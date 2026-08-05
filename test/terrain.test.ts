import { describe, it } from "node:test";
import * as assert from "assert";

import { Hitmap } from "../src/terrain";

describe("Hitmap", () => {
  it("sets and gets properly", () => {
    const h = new Hitmap(10, 10);
    h.set(0, 0);
    h.set(0, 1);
    for (let i = 1; i < 10; i++) {
      h.set(i, i);
    }

    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        assert.strictEqual(
          h.get(i, j),
          i === j || (i === 0 && j === 1),
          `Should have gotten the correct position for (${i}, ${j})`,
        );
      }
    }
  });

  it("unsets properly", () => {
    const h = new Hitmap(10, 10);
    for (let i = 0; i < 8; i++) {
      h.set(0, i);
    }

    assert.ok(!h.get(0, 8));
    for (let i = 0; i < 8; i++) {
      assert.ok(h.get(0, i));
    }

    for (let i = 0; i < 8; i++) {
      h.unset(0, i);
    }
    for (let i = 0; i < 8; i++) {
      assert.ok(!h.get(0, i));
    }
  });

  it("converts to an array with toArray", () => {
    const h = new Hitmap(4, 4);
    h.set(0, 0);
    h.set(1, 1);
    h.set(2, 2);
    h.set(3, 3);

    assert.deepStrictEqual(h.toArray(), [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ]);
  });
});
