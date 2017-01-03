const crc32 = require('crc32');


const bijective = z => z < 0 ? z * -2 - 1 : z * 2;

// Szudzik's pairing function
exports.getCoordInt = (x, y) => {
  const bx = bijective(x);
  const by = bijective(y);
  return bx >= by ? bx * bx + bx + by : bx + by * by;
}

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


exports.getNameInt = name => parseInt(crc32(name), 16);
