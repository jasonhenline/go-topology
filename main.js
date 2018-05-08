class Board {
  // Makes an empty board.
  constructor(width, height) {
    this.turn = "black";
    this.width = width;
    this.height = height;
    this.grid = [];
    for (let row = 0; row < height; row++) {
      this.grid.push(Array(width).fill(null));
    }
  }

  // Play a stone at the given location.
  //
  // If the move is illegal, doesn't update this.turn.
  play(x, y) {
    // TODO(mikewallstedt): Do a real implementation.

    if (!this.grid[x][y]) {
      this.grid[x][y] = this.turn
      this.turn = (this.turn === "black") ? "white" : "black";
    }
  }
}

class View {
  constructor(canvasContext, board, sideLength) {
    this.context = canvasContext;
    this.board = board;
    this.sideLength = sideLength;
  }

  drawBoard() {

    let boardPixelWidth = this.sideLength*this.board.width;
    let boardPixelHeight = this.sideLength*this.board.height;

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
      let y = this.sideLength/2 + row*this.sideLength;
      this.context.moveTo(0, y);
      this.context.lineTo(3*boardPixelWidth, y);
    }

    for (let col = 0; col < 3*this.board.width; col++) {
      let x = this.sideLength/2 + col*this.sideLength;
      this.context.moveTo(x, 0);
      this.context.lineTo(x, 3*boardPixelHeight);
    }

    this.context.stroke();

    // Black lines.
    this.context.beginPath();

    this.context.strokeStyle = "black";

    for (let row = 0; row < this.board.height; row++) {
      let y = boardPixelHeight + this.sideLength/2 + row*this.sideLength;
      this.context.moveTo(boardPixelWidth + 1, y);
      this.context.lineTo(2*boardPixelWidth, y);
    }

    for (let col = 0; col < this.board.width; col++) {
      let x = boardPixelWidth + this.sideLength/2 + col*this.sideLength;
      this.context.moveTo(x, boardPixelHeight + 1);
      this.context.lineTo(x, 2*boardPixelHeight);
    }

    this.context.stroke();

    // Stones.
    let stoneRadius = 0.5*this.sideLength;
    for (let y = 0; y < this.board.height; y++) {
      for (let x = 0; x < this.board.width; x++) {
        let color = this.board.grid[x][y];
        if (color) {
          for (let row = 0; row < 3; ++row) {
            for (let col = 0; col < 3; ++col) {
              let centerX = (x + 0.5)*this.sideLength + row*boardPixelHeight;
              let centerY = (y + 0.5)*this.sideLength + col*boardPixelWidth;
              this.context.beginPath();
              this.context.fillStyle = color;
              this.context.strokeStyle = "black";
              this.context.arc(centerX, centerY, stoneRadius, 0, 2*Math.PI);
              this.context.fill();
              this.context.stroke();
            }
          }
        }
      }
    }
  }

  onMouseClickCallback(mouseEvent) {
    let boardPixelWidth = this.sideLength*this.board.width;
    let boardPixelHeight = this.sideLength*this.board.height;

    let gridOffsetX = (
      Math.floor((mouseEvent.offsetX - boardPixelWidth)/this.sideLength));
    let gridOffsetY = (
      Math.floor((mouseEvent.offsetY - boardPixelHeight)/this.sideLength));

    let stoneRadius = 0.5*this.sideLength;

    if (
      gridOffsetX >= 0 && gridOffsetX < this.board.width &&
      gridOffsetY >= 0 && gridOffsetY < this.board.height &&
      !this.board.grid[gridOffsetX][gridOffsetY]
    ) {
      this.board.play(gridOffsetX, gridOffsetY);
    }
    this.drawBoard();
  }

  onMouseMoveCallback(mouseEvent) {
    this.drawBoard();

    let boardPixelWidth = this.sideLength*this.board.width;
    let boardPixelHeight = this.sideLength*this.board.height;

    let gridOffsetX = (
      Math.floor((mouseEvent.offsetX - boardPixelWidth)/this.sideLength));
    let gridOffsetY = (
      Math.floor((mouseEvent.offsetY - boardPixelHeight)/this.sideLength));

    let stoneRadius = 0.5*this.sideLength;

    if (
      gridOffsetX >= 0 && gridOffsetX < this.board.width &&
      gridOffsetY >= 0 && gridOffsetY < this.board.height &&
      !this.board.grid[gridOffsetX][gridOffsetY]
    ) {
      for (let row = 0; row < 3; ++row) {
        for (let col = 0; col < 3; ++col) {
          let centerX = (
            (gridOffsetX + 0.5)*this.sideLength + row*boardPixelHeight);
          let centerY = (
            (gridOffsetY + 0.5)*this.sideLength + col*boardPixelWidth);
          this.context.beginPath();
          this.context.fillStyle = this.board.turn;
          this.context.strokeStyle = "black";
          this.context.arc(centerX, centerY, stoneRadius, 0, 2*Math.PI);
          this.context.fill();
          this.context.stroke();
        }
      }
    }
  }
}

window.onload = function() {
  let canvas = document.getElementById("play_area");
  let context = canvas.getContext("2d");

  let board = new Board(13, 13);
  let view = new View(context, board, 20);

  view.drawBoard();
  canvas.addEventListener(
    "mousemove", (mouseEvent) => view.onMouseMoveCallback(mouseEvent));
  canvas.addEventListener(
    "click", (mouseEvent) => view.onMouseClickCallback(mouseEvent));
}

