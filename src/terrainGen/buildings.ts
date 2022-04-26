import * as rng from "../rng";
import * as pairing from "./pairing";
import { Terrain } from "../terrain";
import { RegionType } from "./constants";
import { Portal } from "./portal";

export enum RoomType {
  Lobby = "lobby",
  Stairs = "stairs",
  Plain = "room",
  Bed = "bed",
  Storage = "bed",
}

const ROOMSIZE_WIDTH = 15;
const ROOMSIZE_HEIGHT = 15;
const HORIZ_HALLWAYSIZE_WIDTH = 3;
const HORIZ_HALLWAYSIZE_HEIGHT = 8;
const VERT_HALLWAYSIZE_WIDTH = 5;
const VERT_HALLWAYSIZE_HEIGHT = 3;

const STORAGE_ROOM_MAX_CHESTS = 7;
const SHOP_LOBBY_CRATE_ODDS = 3; // out of 10
const SHOP_LOBBY_POT_ODDS = 6; // out of 10

const buildingStairOdds: Partial<Record<RegionType, number>> = {
  [RegionType.House]: 3,
  [RegionType.Shop]: 2,
};

// function connection(right, bottom) {
//   return (right ? 2 : 0) & (bottom ? 1 : 0);
// }
// function cIsRight(conn) {
//   return conn & 2;
// }
// function cIsBottom(conn) {
//   return conn & 1;
// }

export default function (terrain: Terrain, type: RegionType, parent: string) {
  const stairOdds = buildingStairOdds[type] || 3;

  const r = new rng.MT(pairing.getNameInt(parent + "." + type));
  const hasStairs = r.range(0, 10) > stairOdds;

  const layout: Array<RoomType> = new Array(9);
  const connections = new Array(9);
  const availableRooms: Array<RoomType> = [];

  function filled(x: number, y: number) {
    return Boolean(layout[y * 3 + x]);
  }
  function getRoomType() {
    return availableRooms[r.range(0, availableRooms.length)];
  }
  function setRoom(x: number, y: number, value: RoomType = getRoomType()) {
    layout[y * 3 + x] = value;
  }
  function chance() {
    return r.uniform() > 0.5;
  }

  if (type === RegionType.Shop) {
    availableRooms.push(RoomType.Plain);
    availableRooms.push(RoomType.Storage);
    setRoom(1, 2, RoomType.Lobby);
  } else {
    availableRooms.push(RoomType.Plain);
    availableRooms.push(RoomType.Bed);
    setRoom(1, 2, RoomType.Plain);
  }

  if (chance()) {
    setRoom(0, 2);
  }
  if (chance() || !filled(0, 2)) {
    setRoom(2, 2);
  }
  if (type !== RegionType.Shop && chance()) {
    setRoom(1, 1);
  }
  if ((filled(0, 2) || filled(1, 1)) && chance()) {
    setRoom(0, 1);
  }
  if ((filled(2, 2) || filled(1, 1)) && chance()) {
    setRoom(2, 1);
  }
  if (filled(0, 1) && chance()) {
    setRoom(0, 0);
  }
  if (filled(2, 1) && chance()) {
    setRoom(2, 0);
  }
  if ((filled(0, 0) || filled(2, 0)) && chance()) {
    setRoom(2, 0);
  }

  if (hasStairs) {
    for (let i = 0; i < 9; i++) {
      if (layout[i] !== RoomType.Plain) {
        continue;
      }
      layout[i] = RoomType.Stairs;
      break;
    }
  }

  for (let i = 0; i < 9; i++) {
    if (!layout[i]) {
      continue;
    }
    const isEdge = i === 2 || i === 5 || i === 8;
    const isBottom = i > 5;
    connections[i] = [
      !isEdge && Boolean(layout[i + 1]),
      !isBottom &&
        Boolean(layout[i + 3]) &&
        !(type === RegionType.Shop && i === 4),
    ];
  }

  terrain.hitmap.fillArea(0, 0, terrain.width, terrain.height);

  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      if (!layout[y * 3 + x]) {
        continue;
      }

      const rx = x * (ROOMSIZE_WIDTH + HORIZ_HALLWAYSIZE_WIDTH);
      const ry = y * (ROOMSIZE_HEIGHT + VERT_HALLWAYSIZE_HEIGHT);
      terrain.hitmap.fillArea(rx, ry, ROOMSIZE_WIDTH, ROOMSIZE_HEIGHT);

      // Draw the room borders
      terrain.tiles[ry * terrain.width + rx] = 13;
      terrain.tiles[(ry + ROOMSIZE_HEIGHT - 1) * terrain.width + rx] = 8;
      terrain.tiles[ry * terrain.width + rx + ROOMSIZE_WIDTH - 1] = 12;
      terrain.tiles[
        (ry + ROOMSIZE_HEIGHT - 1) * terrain.width + rx + ROOMSIZE_WIDTH - 1
      ] = 7;
      terrain.fillArea(rx + 1, ry, ROOMSIZE_WIDTH - 2, 1, 14);
      terrain.fillArea(
        rx + 1,
        ry + ROOMSIZE_HEIGHT - 1,
        ROOMSIZE_WIDTH - 2,
        1,
        9
      );
      terrain.fillArea(rx, ry + 1, 1, ROOMSIZE_HEIGHT - 2, 16);
      terrain.fillArea(
        rx + ROOMSIZE_WIDTH - 1,
        ry + 1,
        1,
        ROOMSIZE_HEIGHT - 2,
        15
      );

      // Draw the back wall
      for (let i = rx + 1; i < rx + ROOMSIZE_WIDTH - 1; i++) {
        terrain.tiles[(ry + 1) * terrain.width + i] = 20 + (i % 3);
        terrain.tiles[(ry + 2) * terrain.width + i] = 25 + (i % 3);
        terrain.tiles[(ry + 3) * terrain.width + i] = 30 + (i % 3);
        terrain.tiles[(ry + 4) * terrain.width + i] = 35 + (i % 3);
      }

      // Draw the floor
      terrain.fillArea(
        rx + 1,
        ry + 5,
        ROOMSIZE_WIDTH - 2,
        ROOMSIZE_HEIGHT - 6,
        1
      );
      terrain.hitmap.clearArea(
        rx + 1,
        ry + 5,
        ROOMSIZE_WIDTH - 2,
        ROOMSIZE_HEIGHT - 6
      );

      // If this is the lobby, draw the entrance and add the exit portal
      if (y === 2 && x === 1) {
        terrain.tiles[
          ((ry + ROOMSIZE_HEIGHT - 2) * terrain.width +
            rx +
            ROOMSIZE_WIDTH / 2 -
            1) |
            0
        ] = 42;
        terrain.tiles[
          ((ry + ROOMSIZE_HEIGHT - 2) * terrain.width +
            rx +
            ROOMSIZE_WIDTH / 2) |
            0
        ] = 43;
        terrain.tiles[
          ((ry + ROOMSIZE_HEIGHT - 2) * terrain.width +
            rx +
            ROOMSIZE_WIDTH / 2 +
            1) |
            0
        ] = 44;

        terrain.portals.add(
          new Portal(
            rx + ROOMSIZE_WIDTH / 2 - 1,
            ry + ROOMSIZE_HEIGHT - 1,
            3,
            1,
            "..",
            0,
            0
          )
        );
      } else if (chance()) {
        drawCarpet(terrain, rx, ry);
      }
    }
  }

  drawWindows(terrain, layout);

  // Draw hallways
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      if (!layout[y * 3 + x]) {
        continue;
      }

      const rx = x * (ROOMSIZE_WIDTH + HORIZ_HALLWAYSIZE_WIDTH);
      const ry = y * (ROOMSIZE_HEIGHT + VERT_HALLWAYSIZE_HEIGHT);

      if (connections[y * 3 + x][0]) {
        // right
        terrain.tiles[
          ((ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2) | 0) *
            terrain.width +
            rx +
            ROOMSIZE_WIDTH -
            1
        ] = 10;
        terrain.tiles[
          ((ry + ROOMSIZE_HEIGHT / 2 + HORIZ_HALLWAYSIZE_HEIGHT / 2) | 0) *
            terrain.width +
            rx +
            ROOMSIZE_WIDTH -
            1
        ] = 5;
        terrain.tiles[
          ((ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2) | 0) *
            terrain.width +
            rx +
            ROOMSIZE_WIDTH -
            1 +
            HORIZ_HALLWAYSIZE_WIDTH +
            1
        ] = 11;
        terrain.tiles[
          ((ry + ROOMSIZE_HEIGHT / 2 + HORIZ_HALLWAYSIZE_HEIGHT / 2) | 0) *
            terrain.width +
            rx +
            ROOMSIZE_WIDTH -
            1 +
            HORIZ_HALLWAYSIZE_WIDTH +
            1
        ] = 6;
        terrain.fillArea(
          rx + ROOMSIZE_WIDTH,
          ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2,
          HORIZ_HALLWAYSIZE_WIDTH,
          1,
          14
        );
        terrain.fillArea(
          rx + ROOMSIZE_WIDTH,
          ry + ROOMSIZE_HEIGHT / 2 + HORIZ_HALLWAYSIZE_HEIGHT / 2,
          HORIZ_HALLWAYSIZE_WIDTH,
          1,
          9
        );
        terrain.fillArea(
          rx + ROOMSIZE_WIDTH - 1,
          ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 1,
          HORIZ_HALLWAYSIZE_WIDTH + 2,
          HORIZ_HALLWAYSIZE_HEIGHT - 1,
          1
        );

        // Fill the back wall
        for (
          let i = rx + ROOMSIZE_WIDTH - 1;
          i < rx + ROOMSIZE_WIDTH + HORIZ_HALLWAYSIZE_WIDTH + 1;
          i++
        ) {
          terrain.tiles[
            ((ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 1) |
              0) *
              terrain.width +
              i
          ] = 20 + (i % 3);
          terrain.tiles[
            ((ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 2) |
              0) *
              terrain.width +
              i
          ] = 25 + (i % 3);
          terrain.tiles[
            ((ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 3) |
              0) *
              terrain.width +
              i
          ] = 30 + (i % 3);
          terrain.tiles[
            ((ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 4) |
              0) *
              terrain.width +
              i
          ] = 35 + (i % 3);
        }

        terrain.hitmap.clearArea(
          rx + ROOMSIZE_WIDTH - 1,
          ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 5,
          HORIZ_HALLWAYSIZE_WIDTH + 2,
          HORIZ_HALLWAYSIZE_HEIGHT - 5
        );
      }
      if (connections[y * 3 + x][1]) {
        // bottom
        terrain.tiles[
          (ry + ROOMSIZE_HEIGHT - 1) * terrain.width +
            rx +
            ROOMSIZE_WIDTH / 2 -
            VERT_HALLWAYSIZE_WIDTH / 2
        ] = 6;
        terrain.tiles[
          (ry + ROOMSIZE_HEIGHT + VERT_HALLWAYSIZE_HEIGHT) * terrain.width +
            rx +
            ROOMSIZE_WIDTH / 2 -
            VERT_HALLWAYSIZE_WIDTH / 2
        ] = 11;
        terrain.tiles[
          (ry + ROOMSIZE_HEIGHT - 1) * terrain.width +
            rx +
            ROOMSIZE_WIDTH / 2 +
            VERT_HALLWAYSIZE_WIDTH / 2 -
            1
        ] = 5;
        terrain.tiles[
          (ry + ROOMSIZE_HEIGHT + VERT_HALLWAYSIZE_HEIGHT) * terrain.width +
            rx +
            ROOMSIZE_WIDTH / 2 +
            VERT_HALLWAYSIZE_WIDTH / 2 -
            1
        ] = 10;
        terrain.fillArea(
          rx + ROOMSIZE_WIDTH / 2 - VERT_HALLWAYSIZE_WIDTH / 2,
          ry + ROOMSIZE_HEIGHT,
          1,
          VERT_HALLWAYSIZE_HEIGHT,
          16
        );
        terrain.fillArea(
          rx + ROOMSIZE_WIDTH / 2 + VERT_HALLWAYSIZE_WIDTH / 2 - 1,
          ry + ROOMSIZE_HEIGHT,
          1,
          VERT_HALLWAYSIZE_HEIGHT,
          15
        );
        terrain.fillArea(
          rx + ROOMSIZE_WIDTH / 2 - VERT_HALLWAYSIZE_WIDTH / 2 + 1,
          ry + ROOMSIZE_HEIGHT - 1,
          VERT_HALLWAYSIZE_WIDTH - 2,
          VERT_HALLWAYSIZE_HEIGHT + 2 + 4,
          1
        );
        terrain.hitmap.clearArea(
          rx + ROOMSIZE_WIDTH / 2 - VERT_HALLWAYSIZE_WIDTH / 2 + 1,
          ry + ROOMSIZE_HEIGHT - 1,
          VERT_HALLWAYSIZE_WIDTH - 2,
          VERT_HALLWAYSIZE_HEIGHT + 2 + 4
        );
      }

      if (type === RegionType.Shop && y === 2 && x === 1) {
        drawShopLobby(terrain, rx, ry, r, chance);
      } else if (layout[y * 3 + x] === RoomType.Storage) {
        drawStorageRoom(terrain, rx, ry, r);
      }
    }
  }
}

function drawWindows(terrain: Terrain, layout: Array<RoomType>) {
  outer: for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const room = layout[i * 3 + j];

      // First, test that the room is windowable
      if (!room || room === RoomType.Stairs) {
        continue;
      }

      for (let k = 0; k < i; k++) {
        if (layout[k * 3 + j]) {
          continue outer;
        }
      }

      const y = i * (ROOMSIZE_HEIGHT + VERT_HALLWAYSIZE_HEIGHT) + 2;
      const xOffset = j * (ROOMSIZE_WIDTH + HORIZ_HALLWAYSIZE_WIDTH);
      for (let x = 4; x < ROOMSIZE_WIDTH - 2; x += 3) {
        terrain.tiles[y * terrain.width + x + xOffset] = 41;
        terrain.tiles[(y + 1) * terrain.width + x + xOffset] = 46;
      }
    }
  }
}

function drawCarpet(terrain: Terrain, x: number, y: number) {
  terrain.fillArea(x + 3, y + 7, ROOMSIZE_WIDTH - 6, ROOMSIZE_HEIGHT - 10, 48);

  terrain.tiles[(y + 7) * terrain.width + x + 3] = 42;
  terrain.tiles[(y + 7) * terrain.width + x + ROOMSIZE_WIDTH - 4] = 44;
  terrain.tiles[(y + ROOMSIZE_HEIGHT - 4) * terrain.width + x + 3] = 52;
  terrain.tiles[
    (y + ROOMSIZE_HEIGHT - 4) * terrain.width + x + ROOMSIZE_WIDTH - 4
  ] = 54;
  terrain.fillArea(x + 4, y + 7, ROOMSIZE_WIDTH - 8, 1, 43);
  terrain.fillArea(x + 4, y + ROOMSIZE_HEIGHT - 4, ROOMSIZE_WIDTH - 8, 1, 53);
  terrain.fillArea(x + 3, y + 8, 1, ROOMSIZE_HEIGHT - 12, 47);
  terrain.fillArea(x + ROOMSIZE_WIDTH - 4, y + 8, 1, ROOMSIZE_HEIGHT - 12, 49);
}

function drawShopLobby(
  terrain: Terrain,
  x: number,
  y: number,
  r: rng.RNG,
  chance: () => boolean
) {
  const halfRoom = (ROOMSIZE_WIDTH / 2) | 0;

  terrain.hitmap.fillArea(x + halfRoom - 2, y + 5, 5, 3);
  terrain.hitmap.clearArea(x + halfRoom - 1, y + 5, 3, 2);

  terrain.tiles[(y + 5) * terrain.width + x + halfRoom - 2] = 60;
  terrain.tiles[(y + 5) * terrain.width + x + halfRoom - 1] = 61;
  terrain.tiles[(y + 5) * terrain.width + x + halfRoom - 0] = 64;
  terrain.tiles[(y + 5) * terrain.width + x + halfRoom + 1] = 62;
  terrain.tiles[(y + 5) * terrain.width + x + halfRoom + 2] = 63;

  terrain.tiles[(y + 6) * terrain.width + x + halfRoom - 2] = 65;
  terrain.tiles[(y + 6) * terrain.width + x + halfRoom - 1] = 66;
  terrain.tiles[(y + 6) * terrain.width + x + halfRoom - 0] = 66;
  terrain.tiles[(y + 6) * terrain.width + x + halfRoom + 1] = 67;
  terrain.tiles[(y + 6) * terrain.width + x + halfRoom + 2] = 68;

  terrain.tiles[(y + 7) * terrain.width + x + halfRoom - 2] = 70;
  terrain.tiles[(y + 7) * terrain.width + x + halfRoom - 1] = 71;
  terrain.tiles[(y + 7) * terrain.width + x + halfRoom - 0] = 71;
  terrain.tiles[(y + 7) * terrain.width + x + halfRoom + 1] = 72;
  terrain.tiles[(y + 7) * terrain.width + x + halfRoom + 2] = 73;

  for (let i = x; i < x + ROOMSIZE_WIDTH; i++) {
    if (terrain.tiles[(y + 5) * terrain.width + i] !== 1) {
      continue;
    }

    if (r.range(10) < SHOP_LOBBY_CRATE_ODDS) {
      if (chance()) {
        terrain.tiles[(y + 5) * terrain.width + i] = 75 + r.range(4);
      } else {
        terrain.tiles[(y + 5) * terrain.width + i] = 56 + r.range(2);
      }
      terrain.hitmap.set(i, y + 5);
    }
  }

  for (let i = y; i < y + ROOMSIZE_HEIGHT - 2; i++) {
    if (terrain.tiles[i * terrain.width + x + 1] !== 1) {
      continue;
    }
    if (
      terrain.tiles[i * terrain.width + x] === 1 &&
      terrain.tiles[i * terrain.width + x + 2] === 1
    ) {
      continue;
    }
    if (r.range(10) < SHOP_LOBBY_POT_ODDS) {
      terrain.tiles[i * terrain.width + x + 1] = 59;
    }
  }
  for (let i = y + 5; i < y + ROOMSIZE_HEIGHT - 2; i++) {
    if (terrain.tiles[i * terrain.width + x + ROOMSIZE_WIDTH - 2] !== 1) {
      continue;
    }
    if (
      terrain.tiles[i * terrain.width + x + ROOMSIZE_WIDTH - 1] === 1 &&
      terrain.tiles[i * terrain.width + x + ROOMSIZE_WIDTH - 3] === 1
    ) {
      continue;
    }
    if (r.range(10) < SHOP_LOBBY_POT_ODDS) {
      terrain.tiles[i * terrain.width + x + ROOMSIZE_WIDTH - 2] = 59;
    }
  }
}
function drawStorageRoom(terrain: Terrain, x: number, y: number, r: rng.RNG) {
  const numChests = r.range(0, STORAGE_ROOM_MAX_CHESTS + 1);
  for (let i = 0; i < numChests; i++) {
    const chestX = r.range(0, ROOMSIZE_WIDTH - 1);
    const chestY = r.range(0, ROOMSIZE_HEIGHT - 5);

    if (terrain.tiles[(chestY + y) * terrain.width + chestX + x] !== 1) {
      i--;
      continue;
    }

    terrain.tiles[(chestY + y) * terrain.width + chestX + x] = 58;
    terrain.hitmap.set(chestX + x, chestY + y);
  }
}
