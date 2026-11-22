// evaluate.js - Hàm đánh giá thế cờ (heuristic)
//
// evaluate(board, player) trả về MỘT SỐ: càng cao càng có lợi cho `player`, âm nghĩa là đối thủ đang hơn.
// Không sửa `board`. Dùng lại từ board.js: DIRECTIONS, WIN_LENGTH, isInside, getOpponent.
//
// Ý tưởng "cửa sổ 5 ô": mọi đoạn 5 ô liên tiếp (theo 4 hướng) đều có thể trở thành đường thắng.
//   - Cửa sổ có quân của CẢ HAI bên: đã chết, không ai thắng được ở đó -> 0 điểm.
//   - Cửa sổ chỉ có quân một bên: càng nhiều quân càng gần thắng -> cộng điểm theo bảng EVAL_WEIGHT.
// Cách tính này tự xử lý được: đầu bị chặn (ít cửa sổ sống hơn), đường hở hai đầu (nhiều cửa sổ hơn)
// và cả đường có khoảng trống như X X _ X.
//
// Ví dụ: 3 quân liền nhau hở hai đầu nằm trong 3 cửa sổ sống, còn 3 quân bị chặn một đầu chỉ có 1.

// Điểm của một cửa sổ theo số quân (0..5) của một bên. 5 quân = thắng.
const EVAL_WEIGHT = [0, 1, 10, 100, 1000, 100000];

// Hệ số phòng thủ: >1 nghĩa là sợ đối thủ hơn một chút, nên ưu tiên chặn khi hai bên ngang nhau.
const EVAL_DEFENSE = 1.1;

// Thưởng nhỏ cho quân gần tâm bàn (giúp mở đầu hợp lý và phá thế hòa điểm). Chỉ là gia vị.
const EVAL_CENTER = 0.5;

// Điểm không bao giờ vượt ngưỡng này, để luôn nhỏ hơn AI_WIN_SCORE (1.000.000) của ai-worker.js.
const EVAL_LIMIT = 900000;

function evaluate(board, player) {
  const opp = getOpponent(player);
  const n = board.length;
  const last = WIN_LENGTH - 1;
  let mine = 0;     // tổng điểm các cửa sổ chỉ có quân của player
  let theirs = 0;   // tổng điểm các cửa sổ chỉ có quân của đối thủ

  for (const [dr, dc] of DIRECTIONS) {
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!isInside(board, r + dr * last, c + dc * last)) continue;   // cửa sổ bị tràn ra ngoài bàn

        let a = 0;   // số quân của player trong cửa sổ
        let b = 0;   // số quân của đối thủ trong cửa sổ
        for (let k = 0; k < WIN_LENGTH; k++) {
          const v = board[r + dr * k][c + dc * k];
          if (v === player) a++;
          else if (v === opp) b++;
        }

        if (a > 0 && b === 0) mine += EVAL_WEIGHT[a];
        else if (b > 0 && a === 0) theirs += EVAL_WEIGHT[b];
      }
    }
  }

  // Thưởng vị trí: quân càng gần tâm càng được cộng một ít
  const mid = (n - 1) / 2;
  let center = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = board[r][c];
      if (v === 0) continue;
      const bonus = EVAL_CENTER * (mid - Math.max(Math.abs(r - mid), Math.abs(c - mid)));
      center += v === player ? bonus : -bonus;
    }
  }

  const score = mine - EVAL_DEFENSE * theirs + center;
  return Math.max(-EVAL_LIMIT, Math.min(EVAL_LIMIT, score));
}

// Cho Node.js dùng khi chạy thực nghiệm (cần nạp board.js trước để có các hàm và hằng số của nó)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { evaluate };
}
