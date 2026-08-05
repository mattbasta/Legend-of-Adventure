import * as level from "./level.ts";
import settings from "./settings.ts";

const HITMAP_BUFFER = 1 / settings.tilesize;

type Avatar = {
  height: number;
  width: number;
  x: number;
  y: number;
  hitmap: [number, number, number, number];
};

export function updateAvatarX(
  avatar: Avatar,
  hitmap: level.LevelData["hitmap"] = level.getHitmap(),
) {
  const y = (avatar.y - (avatar.height * 0.5) / settings.tilesize) | 0;
  const xLeft = (avatar.x + HITMAP_BUFFER) | 0;
  const xRight =
    (avatar.x + avatar.width / settings.tilesize - HITMAP_BUFFER) | 0;

  let yMin = 0;
  let yMax = hitmap.length;

  for (let i = y; i >= 0; i--) {
    const row = hitmap[i]!;
    if (row[xLeft] || row[xRight]) {
      yMin = i + 1;
      break;
    }
  }
  for (let i = y + 1, maplen = hitmap.length; i < maplen; i++) {
    const row = hitmap[i]!;
    if (row[xLeft] || row[xRight]) {
      yMax = i;
      break;
    }
  }
  avatar.hitmap[0] = yMin;
  avatar.hitmap[2] = yMax;
}

export function updateAvatarY(
  avatar: Avatar,
  hitmap: level.LevelData["hitmap"] = level.getHitmap(),
) {
  const yBottom = (avatar.y - HITMAP_BUFFER) | 0;
  const yTop =
    (avatar.y - avatar.height / settings.tilesize + HITMAP_BUFFER) | 0;

  const x = (avatar.x + HITMAP_BUFFER) | 0;

  const yBottomRow = hitmap[yBottom]!;
  const yTopRow = hitmap[yTop]!;

  let xMin = 0;
  let xMax = yBottomRow.length;

  for (let i = x - 1; i >= 0; i--) {
    if (yBottomRow[i] || yTopRow[i]) {
      xMin = i + 1;
      break;
    }
  }
  for (let i = x + 1, rowlen = yBottomRow.length; i < rowlen; i++) {
    if (yBottomRow[i] || yTopRow[i]) {
      xMax = i;
      break;
    }
  }
  avatar.hitmap[3] = xMin;
  avatar.hitmap[1] = xMax;
}
