class Board {
  // Makes an empty board.
  constructor(width, height) {
    this.turn = "black";
    this.width = width;
    this.height = height;
    this.prisoners = {"black": 0, "white": 0};
    this.grid = [];
    for (let row = 0; row < height; row++) {
      this.grid.push(Array(width).fill(null));
    }
  }

  // Get an array of dead stones in the group of this stone.
  //
  // Returns an empty array if no stones are dead.
  getDeadGroup(x, y) {
    console.log("called getDeadGroup");
    const allDirections = [
      {x: -1, y: 0}, {x: 1, y: 0}, {x: 0, y: -1}, {x: 0, y: 1}];

    let color = this.grid[x][y];
    if (!color) {
      return [];
    }

    let seen = [{x, y}];
    let toCheck = [{position: {x, y}, directions: allDirections.slice()}];

    while (toCheck.length > 0) {
      console.log("seen =", seen);
      console.log("toCheck =", toCheck);
      let current = toCheck.pop();
      console.log("current =", current);
      x = current.position.x;
      y = current.position.y;
      let direction = current.directions.pop();
      let next = {
        x: (x + direction.x + this.width)%this.width,
        y: (y + direction.y + this.height)%this.height
      };
      console.log("next =", next);
      let nextColor = this.grid[next.x][next.y];
      if (!nextColor) {
        // Found a liberty, no stones have to die.
        return [];
      } else if (nextColor === color) {
        if (seen.findIndex(({x, y}) => x === next.x && y === next.y) === -1) {
          seen.push({x: next.x, y: next.y});
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
    return seen;
  }

  // Play a stone at the given location.
  //
  // If the move is illegal, doesn't update this.turn.
  play(x, y) {
    if (!this.grid[x][y]) {
      this.grid[x][y] = this.turn
      for (let direction of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        let neighborX = (x + direction[0] + this.width)%this.width;
        let neighborY = (y + direction[1] + this.height)%this.height;
        console.log("neighbor =", neighborX, neighborY);
        for (let dead of this.getDeadGroup(neighborX, neighborY)) {
          this.grid[dead.x][dead.y] = null;
          this.prisoners[this.turn]++;
        }
      }
      let nextTurn = (this.turn == "black") ? "white" : "black";
      for (let dead of this.getDeadGroup(x, y)) {
        this.grid[dead.x][dead.y] = null;
        this.prisoners[nextTurn]++;
      }
      this.turn = nextTurn;
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

    // Display prisoner count.
    let blackPrisonerSpan = document.getElementById("black_prisoners");
    blackPrisonerSpan.innerHTML = this.board.prisoners["black"];
    let whitePrisonerSpan = document.getElementById("white_prisoners");
    whitePrisonerSpan.innerHTML = this.board.prisoners["white"];
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

