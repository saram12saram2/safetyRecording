import './style.css';

// v.5 

// ─── Game Constants ───────────────────────────────────────────────────────────
// The board is 17 columns × 10 rows = 170 apple cells total.
const COLUMNS      = 17;
const ROWS         = 10;
const GAME_DURATION = 120; // seconds (2 minutes per round)

// ─── Game State ───────────────────────────────────────────────────────────────
// These mutable variables track everything that changes during a round.
let playerScore = 0;                  // player's current score (1 point per apple removed)
let timeLeft    = GAME_DURATION;      // countdown in seconds
let countdown   = null;               // reference to the setInterval so we can clear it later
let isPlaying   = false;              // true while a round is active; blocks clicks before start

// ─── DOM References ───────────────────────────────────────────────────────────
// Grab all elements we'll touch at runtime once (avoids repeated querySelector calls).
const board        = document.getElementById('grid');              // apple cell container
const scoreEl      = document.getElementById('score');             // live score text
const progressBar  = document.getElementById('timer-bar');         // shrinking progress bar
const timerLabel   = document.getElementById('time-remaining');    // numeric countdown
const dragRect     = document.getElementById('selection-box');     // drag-selection rectangle
const btnStart     = document.getElementById('start-button');      // start / restart button
const splashEl     = document.getElementById('splash-screen');     // intro overlay
const modalEl      = document.getElementById('result-modal');      // end-of-round modal
const finalScoreEl = document.getElementById('final-score');       // score shown in modal
const btnClose     = document.getElementById('close-button');      // close modal button

// ─── Drag State ───────────────────────────────────────────────────────────────
// Track the mouse positions so we can draw the selection rectangle while dragging.
let dragging = false; // whether the user is currently holding the mouse button down
let originX  = 0;     // viewport X where the drag began (mousedown)
let originY  = 0;     // viewport Y where the drag began
let pointerX = 0;     // viewport X of the most recent mousemove
let pointerY = 0;     // viewport Y of the most recent mousemove

// ─────────────────────────────────────────────────────────────────────────────
// buildBoard()
// Fills the #grid element with ROWS * COLUMNS apple <div>s.
// Each apple gets a random integer 1–9 stored both as text content and in
// data-value (so the drag logic can read it without parsing textContent).
// ─────────────────────────────────────────────────────────────────────────────
function buildBoard() {
  board.innerHTML = ''; // clear any previous round's apples
  for (let i = 0; i < ROWS * COLUMNS; i++) {
    const cell  = document.createElement('div');
    cell.classList.add('apple');
    const value = Math.floor(Math.random() * 9) + 1; // random 1–9
    cell.textContent   = value;
    cell.dataset.value = value; // used by selection math
    board.appendChild(cell);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// addPoints(points)
// Adds `points` to the running score and updates the display.
// Called with the number of apples removed (one point each).
// ─────────────────────────────────────────────────────────────────────────────
function addPoints(points) {
  playerScore      += points;
  scoreEl.textContent = playerScore;
}

// ─────────────────────────────────────────────────────────────────────────────
// beginCountdown()
// Resets the visual timer to full and starts a 1-second interval that:
//   • decrements timeLeft
//   • shrinks the progress bar proportionally
//   • calls finishRound() when time reaches 0
// ─────────────────────────────────────────────────────────────────────────────
function beginCountdown() {
  timeLeft              = GAME_DURATION;
  progressBar.style.width = "100%";
  timerLabel.textContent  = `${timeLeft}`;

  countdown = setInterval(() => {
    timeLeft--;
    const pct = (timeLeft / GAME_DURATION) * 100; // 0–100 %
    progressBar.style.width = `${pct}%`;
    timerLabel.textContent  = `${timeLeft}`;
    if (timeLeft <= 0) {
      clearInterval(countdown); // stop the interval before calling finishRound
      finishRound();
    }
  }, 1000); // fires every 1 000 ms = 1 second
}

// ─────────────────────────────────────────────────────────────────────────────
// finishRound()
// Tears down the active round:
//   1. Removes all mouse event listeners so the board is no longer interactive.
//   2. Resets game state flags.
//   3. Shows the result modal with the final score.
// ─────────────────────────────────────────────────────────────────────────────
function finishRound() {
  // Remove drag listeners — the same function references used in launchRound()
  // must be passed here so removeEventListener can match them exactly.
  board.removeEventListener('mousedown', handleDragStart);
  board.removeEventListener('mousemove', handleDragMove);
  board.removeEventListener('mouseup',   handleDragEnd);
  board.removeEventListener('mouseleave', handleDragEnd);

  isPlaying           = false;
  btnStart.disabled   = false;
  btnStart.textContent = "Restart";

  finalScoreEl.textContent = playerScore;
  modalEl.classList.remove('hidden'); // make the modal visible
}

// ─────────────────────────────────────────────────────────────────────────────
// getBoardBounds()
// Returns the board element's bounding rectangle in viewport coordinates.
// Used to convert absolute mouse positions into board-relative positions
// when positioning the drag-rect overlay.
// ─────────────────────────────────────────────────────────────────────────────
function getBoardBounds() {
  return board.getBoundingClientRect();
}

// ─────────────────────────────────────────────────────────────────────────────
// isCovered(el, bounds)
// Returns true if the center of `el` falls inside `bounds`.
// Using the center (rather than any corner) means an apple is "selected"
// only when the drag box covers its middle — a natural feel for grid games.
// ─────────────────────────────────────────────────────────────────────────────
function isCovered(el, bounds) {
  const r       = el.getBoundingClientRect();
  const midX    = r.left + r.width  / 2; // midpoint X in viewport coords
  const midY    = r.top  + r.height / 2; // midpoint Y in viewport coords
  return (
    midX >= bounds.left &&
    midX <= bounds.right &&
    midY >= bounds.top  &&
    midY <= bounds.bottom
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// getDragBounds()
// Converts the raw drag start/end coordinates into a normalised rectangle
// (left ≤ right, top ≤ bottom) regardless of drag direction.
// All values are in viewport (clientX/Y) coordinates.
// ─────────────────────────────────────────────────────────────────────────────
function getDragBounds() {
  const left   = Math.min(originX, pointerX);
  const right  = Math.max(originX, pointerX);
  const top    = Math.min(originY, pointerY);
  const bottom = Math.max(originY, pointerY);
  return { left, right, top, bottom };
}

// ─────────────────────────────────────────────────────────────────────────────
// refreshDragRect()
// Repositions and resizes the #selection-box <div> to match the current drag
// rectangle. Coordinates are converted to be relative to the board element so
// the box stays aligned with the apples even if the page is scrolled.
// ─────────────────────────────────────────────────────────────────────────────
function refreshDragRect() {
  const bounds     = getDragBounds();
  const boardRect  = getBoardBounds(); // board's top-left corner in viewport coords
  // Offset from board origin so the overlay sits correctly inside #grid-container
  dragRect.style.left   = `${bounds.left   - boardRect.left}px`;
  dragRect.style.top    = `${bounds.top    - boardRect.top}px`;
  dragRect.style.width  = `${bounds.right  - bounds.left}px`;
  dragRect.style.height = `${bounds.bottom - bounds.top}px`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Mouse Event Handlers
//  These three handlers implement the drag-to-select mechanic:
//    mousedown  → start a new drag
//    mousemove  → extend the drag, highlight covered apples, show sum feedback
//    mouseup    → finish drag; if sum === 10, remove selected apples and score
// ═══════════════════════════════════════════════════════════════════════════════

function handleDragStart(e) {
  if (!isPlaying) return; // ignore clicks before the game starts
  dragging = true;
  // Record the starting corner of the drag in viewport coordinates
  originX  = e.clientX;
  originY  = e.clientY;
  pointerX = e.clientX;
  pointerY = e.clientY;
  dragRect.classList.remove('hidden'); // make the selection box visible
  refreshDragRect();
}

function handleDragMove(e) {
  if (!dragging) return; // only act while the mouse button is held
  pointerX = e.clientX;
  pointerY = e.clientY;
  refreshDragRect(); // redraw the rectangle to follow the cursor

  // Highlight every apple whose center is inside the drag rectangle and
  // compute their sum so we can give the player a visual hint.
  const bounds = getDragBounds();
  const apples = Array.from(document.querySelectorAll('.apple'));
  let total = 0;
  apples.forEach(apple => {
    if (isCovered(apple, bounds)) {
      total += parseInt(apple.dataset.value);
      apple.classList.add('selected-apple');    // CSS highlights it
    } else {
      apple.classList.remove('selected-apple'); // deselect apples no longer covered
    }
  });

  // Change border colour: red = valid selection (sum is exactly 10), blue = not yet
  dragRect.style.borderColor = total === 10 ? 'red' : 'blue';
}

function handleDragEnd(_e) {
  if (!dragging) return;
  dragging = false;
  dragRect.classList.add('hidden'); // hide the drag rectangle

  // Clear all highlight classes immediately
  document.querySelectorAll('.apple').forEach(apple => {
    apple.classList.remove('selected-apple');
  });

  // Re-evaluate which apples were inside the final selection rectangle
  const bounds   = getDragBounds();
  const apples   = Array.from(document.querySelectorAll('.apple'));
  let total      = 0;
  const picked   = [];

  apples.forEach(apple => {
    if (isCovered(apple, bounds)) {
      total += parseInt(apple.dataset.value);
      picked.push(apple);
    }
  });

  // Only remove apples when the sum is exactly 10 (the core rule of the game)
  if (total === 10 && picked.length > 0) {
    picked.forEach(apple => {
      apple.classList.add('pop'); // trigger CSS pop animation
      // After the pop animation finishes, convert the cell to an empty slot
      apple.addEventListener('animationend', () => {
        apple.classList.remove('apple', 'pop');
        apple.classList.add('empty');
        apple.textContent   = '';
        apple.dataset.value = 0; // mark as no value for future selections
      }, { once: true }); // { once: true } auto-removes the listener after it fires
    });

    // Score = number of apples removed (not their numeric values)
    addPoints(picked.length);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// launchRound()
// Resets all state and starts a fresh round:
//   • zeroes score and timer
//   • generates a new random board
//   • hides splash / result screens
//   • attaches mouse listeners
//   • starts the countdown
// ─────────────────────────────────────────────────────────────────────────────
function launchRound() {
  // Reset score display
  playerScore        = 0;
  scoreEl.textContent = playerScore;

  // Reset timer display (beginCountdown() will also do this, but we sync eagerly
  // so there's no visual flicker between resets)
  timeLeft              = GAME_DURATION;
  progressBar.style.width = "100%";
  timerLabel.textContent  = `${timeLeft}`;

  buildBoard(); // populate board with fresh random apples

  // Hide overlay screens
  splashEl.classList.add('hidden');
  modalEl.classList.add('hidden');

  // Attach drag-selection listeners to the board
  board.addEventListener('mousedown',  handleDragStart);
  board.addEventListener('mousemove',  handleDragMove);
  board.addEventListener('mouseup',    handleDragEnd);
  board.addEventListener('mouseleave', handleDragEnd); // treat leaving as releasing

  beginCountdown(); // begin the 2-minute countdown

  // Update button state to reflect active round
  isPlaying            = true;
  btnStart.disabled    = true;
  btnStart.textContent = "In Progress";

}

// ─── Event Listeners ──────────────────────────────────────────────────────────

// Start button: only starts a new round when one isn't already running.
// (The button is disabled during a round, so this guard is a safety net.)
btnStart.addEventListener('click', () => {
  if (!isPlaying) launchRound();
});

// Close button: dismisses the end-of-round result modal.
btnClose.addEventListener('click', () => {
  modalEl.classList.add('hidden');
});



// const COLUMNS = 10;
// const ROWS = 6;
// const GAME_DURATION = 60;

// let score = 0;
// let timeLeft = GAME_DURATION;
// let timer = null;
// let selected = [];

// const board = document.getElementById('grid');
// const scoreEl = document.getElementById('score');
// const timerEl = document.getElementById('time-remaining');

// function buildBoard() {
//   board.innerHTML = '';
//   for (let i = 0; i < ROWS * COLUMNS; i++) {
//     const cell = document.createElement('div');
//     cell.classList.add('apple');

//     const value = Math.floor(Math.random() * 9) + 1;
//     cell.textContent = value;
//     cell.dataset.value = value;

//     cell.addEventListener('click', () => selectCell(cell));

//     board.appendChild(cell);
//   }
// }

// function selectCell(cell) {
//   if (!cell.classList.contains('apple')) return;

//   if (cell.classList.contains('selected')) {
//     cell.classList.remove('selected');
//     selected = selected.filter(c => c !== cell);
//   } else {
//     cell.classList.add('selected');
//     selected.push(cell);
//   }

//   const sum = selected.reduce((s, c) => s + Number(c.dataset.value), 0);

//   if (sum === 10) {
//     selected.forEach(c => {
//       c.classList.remove('apple', 'selected');
//       c.textContent = '';
//     });
//     score += selected.length;
//     scoreEl.textContent = score;
//     selected = [];
//   }

//   if (sum > 10) {
//     selected.forEach(c => c.classList.remove('selected'));
//     selected = [];
//   }
// }

// function startGame() {
//   score = 0;
//   scoreEl.textContent = score;
//   buildBoard();

//   timeLeft = GAME_DURATION;
//   timerEl.textContent = timeLeft;

//   clearInterval(timer);
//   timer = setInterval(() => {
//     timeLeft--;
//     timerEl.textContent = timeLeft;

//     if (timeLeft <= 0) {
//       clearInterval(timer);
//       alert(`Game Over! Score: ${score}`);
//     }
//   }, 1000);
// }

// document.getElementById('start-button').onclick = startGame;