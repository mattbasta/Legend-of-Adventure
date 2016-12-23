// Cantor pairing function
exports.getCoordInt = (x, y) => (x + y) * (x + y + 1) / 2 + y;

const mask = 0b1111111111111;
const half = 67108864;
const halfMinusOne = 67108863;
exports.pairTileset = (a, b, c, d) => (
  (((a & mask) << 13) | (b & mask)) * half +
  (((c & mask) << 13) | (d & mask))
);

const cMask = mask << 13;
exports.unpairTileset = input => {
  const left = (input - (input & halfMinusOne)) / half;
  return [(left & cMask) >> 13, left & mask, (input & cMask) >> 13, input & mask];
};
