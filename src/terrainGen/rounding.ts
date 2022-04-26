import { Terrain } from "../terrain";
import * as pairing from "./pairing";

function isVertical(a: number, b: number, c: number, d: number) {
  return a === c && b === d && isVerticalGradient(a, b, c, d);
}

function isHorizontal(a: number, b: number, c: number, d: number) {
  return a === b && c === d && isHorizontalGradient(a, b, c, d);
}

function isVerticalGradient(a: number, b: number, c: number, d: number) {
  return a !== b && c !== d;
}

function isHorizontalGradient(a: number, b: number, c: number, d: number) {
  return a !== c && b !== d;
}

export function round(terrain: Terrain, tileset: Record<number, number>) {
  const {
    height: rowCount,
    width: colCount,
    tiles: body,
    height,
    width,
  } = terrain;

  const clone = new Uint16Array(rowCount * colCount * 4);
  for (let i = 0; i < rowCount; i++) {
    for (let j = 0; j < colCount; j++) {
      const val = body[i * width + j];
      clone[(i * width + j) * 4] = val;
      clone[(i * width + j) * 4 + 1] = val;
      clone[(i * width + j) * 4 + 2] = val;
      clone[(i * width + j) * 4 + 3] = val;
    }
  }

  for (let y = 0; y < rowCount; y++) {
    for (let x = 0; x < colCount; x++) {
      const val = body[y * width + x];

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
        clone[(y * width + x) * 4] = temp;
        clone[(y * width + x) * 4 + 1] = temp;
        clone[(y * width + x) * 4 + 2] = temp;
        clone[(y * width + x) * 4 + 3] = temp;
        continue;
      }

      // Second column and up, test for horiz gradient.
      if (x && val !== body[y * width + x - 1]) {
        clone[(y * width + x) * 4] = body[y * width + x - 1];
        clone[(y * width + x) * 4 + 2] = body[y * width + x - 1];
        continue;
      }

      // Second row and down, test for vertical gradient.
      if (
        y &&
        body[y * width + x] !== body[(y - 1) * width + x] &&
        clone[((y - 1) * width + x) * 4 + 2] ===
          clone[((y - 1) * width + x) * 4 + 3]
      ) {
        clone[(y * width + x) * 4] = body[(y - 1) * width + x];
        clone[(y * width + x) * 4 + 1] = body[(y - 1) * width + x];
      }
    }
  }

  // Second pass, basic corner matching. Also contains an optimized version
  // of the third pass to save resources

  for (let y = 0; y < rowCount; y++) {
    const yc = y * width;
    for (let x = 0; x < colCount; x++) {
      const ypx = (yc + x) * 4;
      const ypxm1 = (yc + x - 1) * 4;
      const ypxp1 = (yc + x + 1) * 4;

      const hLeftC =
        x &&
        isVertical(
          clone[ypxm1],
          clone[ypxm1 + 1],
          clone[ypxm1 + 2],
          clone[ypxm1 + 3]
        );
      const hRightC =
        x &&
        isVertical(
          clone[ypxp1],
          clone[ypxp1 + 1],
          clone[ypxp1 + 2],
          clone[ypxp1 + 3]
        );

      // Optimize the third pass by squashing it into the second.
      if (
        isHorizontalGradient(
          clone[ypx],
          clone[ypx + 1],
          clone[ypx + 2],
          clone[ypx + 3]
        )
      ) {
        if (hLeftC) {
          if (
            clone[ypx] === clone[ypxm1 + 1] &&
            clone[ypx + 2] === clone[ypxm1 + 2]
          ) {
            clone[ypxm1 + 2] = clone[ypx + 2];
            clone[ypxm1 + 3] = clone[ypx + 2];
          } else if (
            clone[ypx] === clone[ypxm1 + 2] &&
            clone[ypx + 2] === clone[ypxm1 + 3]
          ) {
            clone[ypxm1] = clone[ypx + 1];
            clone[ypxm1 + 1] = clone[ypx + 1];
          }
        }
        continue;
      }

      if (
        isVerticalGradient(
          clone[ypx],
          clone[ypx + 1],
          clone[ypx + 2],
          clone[ypx + 3]
        )
      ) {
        // There is nothing for us here except pain.
        continue;
      }

      const ycl = (y - 1) * width;
      const yclpx = (ycl + x) * 4;

      // Perform second pass transformations
      if (!y || clone[yclpx + 2] === clone[yclpx + 3]) {
        continue;
      }

      if (
        hLeftC &&
        clone[yclpx + 2] === clone[ypxm1] &&
        clone[yclpx + 3] === clone[ypxm1 + 3]
      ) {
        const temp1 = clone[yclpx + 2];
        const temp2 = clone[yclpx + 3];
        clone[ypx] = temp1;
        clone[ypx + 1] = temp2;
        clone[ypx + 2] = temp2;
        clone[ypx + 3] = temp2;
        clone[ypxm1 + 1] = temp1;
        continue;
      }

      if (
        hRightC &&
        clone[yclpx + 2] === clone[ypxp1 + 2] &&
        clone[yclpx + 3] === clone[ypxp1 + 1]
      ) {
        const temp1 = clone[yclpx + 2];
        const temp2 = clone[yclpx + 3];
        clone[ypx] = temp1;
        clone[ypx + 1] = temp2;
        clone[ypx + 2] = temp1;
        clone[ypx + 3] = temp1;
        clone[ypxp1] = temp2;
      }
    }
  }

  // Third pass is done above: intersection handling.

  // Fourth pass, perform final step corner matching.

  for (let y = 0; y < rowCount; y++) {
    const yc = y * width;
    for (let x = 0; x < colCount; x++) {
      const ycpx = (yc + x) * 4;

      // Ignore corners and edges
      if (
        isHorizontalGradient(
          clone[ycpx],
          clone[ycpx + 1],
          clone[ycpx + 2],
          clone[ycpx + 3]
        ) ||
        isVerticalGradient(
          clone[ycpx],
          clone[ycpx + 1],
          clone[ycpx + 2],
          clone[ycpx + 3]
        )
      ) {
        continue;
      }

      const yclpx = ((y - 1) * width + x) * 4;

      if (!y || clone[yclpx + 2] === clone[yclpx + 3]) {
        continue;
      }

      const ycpxm1 = (yc + x - 1) * 4;
      const hLeftC = x && clone[ycpxm1 + 1] !== clone[(yc + (x - 1)) * 4 + 3];

      if (
        hLeftC &&
        clone[ycpxm1 + 1] === clone[yclpx + 2] &&
        clone[ycpxm1 + 3] === clone[yclpx + 3]
      ) {
        const temp = clone[yclpx + 3];
        clone[ycpx] = clone[ycpxm1 + 1];
        clone[ycpx + 1] = temp;
        clone[ycpx + 2] = temp;
        clone[ycpx + 3] = temp;
        continue;
      }

      const ycpxp1 = (yc + x + 1) * 4;
      const hRightC = x < colCount - 1 && clone[ycpxp1] !== clone[ycpxp1 + 2];

      if (
        hRightC &&
        clone[ycpxp1] === clone[yclpx + 3] &&
        clone[ycpxp1 + 2] === clone[yclpx + 2]
      ) {
        const temp = clone[yclpx + 2];
        clone[ycpx] = temp;
        clone[ycpx + 1] = clone[yclpx + 3];
        clone[ycpx + 2] = temp;
        clone[ycpx + 3] = temp;
      }
    }
  }

  for (let i = 0; i < rowCount; i++) {
    for (let j = 0; j < colCount; j++) {
      const cell0 = clone[(i * width + j) * 4];
      const pairedVal = pairing.pairTileset(
        cell0,
        clone[(i * width + j) * 4 + 1],
        clone[(i * width + j) * 4 + 2],
        clone[(i * width + j) * 4 + 3]
      );
      if (pairedVal in tileset) {
        body[i * width + j] = tileset[pairedVal];
      } else {
        body[i * width + j] = cell0;
      }
    }
  }

  return clone;
}
