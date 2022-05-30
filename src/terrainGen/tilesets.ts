import * as pairing from "./pairing";

export const FIELD = {
  // Dark dirt to dirt
  [pairing.pairTileset(4, 4, 4, 3)]: 45,
  [pairing.pairTileset(4, 4, 3, 3)]: 46,
  [pairing.pairTileset(4, 4, 3, 4)]: 47,
  [pairing.pairTileset(4, 3, 3, 3)]: 48,
  [pairing.pairTileset(3, 4, 3, 3)]: 49,
  [pairing.pairTileset(4, 3, 4, 3)]: 50,
  [pairing.pairTileset(3, 3, 3, 3)]: 51,
  [pairing.pairTileset(3, 4, 3, 4)]: 52,
  [pairing.pairTileset(3, 3, 4, 3)]: 53,
  [pairing.pairTileset(3, 3, 3, 4)]: 54,
  [pairing.pairTileset(4, 3, 4, 4)]: 55,
  [pairing.pairTileset(3, 3, 4, 4)]: 56,
  [pairing.pairTileset(3, 4, 4, 4)]: 57,
  [pairing.pairTileset(3, 4, 4, 3)]: 58,
  [pairing.pairTileset(4, 3, 3, 4)]: 59,

  // Dirt to grass
  [pairing.pairTileset(5, 5, 5, 4)]: 0,
  [pairing.pairTileset(5, 5, 4, 4)]: 1,
  [pairing.pairTileset(5, 5, 4, 5)]: 2,
  [pairing.pairTileset(5, 4, 4, 4)]: 3,
  [pairing.pairTileset(4, 5, 4, 4)]: 4,
  [pairing.pairTileset(5, 4, 5, 4)]: 5,
  [pairing.pairTileset(4, 4, 4, 4)]: 6,
  [pairing.pairTileset(4, 5, 4, 5)]: 7,
  [pairing.pairTileset(4, 4, 5, 4)]: 8,
  [pairing.pairTileset(4, 4, 4, 5)]: 9,
  [pairing.pairTileset(5, 4, 5, 5)]: 10,
  [pairing.pairTileset(4, 4, 5, 5)]: 11,
  [pairing.pairTileset(4, 5, 5, 5)]: 12,
  [pairing.pairTileset(4, 5, 5, 4)]: 13,
  [pairing.pairTileset(5, 4, 4, 5)]: 14,

  // Grass to dark grass
  [pairing.pairTileset(6, 6, 6, 5)]: 15,
  [pairing.pairTileset(6, 6, 5, 5)]: 16,
  [pairing.pairTileset(6, 6, 5, 6)]: 17,
  [pairing.pairTileset(6, 5, 5, 5)]: 18,
  [pairing.pairTileset(5, 6, 5, 5)]: 19,
  [pairing.pairTileset(6, 5, 6, 5)]: 20,
  [pairing.pairTileset(5, 5, 5, 5)]: 21,
  [pairing.pairTileset(5, 6, 5, 6)]: 22,
  [pairing.pairTileset(5, 5, 6, 5)]: 23,
  [pairing.pairTileset(5, 5, 5, 6)]: 24,
  [pairing.pairTileset(6, 5, 6, 6)]: 25,
  [pairing.pairTileset(5, 5, 6, 6)]: 26,
  [pairing.pairTileset(5, 6, 6, 6)]: 27,
  [pairing.pairTileset(5, 6, 6, 5)]: 28,
  [pairing.pairTileset(6, 5, 5, 6)]: 29,

  // Dark grass to grass
  [pairing.pairTileset(7, 7, 7, 6)]: 30,
  [pairing.pairTileset(7, 7, 6, 6)]: 31,
  [pairing.pairTileset(7, 7, 6, 7)]: 32,
  [pairing.pairTileset(7, 6, 6, 6)]: 33,
  [pairing.pairTileset(6, 7, 6, 6)]: 34,
  [pairing.pairTileset(7, 6, 7, 6)]: 35,
  [pairing.pairTileset(6, 6, 6, 6)]: 36,
  [pairing.pairTileset(6, 7, 6, 7)]: 37,
  [pairing.pairTileset(6, 6, 7, 6)]: 38,
  [pairing.pairTileset(6, 6, 6, 7)]: 39,
  [pairing.pairTileset(7, 6, 7, 7)]: 40,
  [pairing.pairTileset(6, 6, 7, 7)]: 41,
  [pairing.pairTileset(6, 7, 7, 7)]: 42,
  [pairing.pairTileset(6, 7, 7, 6)]: 43,
  [pairing.pairTileset(7, 6, 6, 7)]: 44,

  [pairing.pairTileset(7, 7, 7, 7)]: 21,

  // Grass to flowers
  [pairing.pairTileset(7, 7, 7, 8)]: 60,
  [pairing.pairTileset(7, 7, 8, 8)]: 61,
  [pairing.pairTileset(7, 7, 8, 7)]: 62,
  [pairing.pairTileset(7, 8, 8, 8)]: 63,
  [pairing.pairTileset(8, 7, 8, 8)]: 64,
  [pairing.pairTileset(7, 8, 7, 8)]: 65,
  [pairing.pairTileset(8, 7, 8, 7)]: 67,
  [pairing.pairTileset(8, 8, 7, 8)]: 68,
  [pairing.pairTileset(8, 8, 8, 7)]: 69,
  [pairing.pairTileset(7, 8, 7, 7)]: 70,
  [pairing.pairTileset(8, 8, 7, 7)]: 71,
  [pairing.pairTileset(8, 7, 7, 7)]: 72,
  [pairing.pairTileset(8, 7, 7, 8)]: 73,
  [pairing.pairTileset(7, 8, 8, 7)]: 74,

  [pairing.pairTileset(8, 8, 8, 8)]: 66,
};