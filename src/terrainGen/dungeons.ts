import * as rng from "../rng";
import {
  DUNGEON_ANGEL_ODDS,
  DUNGEON_BOSS_ODDS,
  DUNGEON_MAX_SIZE,
  DUNGEON_MIN_SIZE,
  DUNGEON_STAIRS_DOWN_ODDS,
  DUNGEON_STATUE_ODDS,
  getCoordRNG,
  Terrain,
} from "../terrain";
import * as pairing from "./pairing";
import { Portal } from "./portal";

const movableDirections: Array<[0 | 1 | -1, 0 | 1 | -1]> = [
  [0, 1],
  [1, 0],
  [0, -1],
  [0, 1],
];

function passageToIndex(x: number, y: number) {
  if (y === 1) {
    return 0;
  } else if (y === -1) {
    return 2;
  } else if (x === 1) {
    return 1;
  } else {
    return 3;
  }
}

enum DungeonRoomType {
  Room = "room",
  Lobby = "lobby",
  Treasure = "treasure",
  Stairwell = "stairwell",
  Boss = "boss",
}

// Rooms can randomly be any of these types. These rooms aren't special
// and have no limit per dungeon level.
const commonRoomTypes = [
  DungeonRoomType.Room,
  DungeonRoomType.Lobby,
  DungeonRoomType.Treasure,
];

class DungeonRoom {
  // top, right, bottom, left
  passages: [boolean, boolean, boolean, boolean] = [false, false, false, false];
  type: DungeonRoomType = DungeonRoomType.Room;
  initial: boolean = false;
  defined: boolean = false;
  parent: [number, number] | null = null;
  outboundPassages: number = 0;
  toBeProcessed: boolean = false;

  hasPassage(x: number, y: number) {
    return this.passages[passageToIndex(x, y)];
  }
}

class DungeonLayout {
  grid: Array<Array<DungeonRoom>>;
  entranceX: number;
  entranceY: number;

  constructor(parent: string) {
    const r = new rng.MT(pairing.getNameInt(parent));
    const dWidth =
      r.range(DUNGEON_MAX_SIZE - DUNGEON_MIN_SIZE) + DUNGEON_MIN_SIZE;
    const dHeight =
      r.range(DUNGEON_MAX_SIZE - DUNGEON_MIN_SIZE) + DUNGEON_MIN_SIZE;

    this.grid = new Array(dHeight);
    for (let i = 0; i < dHeight; i++) {
      this.grid[i] = new Array(dWidth);
      for (let j = 0; j < dWidth; j++) {
        this.grid[i][j] = new DungeonRoom();
      }
    }

    this.entranceY = r.range(dHeight);
    this.entranceX = r.range(dWidth);

    const roomsToProcess: Array<[number, number]> = [
      [this.entranceX, this.entranceY],
    ];
    this.grid[this.entranceY][this.entranceX].toBeProcessed = true;

    // Helper function to determine if a passage can be built
    const canMove = (x: number, y: number, dirX: number, dirY: number) => {
      // You can't build a passage if it would lead out of the grid.
      if (
        x + dirX < 0 ||
        x + dirX >= dWidth ||
        y + dirY < 0 ||
        y + dirY >= dHeight
      ) {
        return false;
      }
      return !(
        // No if the passage already exists
        (
          this.grid[y][x].passages[passageToIndex(dirX, dirY)] ||
          // No if the passage leads to a defined or staged room
          this.grid[y + dirY][x + dirX].defined ||
          this.grid[y + dirY][x + dirX].toBeProcessed
        )
      );
    };

    // Helper function to build a room
    const buildRoom = (x: number, y: number, room: DungeonRoom) => {
      room.defined = true;
      room.initial = x - this.entranceX === 0 && y - this.entranceY === 0;

      if (room.initial) {
        room.type = DungeonRoomType.Lobby;
      } else {
        room.type = commonRoomTypes[r.range(commonRoomTypes.length)];
      }

      const directions = [...movableDirections];
      rng.shuffledIndices(r, movableDirections.length).forEach((v, i) => {
        directions[v] = movableDirections[i];
      });

      let viableDirections = directions.filter(([dirX, dirY]) =>
        canMove(x, y, dirX, dirY)
      );
      if (!room.initial && viableDirections.length > 1) {
        viableDirections = viableDirections.slice(
          0,
          r.range(viableDirections.length - 1) + 1
        );
      }
      room.outboundPassages = viableDirections.length;
      for (const direction of viableDirections) {
        // Define a passage between rooms
        room.passages[passageToIndex(...direction)] = true;

        // Define the reverse passage from the other room
        const oppositeX = x + direction[0];
        const oppositeY = y + direction[1];
        const otherRoom = this.grid[oppositeY][oppositeX];
        otherRoom.passages[
          passageToIndex(direction[0] * -1, direction[1] * -1)
        ] = true;
        otherRoom.parent = [x, y];
        roomsToProcess.push([oppositeX, oppositeY]);
        otherRoom.toBeProcessed = true;
      }
    };

    while (roomsToProcess.length) {
      const nextRoomIndex = r.range(roomsToProcess.length);
      const nextRoom = roomsToProcess[nextRoomIndex];
      const nextRoomObj = this.grid[nextRoom[1]][nextRoom[0]];
      roomsToProcess.splice(nextRoomIndex, 1);
      buildRoom(nextRoom[0], nextRoom[1], nextRoomObj);
      nextRoomObj.toBeProcessed = false;
    }

    const terminalRooms = [];
    for (const gridColumn of this.grid) {
      for (const room of gridColumn) {
        if (room.outboundPassages === 0) {
          terminalRooms.push(room);
        }
      }
    }

    if (r.range(10) <= DUNGEON_STAIRS_DOWN_ODDS) {
      const room = terminalRooms[r.range(terminalRooms.length)];
      room.type = DungeonRoomType.Stairwell;
    }

    // Generate boss room
    if (terminalRooms.length > 0 && r.range(10) <= DUNGEON_BOSS_ODDS) {
      const roomIndex = r.range(terminalRooms.length);
      terminalRooms[roomIndex].type = DungeonRoomType.Boss;
      terminalRooms.splice(roomIndex, 1);
    }
    // Generate angel room
    if (terminalRooms.length > 0 && r.range(10) <= DUNGEON_ANGEL_ODDS) {
      const roomIndex = r.range(terminalRooms.length);
      terminalRooms[roomIndex].type = DungeonRoomType.Boss;
      terminalRooms.splice(roomIndex, 1);
    }
  }
}

export function applyDungeon(parent: string, terrain: Terrain) {
  const layout = getDungeonLayout(parent);
  const roomX = terrain.x + layout.entranceX;
  const roomY = terrain.y + layout.entranceY;
  if (roomY >= layout.grid.length || roomX >= layout.grid[roomY].length) {
    return;
  }

  // Fill the dungeon with the default color (1)
  terrain.fillArea(0, 0, terrain.width, terrain.height, 1);
  terrain.hitmap.fillArea(0, 0, terrain.width, terrain.height);

  // Draw the main floor
  terrain.fillArea(4, 4, terrain.width - 8, terrain.height - 8, 0);
  terrain.fillArea(4, terrain.height - 4, terrain.width - 8, 1, 6);
  terrain.hitmap.clearArea(4, 4, terrain.width - 8, terrain.height - 8);

  const room = layout.grid[roomY][roomX];

  if (room.hasPassage(0, 1)) {
    terrain.fillArea(12, 24, 4, 4, 0);
    terrain.hitmap.clearArea(12, 24, 4, 4);
  }
  if (room.hasPassage(1, 0)) {
    terrain.fillArea(24, 12, 4, 4, 0);
    terrain.fillArea(24, 16, 4, 1, 6);
    terrain.hitmap.clearArea(24, 12, 4, 4);
  }
  if (room.hasPassage(0, -1)) {
    terrain.fillArea(12, 0, 4, 4, 0);
    terrain.hitmap.clearArea(12, 0, 4, 4);
  }
  if (room.hasPassage(-1, 0)) {
    terrain.fillArea(0, 12, 4, 4, 0);
    terrain.fillArea(0, 16, 4, 1, 6);
    terrain.hitmap.clearArea(0, 12, 4, 4);
  }

  if (room.type === DungeonRoomType.Lobby) {
    terrain.fillArea(11, 9, 6, 6, 10);
    terrain.fillArea(13, 10, 1, 1, 15);
    terrain.portals.add(
      new Portal(
        12,
        9,
        2,
        2,
        "..",
        14,
        14 // TODO: figure out what to do with this
      )
    );
  } else if (room.type === DungeonRoomType.Stairwell) {
    console.log('Generating new dungeon portal');
    terrain.fillArea(11, 9, 6, 6, 10);
    terrain.fillArea(13, 12, 1, 1, 11);
    terrain.portals.add(new Portal(12, 9, 2, 2, "dungeon:0:0", 14, 14));
  }

  const r = getCoordRNG(terrain.x, terrain.y);

  // Randomly crack some of the tiles in a dungeon
  let i = 15;
  while (i) {
    const x = r.range(terrain.width);
    const y = r.range(terrain.height);
    const coord = y * terrain.width + x;
    if (terrain.tiles[coord] === 0) {
      terrain.tiles[coord] = 5;
      i--;
    }
  }

  // Randomly place statues
  if (room.type === DungeonRoomType.Room && r.range(10) > DUNGEON_STATUE_ODDS) {
    while (true) {
      const x = r.range(terrain.width);
      const y = r.range(terrain.height - 1) + 1;
      if (
        terrain.tiles[y * terrain.width + x] === 0 &&
        terrain.tiles[(y - 1) * terrain.width + x] === 0
      ) {
        const statue = r.range(3);
        terrain.tiles[(y - 1) * terrain.width + x] = statue + 2;
        terrain.hitmap.set(x, y - 1);
        terrain.tiles[y * terrain.width + x] = statue + 7;
        terrain.hitmap.set(x, y);
        break;
      }
    }
  }
}

const layoutCache: Record<string, DungeonLayout> = {};

export function getDungeonLayout(parent: string) {
  if (layoutCache[parent]) {
    return layoutCache[parent];
  }

  const layout = new DungeonLayout(parent);
  layoutCache[parent] = layout;

  return layout;
}
