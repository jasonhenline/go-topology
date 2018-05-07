function drawGrid(context, topLeftX, topLeftY, sideLength, dimension) {
  context.beginPath();

  for (let row = 0; row < dimension; row++) {
    y = topLeftY + (row + 1)*sideLength;
    context.moveTo(topLeftX + sideLength/2, y);
    context.lineTo(topLeftX + sideLength/2 + sideLength*dimension, y);
  }

  for (let col = 0; col < dimension; col++) {
    x = topLeftX + (col + 1)*sideLength;
    context.moveTo(x, topLeftY + sideLength/2);
    context.lineTo(x, topLeftY + sideLength/2 + sideLength*dimension);
  }

  context.stroke();
}

function drawBoard(context, dimension, sideLength, padding) {
  context.fillStyle = "white";
  context.fillRect(0, 0, 1000, 1000);

  context.fillStyle = "#ffffcc";
  context.fillRect(
    padding + sideLength/2,
    padding + sideLength/2,
    3*sideLength*dimension,
    3*sideLength*dimension);

  context.fillStyle = "#ffcc00";
  context.fillRect(
    padding + sideLength/2 + dimension*sideLength,
    padding + sideLength/2 + dimension *sideLength,
    sideLength*dimension,
    sideLength*dimension);

  context.strokeStyle = "gray";
  drawGrid(context, padding, padding, sideLength, dimension);
  drawGrid(
    context, padding + sideLength*dimension, padding, sideLength, dimension);
  drawGrid(
    context, padding, padding + sideLength*dimension, sideLength, dimension);
  drawGrid(
    context, padding + 2*sideLength*dimension, padding, sideLength, dimension);
  drawGrid(
    context, padding, padding + 2*sideLength*dimension, sideLength, dimension);
  drawGrid(
    context,
    padding + 2*sideLength*dimension,
    padding + sideLength*dimension,
    sideLength,
    dimension);
  drawGrid(
    context,
    padding + sideLength*dimension,
    padding + 2*sideLength*dimension,
    sideLength,
    dimension);
  drawGrid(
    context,
    padding + 2*sideLength*dimension,
    padding + 2*sideLength*dimension,
    sideLength,
    dimension);

  context.strokeStyle = "black";
  drawGrid(
    context,
    padding + sideLength*dimension,
    padding + sideLength*dimension,
    sideLength,
    dimension);
}

function getCanvasOnMouseMoveFunction(context, dimension, sideLength, padding) {
  return function(mouseEvent) {
    drawBoard(context, dimension, sideLength, padding);
    let offset = padding + sideLength/2 + sideLength*dimension
    let gridOffsetX = (mouseEvent.offsetX - offset)/sideLength;
    let gridOffsetY = (mouseEvent.offsetY - offset)/sideLength;
    if (
      gridOffsetX > 0 && gridOffsetX < dimension &&
      gridOffsetY > 0 && gridOffsetY < dimension) {
      let radius = 0.5*sideLength;

      console.log(gridOffsetX, gridOffsetY);
      for (let row = 0; row < 3; ++row) {
        for (let col = 0; col < 3; ++col) {
          let centerX = (
            Math.floor(gridOffsetX)*sideLength +
            sideLength +
            padding +
            col*sideLength*dimension);
          let centerY = (
            Math.floor(gridOffsetY)*sideLength +
            sideLength +
            padding +
            row*sideLength*dimension);
          context.beginPath();
          context.fillStyle = "black";
          context.arc(centerX, centerY, radius, 0, 2*Math.PI);
          context.fill();
        }
      }
    }
  }
}

window.onload = function() {
  let canvas = document.getElementById("play_area");
  let context = canvas.getContext("2d");

  const padding = 10;
  const sideLength = 20;
  const dimension = 13;

  drawBoard(context, dimension, sideLength, padding);

  canvas.addEventListener(
    "mousemove",
    getCanvasOnMouseMoveFunction(context, dimension, sideLength, padding));
}

