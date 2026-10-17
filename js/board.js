// board.js - Bàn cờ, luật chơi, kiểm tra thắng/hòa
// Dùng được ở 3 nơi: trang web (thẻ <script>), Web Worker (importScripts) và Node.js (thực nghiệm)

const BOARD_SIZE = 15;         // bàn 15x15
const WIN_LENGTH = 5;          // 5 ô để thắng
const EMPTY = 0;               // ô trống
const HUMAN = 1;               // quân của người
const AI = 2;                  // quân của máy

// 4 hướng cần kiểm tra: ngang, dọc, chéo xuống, chéo lên
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

/** Tạo bàn cờ trống size x size. */
function createBoard(size = BOARD_SIZE) {
  const board = [];
  for (let r = 0; r < size; r++) {
    board.push(new Array(size).fill(EMPTY));
  }
  return board;
}

/** Sao chép bàn cờ (dùng khi cần thử nước đi mà không đụng bàn thật). */
function cloneBoard(board) {
  return board.map((row) => row.slice());
}

/** Đối thủ của người chơi hiện tại. */
function getOpponent(player) {
  return player === HUMAN ? AI : HUMAN;
}

/** Ô (r, c) có nằm trong bàn cờ không. */
function isInside(board, r, c) {
  return r >= 0 && r < board.length && c >= 0 && c < board[0].length;
}

/** Nước đi hợp lệ: nằm trong bàn và ô còn trống. */
function isValidMove(board, r, c) {
  return isInside(board, r, c) && board[r][c] === EMPTY;
}

/**
 * Đặt quân. Sửa trực tiếp trên board.
 * Trả về true nếu thành công, false nếu nước đi không hợp lệ.
 */
function makeMove(board, r, c, player) {
  if (!isValidMove(board, r, c)) return false;
  board[r][c] = player;
  return true;
}

/** Gỡ quân khỏi ô (r, c). Dùng trong Minimax để quay lui. */
function undoMove(board, r, c) {
  board[r][c] = EMPTY;
}

/**
 * Kiểm tra nước vừa đánh tại (r, c) của `player` có tạo thành 5 quân liên tiếp không.
 * Trả về mảng các ô [[r,c], ...] của đường thắng (để UI tô sáng), hoặc null nếu chưa thắng.
 * Chỉ cần gọi sau mỗi nước đi, không phải quét cả bàn.
 */
function checkWin(board, r, c, player) {
  for (const [dr, dc] of DIRECTIONS) {
    const line = [[r, c]];

    // đếm về một phía
    let i = r + dr;
    let j = c + dc;
    while (isInside(board, i, j) && board[i][j] === player) {
      line.push([i, j]);
      i += dr;
      j += dc;
    }

    // đếm về phía ngược lại
    i = r - dr;
    j = c - dc;
    while (isInside(board, i, j) && board[i][j] === player) {
      line.push([i, j]);
      i -= dr;
      j -= dc;
    }

    if (line.length >= WIN_LENGTH) return line;
  }
  return null;
}

/** Bàn cờ đã đầy (hòa) chưa. */
function isFull(board) {
  for (const row of board) {
    for (const cell of row) {
      if (cell === EMPTY) return false;
    }
  }
  return true;
}

// Cho phép Node.js dùng (require) mà không ảnh hưởng trình duyệt
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    BOARD_SIZE, WIN_LENGTH, EMPTY, HUMAN, AI,
    createBoard, cloneBoard, getOpponent, isInside,
    isValidMove, makeMove, undoMove, checkWin, isFull,
  };
}