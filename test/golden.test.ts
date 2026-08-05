import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { describe, it } from "node:test";
import * as assert from "assert";

import { getCoordOption, Terrain } from "../src/terrain";
import { RegionType, WorldType } from "../src/terrainGen/constants";
import { Region } from "../src/regions";

// Terrain generation is fully deterministic (seeded by region coordinates),
// which makes it a regression oracle for the modernization work: any change
// to generated tiles, hitmaps, or portals is a behavior change and must be
// reviewed. Regenerate with UPDATE_GOLDEN=1 after intentional changes.
const GOLDEN_DIR = path.resolve("test", "golden");

// Mirrors the (unexported) isTownPos/isDungeonPos logic in src/regions.ts so
// the snapshots reflect what the live server generates for these coordinates.
const isTownPos = (x: number, y: number) =>
  (x === 0 && y === 0) || getCoordOption(x, y, 9);
const isDungeonPos = (x: number, y: number) =>
  (x === 1 && y === 0) || getCoordOption(x, y, 14);

interface TerrainHost {
  type: RegionType;
  parentID: string;
  x: number;
  y: number;
  town: boolean;
  dungeonEntrance: boolean;
}

function generate(host: TerrainHost) {
  const regionLike = {
    type: host.type,
    parentID: host.parentID,
    x: host.x,
    y: host.y,
    isTown: () => host.town,
    isDungeonEntrance: () => host.dungeonEntrance,
  } as unknown as Region;
  const terrain = new Terrain(regionLike);
  return {
    tiles: Array.from(terrain.tiles),
    hitmap: terrain.hitmap.toArray(),
    // Capture the full portal state (serialize() omits the destination
    // coordinates, which matter for gameplay).
    portals: Array.from(terrain.portals).map((portal) => ({
      ...portal.serialize(),
      destX: portal.destX,
      destY: portal.destY,
    })),
  };
}

const field = (x: number, y: number): TerrainHost => ({
  type: RegionType.Field,
  parentID: WorldType.Overworld,
  x,
  y,
  town: isTownPos(x, y),
  dungeonEntrance: isDungeonPos(x, y),
});

const CASES: Record<string, TerrainHost> = {
  // (0, 0) is always a town; (1, 0) is always a dungeon entrance.
  "field-town-0-0": field(0, 0),
  "field-dungeon-entrance-1-0": field(1, 0),
  // (2, 1) is neither (verified against getCoordOption).
  "field-plain-2-1": field(2, 1),
  "dungeon-interior": {
    type: RegionType.Dungeon,
    parentID: `${WorldType.Overworld},${RegionType.Field}:1:0`,
    x: 0,
    y: 0,
    town: false,
    dungeonEntrance: false,
  },
  house: {
    type: RegionType.House,
    parentID: `${WorldType.Overworld},${RegionType.Field}:0:0`,
    x: 0,
    y: 0,
    town: false,
    dungeonEntrance: false,
  },
  shop: {
    type: RegionType.Shop,
    parentID: `${WorldType.Overworld},${RegionType.Field}:0:0`,
    x: 0,
    y: 0,
    town: false,
    dungeonEntrance: false,
  },
};

const sha256 = (data: string) =>
  crypto.createHash("sha256").update(data).digest("hex");

describe("terrain golden masters", () => {
  for (const [name, host] of Object.entries(CASES)) {
    it(name, () => {
      const goldenPath = path.join(GOLDEN_DIR, `${name}.json`);
      const actual = JSON.stringify(generate(host));

      if (process.env.UPDATE_GOLDEN) {
        fs.mkdirSync(GOLDEN_DIR, { recursive: true });
        fs.writeFileSync(goldenPath, actual + "\n");
        return;
      }

      assert.ok(
        fs.existsSync(goldenPath),
        `Missing golden file ${goldenPath}; run with UPDATE_GOLDEN=1 to create it`
      );
      const expected = fs.readFileSync(goldenPath, "utf-8").trimEnd();
      assert.strictEqual(
        sha256(actual),
        sha256(expected),
        `Generated terrain for "${name}" no longer matches ${goldenPath}. ` +
          `If this change is intentional, regenerate with UPDATE_GOLDEN=1 ` +
          `and review the diff.`
      );
    });
  }

  it("generation is deterministic across repeated runs", () => {
    const first = JSON.stringify(generate(field(0, 0)));
    const second = JSON.stringify(generate(field(0, 0)));
    assert.strictEqual(first, second);
  });
});
