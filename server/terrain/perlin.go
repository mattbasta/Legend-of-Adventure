package terrain

import (
    "math"
    "math/rand"
)

var PERIOD = 512

var _F2 = 0.5 * (math.Sqrt(3.0) - 1.0)
var _G2 = (3.0 - math.Sqrt(3.0)) / 6.0

var _GRAD3 = [...]struct{
    x int
    y int
    z int
}{
    {1,1,0},{-1,1,0},{1,-1,0},{-1,-1,0},
    {1,0,1},{-1,0,1},{1,0,-1},{-1,0,-1},
    {0,1,1},{0,-1,1},{0,1,-1},{0,-1,-1},
    {1,1,0},{0,-1,1},{-1,1,0},{0,-1,-1}}


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
    // Skew input space to determine which simplex (triangle) we are in
    s := (x + y) * _F2
    i := math.Floor(x + s)
    j := math.Floor(y + s)
    t := (i + j) * _G2
    x0 := x - (i - t) // "Unskewed" distances from cell origin
    y0 := y - (j - t)

    i1, j1 := 0.0, 0.0
    if x0 > y0 { // Lower triangle, XY order: (0,0)->(1,0)->(1,1)
        i1 = 1.0
        j1 = 0.0
    } else { // Upper triangle, YX order: (0,0)->(0,1)->(1,1)
        i1 = 0.0
        j1 = 1.0
    }

    x1 := x0 - i1 + _G2 // Offsets for middle corner in (x,y) unskewed coords
    y1 := y0 - j1 + _G2
    x2 := x0 + _G2 * 2.0 - 1.0 // Offsets for last corner in (x,y) unskewed coords
    y2 := y0 + _G2 * 2.0 - 1.0

    // Determine hashed gradient indices of the three simplex corners
    ii := int(i) % PERIOD
    jj := int(j) % PERIOD
    gi0 := self.Permutation[ii + self.Permutation[jj]] % 12
    gi1 := self.Permutation[ii + int(i1) + self.Permutation[jj + int(j1)]] % 12
    gi2 := self.Permutation[ii + 1 + self.Permutation[jj + 1]] % 12

    // Calculate the contribution from the three corners
    tt := 0.5 - math.Pow(x0, 2) - math.Pow(y0, 2)

    var g struct{x, y, z int}
    noise := 0.0
    if tt > 0 {
        g = _GRAD3[gi0]
        noise = math.Pow(tt, 4) * (float64(g.x) * x0 + float64(g.y) * y0)
    }

    tt = 0.5 - math.Pow(x1, 2) - math.Pow(y1, 2)
    if tt > 0 {
        g = _GRAD3[gi1]
        noise = noise + math.Pow(tt, 4) * (float64(g.x) * x1 + float64(g.y) * y1)
    }

    tt = 0.5 - math.Pow(x2, 2) - math.Pow(y2, 2)
    if tt > 0 {
        g = _GRAD3[gi2]
        noise += math.Pow(tt, 4) * (float64(g.x) * x2 + float64(g.y) * y2)
    }

    return noise * 70.0 // scale noise to [-1, 1]
}

func (self NoiseGenerator) Get2DInt(x, y int, max uint) uint {
    point := (self.Get2D(float64(x), float64(y)) + 1.0) / 2.0
    return uint(point * float64(max))
}

func (self NoiseGenerator) FillGrid(grid *[][]uint, max uint) {
    for i := 0; i < len(*grid); i++ {
        row := (*grid)[i]
        for j := 0; j < len(row); j++ {
            row[j] = self.Get2DInt(i, j, max)
        }
    }
}
