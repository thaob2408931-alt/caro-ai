// Web Worker chạy Minimax + cắt tỉa Alpha-Beta để chọn nước đi cho máy.
// Nhận:  { board, player, level: "easy" | "medium" | "hard" }
// Trả:   { row, col, nodes, time }
// Dùng lại từ board.js: isInside, makeMove, undoMove, checkWin, getOpponent, cloneBoard, EMPTY
// Dùng lại từ evaluate.js: evaluate(board, player)

if (typeof importScripts === "function") {
  importScripts("board.js", "evaluate.js");
}

// ---------- Cấu hình độ khó ----------
// depth: độ sâu Minimax
// maxCandidates: chỉ xét N nước tiềm năng nhất ở mỗi tầng (giúp chạy nhanh)
// randomTop: chọn ngẫu nhiên trong N nước tốt nhất (>1 để máy "dễ" đánh không quá hoàn hảo)
const LEVELS = {
  easy:   { depth: 1, maxCandidates: 8,  randomTop: 3, blockThreat: false },
  medium: { depth: 2, maxCandidates: 12, randomTop: 1, blockThreat: true },
  hard:   { depth: 4, maxCandidates: 14, randomTop: 1, blockThreat: true }
};

const AI_WIN_SCORE = 1000000; // điểm cho nước thắng ngay
let nodeCount = 0;            // đếm số nút Minimax để báo cáo

// ---------- Sinh nước đi ứng viên ----------

// Chỉ xét các ô trống nằm gần quân đã đánh (cách tối đa `radius` ô).
function getCandidates(board, radius) {
  const size = board.length;
  const result = [];
  let hasStone = false;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== EMPTY) {
        hasStone = true;
        continue;
      }
      let near = false;
      for (let dr = -radius; dr <= radius && !near; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (isInside(board, nr, nc) && board[nr][nc] !== EMPTY) {
            near = true;
            break;
          }
        }
      }
      if (near) result.push([r, c]);
    }
  }

  // Bàn trống: đánh giữa bàn
  if (!hasStone) {
    const mid = Math.floor(size / 2);
    return [[mid, mid]];
  }
  return result;
}

// Điểm nhanh cho 1 hướng nếu `p` đặt quân tại (r,c): đếm quân liên tiếp và số đầu hở.
function lineScore(board, r, c, dr, dc, p) {
  let count = 1;
  let open = 0;
  for (const s of [1, -1]) {
    let i = r + dr * s;
    let j = c + dc * s;
    while (isInside(board, i, j) && board[i][j] === p) {
      count++;
      i += dr * s;
      j += dc * s;
    }
    if (isInside(board, i, j) && board[i][j] === EMPTY) open++;
  }

  if (count >= 5) return 100000;
  if (count === 4) return open === 2 ? 10000 : (open === 1 ? 1000 : 0);
  if (count === 3) return open === 2 ? 1000 : (open === 1 ? 100 : 0);
  if (count === 2) return open === 2 ? 100 : (open === 1 ? 10 : 0);
  return 1;
}

// Điểm sơ bộ của 1 ô: vừa tấn công (cho p) vừa phòng thủ (chặn đối thủ).
// Chỉ dùng để sắp xếp nước đi (move ordering), không phải hàm evaluate chính.
function cellScore(board, r, c, p) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const opp = getOpponent(p);
  let attack = 0;
  let defend = 0;
  for (const [dr, dc] of dirs) {
    attack += lineScore(board, r, c, dr, dc, p);
    defend += lineScore(board, r, c, dr, dc, opp);
  }
  return attack + defend * 0.9;
}

// Lấy các nước tiềm năng nhất, đã sắp xếp giảm dần theo điểm sơ bộ.
// Sắp xếp tốt giúp Alpha-Beta cắt tỉa được nhiều hơn.
function getOrderedMoves(board, player, maxCandidates) {
  const candidates = getCandidates(board, 2);
  const scored = candidates.map(([r, c]) => ({ r, c, s: cellScore(board, r, c, player) }));
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, maxCandidates).map(m => [m.r, m.c]);
}

// Tìm nước thắng ngay lập tức cho `player` (nếu có).
function findWinningMove(board, player) {
  const candidates = getCandidates(board, 2);
  for (const [r, c] of candidates) {
    makeMove(board, r, c, player);
    const win = checkWin(board, r, c, player);
    undoMove(board, r, c);
    if (win) return [r, c];
  }
  return null;
}

// ---------- Minimax + Alpha-Beta ----------

// root: người chơi mà AI đang tính nước đi (điểm tính theo góc nhìn của root)
// isMax: true nếu đang là lượt của root
function minimax(board, depth, alpha, beta, isMax, root, maxCandidates) {
  nodeCount++;

  if (depth === 0) {
    return evaluate(board, root);
  }

  const current = isMax ? root : getOpponent(root);
  const moves = getOrderedMoves(board, current, maxCandidates);
  if (moves.length === 0) return 0; // hết nước đi -> hòa

  let best = isMax ? -Infinity : Infinity;

  for (const [r, c] of moves) {
    makeMove(board, r, c, current);

    let score;
    if (checkWin(board, r, c, current)) {
      // Thắng càng sớm (depth còn lại càng lớn) thì điểm càng cao
      score = isMax ? AI_WIN_SCORE + depth : -(AI_WIN_SCORE + depth);
    } else {
      score = minimax(board, depth - 1, alpha, beta, !isMax, root, maxCandidates);
    }

    undoMove(board, r, c);

    if (isMax) {
      if (score > best) best = score;
      if (best > alpha) alpha = best;
    } else {
      if (score < best) best = score;
      if (best < beta) beta = best;
    }
    if (beta <= alpha) break; // cắt tỉa
  }

  return best;
}

// ---------- Chọn nước đi ở gốc ----------

function findBestMove(board, player, level) {
  const cfg = LEVELS[level] || LEVELS.medium;
  const opp = getOpponent(player);

  // 1. Thắng ngay nếu có thể
  const winMove = findWinningMove(board, player);
  if (winMove) return winMove;

  // 2. Chặn khi đối thủ sắp thắng (medium, hard)
  if (cfg.blockThreat) {
    const blockMove = findWinningMove(board, opp);
    if (blockMove) return blockMove;
  }

  // 3. Minimax
  const moves = getOrderedMoves(board, player, cfg.maxCandidates);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const scoredMoves = [];
  let alpha = -Infinity;
  const useFullWindow = cfg.randomTop > 1; // cần điểm thật của từng nước để chọn ngẫu nhiên

  for (const [r, c] of moves) {
    makeMove(board, r, c, player);
    const score = minimax(
      board,
      cfg.depth - 1,
      useFullWindow ? -Infinity : alpha,
      Infinity,
      false,
      player,
      cfg.maxCandidates
    );
    undoMove(board, r, c);

    scoredMoves.push({ r, c, score });
    if (!useFullWindow && score > alpha) alpha = score;
  }

  scoredMoves.sort((a, b) => b.score - a.score);
  const pickFrom = Math.min(cfg.randomTop, scoredMoves.length);
  const pick = scoredMoves[Math.floor(Math.random() * pickFrom)];
  return [pick.r, pick.c];
}

// ---------- Tính nước đi + nhận/trả tin nhắn ----------

// Tính nước đi cho `player`. Trả về { row, col, nodes, time } đúng CONTRACT mục 4.
function computeMove(board, player, level) {
  const start = performance.now();
  nodeCount = 0;

  const workBoard = cloneBoard(board); // không sửa bàn gốc
  const move = findBestMove(workBoard, player, level);
  const time = Math.round(performance.now() - start);

  if (move === null) return { row: -1, col: -1, nodes: nodeCount, time: time };
  return { row: move[0], col: move[1], nodes: nodeCount, time: time };
}

if (typeof importScripts === "function") {
  // Đang chạy là Web Worker
  onmessage = function (e) {
    const { board, player, level } = e.data;
    postMessage(computeMove(board, player, level));
  };
} else if (typeof window !== "undefined") {
  // Phương án dự phòng: chạy ngay trong trang (main.js gọi window.caroComputeMove)
  window.caroComputeMove = computeMove;
}
