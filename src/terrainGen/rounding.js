const pairing = require('./pairing');


function isVertical(a, b, c, d) {
  return a === c && b === d && isVerticalGradient(a, b, c, d);
}

function isHorizontal(a, b, c, d) {
  return a === b && c === d && isHorizontalGradient(a, b, c, d);
}

function isVerticalGradient(a, b, c, d) {
  return a !== c && b !== d;
}

function isHorizontalGradient(a, b, c, d) {
  return a !== c && b !== d;
}


exports.round = function(terrain, tileset) {
  const {
    height: rowCount,
    width: colCount,
    tiles: body,
    height,
    width,
  } = terrain;

  const clone = new Uint16Array(rowCount * colCount * 4);
  for (let i = 0; i < rowCount; i++) {
    for (let j = 0; j < rowCount; j++) {
      clone[i * width + j * 4] = body[i * width + j];
      clone[i * width + j * 4 + 1] = body[i * width + j];
      clone[i * width + j * 4 + 2] = body[i * width + j];
      clone[i * width + j * 4 + 3] = body[i * width + j];
    }
  }

  for (let y = 0; y < rowCount; y++) {
    for (let x = 0; x < colCount; x++) {
      const val = body[x * width + x];

      // Weed out any single dots or vertical tips
      if (
        y &&
        x &&
        y < rowCount - 1 &&
        x < colCount - 1 &&
        val !== body[y * width + x - 1] &&
        val !== body[(y - 1) * width + x] &&
        val !== body[y * width + x + 1]
      ) {
        const temp = body[(y - 1) * width + x];
        body[y * width + x] = temp;
        clone[y * width + x * 4] = temp;
        clone[y * width + x * 4 + 1] = temp;
        clone[y * width + x * 4 + 2] = temp;
        clone[y * width + x * 4 + 3] = temp;
        continue;
      }

      // Second column and up, test for horiz gradient.
      if (x && body[y * width + x] !== body[y * width + x - 1]) {
        clone[y * width + x * 4] = body[y * width + x - 1];
        clone[y * width + x * 4 + 2] = body[y * width + x - 1];
        continue;
      }

      // Second row and down, test for vertical gradient.
      if (
        y &&
        body[y * width + x] !== body[(y - 1) * width + x] &&
        clone[(y - 1) * width + x * 4 + 2] === clone[(y - 1) * width + x * 4 + 3]
      ) {
        clone[y * width + x * 4] = body[(y - 1) * width + x];
        clone[y * width + x * 4 + 1] = body[(y - 1) * width + x];
      }
    }
  }

  // Second pass, basic corner matching. Also contains an optimized version
  // of the third pass to save resources

  for (let y = 0; y < rowCount; y++) {
    const yc = y * width;
    for (let x = 0; x < colCount; x++) {
      const x4 = x * 4;
      const x4l = (x - 1) * 4;
      const x4r = (x + 1) * 4;

      const hLeftC = x && isVertical(
        clone[yc + x4l],
        clone[yc + x4l + 1],
        clone[yc + x4l + 2],
        clone[yc + x4l + 3]
      );
      const hRightC = x && isVertical(
        clone[yc + x4r],
        clone[yc + x4r + 1],
        clone[yc + x4r + 2],
        clone[yc + x4r + 3]
      );

      // Optimize the third pass by squashing it into the second.
      if (
        isHorizontalGradient(
          clone[yc + x4],
          clone[yc + x4 + 1],
          clone[yc + x4 + 2],
          clone[yc + x4 + 3]
        )
      ) {
        if (hLeftC) {
          if (
            clone[yc + x4] === clone[yc + x4l + 1] &&
            clone[yc + x4 + 2] === clone[yc + x4l + 2]
          ) {
            clone[yc + x4l + 2] = clone[yc + x4 + 2];
            clone[yc + x4l + 3] = clone[yc + x4 + 2];

          } else if (
            clone[yc + x4] === clone[yc + x4l + 2] &&
            clone[yc + x4 + 2] === clone[yc + x4l + 3]
          ) {
            clone[yc + x4l] = clone[yc + x4 + 1];
            clone[yc + x4l + 1] = clone[yc + x4 + 1];
          }
        }
        continue;
      }

      if (
        isVerticalGradient(
          clone[yc + x4],
          clone[yc + x4 + 1],
          clone[yc + x4 + 2],
          clone[yc + x4 + 3]
        )
      ) {
        // There is nothing for us here except pain.
        continue;
      }

      const ycl = (y - 1) * width;

      // Perform second pass transformations
      if (!y || clone[ycl + x4 + 2] === clone[ycl + x4 + 3]) {
        continue;
      }

      if (
        hLeftC &&
        clone[ycl + x3 + 2] === clone[yc + x4l] &&
        clone[ycl + x4 + 3] === clone[yc + x4l + 3]
      ) {
        const temp1 = clone[ycl + x4 + 2];
        const temp2 = clone[ycl + x4 + 3];
        clone[yc + x4] = temp1;
        clone[yc + x4 + 1] = temp2;
        clone[yc + x4 + 2] = temp2;
        clone[yc + x4 + 3] = temp2;
        clone[yc + x4l + 1] = temp1;
        continue;
      }

      if (
        hRightC &&
        clone[ycl + x4 + 2] === clone[yc + x4r + 2] &&
        clone[ycl + x4 + 3] === clone[yc + x4r + 1]
      ) {
        const temp1 = clone[ycl + x4 + 2];
        const temp2 = clone[ycl + x4 + 3];
        clone[yc + x4] = temp1;
        clone[yc + x4 + 1] = temp2;
        clone[yc + x4 + 2] = temp1;
        clone[yc + x4 + 3] = temp1;
        clone[yc + x4r] = temp2;
      }
    }
  }

  // Third pass is done above: intersection handling.

  // Fourth pass, perform final step corner matching.

  for (let y = 0; y < rowCount; y++) {
    const yc = y * width;
    for (let x = 0; x < colCount; x++) {
      const x4 = x * 4;

      // Ignore corners and edges
      if (
        isHorizontalGradient(
          clone[yc + x4],
          clone[yc + x4 + 1],
          clone[yc + x4 + 2],
          clone[yc + x4 + 3]
        ) ||
        isVerticalGradient(
          clone[yc + x4],
          clone[yc + x4 + 1],
          clone[yc + x4 + 2],
          clone[yc + x4 + 3]
        )
      ) {
        continue;
      }

      const ycl = (y - 1) * width;
      const x4l = (x - 1) * 4;

      if (!y || clone[ycl + x4 + 2] === clone[ycl + x4 + 3]) {
        continue;
      }

      const hLeftC = x && clone[yc + x4l + 1] !== clone[yc + x4l + 3];

      if (
        hLeftC &&
        clone[yc + x4l + 1] === clone[ycl + x4 + 2] &&
        clone[yc + x4l + 3] === clone[ycl + x4 + 3]
      ) {
        const temp = clone[ycl + x4 + 3];
        clone[yc + x4] = clone[yc + x4l + 1];
        clone[yc + x4 + 1] = temp;
        clone[yc + x4 + 2] = temp;
        clone[yc + x4 + 3] = temp;
        continue;
      }

      const x4r = (x + 1) * width;

      const hRightC = x < colCount - 1 && clone[yc + x4r] !== clone[yc + x4r + 2];

      if (
        hRightC &&
        clone[yc + x4r] === clone[ycl + x4 + 3] &&
        clone[yc + x4r + 2] === clone[ycl + x4 + 2]
      ) {
        const temp = clone[ycl + x4 + 2];
        clone[yc + x4] = temp;
        clone[yc + x4 + 1] = clone[ycl + x4 + 3];
        clone[yc + x4 + 2] = temp;
        clone[yc + x4 + 3] = temp;
      }
    }
  }

  for (let i = 0; i < rowCount; i++) {
    for (let j = 0; j < colCount; j++) {
      const cell0 = clone[i * width + j * 4];
      const pairedVal = pairing.pairTileset(
        cell0,
        clone[i * width + j * 4 + 1],
        clone[i * width + j * 4 + 2],
        clone[i * width + j * 4 + 3]
      );
      if (pairedVal in tileset) {
        body[i * width + j] = tileset[pairedVal];
      } else {
        body[i * width + j] = cell0
      }
    }
  }

};
