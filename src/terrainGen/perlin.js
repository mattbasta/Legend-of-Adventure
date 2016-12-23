const rng = require('rng');


const TERRAIN_PERLIN_PERIOD     = 256;
const TERRAIN_PERLIN_PERIOD_M1  = TERRAIN_PERLIN_PERIOD - 1;
const TERRAIN_PERLIN_MAX        = 6;
const PERLIN_FREQUENCY          = 0.1;
const PERLIN_DILATION           = 3;
const PERLIN_BIOME_FREQUENCY    = 0.0075;
const PERLIN_UPLIFT             = 5;


function lerp(a, b, v) {
  return a * (1 - v) + b * v;
}

function smooth(v) {
  return v * v * (3 - 2 * v);
}

function randomGradient(rng) {
  const v = rng.uniform() * Math.PI * 2;
  return [Math.cos(v), Math.sin(v)];
}

// TODO: Break grad into two params
function gradient(ox, oy, grad, px, py) {
  return grad[0] * (px - ox) + grad[1] * (py - oy);
}

// Ported from the Go source: https://golang.org/src/math/rand/rand.go?s=5071:5103#L154
function seededPermutation(rng, maxExclusive) {
  const values = new Uint16Array(maxExclusive);
  for (let i = 0; i < maxExclusive; i++) {
    const j = rng.range(0, i);
    values[i] = values[j];
    values[j] = i;
  }
  return values;
}


exports.NoiseGenerator = class NoiseGenerator {
  constructor(seed) {
    this.seed = seed;
    this.rng = new rng.MT(seed);

    this.permutations = seededPermutation(this.rng, TERRAIN_PERLIN_PERIOD);

    this.rgradients = new Array(TERRAIN_PERLIN_PERIOD);
    for (let i = 0; i < TERRAIN_PERLIN_PERIOD; i++) {
      this.rgradients[i] = randomGradient(this.rng);
    }
  }

  getGradient(x, y) {
    const idx = this.permutations[x & TERRAIN_PERLIN_PERIOD_M1] + this.permutations[y & TERRAIN_PERLIN_PERIOD_M1];
    return this.rgradients[idx & TERRAIN_PERLIN_PERIOD_M1]
  }

  get2d(x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const gradients0 = this.getGradient(x0, y0);
    const gradients1 = this.getGradient(x1, y0);
    const gradients2 = this.getGradient(x0, y1);
    const gradients3 = this.getGradient(x1, y1);

    const v0 = gradient(x0, y0, gradients0, x, y);
    const v1 = gradient(x0 + 1, y0, gradients1, x, y);
    const v2 = gradient(x0, y0 + 1, gradients2, x, y);
    const v3 = gradient(x0 + 1, y0 + 1, gradients3, x, y);
    const fx = smooth(x - x0);
    const vx0 = lerp(v0, v1, fx);
    const vx1 = lerp(v2, v3, fx);
    const fy = smooth(y - y0);
    return lerp(vx0, vx1, fy);
  }

  get2dNormal(x, y, max) {
    const v = this.get2d(x * PERLIN_FREQUENCY, y * PERLIN_FREQUENCY) * 0.5 + 0.5;
    return Math.pow(v, PERLIN_DILATION) * max;
  }

  getCentered2d(x, y, freq, bounds) {
    return this.get2d(x * freq, y * freq) * bounds;
  }

  fillGrid(x, y, grid, width, height, max) {
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        grid[i * width + j] = (
          this.get2dNormal(x + j, y + i, max - 1) +
          this.getCentered2d(x + j, y + i, PERLIN_BIOME_FREQUENCY, max - 1) +
          PERLIN_UPLIFT
        );
      }
    }
  }
};
