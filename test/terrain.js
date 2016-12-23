const assert = require('assert');

const terrain = require('../src/terrain');


describe('Hitmap', () => {
  it('should set and get properly', () => {
    const h = new terrain.Hitmap(10, 10);
    h.set(0, 0);
    h.set(0, 1);
    h.set(1, 1);
    h.set(2, 2);
    h.set(3, 3);
    h.set(4, 4);
    h.set(5, 5);
    h.set(6, 6);
    h.set(7, 7);
    h.set(8, 8);
    h.set(9, 9);

    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        assert.equal(
          h.get(i, j),
          i === j || i === 0 && j === 1,
          `Should have gotten the correct position for (${i}, ${j})`
        );
      }
    }
  });

  it('should convert to an array with toArray', () => {
    const h = new terrain.Hitmap(4, 4);
    h.set(0, 0);
    h.set(1, 1);
    h.set(2, 2);
    h.set(3, 3);

    assert.equal(
      JSON.stringify(h.toArray()),
      JSON.stringify([
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ])
    );
  });
});
