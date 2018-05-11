/*jshint esversion: 6 */

function getConstantMatrix({width, height}, value) {
  return new Array(height).fill(null).map(() => new Array(width).fill(value));
}

class TorusTopology {
  constructor({width, height}) {
    this.size = {x: width, y: height};
  }

  normalizeCoords({x, y}) {
    return {x: (x + this.size.x)%this.size.x, y: (y + this.size.y)%this.size.y};
  }

  getOtherCoords({x, y}) {
    let result = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (row !== 1 || col !== 1) {
          result.push(
            {x: x + (col - 1)*this.size.x, y: y + (row - 1)*this.size.y});
        }
      }
    }
    return result;
  }
}

class CylinderTopology {
  constructor({width, height}) {
    this.size = {x: width, y: height};
  }

  normalizeCoords({x, y}) {
    if (y < 0 || y >= this.size.y) {
      return null;
    }
    return {x: (x + this.size.x)%this.size.x, y};
  }

  getOtherCoords({x, y}) {
    return [{x: x - this.size.x, y}, {x: x + this.size.x, y}];
  }
}

class MobiusStripTopology {
  constructor({width, height}) {
    this.size = {x: width, y: height};
  }

  normalizeCoords({x, y}) {
    if (y < 0 || y >= this.size.y) {
      return null;
    } else if (x < 0 || x >= this.size.x) {
      return {x: (x + this.size.x)%this.size.x, y: this.size.y - 1 - y};
    } else {
      return {x, y};
    }
  }

  getOtherCoords({x, y}) {
    let flipY = this.size.y - 1 - y;
    return [{x: x - this.size.x, y: flipY}, {x: x + this.size.x, y: flipY}];
  }
}

class GameState {
  constructor({width, height}) {
    this.turn = "black";
    this.prisonersTakenBy = {black: 0, white: 0};
    this.grid = getConstantMatrix({width, height}, null);
    this.isLegalMove = getConstantMatrix({width, height}, true);
    this.pastGrids = [JSON.stringify(this.grid)];
  }
}

class Board {
  constructor(topology) {
    this.topology = topology;
    this.size = topology.size;
    this.state = 
      new GameState({width: topology.size.x, height: topology.size.y});
    this.pastStates = [JSON.stringify(this.state)];
  }

  // Get an array of dead stones in the group of this stone.
  //
  // Returns an empty array if no stones are dead.
  getDeadGroup({x, y}) {
    let allDirections = [
      {dx: -1, dy: 0}, {dx: 1, dy: 0}, {dx: 0, dy: -1}, {dx: 0, dy: 1}];

    const color = this.state.grid[x][y];
    if (!color) {
      return [];
    }

    let seen = [JSON.stringify({x, y})];
    let toCheck = [{position: {x, y}, directions: allDirections.slice()}];

    while (toCheck.length > 0) {
      let current = toCheck.pop();
      x = current.position.x;
      y = current.position.y;
      let {dx, dy} = current.directions.pop();
      let next = this.topology.normalizeCoords({x: x + dx, y: y + dy});
      if (next) {
        let nextColor = this.state.grid[next.x][next.y];
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
      }
      if (current.directions.length > 0) {
        toCheck.push(current);
      }
    }
    return seen.map(JSON.parse);
  }

  populateLegalMoves() {
    for (let y = 0; y < this.size.y; y++) {
      for (let x = 0; x < this.size.x; x++) {
        if (this.state.grid[x][y]) {
          this.state.isLegalMove[x][y] = false;
        } else {
          let copyBoard = new Board(this.topology);
          copyBoard.state.turn = this.state.turn;
          copyBoard.state.grid = this.state.grid.map((row) => row.slice());
          copyBoard.play({x, y}, false);
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
  // If the move is illegal, this function doesn't update this.turn.
  play({x, y}, callPopulateLegalMoves = true) {
    if (this.state.isLegalMove[x][y]) {
      this.state.grid[x][y] = this.state.turn;
      for (let [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        let neighbor = this.topology.normalizeCoords({x: x + dx, y: y + dy});
        if (neighbor) {
          for (let dead of this.getDeadGroup(neighbor)) {
            this.state.grid[dead.x][dead.y] = null;
            this.state.prisonersTakenBy[this.state.turn]++;
          }
        }
      }
      const nextTurn = (this.state.turn == "black") ? "white" : "black";
      for (let dead of this.getDeadGroup({x, y})) {
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

  undo() {
    if (this.pastStates.length > 1) {
      this.pastStates.pop();
      this.state =
        JSON.parse(this.pastStates[this.pastStates.length - 1]);
    }
  }
}

class View {
  constructor({canvasContext, board, sideLength}) {
    this.context = canvasContext;
    this.board = board;
    this.sideLength = sideLength;
    this.offset = {x: 0, y: 0};
  }

  drawStone(x, y, color) {
    x = (x + this.offset.x)%this.board.size.x;
    y = (y + this.offset.y)%this.board.size.y;

    const stoneRadius = 0.5*this.sideLength;
    const boardPixelWidth = this.sideLength*this.board.size.x;
    const boardPixelHeight = this.sideLength*this.board.size.y;
    const grayStroke = "#666666";
    const grayColor = color === "black" ? grayStroke : "#f9f9f9";

    let draw = ({x, y}) => {
      this.context.beginPath();
      let centerX = (x + 0.5)*this.sideLength + boardPixelHeight;
      let centerY = (y + 0.5)*this.sideLength + boardPixelWidth;
      this.context.arc(centerX, centerY, stoneRadius, 0, 2*Math.PI);
      this.context.fill();
      this.context.stroke();
    };

    this.context.fillStyle = grayColor;
    this.context.strokeStyle = grayStroke;
    for (let other of this.board.topology.getOtherCoords({x, y})) {
      draw(other);
    }
    this.context.fillStyle = color;
    this.context.strokeStyle = "black";
    draw({x, y});
  }

  drawBoard() {
    const boardPixelWidth = this.sideLength*this.board.size.x;
    const boardPixelHeight = this.sideLength*this.board.size.y;

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

    for (let row = 0; row < 3*this.board.size.y; row++) {
      const y = this.sideLength/2 + row*this.sideLength;
      this.context.moveTo(0, y);
      this.context.lineTo(3*boardPixelWidth, y);
    }

    for (let col = 0; col < 3*this.board.size.x; col++) {
      const x = this.sideLength/2 + col*this.sideLength;
      this.context.moveTo(x, 0);
      this.context.lineTo(x, 3*boardPixelHeight);
    }

    this.context.stroke();

    // Black lines.
    this.context.beginPath();

    this.context.strokeStyle = "black";

    for (let row = 0; row < this.board.size.y; row++) {
      const y = boardPixelHeight + this.sideLength/2 + row*this.sideLength;
      this.context.moveTo(boardPixelWidth + 1, y);
      this.context.lineTo(2*boardPixelWidth, y);
    }

    for (let col = 0; col < this.board.size.x; col++) {
      const x = boardPixelWidth + this.sideLength/2 + col*this.sideLength;
      this.context.moveTo(x, boardPixelHeight + 1);
      this.context.lineTo(x, 2*boardPixelHeight);
    }

    this.context.stroke();

    // Stones.
    for (let y = 0; y < this.board.size.y; y++) {
      for (let x = 0; x < this.board.size.x; x++) {
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
    const boardPixelWidth = this.sideLength*this.board.size.x;
    const boardPixelHeight = this.sideLength*this.board.size.y;

    const gridOffsetX = (
      Math.floor((mouseEvent.offsetX - boardPixelWidth)/this.sideLength));
    const gridOffsetY = (
      Math.floor((mouseEvent.offsetY - boardPixelHeight)/this.sideLength));

    const x = (
      (gridOffsetX - this.offset.x + this.board.size.x)%
      this.board.size.x);
    const y = (
      (gridOffsetY - this.offset.y + this.board.size.y)%
      this.board.size.y);

    if (
      gridOffsetX >= 0 && gridOffsetX < this.board.size.x &&
      gridOffsetY >= 0 && gridOffsetY < this.board.size.y &&
      this.board.state.isLegalMove[x][y]
    ) {
      this.board.play({x, y});
    }
    this.drawBoard();
  }

  onCanvasMouseMoveCallback(mouseEvent) {
    this.drawBoard();

    const boardPixelWidth = this.sideLength*this.board.size.x;
    const boardPixelHeight = this.sideLength*this.board.size.y;

    const gridOffsetX = (
      Math.floor((mouseEvent.offsetX - boardPixelWidth)/this.sideLength));
    const gridOffsetY = (
      Math.floor((mouseEvent.offsetY - boardPixelHeight)/this.sideLength));

    const x = (
      (gridOffsetX - this.offset.x + this.board.size.x)%
      this.board.size.x);
    const y = (
      (gridOffsetY - this.offset.y + this.board.size.y)%
      this.board.size.y);

    if (
      gridOffsetX >= 0 && gridOffsetX < this.board.size.x &&
      gridOffsetY >= 0 && gridOffsetY < this.board.size.y &&
      this.board.state.isLegalMove[x][y]
    ) {
      this.drawStone(x, y, this.board.state.turn);
    }
  }

  onUndoMouseClickCallback(mouseEvent) {
    this.board.undo();
    this.drawBoard();
  }

  onKeyDownCallback(keyboardEvent) {
    const directions = new Map([
      ["ArrowLeft", {dx: -1, dy: 0}],
      ["ArrowRight", {dx: 1, dy: 0}],
      ["ArrowUp", {dx: 0, dy: -1}],
      ["ArrowDown", {dx: 0, dy: 1}]
    ]);

    if (directions.has(keyboardEvent.key)) {
      const {dx, dy} = directions.get(keyboardEvent.key);
      this.offset.x = (
        (this.offset.x + this.board.size.x + dx)%this.board.size.x);
      this.offset.y = (
        (this.offset.y + this.board.size.y + dy)%this.board.size.y);
      this.drawBoard();
      keyboardEvent.preventDefault();
    }
  }
}

window.onload = function() {
  let canvas = document.getElementById("play_area");
  let context = canvas.getContext("2d");

  let topology = new MobiusStripTopology({width: 13, height: 13});
  let board = new Board(topology);
  let view = new View({canvasContext: context, board, sideLength: 20});

  view.drawBoard();
  canvas.addEventListener(
    "mousemove", (mouseEvent) => view.onCanvasMouseMoveCallback(mouseEvent));
  canvas.addEventListener(
    "click", (mouseEvent) => view.onCanvasMouseClickCallback(mouseEvent));

  const undoButton = document.getElementById("undo_button");
  undoButton.addEventListener(
    "click", (mouseEvent) => view.onUndoMouseClickCallback(mouseEvent));

  window.addEventListener(
    "keydown", (keyboardEvent) => view.onKeyDownCallback(keyboardEvent));
};

