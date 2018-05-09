/*jshint esversion: 6 */

class Board {
  // Makes an empty board.
  constructor(width, height) {
    this.width = width;
    this.height = height;

    // The state saved for undo.
    this.state = {
      turn: "black",
      prisonersTakenBy: {black: 0, white: 0},
      grid: [],
      isLegalMove: [],
      pastGrids: []
    };

    for (let row = 0; row < height; row++) {
      this.state.grid.push(Array(width).fill(null));
    }
    for (let row = 0; row < height; row++) {
      this.state.isLegalMove.push(Array(width).fill(true));
    }
    this.state.pastGrids.push(JSON.stringify(this.state.grid));
    this.pastStates = [JSON.stringify(this.state)];
  }

  undo() {
    if (this.pastStates.length > 1) {
      this.pastStates.pop();
      this.state = JSON.parse(this.pastStates[this.pastStates.length - 1]);
    }
  }

  // Get an array of dead stones in the group of this stone.
  //
  // Returns an empty array if no stones are dead.
  getDeadGroup(x, y) {
    const allDirections = [
      {x: -1, y: 0}, {x: 1, y: 0}, {x: 0, y: -1}, {x: 0, y: 1}];

    const color = this.state.grid[x][y];
    if (!color) {
      return [];
    }

    const seen = [JSON.stringify({x, y})];
    const toCheck = [{position: {x, y}, directions: allDirections.slice()}];

    while (toCheck.length > 0) {
      const current = toCheck.pop();
      x = current.position.x;
      y = current.position.y;
      const direction = current.directions.pop();
      const next = {
        x: (x + direction.x + this.width)%this.width,
        y: (y + direction.y + this.height)%this.height
      };
      const nextColor = this.state.grid[next.x][next.y];
      if (!nextColor) {
        // Found a liberty, no stones have to die.
        return [];
      } else if (nextColor === color) {
        if (!seen.includes(JSON.stringify(next))) {
          seen.push(JSON.stringify({x: next.x, y: next.y}));
          toCheck.push({
            position: {x: next.x, y: next.y},
            directions: allDirections.slice()
          });
        }
      }
      if (current.directions.length > 0) {
        toCheck.push(current);
      }
    }
    return seen.map(JSON.parse);
  }

  populateLegalMoves() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.state.grid[x][y]) {
          this.state.isLegalMove[x][y] = false;
        } else {
          const copyBoard = new Board(this.width, this.height);
          copyBoard.state.turn = this.state.turn;
          copyBoard.state.grid = this.state.grid.map((row) => row.slice());
          copyBoard.play(x, y, false);
          if (
            this.state.pastGrids.includes(
              JSON.stringify(copyBoard.state.grid))) {
            this.state.isLegalMove[x][y] = false;
          } else {
            this.state.isLegalMove[x][y] = true;
          }
        }
      }
    }
  }

  // Play a stone at the given location.
  //
  // If the move is illegal, doesn't update this.turn.
  play(x, y, callPopulateLegalMoves = true) {
    if (this.state.isLegalMove[x][y]) {
      this.state.grid[x][y] = this.state.turn;
      for (let direction of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const neighborX = (x + direction[0] + this.width)%this.width;
        const neighborY = (y + direction[1] + this.height)%this.height;
        for (let dead of this.getDeadGroup(neighborX, neighborY)) {
          this.state.grid[dead.x][dead.y] = null;
          this.state.prisonersTakenBy[this.state.turn]++;
        }
      }
      const nextTurn = (this.state.turn == "black") ? "white" : "black";
      for (let dead of this.getDeadGroup(x, y)) {
        this.state.grid[dead.x][dead.y] = null;
        this.state.prisonersTakenBy[nextTurn]++;
      }
      this.state.turn = nextTurn;
      this.state.pastGrids.push(JSON.stringify(this.state.grid));
      if (callPopulateLegalMoves) {
        this.populateLegalMoves();
        this.pastStates.push(JSON.stringify(this.state));
      }
    }
  }
}

class View {
  constructor(canvasContext, board, sideLength) {
    this.context = canvasContext;
    this.board = board;
    this.sideLength = sideLength;
  }

  drawStone(x, y, color) {
    const stoneRadius = 0.5*this.sideLength;
    const boardPixelWidth = this.sideLength*this.board.width;
    const boardPixelHeight = this.sideLength*this.board.height;
    const grayStroke = "#666666";
    const grayColor = color === "black" ? grayStroke : "#f9f9f9";

    for (let row = 0; row < 3; ++row) {
      for (let col = 0; col < 3; ++col) {
        const centerX = (x + 0.5)*this.sideLength + row*boardPixelHeight;
        const centerY = (y + 0.5)*this.sideLength + col*boardPixelWidth;
        this.context.beginPath();
        if (row === 1 && col === 1) {
          this.context.fillStyle = color;
          this.context.strokeStyle = "black";
        } else {
          this.context.fillStyle = grayColor;
          this.context.strokeStyle = grayStroke;
        }
        this.context.arc(centerX, centerY, stoneRadius, 0, 2*Math.PI);
        this.context.fill();
        this.context.stroke();
      }
    }
  }

  drawBoard() {
    const boardPixelWidth = this.sideLength*this.board.width;
    const boardPixelHeight = this.sideLength*this.board.height;

    // Blank out the whole canvas.
    this.context.fillStyle = "white";
    this.context.fillRect(0, 0, 1000, 1000);

    // Outer dim rectangle
    this.context.fillStyle = "#ffffcc";
    this.context.fillRect(0, 0, 3*boardPixelWidth, 3*boardPixelHeight);

    // Inner bright rectangle
    this.context.fillStyle = "#ffcc00";
    this.context.fillRect(
      boardPixelWidth,
      boardPixelHeight,
      boardPixelWidth,
      boardPixelHeight);

    // Greyed out lines.
    this.context.beginPath();

    this.context.strokeStyle = "gray";

    for (let row = 0; row < 3*this.board.height; row++) {
      const y = this.sideLength/2 + row*this.sideLength;
      this.context.moveTo(0, y);
      this.context.lineTo(3*boardPixelWidth, y);
    }

    for (let col = 0; col < 3*this.board.width; col++) {
      const x = this.sideLength/2 + col*this.sideLength;
      this.context.moveTo(x, 0);
      this.context.lineTo(x, 3*boardPixelHeight);
    }

    this.context.stroke();

    // Black lines.
    this.context.beginPath();

    this.context.strokeStyle = "black";

    for (let row = 0; row < this.board.height; row++) {
      const y = boardPixelHeight + this.sideLength/2 + row*this.sideLength;
      this.context.moveTo(boardPixelWidth + 1, y);
      this.context.lineTo(2*boardPixelWidth, y);
    }

    for (let col = 0; col < this.board.width; col++) {
      const x = boardPixelWidth + this.sideLength/2 + col*this.sideLength;
      this.context.moveTo(x, boardPixelHeight + 1);
      this.context.lineTo(x, 2*boardPixelHeight);
    }

    this.context.stroke();

    // Stones.
    for (let y = 0; y < this.board.height; y++) {
      for (let x = 0; x < this.board.width; x++) {
        const color = this.board.state.grid[x][y];
        if (color) {
          this.drawStone(x, y, color);
        }
      }
    }

    // Display prisoner count.
    const blackScoreSpan = document.getElementById("prisoners_taken_by_black");
    blackScoreSpan.innerHTML = this.board.state.prisonersTakenBy.black;
    const whiteScoreSpan = document.getElementById("prisoners_taken_by_white");
    whiteScoreSpan.innerHTML = this.board.state.prisonersTakenBy.white;
  }

  onCanvasMouseClickCallback(mouseEvent) {
    const boardPixelWidth = this.sideLength*this.board.width;
    const boardPixelHeight = this.sideLength*this.board.height;

    const gridOffsetX = (
      Math.floor((mouseEvent.offsetX - boardPixelWidth)/this.sideLength));
    const gridOffsetY = (
      Math.floor((mouseEvent.offsetY - boardPixelHeight)/this.sideLength));

    if (
      gridOffsetX >= 0 && gridOffsetX < this.board.width &&
      gridOffsetY >= 0 && gridOffsetY < this.board.height &&
      this.board.state.isLegalMove[gridOffsetX][gridOffsetY]
    ) {
      this.board.play(gridOffsetX, gridOffsetY);
    }
    this.drawBoard();
  }

  onCanvasMouseMoveCallback(mouseEvent) {
    this.drawBoard();

    const boardPixelWidth = this.sideLength*this.board.width;
    const boardPixelHeight = this.sideLength*this.board.height;

    const gridOffsetX = (
      Math.floor((mouseEvent.offsetX - boardPixelWidth)/this.sideLength));
    const gridOffsetY = (
      Math.floor((mouseEvent.offsetY - boardPixelHeight)/this.sideLength));

    if (
      gridOffsetX >= 0 && gridOffsetX < this.board.width &&
      gridOffsetY >= 0 && gridOffsetY < this.board.height &&
      this.board.state.isLegalMove[gridOffsetX][gridOffsetY]
    ) {
      this.drawStone(gridOffsetX, gridOffsetY, this.board.state.turn);
    }
  }

  onUndoMouseClickCallback(mouseEvent) {
    this.board.undo();
    this.drawBoard();
  }
}

window.onload = function() {
  const canvas = document.getElementById("play_area");
  const context = canvas.getContext("2d");

  const board = new Board(13, 13);
  const view = new View(context, board, 20);

  view.drawBoard();
  canvas.addEventListener(
    "mousemove", (mouseEvent) => view.onCanvasMouseMoveCallback(mouseEvent));
  canvas.addEventListener(
    "click", (mouseEvent) => view.onCanvasMouseClickCallback(mouseEvent));

  const undoButton = document.getElementById("undo_button");
  undoButton.addEventListener(
    "click", (mouseEvent) => view.onUndoMouseClickCallback(mouseEvent));
};

