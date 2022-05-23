const rng = require('rng'); // ts-ignore

export interface RNG {
  new(seed: number): RNG;

  next(): number; // Get a random byte [0,255]
  random(): number; // Same as uniform(), just to be compatible with the Math.random() style API
  uniform(): number; // Get a uniform random number between 0 and 1
  normal(): number; // Get normally distributed number, with a mean 0, variance 1
  range( max: number ): number; // Get random integer up to max
  range( min: number, max: number ): number; // Get random integer in range [min,max]

  exp(): number; // Get exponentionally distributed number with lambda 1
  poisson( mean: number ): number; // Get poisson distributed number, the mean defaulting to 1
}

export const MT: RNG = rng.MT;

// This is the same as `rand.Perm` in Go
export function shuffledIndices(rng: RNG, n: number) {
  const arr = new Array(n);
  for (let i = 0; i < n; i++){
    const j = rng.range(i + 1);
    arr[i] = arr[j];
    arr[j] = i;
  }
  return arr;
}
