import * as rng from "../rng";
import { Terrain } from "../terrain";
import * as featureTiles from "./featureTiles";
import * as pairing from "./pairing";

const roadWidth = 4;
const roadMaterial = 81;

const BUILDINGS_MIN = 9;
const BUILDINGS_MAX = 15;
// const BUILDINGS_MIN = 9;
// const BUILDINGS_MAX = 15;
const TOWN_MIN_EDGE = 10;
const TOWN_MAX_EDGE = 190;

const buildings = [
  "plaza",
  "well",
  // 'church',
  "clock",
  // 'library',
  "graveyard",
  "shop",
  "house",
];
const townCenters = ["plaza", "well"];
const repeatableBuildings = new Set(["shop", "house"]);

const borderConds: Array<
  (x: number, y: number, bounds: [number, number, number, number]) => boolean
> = [
  (x, y, bounds) => y > bounds[2],
  (x, y, bounds) => x < bounds[3],
  (x, y, bounds) => y < bounds[0],
  (x, y, bounds) => x > bounds[1],
];

const directionDefs = [
  [0, 0],
  [-1, 0],
  [-1, -1],
  [0, -1],
];

export default function (terrain: Terrain) {
  const buildingEntities: Record<string, featureTiles.FeatureTiles> = {};
  for (let building of buildings) {
    buildingEntities[building] = featureTiles.getFeatureTiles(building);
  }

  const availableBuildings = [...buildings];

  const r = new rng.MT(pairing.getCoordInt(terrain.x, terrain.y));

  const centerIndex = r.range(0, townCenters.length);
  const center = townCenters[centerIndex];
  const centerEntity = buildingEntities[center];

  const midpointX = (terrain.width / 2) | 0;
  const midpointY = (terrain.height / 2) | 0;

  const centerX = (midpointX - centerEntity.width / 2) | 0;
  const centerY = (midpointY - centerEntity.height / 2) | 0;

  const townBoundaries: [number, number, number, number] = [
    centerY,
    centerX + centerEntity.width,
    centerY + centerEntity.height + roadWidth,
    centerX,
  ];

  centerEntity.apply(terrain, centerX, centerY);
  delete buildingEntities[center];
  availableBuildings.splice(availableBuildings.indexOf(center), 1);

  const buildingLimit = r.range(BUILDINGS_MIN, BUILDINGS_MAX + 1);
  let buildingCount = 0;

  // The internal position is represented with a point that's located
  // somewhere along the internal spiral. Since this isn't the coordinate
  // that the building is actually going to be placed at (since the building's
  // actual location is potentially (x - width) or (y - height) from this
  // point), we use these defs to offset this point by the building's height
  // and width.

  let iteration = 0;
  while (
    townBoundaries[0] > TOWN_MIN_EDGE &&
    townBoundaries[0] < TOWN_MAX_EDGE &&
    townBoundaries[1] > TOWN_MIN_EDGE &&
    townBoundaries[1] < TOWN_MAX_EDGE &&
    townBoundaries[2] > TOWN_MIN_EDGE &&
    townBoundaries[2] < TOWN_MAX_EDGE &&
    townBoundaries[3] > TOWN_MIN_EDGE &&
    townBoundaries[3] < TOWN_MAX_EDGE &&
    buildingCount < buildingLimit
  ) {
    iteration += 1;

    const oldBoundaries: [number, number, number, number] = [...townBoundaries];
    for (let direction = 0; direction < 4; direction++) {
      let x: number;
      let y: number;

      switch (direction) {
        case 0:
          x = oldBoundaries[1] + roadWidth;
          y = oldBoundaries[0];
          break;
        case 1:
          x = oldBoundaries[1];
          y = oldBoundaries[2];
          break;
        case 2:
          x = oldBoundaries[3] - roadWidth;
          y = oldBoundaries[2];
          break;
        case 3:
          x = oldBoundaries[3];
          y = oldBoundaries[0] - roadWidth;
          break;
        default:
          throw new Error("Invalid direction");
      }

      let widestBuilding = 0;
      while (!borderConds[direction](x, y, oldBoundaries)) {
        const buildingIndex = r.range(0, availableBuildings.length);
        const building = availableBuildings[buildingIndex];
        const buildingEntity = buildingEntities[building];

        if (!repeatableBuildings.has(building)) {
          delete buildingEntities[building];
          availableBuildings.splice(buildingIndex, 1);
        }

        const [dirX, dirY] = directionDefs[direction];
        const bOffsetX = dirX * buildingEntity.width;
        const bOffsetY = dirY * buildingEntity.height;

        // Place the building on the grid
        buildingEntity.apply(terrain, x + bOffsetX, y + bOffsetY);

        switch (direction) {
          case 0:
            y += buildingEntity.height;
            if (buildingEntity.width > widestBuilding) {
              widestBuilding = buildingEntity.width;
            }

            break;
          case 1:
            x -= buildingEntity.width;
            if (buildingEntity.height > widestBuilding) {
              widestBuilding = buildingEntity.height;
            }

            break;
          case 2:
            y -= buildingEntity.height;
            if (buildingEntity.width > widestBuilding) {
              widestBuilding = buildingEntity.width;
            }

            break;
          case 3:
            x += buildingEntity.width;
            if (buildingEntity.height > widestBuilding) {
              widestBuilding = buildingEntity.height;
            }

            break;
        }

        buildingCount += 1;

        switch (direction) {
          case 0:
            terrain.fillArea(
              oldBoundaries[1],
              oldBoundaries[0],
              roadWidth,
              y - oldBoundaries[0],
              roadMaterial
            );
            if (y < townBoundaries[2]) {
              townBoundaries[2] = y;
            }
            townBoundaries[1] = x + widestBuilding;
            break;
          case 1:
            if (iteration === 1) {
              terrain.fillArea(
                x - buildingEntity.width,
                oldBoundaries[2] - roadWidth,
                Math.max(
                  oldBoundaries[1] - x + buildingEntity.width,
                  centerEntity.width + roadWidth
                ) | 0,
                roadWidth,
                roadMaterial
              );
            }
            terrain.fillArea(
              x - buildingEntity.width,
              y + widestBuilding,
              oldBoundaries[1] - x + buildingEntity.width,
              roadWidth,
              roadMaterial
            );
            if (x < townBoundaries[3]) {
              townBoundaries[3] = x;
            }
            townBoundaries[2] = y + widestBuilding + roadWidth;
            // Draw the extension of the road to the right
            terrain.fillArea(
              oldBoundaries[1],
              oldBoundaries[2],
              roadWidth,
              townBoundaries[2] - oldBoundaries[2],
              roadMaterial
            );
            break;
          case 2:
            terrain.fillArea(
              x,
              Math.min(y, oldBoundaries[0]) - roadWidth,
              roadWidth,
              Math.max(
                oldBoundaries[2] - y,
                oldBoundaries[2] - oldBoundaries[0]
              ),
              roadMaterial
            );
            townBoundaries[3] = x - widestBuilding;
            if (y > townBoundaries[0]) {
              townBoundaries[0] = y;
            }
            break;
          case 3:
            terrain.fillArea(
              oldBoundaries[3],
              y,
              Math.max(
                x - oldBoundaries[3],
                townBoundaries[1] - oldBoundaries[3]
              ) | 0,
              roadWidth,
              roadMaterial
            );
            if (x > townBoundaries[1]) {
              townBoundaries[1] = x;
            }
            townBoundaries[0] = y - widestBuilding;
            break;
        }

        if (buildingCount >= buildingLimit) {
          break;
        }
      }
    }
  }

  smoothRoads(terrain);
}

function isRoad(material: number) {
  return material === roadMaterial ? 1 : 0;
}

const roadMajorTiles = {
  [pairing.pairTileset(1, 1, 1, 1)]: 81,
  [pairing.pairTileset(1, 1, 0, 0)]: 85,
  [pairing.pairTileset(1, 0, 0, 1)]: 87,
  [pairing.pairTileset(0, 1, 1, 0)]: 75,
  [pairing.pairTileset(0, 0, 1, 1)]: 77,
  [pairing.pairTileset(1, 1, 0, 1)]: 86,
  [pairing.pairTileset(0, 1, 1, 1)]: 76,
  [pairing.pairTileset(1, 0, 1, 1)]: 82,
  [pairing.pairTileset(1, 1, 1, 0)]: 80,
};
const roadMinorTiles = {
  [pairing.pairTileset(0, 1, 1, 1)]: 78,
  [pairing.pairTileset(1, 0, 1, 1)]: 79,
  [pairing.pairTileset(1, 1, 0, 1)]: 83,
  [pairing.pairTileset(1, 1, 1, 0)]: 84,
};

function smoothRoads({ tiles, width, height }: Terrain) {
  const orig = tiles.slice(0);
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const cell = tiles[i * width + j];
      if (!isRoad(cell)) {
        continue;
      }

      const major = pairing.pairTileset(
        isRoad(orig[(i - 1) * width + j]),
        isRoad(orig[i * width + j + 1]),
        isRoad(orig[(i + 1) * width + j]),
        isRoad(orig[i * width + j - 1])
      );
      const majorTile = roadMajorTiles[major];
      if (!majorTile) {
        continue;
        continue;
      }

      if (majorTile !== roadMaterial) {
        tiles[i * width + j] = majorTile;
        continue;
      }

      const minor0 = isRoad(orig[(i - 1) * width + j - 1]);
      const minor1 = isRoad(orig[(i - 1) * width + j + 1]);
      const minor2 = isRoad(orig[(i + 1) * width + j - 1]);
      const minor3 = isRoad(orig[(i + 1) * width + j + 1]);

      if (minor0 && minor1 && minor2 && minor3) {
        continue;
      }

      const minor = pairing.pairTileset(minor0, minor1, minor2, minor3);
      const minorTile = roadMinorTiles[minor];
      if (!minorTile) {
        continue;
      }

      tiles[i * width + j] = minorTile;
    }
  }
}
