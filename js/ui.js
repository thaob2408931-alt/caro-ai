/* ui.js - Giao diện 

  Nội dung:
   - Vẽ bàn cờ vào <div id="board">.
   - Click ô trống -> gọi onCellClick(r, c) của main.js.
   - Cung cấp cho main.js: renderBoard(board), showMessage(text), highlightWin(line).
   - getSettings()   : tên, quân, người đi trước... người chơi đã thiết lập.
   - setTurn(player) : đánh dấu người đang đến lượt (0 = không ai).
   - startTimer(), stopTimer() : đồng hồ trận đấu.
   - showResult()    : hiện kết quả (thời gian + số nước đi + hộp thoại kết thúc + nút "Đấu lại").
   - Người bấm "Bắt đầu trận đấu" hoặc "Đấu lại" -> gọi onNewGame() của main.js.

  Giá trị ô theo CONTRACT: 0 = trống, 1 = người chơi 1 (HUMAN), 2 = người chơi 2 (AI nếu chơi với máy).
*/

(function () {
  "use strict";

  // 1. Dữ liệu dùng chung 
  const DEFAULT_NAMES = { 1: "Người chơi 1", 2: "Người chơi 2" };
  const AI_NAME = "Máy (AI)";
  const COLS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  let symbolOf = { 1: "x", 2: "o" };   // giá trị ô -> class CSS của quân (đổi theo thiết lập)
  let confirmed = null;                // thiết lập của trận đang chơi (null = chưa bắt đầu trận nào)

  const $ = (id) => document.getElementById(id);

  // Lưu/đọc tùy chọn nhỏ (sáng-tối, âm thanh). Bọc try/catch vì có trình duyệt chặn localStorage.
  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { /* bỏ qua */ }
    return null;
  }

  // 2. Bàn cờ 
  let boardEl = null;   // thẻ <div id="board">
  let cells = [];       // cells[r][c]: nút bấm của ô (r, c)
  let shown = [];       // shown[r][c]: giá trị ô đang hiển thị (chỉ vẽ lại ô nào thay đổi)
  let size = 0;         // kích thước bàn (15)
  let lastCell = null;  // ô vừa đánh
  let winLine = null;   // đường thắng đang tô sáng
  let moveCount = 0;    // số quân đang có trên bàn = số nước đã đi
  let history = [];     // các nước đã đi: { r, c, v }

  // Tên ô kiểu cờ: cột chữ + hàng số, ví dụ "H8"
  function coordName(r, c) {
    return COLS[c] + (r + 1);
  }

  // Mô tả ô cho trình đọc màn hình, ví dụ "Hàng 8, cột 4: X"
  function label(r, c, v) {
    return "Hàng " + (r + 1) + ", cột " + (c + 1) + ": " + (v === 0 ? "trống" : symbolOf[v].toUpperCase());
  }

  // Vẽ dãy tọa độ A..O (trên) và 1..15 (trái) quanh bàn cờ
  function buildCoords(n) {
    const cx = $("coord-x");
    const cy = $("coord-y");
    if (!cx || !cy) return;
    cx.textContent = "";
    cy.textContent = "";
    cx.style.setProperty("--n", n);
    cy.style.setProperty("--n", n);
    for (let i = 0; i < n; i++) {
      const a = document.createElement("span");
      a.textContent = COLS[i];
      cx.appendChild(a);
      const b = document.createElement("span");
      b.textContent = i + 1;
      cy.appendChild(b);
    }
  }

  // Tạo n x n nút bấm trong #board. Trả về false nếu trang không có #board.
  function build(n) {
    if (!boardEl) boardEl = $("board");
    if (!boardEl) return false;

    size = n;
    cells = [];
    shown = [];
    lastCell = null;
    winLine = null;
    boardEl.textContent = "";
    boardEl.style.setProperty("--n", n);   // báo CSS số cột
    buildCoords(n);

    const mid = (n - 1) / 2;               // ô giữa bàn (nếu n lẻ) được chấm một điểm nhỏ
    const frag = document.createDocumentFragment();
    for (let r = 0; r < n; r++) {
      cells.push([]);
      shown.push([]);
      for (let c = 0; c < n; c++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cell empty" + (r === mid && c === mid ? " center" : "");
        btn.dataset.r = r;                 // lưu tọa độ để biết ô nào được click
        btn.dataset.c = c;
        btn.setAttribute("aria-label", label(r, c, 0));
        btn.title = coordName(r, c);
        cells[r].push(btn);
        shown[r].push(0);
        frag.appendChild(btn);
      }
    }
    boardEl.appendChild(frag);
    return true;
  }

  // Một chỗ nghe click cho cả bàn cờ. Chỉ báo main.js khi ô còn trống.
  function handleBoardClick(e) {
    const cell = e.target.closest(".cell");
    if (!cell || !boardEl.contains(cell)) return;

    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);
    if (shown[r][c] !== 0) return;
    if (typeof onCellClick === "function") onCellClick(r, c);
  }

  function setLast(cell) {             // chuyển dấu "nước vừa đánh" sang ô mới (null = bỏ dấu)
    if (lastCell) lastCell.classList.remove("last");
    lastCell = cell;
    if (cell) cell.classList.add("last");
  }

  function clearWin() {                // xóa tô sáng đường thắng
    for (const row of cells) {
      for (const cell of row) {
        cell.classList.remove("win");
        cell.style.removeProperty("--i");
      }
    }
    winLine = null;
  }

  // renderBoard(board): vẽ lại bàn cờ. Chỉ cập nhật ô thay đổi, tự đánh dấu nước vừa đánh.
  function renderBoard(board) {
    const n = board.length;
    if (cells.length === 0 || n !== size) {
      if (!build(n)) return;
    }

    let placed = 0;         // số ô vừa từ trống thành có quân
    let placedCell = null;
    let placedAt = null;
    let other = 0;          // thay đổi khác (ván mới, gỡ quân...)

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const v = board[r][c];
        if (v === shown[r][c]) continue;

        if (shown[r][c] === 0) {
          placed++;
          placedCell = cells[r][c];
          placedAt = { r: r, c: c, v: v };
        } else {
          other++;
        }

        const cell = cells[r][c];
        cell.classList.remove("empty", "x", "o");
        cell.classList.add(v === 0 ? "empty" : symbolOf[v]);
        cell.setAttribute("aria-label", label(r, c, v));
        shown[r][c] = v;
      }
    }

    // Đúng 1 quân mới đặt = nước vừa đánh. Ván mới hoặc gỡ quân = bỏ dấu.
    if (placed === 1 && other === 0) setLast(placedCell);
    else if (placed + other > 0) setLast(null);

    // Ván mới (ô thắng đã trống) thì xóa tô sáng đường thắng
    if (winLine && !winLine.every(([r, c]) => shown[r] && shown[r][c] !== 0)) clearWin();

    // Số nước đã đi = số quân trên bàn
    moveCount = shown.reduce((sum, row) => sum + row.filter((v) => v !== 0).length, 0);
    const movesText = $("moves").querySelector("span");
    if (movesText) movesText.textContent = "Số nước đi: " + moveCount;

    // Lịch sử nước đi + âm thanh
    if (moveCount === 0) {
      history = [];
      renderHistory();
    } else if (placed === 1 && other === 0) {
      history.push(placedAt);
      renderHistory();
      beep(placedAt.v === 1 ? 560 : 440, 0.09, "triangle", 0.06);
    }
  }

  // highlightWin(line): tô sáng đường thắng (mảng [[r, c], ...] từ checkWin, có thể dài hơn 5). null = xóa.
  function highlightWin(line) {
    clearWin();
    if (!line || line.length === 0 || cells.length === 0) return;

    line.forEach(([r, c], i) => {
      const cell = cells[r] && cells[r][c];
      if (!cell) return;
      cell.style.setProperty("--i", i);   // thứ tự ô, để CSS tô lần lượt
      cell.classList.add("win");
    });
    winLine = line;
  }

  // 3. Lịch sử nước đi 
  function renderHistory() {
    const ol = $("history");
    if (!ol) return;
    ol.textContent = "";
    const names = confirmed ? confirmed.names : DEFAULT_NAMES;
    const frag = document.createDocumentFragment();
    history.forEach((m, i) => {
      const li = document.createElement("li");
      const n = document.createElement("span");
      n.className = "n";
      n.textContent = i + 1;
      const chip = document.createElement("i");
      chip.className = "chip mini " + symbolOf[m.v];
      const t = document.createElement("span");
      t.className = "t";
      t.textContent = names[m.v] || DEFAULT_NAMES[m.v];
      const pos = document.createElement("span");
      pos.className = "pos";
      pos.textContent = coordName(m.r, m.c);
      li.append(n, chip, t, pos);
      frag.appendChild(li);
    });
    ol.appendChild(frag);
    ol.scrollTop = ol.scrollHeight;
  }

  // 4. Thông báo 
  // showMessage(text): hiện thông báo. Chuỗi rỗng hoặc null = ẩn.
  // Màu thanh thông báo tự đổi theo trạng thái: đang chơi / có người thắng / hòa (không cần đọc nội dung chữ).
  function showMessage(text) {
    const el = $("message");
    if (!el) return;
    el.textContent = text == null ? "" : String(text);

    const bar = $("statusbar");
    if (bar) {
      let kind = "idle";
      if (timerId !== null) kind = "play";
      else if (confirmed && moveCount > 0) kind = winLine ? "win" : "draw";
      bar.dataset.kind = kind;
      bar.hidden = el.textContent === "";
    }

    el.classList.remove("pop");          // chạy lại hiệu ứng trượt nhẹ cho thông báo mới
    void el.offsetWidth;
    if (el.textContent) el.classList.add("pop");
  }

  // 5. Người chơi đang đến lượt 
  // setTurn(player): player = 1 hoặc 2 -> thẻ người đó sáng viền; 0 = không ai (chưa bắt đầu hoặc hết trận).
  function setTurn(player) {
    $("card-1").classList.toggle("active", player === 1);
    $("card-2").classList.toggle("active", player === 2);

    // Bàn cờ chỉ "mở" khi đến lượt người (lượt máy hoặc hết trận thì khóa, không hiện quân mờ khi di chuột)
    const aiTurn = confirmed && confirmed.mode === "pve" && player === 2;
    const locked = player === 0 || aiTurn;
    if (boardEl) {
      boardEl.dataset.turn = locked ? "" : symbolOf[player];
      boardEl.classList.toggle("locked", locked);
    }

    // Quân của người đang đến lượt hiện cạnh thông báo
    const chip = $("status-chip");
    if (chip) {
      chip.hidden = player === 0;
      if (player !== 0) chip.className = "chip mini " + symbolOf[player];
    }
  }

  // 6. Đồng hồ 
  // Tính bằng performance.now() (đồng hồ của trình duyệt, không bị lệch khi tab chạy nền).
  let timerId = null;
  let startedAt = 0;
  let elapsed = 0;     // thời gian của trận gần nhất (ms), đứng yên khi đồng hồ dừng

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function formatTime(ms) {            // mm:ss, quá 1 giờ thì hh:mm:ss
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor(total / 60) % 60;
    return (h > 0 ? pad(h) + ":" : "") + pad(m) + ":" + pad(total % 60);
  }

  function setClockState(state) {      // idle | run | stop
    const clock = $("clock");
    if (!clock) return;
    clock.dataset.state = state;
    $("clock-state").textContent = state === "run" ? "Đang thi đấu" : state === "stop" ? "Đã dừng" : "Chưa bắt đầu";
  }

  function tick() {
    $("timer").textContent = formatTime(performance.now() - startedAt);
  }

  // startTimer(): bắt đầu tính giờ từ 00:00 (gọi lúc trận đấu bắt đầu)
  function startTimer() {
    if (timerId !== null) clearInterval(timerId);
    startedAt = performance.now();
    elapsed = 0;
    tick();
    timerId = setInterval(tick, 250);
    setClockState("run");
    showBanner();
    playStart();
  }

  // stopTimer(): dừng đồng hồ (gọi lúc trận đấu kết thúc), trả về thời gian trận đấu (ms)
  function stopTimer() {
    if (timerId === null) return elapsed;
    clearInterval(timerId);
    timerId = null;
    elapsed = performance.now() - startedAt;
    $("timer").textContent = formatTime(elapsed);
    setClockState("stop");
    return elapsed;
  }

  // Quay lại tab: cập nhật ngay, khỏi chờ nhịp kế tiếp
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && timerId !== null) tick();
  });

  // 7. Banner "Trận đấu bắt đầu" 
  let bannerTimer = null;

  function showBanner() {
    const el = $("banner");
    if (!el || !confirmed) return;
    const first = confirmed.firstPlayer;
    $("banner-title").textContent = "Bắt đầu!";
    $("banner-sub").textContent = confirmed.names[first] + " đánh trước · quân " + confirmed.symbols[first];
    el.hidden = true;
    void el.offsetWidth;                 // chạy lại hiệu ứng
    el.hidden = false;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { el.hidden = true; }, 2300);
  }

  function hideBanner() {
    clearTimeout(bannerTimer);
    const el = $("banner");
    if (el) el.hidden = true;
  }

  // 8. Kết quả cuối trận 
  const resultDlg = $("result-dialog");
  let resultTimer = null;

  // Ai thắng: lấy giá trị ô đầu tiên của đường thắng. 0 = hòa.
  function getWinner() {
    return winLine && winLine.length ? shown[winLine[0][0]][winLine[0][1]] : 0;
  }

  function confetti() {
    const box = $("confetti");
    if (!box) return;
    box.textContent = "";
    const colors = ["#ff5d7a", "#4da3ff", "#ffd45c", "#3ddc97", "#8a6bff", "#ff9f43"];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement("i");
      p.style.setProperty("--l", Math.random() * 100 + "%");
      p.style.setProperty("--w", 5 + Math.random() * 6 + "px");
      p.style.setProperty("--c", colors[i % colors.length]);
      p.style.setProperty("--d", 2.2 + Math.random() * 1.8 + "s");
      p.style.setProperty("--t", Math.random() * 0.7 + "s");
      p.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");
      p.style.setProperty("--r", Math.random() * 720 - 360 + "deg");
      box.appendChild(p);
    }
  }

  function openDialog(dlg) {
    if (dlg.open) return;
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
  }

  function closeDialog(dlg) {
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
  }

  // Ghi nội dung kết thúc trận vào hộp thoại và vào thẻ kết quả ở panel
  function fillResult() {
    const w = getWinner();
    const names = confirmed ? confirmed.names : DEFAULT_NAMES;
    const symbols = confirmed ? confirmed.symbols : { 1: "X", 2: "O" };
    const pve = confirmed && confirmed.mode === "pve";
    const aiWon = pve && w === 2;

    let kind = "draw";
    let title = "Hòa nhau!";
    let sub = "Bàn cờ đã kín mà chưa ai nối được 5 quân. Hai bên ngang tài ngang sức.";
    if (w) {
      kind = aiWon ? "lose" : "win";
      title = aiWon ? "Máy chiến thắng" : "Chiến thắng!";
      sub = aiWon
        ? "Máy đã nối đủ 5 quân liên tiếp. Đấu lại để gỡ nhé!"
        : "Chúc mừng " + names[w] + " đã nối đủ 5 quân liên tiếp.";
    }

    $("rd-body").dataset.kind = kind;
    $("rd-title").textContent = title;
    $("rd-sub").textContent = sub;
    $("rd-time").textContent = formatTime(elapsed);
    $("rd-moves").textContent = moveCount;

    const wrap = $("rd-winner");
    wrap.hidden = !w;
    if (w) {
      $("rd-chip").className = "chip " + symbolOf[w];
      $("rd-name").textContent = names[w];
      $("rd-role").textContent = "Quân " + symbols[w] + (aiWon ? " · Máy" : " · Người thắng cuộc");
    }

    const res = $("result");
    res.dataset.kind = kind;
    $("result-title").textContent = w ? names[w] + " thắng" : "Hai bên hòa nhau";
    $("result-text").textContent = "Thời gian: " + formatTime(elapsed) + " · Số nước đi: " + moveCount;
    return kind;
  }

  function showResult() {              // gọi sau stopTimer()
    const kind = fillResult();
    $("result").hidden = false;

    if (kind === "win") { confetti(); playWin(); }
    else if (kind === "lose") playLose();
    else playDraw();
    if (kind !== "win") $("confetti").textContent = "";

    // Thời gian chờ cho người chơi nhìn đường thắng rồi mới hiện hộp thoại
    clearTimeout(resultTimer);
    resultTimer = setTimeout(() => {
      if (!setupEl.open && !$("result").hidden) openDialog(resultDlg);
    }, kind === "draw" ? 500 : 1100);
  }

  function hideResult() {
    clearTimeout(resultTimer);
    $("result").hidden = true;
    if (resultDlg.open) closeDialog(resultDlg);
  }

  // 9. Âm thanh (Web Audio, không cần file ngoài) 
  let audioCtx = null;
  let soundOn = store("caro-sound") !== "off";

  function beep(freq, dur, type, vol, delay) {
    if (!soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const t0 = audioCtx.currentTime + (delay || 0);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) { /* trình duyệt không hỗ trợ âm thanh thì bỏ qua */ }
  }
  function playStart() { beep(523, 0.14, "sine", 0.07); beep(784, 0.2, "sine", 0.07, 0.12); }
  function playWin() { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.22, "triangle", 0.08, i * 0.12)); }
  function playLose() { [392, 330, 262].forEach((f, i) => beep(f, 0.26, "sine", 0.07, i * 0.16)); }
  function playDraw() { beep(440, 0.18, "sine", 0.06); beep(440, 0.22, "sine", 0.06, 0.2); }

  function applySound() {
    const btn = $("btn-sound");
    btn.setAttribute("aria-pressed", String(soundOn));
    btn.title = soundOn ? "Tắt âm thanh" : "Bật âm thanh";
  }

  // Giao diện sáng/tối: mặc định là SÁNG, chỉ tối khi người chơi bấm nút đổi (và được nhớ cho lần sau)
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    store("caro-theme", t);
  }

  function initTheme() {
    document.documentElement.setAttribute("data-theme", store("caro-theme") === "dark" ? "dark" : "light");
  }

  // 10. Form thiết lập trận đấu 
  const setupEl = $("setup");
  const formEl = $("setup-form");

  // Giá trị đang chọn của một nhóm radio trong form
  function picked(name) {
    const el = formEl.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  function checkRadio(name, value) {
    const el = formEl.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (el) el.checked = true;
  }

  // Đọc form thành đối tượng thiết lập
  function readForm() {
    const pve = picked("mode") === "pve";
    const sym1 = picked("piece") === "O" ? "O" : "X";
    return {
      mode: pve ? "pve" : "pvp",
      level: picked("level") || "medium",
      names: { 1: $("name1").value.trim(), 2: pve ? AI_NAME : $("name2").value.trim() },
      symbols: { 1: sym1, 2: sym1 === "X" ? "O" : "X" },   // người 1 chọn quân, người 2 nhận quân còn lại
      firstPlayer: Number(picked("first")) || 1,
    };
  }

  // Cập nhật chữ trong form theo những gì đang nhập/chọn (tên hiện ngay trên các nút)
  let savedName2 = "";   // nhớ tên người chơi 2 khi tạm chuyển sang chơi với máy

  function refreshForm() {
    const pve = picked("mode") === "pve";
    const n1 = $("name1").value.trim() || DEFAULT_NAMES[1];
    const n2 = pve ? AI_NAME : $("name2").value.trim() || DEFAULT_NAMES[2];
    const sym1 = picked("piece") === "O" ? "O" : "X";

    $("piece-who").textContent = n1;
    $("piece-note").textContent = n2 + " sẽ đánh quân " + (sym1 === "X" ? "O" : "X") + ". Quân chỉ chọn được ở đây, vào trận rồi sẽ không đổi được.";
    $("first-1").textContent = n1;
    $("first-2").textContent = n2;
    $("field-level").hidden = !pve;
  }

  // Đổi chế độ: chơi với máy thì người chơi 2 là "Máy (AI)" và không nhập tên
  function handleModeChange() {
    const pve = picked("mode") === "pve";
    const name2 = $("name2");
    if (pve) {
      savedName2 = name2.value;
      name2.value = AI_NAME;
    } else if (name2.disabled) {
      name2.value = savedName2;
    }
    name2.disabled = pve;
    refreshForm();
  }

  // Kiểm tra form, trả về câu báo lỗi ("" nếu hợp lệ)
  function validate(s) {
    if (!s.names[1]) return "Hãy nhập tên Người chơi 1.";
    if (s.mode === "pvp" && !s.names[2]) return "Hãy nhập tên Người chơi 2.";
    if (s.names[1].toLowerCase() === s.names[2].toLowerCase()) return "Hai người chơi cần có tên khác nhau.";
    return "";
  }

  // Đổ thiết lập đã lưu vào form (dùng khi bấm "Chơi lại" để không phải nhập lại)
  function fillForm(s) {
    checkRadio("mode", s.mode);
    $("name1").value = s.names[1];
    $("name2").value = s.mode === "pve" ? savedName2 : s.names[2];
    $("name2").disabled = s.mode === "pve";
    checkRadio("piece", s.symbols[1]);
    checkRadio("first", s.firstPlayer);
    checkRadio("level", s.level);
    refreshForm();
  }

  function openSetup() {
    if (resultDlg.open) closeDialog(resultDlg);
    if (confirmed) fillForm(confirmed);
    $("setup-error").textContent = "";
    $("btn-cancel").hidden = !confirmed;   // chưa có trận nào thì không có nút "Quay lại"
    openDialog(setupEl);
    $("name1").focus();
  }

  function closeSetup() {
    closeDialog(setupEl);
  }

  // Áp dụng thiết lập của trận mới lên giao diện: tên, quân, cách vẽ quân
  function applySettings(s) {
    symbolOf = { 1: s.symbols[1].toLowerCase(), 2: s.symbols[2].toLowerCase() };
    for (const p of [1, 2]) {
      $("pname-" + p).textContent = s.names[p];
      $("chip-" + p).className = "chip " + symbolOf[p];
      const who = s.mode === "pve" ? (p === 1 ? "Người · " : "Máy · ") : "";
      $("prole-" + p).textContent = who + "Quân " + s.symbols[p];
    }
  }

  // Bấm "Bắt đầu trận đấu"
  function handleSubmit(e) {
    e.preventDefault();
    const s = readForm();
    const error = validate(s);
    $("setup-error").textContent = error;
    if (error) {
      (s.names[1] ? $("name2") : $("name1")).focus();
      return;
    }

    confirmed = s;
    applySettings(s);
    hideResult();
    hideBanner();
    closeSetup();
    if (typeof onNewGame === "function") onNewGame();   // main.js bắt đầu trận mới
  }

  // Bấm "Đấu lại": giữ nguyên thiết lập, bắt đầu trận mới ngay
  function handleRematch() {
    hideResult();
    hideBanner();
    if (typeof onNewGame === "function") onNewGame();
  }

  // getSettings(): main.js gọi để lấy thiết lập của trận đang bắt đầu. Trả về:
  //   mode        : "pvp" (2 người) | "pve" (chơi với máy)
  //   level       : "easy" | "medium" | "hard"  
  //   names       : { 1: tên người chơi 1, 2: tên người chơi 2 hoặc "Máy (AI)" }
  //   symbols     : { 1: "X" | "O", 2: quân còn lại }
  //   firstPlayer : người đánh trước, 1 hoặc 2 (giá trị ô, chính là giá trị truyền vào makeMove)
  function getSettings() {
    const s = confirmed || readForm();
    return {
      mode: s.mode,
      level: s.level,
      names: { 1: s.names[1], 2: s.names[2] },
      symbols: { 1: s.symbols[1], 2: s.symbols[2] },
      firstPlayer: s.firstPlayer,
    };
  }

  // 11. Cho main.js gọi các hàm bằng tên 
  window.renderBoard = renderBoard;
  window.showMessage = showMessage;
  window.highlightWin = highlightWin;
  window.getSettings = getSettings;
  window.setTurn = setTurn;
  window.startTimer = startTimer;
  window.stopTimer = stopTimer;
  window.showResult = showResult;

  // 12. Chạy khi mở trang 
  initTheme();                                                    // chọn sáng/tối ngay khi nạp file
  const initialSize = typeof BOARD_SIZE === "number" ? BOARD_SIZE : 15;   // BOARD_SIZE từ board.js
  if (build(initialSize)) {
    boardEl.addEventListener("click", handleBoardClick);
    boardEl.classList.add("locked");     // chưa vào trận thì chưa cho đánh
  }

  formEl.addEventListener("submit", handleSubmit);
  formEl.addEventListener("input", refreshForm);                  // gõ tên hoặc đổi lựa chọn thì cập nhật chữ ngay
  formEl.querySelectorAll('input[name="mode"]').forEach((el) => el.addEventListener("change", handleModeChange));
  $("btn-cancel").addEventListener("click", closeSetup);
  $("btn-restart").addEventListener("click", openSetup);
  $("btn-rematch").addEventListener("click", handleRematch);

  // Hộp thoại kết thúc trận
  $("btn-rematch-modal").addEventListener("click", handleRematch);
  $("btn-newsetup").addEventListener("click", openSetup);
  $("btn-close-result").addEventListener("click", () => closeDialog(resultDlg));
  resultDlg.addEventListener("click", (e) => { if (e.target === resultDlg) closeDialog(resultDlg); });   // bấm nền mờ = đóng

  // Âm thanh và giao diện sáng/tối
  $("btn-sound").addEventListener("click", () => {
    soundOn = !soundOn;
    store("caro-sound", soundOn ? "on" : "off");
    applySound();
    if (soundOn) beep(660, 0.1, "sine", 0.07);
  });
  $("btn-theme").addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
  });
  applySound();

  setupEl.addEventListener("cancel", (e) => {                     // phím Esc: chưa có trận nào thì không cho đóng form
    if (!confirmed) e.preventDefault();
  });

  refreshForm();
  openSetup();                                                    // mở trang là hiện form thiết lập
})();