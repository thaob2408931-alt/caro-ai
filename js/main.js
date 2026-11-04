/* main.js - Nối giao diện (ui.js) với luật chơi (board.js)  

  Nội dung:
   - Giữ trạng thái trận: bàn cờ, lượt đi, đã kết thúc chưa.
   - Nhận click từ giao diện (onCellClick): đặt quân, kiểm tra thắng/hòa, đổi lượt.
   - Bắt đầu trận mới khi người chơi bấm "Bắt đầu trận đấu" hoặc "Đấu lại" (onNewGame).
   - Ra thông báo: bắt đầu, đến lượt ai (tên, quân), thắng, hòa, kết thúc; chạy và dừng đồng hồ.
   - Đến lượt máy: gửi bàn cờ cho ai-worker.js, nhận nước đi và đặt quân (requestAiMove, onAiMove).
  
  Các hàm dùng từ file khác:
   - board.js : createBoard, makeMove, checkWin, isFull, getOpponent, AI (=2)
   - ui.js : renderBoard, showMessage, highlightWin, getSettings, setTurn, startTimer, stopTimer, showResult

  Giá trị ô: 1 = người chơi 1, 2 = người chơi 2 (là máy khi chơi với máy). Quân X/O do người chơi chọn. 
*/

(function () {
  "use strict";

  let board = null;     // bàn cờ hiện tại
  let current = 1;      // người sắp đi: 1 hoặc 2
  let gameOver = true;  // true thì không cho đánh (chưa bắt đầu hoặc đã hết trận)
  let settings = null;  // thiết lập của trận (xem getSettings trong ui.js)
  let worker = null;    // Web Worker của AI (ai-worker.js)

  // "Nguyễn Văn A (quân X)"
  function who(player) {
    return settings.names[player] + " (quân " + settings.symbols[player] + ")";
  }

  // Chơi với máy và đang đến lượt máy
  function isAiTurn() {
    return settings.mode === "pve" && current === AI;
  }

  // Gửi bàn cờ cho ai-worker.js (CONTRACT mục 4)
  function requestAiMove() {
    try {
      if (!worker) {
        worker = new Worker("js/ai-worker.js");
        worker.onmessage = onAiMove;
        worker.onerror = function (err) {
          showMessage("Không chạy được AI (cần chạy trang bằng server, kiểm tra console F12).");
          console.error(err);
        };
      }
      worker.postMessage({ board: board, player: AI, level: settings.level });
    } catch (err) {
      showMessage("Không chạy được AI (cần chạy trang bằng server, kiểm tra console F12).");
      console.error(err);
    }
  }

  // Nhận { row, col, nodes, time } từ Worker rồi đặt quân (giống onCellClick)
  function onAiMove(e) {
    if (gameOver || !isAiTurn()) return;
    const { row, col, nodes, time } = e.data;
    console.log("AI chọn (" + row + ", " + col + ") | nodes: " + nodes + " | " + time + " ms");

    if (row < 0) {   // AI hết nước đi
      endGame("Trận đấu kết thúc! Bàn cờ đã kín, hai bên hòa nhau.");
      return;
    }
    if (!makeMove(board, row, col, current)) return;

    renderBoard(board);

    const line = checkWin(board, row, col, current);
    if (line) {
      highlightWin(line);
      endGame("Trận đấu kết thúc! " + who(current) + " đã chiến thắng với 5 quân liên tiếp.");
    } else if (isFull(board)) {
      endGame("Trận đấu kết thúc! Bàn cờ đã kín, hai bên hòa nhau.");
    } else {
      current = getOpponent(current);
      announceTurn("");
    }
  }

  // Báo đến lượt ai và sáng thẻ người đó
  function announceTurn(prefix) {
    setTurn(current);
    if (isAiTurn()) {
      showMessage(prefix + "Đến lượt " + who(current) + ". AI đang suy nghĩ...");
      requestAiMove();
      return;
    }
    showMessage(prefix + "Đến lượt " + who(current) + " đánh.");
  }

  // Kết thúc trận: dừng đồng hồ, hiện thông báo và kết quả
  function endGame(text) {
    gameOver = true;
    setTurn(0);
    stopTimer();
    showMessage(text);
    showResult();
  }

  // Bắt đầu trận mới theo thiết lập trong form
  function startNewGame() {
    if (worker) { worker.terminate(); worker = null; }   // bỏ kết quả AI của trận trước
    settings = getSettings();
    board = createBoard();
    current = settings.firstPlayer;
    gameOver = false;

    highlightWin(null);   // xóa đường thắng của trận trước
    renderBoard(board);
    startTimer();         // đồng hồ chạy từ lúc "Trận đấu bắt đầu"
    announceTurn("Trận đấu bắt đầu! ");
  }

  // Giao diện gọi khi người chơi click vào một ô TRỐNG 
  function onCellClick(r, c) {
    if (gameOver || isAiTurn()) return;
    if (!makeMove(board, r, c, current)) return;   // ô không hợp lệ thì bỏ qua

    renderBoard(board);

    const line = checkWin(board, r, c, current);   // đường thắng hoặc null
    if (line) {
      highlightWin(line);
      endGame("Trận đấu kết thúc! " + who(current) + " đã chiến thắng với 5 quân liên tiếp.");
    } else if (isFull(board)) {
      endGame("Trận đấu kết thúc! Bàn cờ đã kín, hai bên hòa nhau.");
    } else {
      current = getOpponent(current);
      announceTurn("");
    }
  }

  // ui.js gọi 2 hàm này bằng tên nên phải đưa ra phạm vi toàn cục
  window.onCellClick = onCellClick;
  window.onNewGame = startNewGame;

  // Không tự bắt đầu trận: ui.js mở form thiết lập, người chơi bấm "Bắt đầu trận đấu" mới vào trận.
})();