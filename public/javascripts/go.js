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
      getExtendDirections,
      getScrollDirections: getExtendDirections
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
      getExtendDirections,
      getScrollDirections: getExtendDirections
    };
  };

  let getMobiusStripTopology = function({width, height}) {
    let size = {x: width, y: height};

    let normalizeCoords = function({x, y}) {
      if (y < 0 || y >= size.y) {
        return null;
      }
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
      getExtendDirections,
      getScrollDirections: getExtendDirections
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

    let getScrollDirections = function() {
      return ["x"];
    };

    return {
      size,
      normalizeCoords,
      getExtendDirections,
      getScrollDirections
    };
  };

  let getView = function({canvas, gameState, topology, player, sideLength}) {
    let offset = {x: 0, y: 0};
    let context = canvas.getContext("2d");
    let my = {gameState}

    const stoneRadius = 0.5*sideLength;
    const boardPixelWidth = sideLength*my.gameState.size.x;
    const boardPixelHeight = sideLength*my.gameState.size.y;
    const grayFill = {
      black: "#666666",
      white: "#f9f9f9"
    };
    const grayStroke = {
      black: "#666666",
      white: "#666666"
    };
    let [extendsX, extendsY] = (() => {
      let extendDirections = topology.getExtendDirections();
      return ["x", "y"].map((d) => extendDirections.includes(d));
    })();

    canvas.setAttribute("width", (extendsX ? 3 : 1)*boardPixelWidth);
    canvas.setAttribute("height", (extendsY ? 3 : 1)*boardPixelHeight);

    // {x, y} are the apparent coordinates of the stone in the (shadow) board.
    //
    // {row, col} are the coordinates of the board itself among the shadow
    // boards.
    let drawSingleStone = function(
        {x, y}, {row, col}, {fillStyle, strokeStyle, alpha=1.0, radius}) {
      let centerX = (x + 0.5)*sideLength + col*boardPixelWidth;
      let centerY = (y + 0.5)*sideLength + row*boardPixelHeight;

      context.beginPath();
      context.fillStyle = fillStyle;
      context.strokeStyle = strokeStyle;
      context.globalAlpha = alpha;
      context.arc(centerX, centerY, radius, 0, 2*Math.PI);
      context.fill();
      context.stroke();
      context.globalAlpha = 1.0;
    };

    // {x, y} are the apparent coordinates of the stone in the center board.
    let drawStoneAndShadows = function(
      {x, y},
      {
        fillStyle,
        strokeStyle,
        shadowFillStyle,
        shadowStrokeStyle,
        alpha=1.0,
        radius=stoneRadius
      }
    ) {
      let centerCol = extendsX ? 1 : 0;
      let centerRow = extendsY ? 1 : 0;

      // Draw the stone itself.
      drawSingleStone(
        {x, y},
        {row: centerRow, col: centerCol},
        {fillStyle: fillStyle, strokeStyle: strokeStyle, alpha, radius});

      // Draw the shadow stones.
      let colBound = extendsX ? 1 : 0;
      let rowBound = extendsY ? 1 : 0;
      for (let row = -rowBound; row <= rowBound; row++) {
        for (let col = -colBound; col <= colBound; col++) {
          if (row !== 0 || col !== 0) {
            let shadowCoords =
              topology.normalizeCoords(
                {x: x + col*my.gameState.size.x, y: y + row*my.gameState.size.y});
            drawSingleStone(
              shadowCoords,
              {row: centerRow + row, col: centerCol + col},
              {
                fillStyle: shadowFillStyle,
                strokeStyle: shadowStrokeStyle,
                alpha,
                radius
              }
            );
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

      let rowUpper = (extendsY ? 3 : 1)*my.gameState.size.y;
      let colUpper = (extendsX ? 3 : 1)*my.gameState.size.x;
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

      for (let row = 0; row < my.gameState.size.y; row++) {
        const y = yOffsetCenterBoard + sideLength/2 + row*sideLength;
        context.moveTo(xOffsetCenterBoard + 1 + xFudge*sideLength, y);
        context.lineTo(
          xOffsetCenterBoard + boardPixelWidth - xFudge*sideLength, y);
      }

      for (let col = 0; col < my.gameState.size.x; col++) {
        const x = xOffsetCenterBoard + sideLength/2 + col*sideLength;
        context.moveTo(x, yOffsetCenterBoard + 1 + yFudge*sideLength);
        context.lineTo(
          x, yOffsetCenterBoard + boardPixelHeight - yFudge*sideLength);
      }

      context.stroke();

      // Stones.
      for (let y = 0; y < my.gameState.size.y; y++) {
        for (let x = 0; x < my.gameState.size.x; x++) {
          const color = my.gameState.grid[x][y];
          if (color) {
            let normalCoords =
              topology.normalizeCoords(
                {x: x + offset.x, y: y + offset.y});
            drawStoneAndShadows(
              normalCoords,
              {
                fillStyle: color,
                strokeStyle: "black",
                shadowFillStyle: grayFill[color],
                shadowStrokeStyle: grayStroke[color]
              });
          }
        }
      }

      // Last played stone dot.
      if (my.gameState.lastPlayPoint) {
        let normalCoords =
          topology.normalizeCoords(
            {
              x: my.gameState.lastPlayPoint.x + offset.x,
              y: my.gameState.lastPlayPoint.y + offset.y
            }
          );
        drawStoneAndShadows(
          normalCoords,
          {
            fillStyle: "red",
            strokeStyle: "red",
            shadowFillStyle: "red",
            shadowStrokeStyle: "red",
            radius: 0.3*stoneRadius
          }
        );
      }

      // Display prisoner count.
      const blackScoreSpan =
        document.getElementById("prisoners_taken_by_black");
      blackScoreSpan.innerHTML = my.gameState.prisonersTakenBy.black;
      const whiteScoreSpan =
        document.getElementById("prisoners_taken_by_white");
      whiteScoreSpan.innerHTML = my.gameState.prisonersTakenBy.white;
    };

    let getGridOffsets = function(mouseEvent) {
      let offsetCenterBoard = {
        x: (extendsX ? 1 : 0)*boardPixelWidth,
        y: (extendsY ? 1 : 0)*boardPixelHeight
      };
      return {
        x: Math.floor((mouseEvent.offsetX - offsetCenterBoard.x)/sideLength),
        y: Math.floor((mouseEvent.offsetY - offsetCenterBoard.y)/sideLength)
      };
    };

    let isOnBoard = function({x, y}) {
      return x >= 0 && x < my.gameState.size.x && y >= 0 && y < my.gameState.size.y;
    };

    let pollGameState = function() {
        if (player !== my.gameState.player) {
            let xhttp1 = new XMLHttpRequest();
            xhttp1.open("GET", "whosemove/" + my.gameState.id, false);
            xhttp1.send();
            if (player === xhttp1.response) {
                let xhttp2 = new XMLHttpRequest();
                xhttp2.open("GET", "getstate/" + my.gameState.id, false);
                xhttp2.send();
                // TODO: Handle error responses.
                let newGameState = JSON.parse(xhttp2.response);
                my.gameState = newGameState;
                drawBoard();
            }
        }
    };

    let onCanvasMouseClickCallback = function(mouseEvent) {
      if (player !== my.gameState.player) {
        return;
      }

      let gridOffsets = getGridOffsets(mouseEvent);
      if (isOnBoard(gridOffsets)) {
        let normalCoords =
          topology.normalizeCoords(
            {x: gridOffsets.x - offset.x, y: gridOffsets.y - offset.y});
        if (my.gameState.isLegalMove[normalCoords.x][normalCoords.y]) {
          let xhttp = new XMLHttpRequest();
          xhttp.open("POST", "playmove/" + my.gameState.id, false);
          xhttp.setRequestHeader("Csrf-Token", my.gameState.csrfToken);
          // TODO: Handle error responses.
          xhttp.send(`${normalCoords.x},${normalCoords.y}`);
          let newGameState = JSON.parse(xhttp.response);
          my.gameState = newGameState;
        }
      }
      drawBoard();
      mouseEvent.stopPropagation();
    };

    let onCanvasMouseMoveCallback = function(mouseEvent) {
      // Moving the mouse outside the canvas causes the board to be redrawn
      // with no proposed stones. We don't want to draw over our proposed
      // stones, so we don't let this event get to the other handler.
      mouseEvent.stopPropagation();

      if (player !== my.gameState.player) {
        return;
      }

      drawBoard();

      let gridOffsets = getGridOffsets(mouseEvent);
      if (isOnBoard(gridOffsets)) {
        let normalCoords =
          topology.normalizeCoords(
            {x: gridOffsets.x - offset.x, y: gridOffsets.y - offset.y});
        if (my.gameState.isLegalMove[normalCoords.x][normalCoords.y]) {
          drawStoneAndShadows(
            {x: gridOffsets.x, y: gridOffsets.y},
            {
              fillStyle: my.gameState.player,
              strokeStyle: "black",
              shadowFillStyle: grayFill[my.gameState.player],
              shadowStrokeStyle: grayStroke[my.gameState.player],
              alpha: 0.5
            });
        }
      }
    };

    // Clear the proposed stones if the mouse moves outside the canvas.
    let onBodyMouseMoveCallback = function(mouseEvent) {
      drawBoard();
    };

    let onPassMouseClickCallback = function(mouseEvent) {
      if (player !== my.gameState.player) {
        return;
      }
      // TODO: Implement pass.
      drawBoard();
    };

    let onUndoMouseClickCallback = function(mouseEvent) {
      if (player !== my.gameState.player) {
        return;
      }

      // TODO: Implement undo.
      drawBoard();
    };

    let directionPairs = {
      x: [["ArrowLeft", {dx: -1, dy: 0}],
        ["ArrowRight", {dx: 1, dy: 0}]],
      y: [["ArrowUp", {dx: 0, dy: -1}],
        ["ArrowDown", {dx: 0, dy: 1}]]
    };

    let keyToDirectionMap = Object.create(null);
    for (let direction of topology.getScrollDirections()) {
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
      onBodyMouseMoveCallback,
      onPassMouseClickCallback,
      onUndoMouseClickCallback,
      onKeyDownCallback,
      pollGameState
    };
  };

  window.onload = function() {
      let player = document.getElementById("player").innerHTML;

      let gameState =
        JSON.parse(
            document.getElementById("game_state").innerHTML
        )

      let topology =
        (gameState.topology === "cylinder") ? getCylinderTopology(
            {
                width: gameState.size.x,
                height: gameState.size.y
            }
        ) : null;
        // TODO: Put in other cases.

      let canvas = document.getElementById("play_area");

      let view = getView({canvas, gameState, topology, player, sideLength: 20});

      view.drawBoard();

      canvas.addEventListener(
          "mousemove",
          (mouseEvent) => view.onCanvasMouseMoveCallback(mouseEvent));
      canvas.addEventListener(
          "click", (mouseEvent) => view.onCanvasMouseClickCallback(mouseEvent));

      document.body.addEventListener(
          "mousemove",
          (mouseEvent) => view.onBodyMouseMoveCallback(mouseEvent));

      const passButton = document.getElementById("pass_button");
      passButton.addEventListener(
          "click", (mouseEvent) => view.onPassMouseClickCallback(mouseEvent));

      // Non-active player can still request an undo.
      const undoButton = document.getElementById("undo_button");
      undoButton.addEventListener(
        "click", (mouseEvent) => view.onUndoMouseClickCallback(mouseEvent));

      // Non-active player can still scroll the board.
      window.addEventListener(
        "keydown", (keyboardEvent) => view.onKeyDownCallback(keyboardEvent));

      let pollInterval = setInterval(() => view.pollGameState(), 1000)
  };

}());
