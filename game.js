// export default class Game {
//     constructor({ board, scoreEl, timerEl }) {
//       this.board = board;
//       this.scoreEl = scoreEl;
//       this.timerEl = timerEl;
  
//       this.score = 0;
//       this.timeLeft = 120;
//       this.isPlaying = false;
//     }
  
//     start() {
//       this.reset();
//       this.isPlaying = true;
//       this.startTimer();
//     }
  
//     reset() {
//       this.score = 0;
//       this.updateScore();
//     }
  
//     updateScore() {
//       this.scoreEl.textContent = this.score;
//     }
  
//     addScore(points) {
//       this.score += points;
//       this.updateScore();
//     }
  
//     startTimer() {
//       this.interval = setInterval(() => {
//         this.timeLeft--;
//         this.timerEl.textContent = this.timeLeft;
  
//         if (this.timeLeft <= 0) {
//           this.end();
//         }
//       }, 1000);
//     }
    
  
//     end() {
//       clearInterval(this.interval);
//       this.isPlaying = false;
//       alert(`Final Score: ${this.score}`);
//     }
//   }

  

// export function findSolutions(grid, rows, cols) {
//   const results = [];

//   const prefix = Array.from({ length: rows + 1 }, () =>
//     Array(cols + 1).fill(0)
//   );

//   for (let r = 0; r < rows; r++) {
//     for (let c = 0; c < cols; c++) {
//       prefix[r + 1][c + 1] =
//         grid[r][c] +
//         prefix[r][c + 1] +
//         prefix[r + 1][c] -
//         prefix[r][c];
//     }
//   }

//   for (let r1 = 0; r1 < rows; r1++) {
//     for (let r2 = r1; r2 < rows; r2++) {
//       for (let c1 = 0; c1 < cols; c1++) {
//         for (let c2 = c1; c2 < cols; c2++) {
//           const sum =
//             prefix[r2 + 1][c2 + 1] -
//             prefix[r1][c2 + 1] -
//             prefix[r2 + 1][c1] +
//             prefix[r1][c1];

//           if (sum === 10) {
//             results.push({ r1, c1, r2, c2 });
//           }
//         }
//       }
//     }
//   }

//   return results;
// }