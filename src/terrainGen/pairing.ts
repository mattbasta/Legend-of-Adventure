const bijective = (z: number) => (z < 0 ? z * -2 - 1 : z * 2);

// Szudzik's pairing function
export const getCoordInt = (x: number, y: number) => {
  const bx = bijective(x);
  const by = bijective(y);
  return bx >= by ? bx * bx + bx + by : bx + by * by;
};

const mask = 0b1111111111111;
const half = 67108864;
const halfMinusOne = 67108863;
export const pairTileset = (a: number, b: number, c: number, d: number) =>
  (((a & mask) << 13) | (b & mask)) * half + (((c & mask) << 13) | (d & mask));

const cMask = mask << 13;
export const unpairTileset = (input: number) => {
  const left = (input - (input & halfMinusOne)) / half;
  return [
    (left & cMask) >> 13,
    left & mask,
    (input & cMask) >> 13,
    input & mask,
  ];
};

function hash(str: string): number {
  let hash = 5381,
    i = str.length;

  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }

  /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
   * integers. Since we want the results to be always positive, convert the
   * signed int to an unsigned by doing an unsigned bitshift. */
  return hash >>> 0;
}
export const getNameInt = (name: string) => hash(name.padEnd(32));
