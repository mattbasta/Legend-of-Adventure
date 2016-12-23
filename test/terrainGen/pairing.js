const assert = require('assert');

const pairing = require('../../src/terrainGen/pairing');


describe('pairing', () => {
  describe('pairTileset', () => {
    it('should unpair correctly', () => {
      const seen = new Set();
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          for (let k = 0; k < 10; k++) {
            for (let l = 0; l < 10; l++) {
              const name = `${i}, ${j}, ${k}, ${l}`;
              const paired = pairing.pairTileset(i, j, k, l);
              assert.ok(!seen.has(paired), `Should not have encountered ${name} before (${paired})`);
              seen.add(paired);
              const [a, b, c, d] = pairing.unpairTileset(paired);
              assert.equal(a, i, `Expected valid mapping for pairing ${paired} (${name}) for position 1`);
              assert.equal(b, j, `Expected valid mapping for pairing ${paired} (${name}) for position 2`);
              assert.equal(c, k, `Expected valid mapping for pairing ${paired} (${name}) for position 3`);
              assert.equal(d, l, `Expected valid mapping for pairing ${paired} (${name}) for position 4`);
            }
          }
        }
      }
    });
  });
});
