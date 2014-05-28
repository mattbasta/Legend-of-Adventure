package terrain

import (
    "math"
    "math/rand"
)

var PERIOD = 256

var F2 = 0.5 * (math.Sqrt(3.0) - 1.0)
var G2 = (3.0 - math.Sqrt(3.0)) / 6.0

var GRAD3 = [...][3]int{
    {1,1,0},{-1,1,0},{1,-1,0},{-1,-1,0},
    {1,0,1},{-1,0,1},{1,0,-1},{-1,0,-1},
    {0,1,1},{0,-1,1},{0,1,-1},{0,-1,-1},
    {1,1,0},{0,-1,1},{-1,1,0},{0,-1,-1},
}


type NoiseGenerator struct {
    Seed int
    Permutation []int
}

func NewNoiseGenerator(seed int) *NoiseGenerator {
    gen := new(NoiseGenerator)
    gen.Seed = seed
    gen.Permutation = make([]int, PERIOD)

    rng := rand.New(rand.NewSource(int64(seed)))
    for i, _ := range gen.Permutation {
        swapPos := rng.Intn(PERIOD-1)
        gen.Permutation[i], gen.Permutation[swapPos] = gen.Permutation[swapPos], gen.Permutation[i]
    }

    // Double the permutation
    gen.Permutation = append(gen.Permutation, gen.Permutation...)

    return gen
}

func (self NoiseGenerator) Get2D(x, y float64) float64 {
    // int i1, j1, I, J, c;
    s := (x + y) * F2
    i := math.Floor(x + s)
    j := math.Floor(y + s)
    t := (i + j) * G2

    xx := [3]float64{0.0, 0.0, 0.0}
    yy := [3]float64{0.0, 0.0, 0.0}
    f := [3]float64{0.0, 0.0, 0.0}
    noise := [3]float64{0.0, 0.0, 0.0}

    g := [3]int{0, 0, 0}

    xx[0] = x - (i - t)
    yy[0] = y - (j - t)

    i1 := 0
    if xx[0] > yy[0] {
        i1 = 1
    }
    j1 := 0
    if xx[0] <= yy[0] {
        j1 = 1
    }

    xx[2] = xx[0] + G2 * 2.0 - 1.0
    yy[2] = yy[0] + G2 * 2.0 - 1.0
    xx[1] = xx[0] - float64(i1) + G2
    yy[1] = yy[0] - float64(j1) + G2

    I := int(i) & 255
    J := int(j) & 255
    g[0] = self.Permutation[I + self.Permutation[J]] % 12
    g[1] = self.Permutation[I + i1 + self.Permutation[J + j1]] % 12
    g[2] = self.Permutation[I + 1 + self.Permutation[J + 1]] % 12

    for c := 0; c <= 2; c++ {
        f[c] = 0.5 - xx[c] * xx[c] - yy[c] * yy[c]
    }

    for c := 0; c <= 2; c++ {
        if f[c] > 0 {
            noise[c] = f[c]*f[c]*f[c]*f[c] * (float64(GRAD3[g[c]][0]) * xx[c] + float64(GRAD3[g[c]][1]) * yy[c])
        }
    }

    return (noise[0] + noise[1] + noise[2]) * 70.0
}

func (self NoiseGenerator) Get2DInt(x, y int, max uint) uint {
    point := (self.Get2D(float64(x) / PERLIN_FREQUENCY, float64(y) / PERLIN_FREQUENCY) + 1.0) / 2.0
    return uint(point * float64(max))
}

func (self NoiseGenerator) FillGrid(grid *[][]uint, max uint) {
    for i := 0; i < len(*grid); i++ {
        row := (*grid)[i]
        for j := 0; j < len(row); j++ {
            row[j] = self.Get2DInt(i, j, max - TERRAIN_PERLIN_INCREASE) + TERRAIN_PERLIN_INCREASE
        }
    }
}
