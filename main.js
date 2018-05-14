// My namespace to prevent polluting the global namespace
// (other than this binding).
JTH = {};

JTH.getConstantMatrix = function({width, height}, value) {
  let result = [];
  for (let i = 0; i < height; i++) {
    let row = [];
    for (let j = 0; j < width; j++) {
      row.push(value);
    }
    result.push(row);
  }
  return result;
};

JTH.getTorusTopology = function({width, height}) {
  let size = {x: width, y: height};

  let normalizeCoords = function({x, y}) {
    return {x: (x + size.x)%size.x, y: (y + size.y)%size.y};
  };

  let getOtherCoords = function({x, y}) {
    let result = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (row !== 1 || col !== 1) {
          result.push(
            {x: x + (col - 1)*size.x, y: y + (row - 1)*size.y});
        }
      }
    }
    return result;
  };

  let getExtendDirections = function() {
    return ["x", "y"];
  };

  return {
    size,
    normalizeCoords,
    getOtherCoords,
    getExtendDirections
  };
};

JTH.getCylinderTopology = function({width, height}) {
  let size = {x: width, y: height};

  let normalizeCoords = function({x, y}) {
    if (y < 0 || y >= size.y) {
      return null;
    }
    return {x: (x + size.x)%size.x, y};
  };

  let getOtherCoords = function({x, y}) {
    return [{x: x - size.x, y}, {x: x + size.x, y}];
  };

  let getExtendDirections = function() {
    return ["x"];
  };

  return {
    size,
    normalizeCoords,
    getOtherCoords,
    getExtendDirections
  };
};

JTH.getMobiusStripTopology = function({width, height}) {
  let size = {x: width, y: height};

  let normalizeCoords = function({x, y}) {
    if (y < 0 || y >= size.y) {
      return null;
    } else if (x < 0 || x >= size.x) {
      return {x: (x + size.x)%size.x, y: size.y - 1 - y};
    } else {
      return {x, y};
    }
  }

  let getOtherCoords = function({x, y}) {
    let flipY = size.y - 1 - y;
    return [{x: x - size.x, y: flipY}, {x: x + size.x, y: flipY}];
  }

  let getExtendDirections = function() {
    return ["x"];
  }

  return {
    size,
    normalizeCoords,
    getOtherCoords,
    getExtendDirections
  };
};

JTH.getGameState = function({width, height}) {
  let grid = JTH.getConstantMatrix({width, height}, null)
  return {
    turn: "black",
    prisonersTakenBy: {black: 0, white: 0},
    grid,
    isLegalMove: JTH.getConstantMatrix({width, height}, true),
    pastGrids: [JSON.stringify(grid)]
  };
};

JTH.getBoard = function(topology) {
  // All the directions you can move to check for liberties.
  let allDirections = [
    {dx: -1, dy: 0}, {dx: 1, dy: 0}, {dx: 0, dy: -1}, {dx: 0, dy: 1}];

  let size = topology.size;

  let state =
    JTH.getGameState({width: topology.size.x, height: topology.size.y});

  let pastStates = [JSON.stringify(state)];

  // Get an array of dead stones in the group of this stone.
  //
  // Returns an empty array if no stones are dead.
  let getDeadGroup = function({x, y}) {
    const color = state.grid[x][y];
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
      let next = topology.normalizeCoords({x: x + dx, y: y + dy});
      if (next) {
        let nextColor = state.grid[next.x][next.y];
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
  };

  let populateLegalMoves = function() {
    for (let y = 0; y < size.y; y++) {
      for (let x = 0; x < size.x; x++) {
        if (state.grid[x][y]) {
          state.isLegalMove[x][y] = false;
        } else {
          let copyBoard = JTH.getBoard(topology);
          copyBoard.state.turn = state.turn;
          copyBoard.state.grid = state.grid.map((row) => row.slice());
          copyBoard.play({x, y}, false);
          if (
            state.pastGrids.includes(
              JSON.stringify(copyBoard.state.grid))) {
            state.isLegalMove[x][y] = false;
          } else {
            state.isLegalMove[x][y] = true;
          }
        }
      }
    }
  };

  // Play a stone at the given location.
  //
  // If the move is illegal, this function doesn't update turn.
  let play = function({x, y}, callPopulateLegalMoves = true) {
    if (state.isLegalMove[x][y]) {
      state.grid[x][y] = state.turn;
      for (let [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        let neighbor = topology.normalizeCoords({x: x + dx, y: y + dy});
        if (neighbor) {
          for (let dead of getDeadGroup(neighbor)) {
            state.grid[dead.x][dead.y] = null;
            state.prisonersTakenBy[state.turn]++;
          }
        }
      }
      const nextTurn = (state.turn == "black") ? "white" : "black";
      for (let dead of getDeadGroup({x, y})) {
        state.grid[dead.x][dead.y] = null;
        state.prisonersTakenBy[nextTurn]++;
      }
      state.turn = nextTurn;
      state.pastGrids.push(JSON.stringify(state.grid));
      if (callPopulateLegalMoves) {
        populateLegalMoves();
        pastStates.push(JSON.stringify(state));
      }
    }
  };

  let undo = function() {
    if (pastStates.length > 1) {
      pastStates.pop();
      state = JSON.parse(pastStates[pastStates.length - 1]);
    }
  };

  return {
    topology,
    size,
    state,
    play,
    undo
  };
};

JTH.getView = function({canvasContext, board, sideLength}) {
  let offset = {x: 0, y: 0};
  let context = canvasContext;

  const stoneRadius = 0.5*sideLength;
  const boardPixelWidth = sideLength*board.size.x;
  const boardPixelHeight = sideLength*board.size.y;
  const grayStroke = "#666666";

  let drawStone = function(x, y, color) {
    let grayColor = color === "black" ? grayStroke : "#f9f9f9";

    x = (x + offset.x)%board.size.x;
    y = (y + offset.y)%board.size.y;

    let draw = ({x, y}) => {
      context.beginPath();
      let centerX = (x + 0.5)*sideLength + boardPixelHeight;
      let centerY = (y + 0.5)*sideLength + boardPixelWidth;
      context.arc(centerX, centerY, stoneRadius, 0, 2*Math.PI);
      context.fill();
      context.stroke();
    };

    context.fillStyle = grayColor;
    context.strokeStyle = grayStroke;
    for (let other of board.topology.getOtherCoords({x, y})) {
      draw(other);
    }
    context.fillStyle = color;
    context.strokeStyle = "black";
    draw({x, y});
  };

  let drawBoard = function() {
    let extendDirections = board.topology.getExtendDirections();
    const extendsX = extendDirections.includes("x");
    const extendsY = extendDirections.includes("y");

    // Blank out the whole canvas.
    context.fillStyle = "white";
    context.fillRect(0, 0, 1000, 1000);

    // Outer dim rectangle
    context.fillStyle = "#ffffcc";
    context.fillRect(0, 0, 3*boardPixelWidth, 3*boardPixelHeight);

    // Inner bright rectangle
    context.fillStyle = "#ffcc00";
    context.fillRect(
      boardPixelWidth,
      boardPixelHeight,
      boardPixelWidth,
      boardPixelHeight);

    // Greyed out lines.
    context.beginPath();

    context.strokeStyle = "gray";

    let rowLower = (extendsY ? 0 : 1)*board.size.y;
    let rowUpper = (extendsY ? 3 : 2)*board.size.y;
    let colLower = (extendsX ? 0 : 1)*board.size.x;
    let colUpper = (extendsX ? 3 : 2)*board.size.x;
    let yFudge = extendsY ? 0 : 0.5;
    let xFudge = extendsX ? 0 : 0.5;

    for (let row = rowLower; row < rowUpper; row++) {
      const y = sideLength/2 + row*sideLength;
      context.moveTo((colLower + xFudge)*sideLength, y);
      context.lineTo((colUpper - xFudge)*sideLength, y);
    }

    for (let col = colLower; col < colUpper; col++) {
      const x = sideLength/2 + col*sideLength;
      context.moveTo(x, (rowLower + yFudge)*sideLength);
      context.lineTo(x, (rowUpper - yFudge)*sideLength);
    }

    context.stroke();

    // Black lines.
    context.beginPath();

    context.strokeStyle = "black";

    for (let row = 0; row < board.size.y; row++) {
      const y = boardPixelHeight + sideLength/2 + row*sideLength;
      context.moveTo(boardPixelWidth + 1 + xFudge*sideLength, y);
      context.lineTo(2*boardPixelWidth - xFudge*sideLength, y);
    }

    for (let col = 0; col < board.size.x; col++) {
      const x = boardPixelWidth + sideLength/2 + col*sideLength;
      context.moveTo(x, boardPixelHeight + 1 + yFudge*sideLength);
      context.lineTo(x, 2*boardPixelHeight - yFudge*sideLength);
    }

    context.stroke();

    // Stones.
    for (let y = 0; y < board.size.y; y++) {
      for (let x = 0; x < board.size.x; x++) {
        const color = board.state.grid[x][y];
        if (color) {
          drawStone(x, y, color);
        }
      }
    }

    // Display prisoner count.
    const blackScoreSpan = document.getElementById("prisoners_taken_by_black");
    blackScoreSpan.innerHTML = board.state.prisonersTakenBy.black;
    const whiteScoreSpan = document.getElementById("prisoners_taken_by_white");
    whiteScoreSpan.innerHTML = board.state.prisonersTakenBy.white;
  };

  let onCanvasMouseClickCallback = function(mouseEvent) {
    const gridOffsetX = (
      Math.floor((mouseEvent.offsetX - boardPixelWidth)/sideLength));
    const gridOffsetY = (
      Math.floor((mouseEvent.offsetY - boardPixelHeight)/sideLength));

    const x = (gridOffsetX - offset.x + board.size.x)% board.size.x;
    const y = (gridOffsetY - offset.y + board.size.y)% board.size.y;

    if (
      gridOffsetX >= 0 && gridOffsetX < board.size.x &&
      gridOffsetY >= 0 && gridOffsetY < board.size.y &&
      board.state.isLegalMove[x][y]
    ) {
      board.play({x, y});
    }
    drawBoard();
  };

  let onCanvasMouseMoveCallback = function(mouseEvent) {
    drawBoard();

    const gridOffsetX = (
      Math.floor((mouseEvent.offsetX - boardPixelWidth)/sideLength));
    const gridOffsetY = (
      Math.floor((mouseEvent.offsetY - boardPixelHeight)/sideLength));

    const x = (gridOffsetX - offset.x + board.size.x)%board.size.x;
    const y = (gridOffsetY - offset.y + board.size.y)%board.size.y;

    if (
      gridOffsetX >= 0 && gridOffsetX < board.size.x &&
      gridOffsetY >= 0 && gridOffsetY < board.size.y &&
      board.state.isLegalMove[x][y]
    ) {
      drawStone(x, y, board.state.turn);
    }
  };

  let onUndoMouseClickCallback = function(mouseEvent) {
    board.undo();
    drawBoard();
  };


  let directionPairs = {
    x: [["ArrowLeft", {dx: -1, dy: 0}],
      ["ArrowRight", {dx: 1, dy: 0}]],
    y: [["ArrowUp", {dx: 0, dy: -1}],
      ["ArrowDown", {dx: 0, dy: 1}]]
  };

  let keyToDirectionMap = Object.create(null);
  for (let direction of board.topology.getExtendDirections()) {
    for (let [key, dirs] of directionPairs[direction]) {
      keyToDirectionMap[key] = dirs;
    }
  }

  let onKeyDownCallback = function(keyboardEvent) {
    if (keyToDirectionMap[keyboardEvent.key]) {
      const {dx, dy} = keyToDirectionMap[keyboardEvent.key];
      offset.x = (offset.x + board.size.x + dx)%board.size.x;
      offset.y = (offset.y + board.size.y + dy)%board.size.y;
      drawBoard();
      keyboardEvent.preventDefault();
    }
  };

  return {
    drawBoard,
    onCanvasMouseClickCallback,
    onCanvasMouseMoveCallback,
    onUndoMouseClickCallback,
    onKeyDownCallback
  };
};

window.onload = function() {
  let canvas = document.getElementById("play_area");
  let context = canvas.getContext("2d");

  let topology = JTH.getCylinderTopology({width: 13, height: 13});
  let board = JTH.getBoard(topology);
  let view = JTH.getView({canvasContext: context, board, sideLength: 20});

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

