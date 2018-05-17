(function() {
  "use strict";

  // Mod operator that handles negative numerators correctly.
  let mod = function(n, d) {
    let r = n % d;
    return r >= 0 ? r : r + d;
  };

  // Make a matrix containing all the same value.
  let getConstantMatrix = function({width, height}, value) {
    let result = [];
    for (let i = 0; i < width; i++) {
      let row = [];
      for (let j = 0; j < height; j++) {
        row.push(value);
      }
      result.push(row);
    }
    return result;
  };

  let getCylinderTopology = function({width, height}) {
    let size = {x: width, y: height};

    let normalizeCoords = function({x, y}) {
      if (y < 0 || y >= size.y) {
        return null;
      }
      return {x: mod(x, size.x), y};
    };

    let getExtendDirections = function() {
      return ["x"];
    };

    return {
      size,
      normalizeCoords,
      getExtendDirections
    };
  };

  let getTorusTopology = function({width, height}) {
    let size = {x: width, y: height};

    let normalizeCoords = function({x, y}) {
      return {x: mod(x, size.x), y: mod(y, size.y)};
    };

    let getExtendDirections = function() {
      return ["x", "y"];
    };

    return {
      size,
      normalizeCoords,
      getExtendDirections
    };
  };

  let getMobiusStripTopology = function({width, height}) {
    let size = {x: width, y: height};

    let normalizeCoords = function({x, y}) {
      let fullX = mod(x, 2*size.x);
      if (fullX < size.x) {
        return {x: fullX, y: y};
      } else {
        return {x: fullX - size.x, y: size.y - 1 - y};
      }
    };

    let getExtendDirections = function() {
      return ["x"];
    };

    return {
      size,
      normalizeCoords,
      getExtendDirections
    };
  };

  let getKleinBottleTopology = function({width, height}) {
    let size = {x: width, y: height};

    let normalizeCoords = function({x, y}) {
      let fullX = mod(x, 2*size.x);
      if (fullX < size.x) {
        return {x: fullX, y: mod(y, size.y)};
      } else {
        return {x: fullX - size.x, y: mod(size.y - 1 - y, size.y)};
      }
    };

    let getExtendDirections = function() {
      return ["x", "y"];
    };

    return {
      size,
      normalizeCoords,
      getExtendDirections
    };
  };

  let getGameState = function({width, height}) {
    let grid = getConstantMatrix({width, height}, null);
    return {
      turn: "black",
      prisonersTakenBy: {black: 0, white: 0},
      grid,
      isLegalMove: getConstantMatrix({width, height}, true),
      pastGrids: [JSON.stringify(grid)]
    };
  };

  let getBoard = function(topology) {
    // All the directions you can move to check for liberties.
    let allDirections =
      [{dx: -1, dy: 0}, {dx: 1, dy: 0}, {dx: 0, dy: -1}, {dx: 0, dy: 1}];

    let size = topology.size;

    let state =
      getGameState({width: topology.size.x, height: topology.size.y});

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
            let copyBoard = getBoard(topology);
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
        let lastState = JSON.parse(pastStates[pastStates.length - 1]);
        for (let key in lastState) {
          if (lastState.hasOwnProperty(key)) {
            state[key] = lastState[key];
          }
        }
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

  let getView = function({canvas, board, sideLength}) {
    let offset = {x: 0, y: 0};
    let context = canvas.getContext("2d");

    const stoneRadius = 0.5*sideLength;
    const boardPixelWidth = sideLength*board.size.x;
    const boardPixelHeight = sideLength*board.size.y;
    let grayFill = {
      black: "#666666",
      white: "#f9f9f9"
    };
    let grayStroke = {
      black: "#666666",
      white: "#666666"
    };
    let extendDirections = board.topology.getExtendDirections();
    const extendsX = extendDirections.includes("x");
    const extendsY = extendDirections.includes("y");

    canvas.setAttribute("width", (extendsX ? 3 : 1)*boardPixelWidth);
    canvas.setAttribute("height", (extendsY ? 3 : 1)*boardPixelHeight);

    // {x, y} are the apparent coordinates of the stone in the (shadow) board.
    //
    // {row, col} are the coordinates of the board itself among the shadow
    // boards.
    let drawSingleStone = function(
        {x, y}, {row, col}, {fillStyle, strokeStyle}) {
      let centerX = (x + 0.5)*sideLength + col*boardPixelWidth;
      let centerY = (y + 0.5)*sideLength + row*boardPixelHeight;

      context.beginPath();
      context.fillStyle = fillStyle;
      context.strokeStyle = strokeStyle;
      context.arc(centerX, centerY, stoneRadius, 0, 2*Math.PI);
      context.fill();
      context.stroke();
    };

    // {x, y} are the apparent coordinates of the stone in the center board.
    let drawStoneAndShadows = function({x, y}, color) {
      let centerCol = extendsX ? 1 : 0;
      let centerRow = extendsY ? 1 : 0;

      // Draw the stone itself.
      drawSingleStone(
        {x, y},
        {row: centerRow, col: centerCol},
        {fillStyle: color, strokeStyle: "black"});

      // Draw the shadow stones.
      let colBound = extendsX ? 1 : 0;
      let rowBound = extendsY ? 1 : 0;
      for (let row = -rowBound; row <= rowBound; row++) {
        for (let col = -colBound; col <= colBound; col++) {
          if (row !== 0 || col !== 0) {
            let shadowCoords =
              board.topology.normalizeCoords(
                {x: x + col*board.size.x, y: y + row*board.size.y});
            drawSingleStone(
              shadowCoords,
              {row: centerRow + row, col: centerCol + col},
              {fillStyle: grayFill[color], strokeStyle: grayStroke[color]});
          }
        }
      }
    };

    let drawBoard = function() {
      // Blank out the whole canvas.
      context.fillStyle = "white";
      context.fillRect(0, 0, 1000, 1000);

      // Outer dim rectangle
      let bigWidth = (extendsX ? 3 : 1)*boardPixelWidth;
      let bigHeight = (extendsY ? 3 : 1)*boardPixelHeight;
      context.fillStyle = "#ffffcc";
      context.fillRect(0, 0, bigWidth, bigHeight);

      // Inner bright rectangle
      let upperLeftX = (extendsX ? 1 : 0)*boardPixelWidth;
      let upperLeftY = (extendsY ? 1 : 0)*boardPixelHeight;
      context.fillStyle = "#ffcc00";
      context.fillRect(
        upperLeftX,
        upperLeftY,
        boardPixelWidth,
        boardPixelHeight);

      // Greyed out lines.
      context.beginPath();

      context.strokeStyle = "gray";

      let rowUpper = (extendsY ? 3 : 1)*board.size.y;
      let colUpper = (extendsX ? 3 : 1)*board.size.x;
      let yFudge = extendsY ? 0 : 0.5;
      let xFudge = extendsX ? 0 : 0.5;

      for (let row = 0; row < rowUpper; row++) {
        const y = sideLength/2 + row*sideLength;
        context.moveTo(xFudge*sideLength, y);
        context.lineTo((colUpper - xFudge)*sideLength, y);
      }

      for (let col = 0; col < colUpper; col++) {
        const x = sideLength/2 + col*sideLength;
        context.moveTo(x, yFudge*sideLength);
        context.lineTo(x, (rowUpper - yFudge)*sideLength);
      }

      context.stroke();

      // Black lines.
      context.beginPath();

      context.strokeStyle = "black";

      let xOffsetCenterBoard = (extendsX ? 1 : 0)*boardPixelWidth;
      let yOffsetCenterBoard = (extendsY ? 1 : 0)*boardPixelHeight;

      for (let row = 0; row < board.size.y; row++) {
        const y = yOffsetCenterBoard + sideLength/2 + row*sideLength;
        context.moveTo(xOffsetCenterBoard + 1 + xFudge*sideLength, y);
        context.lineTo(
          xOffsetCenterBoard + boardPixelWidth - xFudge*sideLength, y);
      }

      for (let col = 0; col < board.size.x; col++) {
        const x = xOffsetCenterBoard + sideLength/2 + col*sideLength;
        context.moveTo(x, yOffsetCenterBoard + 1 + yFudge*sideLength);
        context.lineTo(
          x, yOffsetCenterBoard + boardPixelHeight - yFudge*sideLength);
      }

      context.stroke();

      // Stones.
      for (let y = 0; y < board.size.y; y++) {
        for (let x = 0; x < board.size.x; x++) {
          const color = board.state.grid[x][y];
          if (color) {
            let normalCoords =
              board.topology.normalizeCoords(
                {x: x + offset.x, y: y + offset.y});
            drawStoneAndShadows(normalCoords, color);
          }
        }
      }

      // Display prisoner count.
      const blackScoreSpan =
        document.getElementById("prisoners_taken_by_black");
      blackScoreSpan.innerHTML = board.state.prisonersTakenBy.black;
      const whiteScoreSpan =
        document.getElementById("prisoners_taken_by_white");
      whiteScoreSpan.innerHTML = board.state.prisonersTakenBy.white;
    };

    let onCanvasMouseClickCallback = function(mouseEvent) {
      let xOffsetCenterBoard = (extendsX ? 1 : 0)*boardPixelWidth;
      let yOffsetCenterBoard = (extendsY ? 1 : 0)*boardPixelHeight;

      const gridOffsetX = (
        Math.floor((mouseEvent.offsetX - xOffsetCenterBoard)/sideLength));
      const gridOffsetY = (
        Math.floor((mouseEvent.offsetY - yOffsetCenterBoard)/sideLength));

      if (
        gridOffsetX >= 0 && gridOffsetX < board.size.x &&
        gridOffsetY >= 0 && gridOffsetY < board.size.y
      ) {
        let normalCoords =
          board.topology.normalizeCoords(
            {x: gridOffsetX - offset.x, y: gridOffsetY - offset.y});
        if (board.state.isLegalMove[normalCoords.x][normalCoords.y]) {
          board.play(normalCoords);
        }
      }
      drawBoard();
    };

    let onCanvasMouseMoveCallback = function(mouseEvent) {
      drawBoard();

      let xOffsetCenterBoard = (extendsX ? 1 : 0)*boardPixelWidth;
      let yOffsetCenterBoard = (extendsY ? 1 : 0)*boardPixelHeight;

      const gridOffsetX = (
        Math.floor((mouseEvent.offsetX - xOffsetCenterBoard)/sideLength));
      const gridOffsetY = (
        Math.floor((mouseEvent.offsetY - yOffsetCenterBoard)/sideLength));

      if (
        gridOffsetX >= 0 && gridOffsetX < board.size.x &&
        gridOffsetY >= 0 && gridOffsetY < board.size.y
      ) {
        let normalCoords =
          board.topology.normalizeCoords(
            {x: gridOffsetX - offset.x, y: gridOffsetY - offset.y});
        if (board.state.isLegalMove[normalCoords.x][normalCoords.y]) {
          drawStoneAndShadows(
            {x: gridOffsetX, y: gridOffsetY}, board.state.turn);
        }
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
        offset.x += dx;
        offset.y += dy;
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
    let startGameButton = document.getElementById("start_game_button");
    startGameButton.addEventListener("click", function() {
      let width = Number(document.getElementById("width_input").value);
      let height = Number(document.getElementById("height_input").value);
      let topology = function() {
        if (document.getElementById("radio_torus").checked) {
          return getTorusTopology({width, height});
        } else if (document.getElementById("radio_cylinder").checked) {
          return getCylinderTopology({width, height});
        } else if (document.getElementById("radio_mobius").checked) {
          return getMobiusStripTopology({width, height});
        } else if (document.getElementById("radio_klein").checked) {
          return getKleinBottleTopology({width, height});
        }
      }();

      document.getElementById("setup").style.display = "none";
      document.getElementById("play_screen").style.display = "block";

      let canvas = document.getElementById("play_area");

      let board = getBoard(topology);
      let view = getView({canvas: canvas, board, sideLength: 20});

      view.drawBoard();
      canvas.addEventListener(
        "mousemove",
        (mouseEvent) => view.onCanvasMouseMoveCallback(mouseEvent));
      canvas.addEventListener(
        "click", (mouseEvent) => view.onCanvasMouseClickCallback(mouseEvent));

      const undoButton = document.getElementById("undo_button");
      undoButton.addEventListener(
        "click", (mouseEvent) => view.onUndoMouseClickCallback(mouseEvent));

      window.addEventListener(
        "keydown", (keyboardEvent) => view.onKeyDownCallback(keyboardEvent));
    });
  };

}());
