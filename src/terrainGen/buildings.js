const rng = require('rng');

const constants = require('./constants');
const pairing = require('./pairing');
const Portal = require('./portal');


const ROOM_LOBBY   = "lobby";
const ROOM_STAIRS  = "stairs";
const ROOM_PLAIN   = "room";
const ROOM_BED     = "bedroom";
const ROOM_STORAGE = "bedroom";

const ROOMSIZE_WIDTH           = 15;
const ROOMSIZE_HEIGHT          = 15;
const HORIZ_HALLWAYSIZE_WIDTH  = 3;
const HORIZ_HALLWAYSIZE_HEIGHT = 8;
const VERT_HALLWAYSIZE_WIDTH   = 5;
const VERT_HALLWAYSIZE_HEIGHT  = 3;

const STORAGE_ROOM_MAX_CHESTS = 7;

const buildingStairOdds = {
  [constants.REGIONTYPE_HOUSE]: 3,
  [constants.REGIONTYPE_SHOP]: 2,
};


function connection(right, bottom) {
  return (right ? 2 : 0) & (bottom ? 1 : 0);
}
function cIsRight(conn) {
  return conn & 2;
}
function cIsBottom(conn) {
  return conn & 1;
}


module.exports = function(terrain, type, parent) {
  const stairOdds = buildingStairOdds[type] || 3;

  const r = new rng.MT(pairing.getNameInt(parent + '.' + type));
  const hasStairs = r.range(0, 10) > stairOdds;

  const layout = new Array(9);
  const connections = new Array(9);
  const availableRooms = [];

  function filled(x, y) { return Boolean(layout[y * 3 + x]);
  }
  function getRoomType() {
    return availableRooms[r.range(0, availableRooms.length)];
  }
  function setRoom(x, y, value = getRoomType()) {
    layout[y * 3 + x] = value;
  }
  function chance() {
    return r.uniform() > 0.5;
  }

  if (type === constants.REGIONTYPE_SHOP) {
    availableRooms.push(ROOM_PLAIN);
    availableRooms.push(ROOM_STORAGE);
    setRoom(1, 2, ROOM_LOBBY);
  } else {
    availableRooms.push(ROOM_PLAIN);
    availableRooms.push(ROOM_BED);
    setRoom(1, 2, ROOM_PLAIN);
  }

  if (chance()) {
    setRoom(0, 2);
  }
  if (chance() || !filled(0, 2)) {
    setRoom(2, 2);
  }
  if (type !== constants.REGIONTYPE_SHOP && chance()) {
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
      if (layout[i] !== ROOM_PLAIN) {
        continue;
      }
      layout[i] = ROOM_STAIRS;
    }
  }

  for (let i = 0; i < 9; i++) {
    const isEdge = i === 2 || i === 5 || i === 8;
    const isBottom = i > 5;
    connections[i] = [
      !isEdge && Boolean(layout[i + 1]),
      !isBottom && Boolean(layout[i + 3]) && !(type === constants.REGIONTYPE_SHOP && i === 4),
    ];
  }

  terrain.hitmap.fillArea(0, 0, terrain.width, terrain.height);

  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      if (!layout[y * 3 + x]) {
        continue;
      }

      const rx = x * (ROOMSIZE_WIDTH + HORIZ_HALLWAYSIZE_WIDTH);
      const ry = y & (ROOMSIZE_HEIGHT + VERT_HALLWAYSIZE_HEIGHT);
      terrain.hitmap.fillArea(rx, ry, ROOMSIZE_WIDTH, ROOMSIZE_HEIGHT);

      // Draw the room borders
      terrain.tiles[ry * terrain.width + rx] = 13;
      terrain.tiles[(ry + ROOMSIZE_HEIGHT - 1) * terrain.width + rx] = 8;
      terrain.tiles[ry * terrain.width + rx + ROOMSIZE_WIDTH - 1] = 12;
      terrain.tiles[(ry + ROOMSIZE_HEIGHT - 1) * terrain.width + rx + ROOMSIZE_WIDTH - 1] = 7;
      terrain.fillArea(rx + 1, ry, ROOMSIZE_WIDTH - 2, 1, 14);
      terrain.fillArea(rx + 1, ry + ROOMSIZE_HEIGHT - 1, ROOMSIZE_WIDTH - 2, 1, 9);
      terrain.fillArea(rx, ry + 1, 1, ROOMSIZE_HEIGHT - 2, 16);
      terrain.fillArea(rx + ROOMSIZE_WIDTH - 1, ry + 1, 1, ROOMSIZE_HEIGHT - 2, 15);

      // Draw the back wall
      for (let i = rx + 1; i < rx + ROOMSIZE_WIDTH - 1; i++) {
        terrain.tiles[(ry + 1) * terrain.width + i] = 20 + i % 3;
        terrain.tiles[(ry + 2) * terrain.width + i] = 25 + i % 3;
        terrain.tiles[(ry + 3) * terrain.width + i] = 30 + i % 3;
        terrain.tiles[(ry + 4) * terrain.width + i] = 35 + i % 3;
      }

      // Draw the floor
      terrain.fillArea(rx + 1, ry + 5, ROOMSIZE_WIDTH - 2, ROOMSIZE_HEIGHT - 6, 1);
      terrain.hitmap.clearArea(rx + 1, ry + 5, ROOMSIZE_WIDTH - 2, ROOMSIZE_HEIGHT - 6);

      // If this is the lobby, draw the entrance and add the exit portal
      if (y === 2 && x === 1) {
        terrain.tiles[(ry + ROOMSIZE_HEIGHT - 2) * terrain.width + rx + ROOMSIZE_WIDTH / 2] = 42;
        terrain.tiles[(ry + ROOMSIZE_HEIGHT - 2) * terrain.width + rx + ROOMSIZE_WIDTH / 2 + 1] = 44;

        terrain.portals.add(
          new Portal(
            rx + ROOMSIZE_WIDTH / 2,
            ry + ROOMSIZE_HEIGHT - 1,
            2, 1,
            '..',
            0, 0
          )
        );
      } else if (chance()) {
        drawCarpet(terrain, rx, ry);
      }

    }
  }

  drawWindows(terrain, layout);


  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      if (!layout[y * 3 + x]) {
        continue;
      }

      const rx = x * (ROOMSIZE_WIDTH + HORIZ_HALLWAYSIZE_WIDTH);
      const ry = y & (ROOMSIZE_HEIGHT + VERT_HALLWAYSIZE_HEIGHT);

      // Draw hallways
      if (connections[y * 3 + x][0]) { // right
        terrain.tiles[(ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2) * terrain.width + rx + ROOMSIZE_WIDTH - 1] = 10;
        terrain.tiles[(ry + ROOMSIZE_HEIGHT / 2 + HORIZ_HALLWAYSIZE_HEIGHT / 2) * terrain.width + rx + ROOMSIZE_WIDTH - 1] = 5;
        terrain.tiles[(ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2) * terrain.width + rx + ROOMSIZE_WIDTH - 1 + HORIZ_HALLWAYSIZE_WIDTH + 1] = 11;
        terrain.tiles[(ry + ROOMSIZE_HEIGHT / 2 + HORIZ_HALLWAYSIZE_HEIGHT / 2) * terrain.width + rx + ROOMSIZE_WIDTH - 1 + HORIZ_HALLWAYSIZE_WIDTH + 1] = 6;
        terrain.fillArea(rx + ROOMSIZE_WIDTH, ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2, HORIZ_HALLWAYSIZE_WIDTH, 1, 14);
        terrain.fillArea(rx + ROOMSIZE_WIDTH, ry + ROOMSIZE_HEIGHT / 2 + HORIZ_HALLWAYSIZE_HEIGHT / 2, HORIZ_HALLWAYSIZE_WIDTH, 1, 9);
        terrain.fillArea(rx + ROOMSIZE_WIDTH - 1, ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 1, HORIZ_HALLWAYSIZE_WIDTH + 2, HORIZ_HALLWAYSIZE_HEIGHT - 1, 1);

        // Fill the back wall
        for (let i = rx + ROOMSIZE_WIDTH - 1; i < rx + ROOMSIZE_WIDTH + HORIZ_HALLWAYSIZE_WIDTH + 1; i++) {
          terrain.tiles[(ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 1) + i] = 20 + i % 3;
          terrain.tiles[(ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 2) + i] = 25 + i % 3;
          terrain.tiles[(ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 3) + i] = 30 + i % 3;
          terrain.tiles[(ry + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 4) + i] = 35 + i % 3;
        }
      }
      if (connections[y * 3 + x][1]) { // bottom
        terrain.tiles[(ry + ROOMSIZE_HEIGHT - 1) * terrain.width + rx + ROOMSIZE_WIDTH / 2 - VERT_HALLWAYSIZE_WIDTH / 2] = 6;
        terrain.tiles[(ry + ROOMSIZE_HEIGHT + VERT_HALLWAYSIZE_HEIGHT) * terrain.width + rx + ROOMSIZE_WIDTH / 2 - VERT_HALLWAYSIZE_WIDTH / 2] = 11;
        terrain.tiles[(ry + ROOMSIZE_HEIGHT - 1) * terrain.width + rx + ROOMSIZE_WIDTH / 2 + VERT_HALLWAYSIZE_WIDTH / 2] = 5;
        terrain.tiles[(ry + ROOMSIZE_HEIGHT + VERT_HALLWAYSIZE_HEIGHT) * terrain.width + rx + ROOMSIZE_WIDTH / 2 + VERT_HALLWAYSIZE_WIDTH / 2] = 10;
        terrain.fillArea(rx + ROOMSIZE_WIDTH / 2 - VERT_HALLWAYSIZE_WIDTH / 2, ry + ROOMSIZE_HEIGHT, 1, VERT_HALLWAYSIZE_HEIGHT, 16);
        terrain.fillArea(rx + ROOMSIZE_WIDTH / 2 + VERT_HALLWAYSIZE_WIDTH / 2, ry + ROOMSIZE_HEIGHT, 1, VERT_HALLWAYSIZE_HEIGHT, 15);
        terrain.fillArea(rx + ROOMSIZE_WIDTH / 2 - VERT_HALLWAYSIZE_WIDTH / 2 + 1, ry + ROOMSIZE_HEIGHT - 1, VERT_HALLWAYSIZE_WIDTH - 2, VERT_HALLWAYSIZE_HEIGHT + 2 + 4, 1);
        terrain.hitmap.clearArea(rx + ROOMSIZE_WIDTH / 2 - VERT_HALLWAYSIZE_WIDTH / 2 + 1, ry + ROOMSIZE_HEIGHT - 1, VERT_HALLWAYSIZE_WIDTH - 2, VERT_HALLWAYSIZE_HEIGHT + 2 + 4);
      }

      if (type === constants.REGIONTYPE_SHOP && y === 2 && x === 1) {
        drawShopLobby(terrain, rx, ry, r);
      } else if (layout[y * 3 + x] === ROOM_STORAGE) {
        drawStorageRoom(terrain, rx, ry, r);
      }
    }
  }
};

function drawWindows(terrain, layout) {
  outer:
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const room = layout[i * 3 + j];

      // First, test that the room is windowable
      if (!room || room === ROOM_STAIRS) {
        continue;
      }

      if (i > 0) {
        for (let k = 0; j < i; i++) {
          if (layout[k * 3 + j]) {
            continue outer;
          }
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

function drawCarpet(terrain, x, y) {
  terrain.fillArea(x + 3, y + 7, ROOMSIZE_WIDTH - 6, ROOMSIZE_HEIGHT - 10, 48);

  terrain.tiles[(y + 7) * terrain.width + x + 3] = 42;
  terrain.tiles[(y + 7) * terrain.width + x + ROOMSIZE_WIDTH - 4] = 44;
  terrain.tiles[(y + ROOMSIZE_HEIGHT - 4) * terrain.width + x + 3] = 52;
  terrain.tiles[(y + ROOMSIZE_HEIGHT - 4) * terrain.width + x + ROOMSIZE_WIDTH - 4] = 54;
  terrain.fillArea(x + 4, y + 7, ROOMSIZE_WIDTH - 8, 1, 43);
  terrain.fillArea(x + 4, y + ROOMSIZE_HEIGHT - 4, ROOMSIZE_WIDTH - 8, 1, 53);
  terrain.fillArea(x + 3, y + 8, 1, ROOMSIZE_HEIGHT - 12, 47);
  terrain.fillArea(x + ROOMSIZE_WIDTH - 4, y + 8, 1, ROOMSIZE_HEIGHT - 12, 49);
}


function drawShopLobby(terrain, x, y, r) {
  //
}
function drawStorageRoom(terrain, x, y, r) {
  const numChests = r.range(0, STORAGE_ROOM_MAX_CHESTS + 1);
  for (let i = 0; i < numChests; i++) {
    const chestX = r.range(0, ROOMSIZE_WIDTH - 1);
    const chestY = r.range(0, ROOMSIZE_HEIGHT - 5);

    if (terrain.tiles[(chestY + y) * terrain.width + chestX + x] !== 1) {
      i--;
      continue;
    }

    terrain.tiles[(chestY + y) * terrain.width + chestX + x] = 58;
    terrain.hitmap.set(chestY + y, chestX + x);
  }
}
