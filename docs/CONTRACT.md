# CONTRACT - Hợp đồng giao tiếp giữa các file

Mọi người làm theo đúng tên hàm và định dạng dưới đây để code ghép được với nhau.
Muốn thay đổi gì phải báo lại với nhóm và sửa file này trước.

## 1. Quy ước chung

- Bàn cờ: 15x15, 5 quân liên tiếp thắng, không luật chặn hai đầu.
- Bàn cờ là mảng 2 chiều: `board[hàng][cột]`, hàng và cột đánh số từ 0.
- Giá trị ô: `0` = trống (EMPTY), `1` = người (HUMAN), `2` = máy (AI).
- Hằng số có sẵn trong `board.js`: `BOARD_SIZE`, `WIN_LENGTH`, `EMPTY`, `HUMAN`, `AI`.

## 2. board.js (Thảo phụ trách)

| Hàm | Mô tả | Trả về |
|---|---|---|
| `createBoard(size)` | Tạo bàn trống (mặc định 15) | mảng 2 chiều |
| `cloneBoard(board)` | Sao chép bàn cờ | mảng 2 chiều mới |
| `getOpponent(player)` | Đối thủ của người chơi | `1` hoặc `2` |
| `isInside(board, r, c)` | Ô có nằm trong bàn không | true/false |
| `isValidMove(board, r, c)` | Trong bàn và còn trống | true/false |
| `makeMove(board, r, c, player)` | Đặt quân (sửa trực tiếp board) | true nếu thành công |
| `undoMove(board, r, c)` | Gỡ quân (để Minimax quay lui) | không |
| `checkWin(board, r, c, player)` | Nước vừa đánh tại (r,c) có thắng không | mảng ô đường thắng `[[r,c],...]` hoặc `null` |
| `isFull(board)` | Bàn đầy (hòa) | true/false |

## 3. evaluate.js (Ngọc phụ trách)

```js
evaluate(board, player)  // trả về một số
```

- Điểm càng cao càng có lợi cho `player`.
- Điểm dương: `player` đang hơn; điểm âm: đối thủ đang hơn.
- Không được sửa `board` bên trong hàm này.

## 4. ai-worker.js (Vy phụ trách)

Web Worker nhận và trả tin nhắn qua `postMessage`.

**Gửi vào Worker:**

```js
{ board: [[...]], player: 2, level: "easy" | "medium" | "hard" }
```

**Worker trả về:**

```js
{ row: 7, col: 8, nodes: 1520, time: 340 }
```

- `row`, `col`: nước đi AI chọn.
- `nodes`: số nút Minimax đã duyệt (dùng cho báo cáo).
- `time`: thời gian suy nghĩ, tính bằng mili giây.

Độ khó (gợi ý, Vy và Ngọc có thể chỉnh):

| level | Độ sâu |
|---|---|
| easy | 1 |
| medium | 2 |
| hard | 3-4 |

## 5. ui.js (Á phụ trách)

- Vẽ bàn cờ vào phần tử `<div id="board">`.
- Khi người click ô trống, gọi hàm xử lý ở `main.js`: `onCellClick(r, c)`.
- Cung cấp các hàm cho `main.js` gọi:
  - `renderBoard(board)`: vẽ lại bàn cờ.
  - `showMessage(text)`: hiện thông báo (đến lượt, thắng, thua, hòa, "AI đang suy nghĩ...").
  - `highlightWin(line)`: tô sáng đường thắng (nhận mảng từ `checkWin`).

## 6. main.js (Thảo và Á phối hợp)

- Giữ trạng thái ván chơi: bàn cờ, lượt đi, đã kết thúc chưa.
- Nối giao diện với luật chơi và với Worker.

## 7. Thứ tự nạp trong index.html

```html
<script src="js/board.js"></script>
<script src="js/evaluate.js"></script>
<script src="js/ui.js"></script>
<script src="js/main.js"></script>
```

`ai-worker.js` không nạp bằng thẻ script. Nó được tạo bằng `new Worker("js/ai-worker.js")`
và tự nạp lại các file cần dùng bằng `importScripts("board.js", "evaluate.js")`.

## 8. Quy tắc Git

- Mỗi người làm trên nhánh riêng: `feature/board`, `feature/ui`, `feature/ai`, `feature/eval`.
- Không push thẳng lên `main`. Làm xong thì tạo Pull Request cho nhóm trưởng.
- Trước khi làm mỗi ngày: Fetch + Pull `main`, rồi Update from main vào nhánh của mình.