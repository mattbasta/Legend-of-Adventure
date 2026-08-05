import { describe, it } from "node:test";
import * as assert from "assert";

import { pairTileset, unpairTileset } from "../src/terrainGen/pairing.ts";

describe("pairing", () => {
  it("pairTileset round-trips and never collides", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        for (let k = 0; k < 10; k++) {
          for (let l = 0; l < 10; l++) {
            const name = `${i}, ${j}, ${k}, ${l}`;
            const paired = pairTileset(i, j, k, l);
            assert.ok(
              !seen.has(paired),
              `Should not have encountered ${name} before (${paired})`,
            );
            seen.add(paired);
            assert.deepStrictEqual(
              unpairTileset(paired),
              [i, j, k, l],
              `Expected valid mapping for pairing ${paired} (${name})`,
            );
          }
        }
      }
    }
  });
});
