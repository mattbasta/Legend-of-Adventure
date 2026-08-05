// Typings for the untyped CJS "rng" package (mersenne twister et al).
declare module "rng" {
  interface RNGInstance {
    next(): number; // Get a random byte [0,255]
    random(): number; // Math.random()-style API for uniform()
    uniform(): number; // Uniform random number between 0 and 1
    normal(): number; // Normally distributed number, mean 0, variance 1
    range(max: number): number; // Random integer in [0, max)
    range(min: number, max: number): number; // Random integer in [min, max)
    exp(): number; // Exponentially distributed number with lambda 1
    poisson(mean?: number): number; // Poisson distributed number
  }
  const rng: {
    MT: new (seed?: number) => RNGInstance;
  };
  export = rng;
}
