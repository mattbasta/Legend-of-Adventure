// Parts of this file were created by nsf on GitHub
// https://gist.github.com/nsf/1170424

package terrain

import (
    "log"
    "math"
    "math/rand"
)

const PI = 3.1415926535

type Vec2 struct {
    X, Y float64
}

func lerp(a, b, v float64) float64 {
    return a * (1 - v) + b * v
}

func smooth(v float64) float64 {
    return v * v * (3 - 2 * v)
}

func random_gradient(r *rand.Rand) Vec2 {
    v := r.Float64() * PI * 2
    return Vec2{
        float64(math.Cos(v)),
        float64(math.Sin(v)),
    }
}

func gradient(orig, grad, p Vec2) float64 {
    sp := Vec2{p.X - orig.X, p.Y - orig.Y}
    return grad.X * sp.X + grad.Y * sp.Y
}

type NoiseGenerator struct {
    rgradients []Vec2
    permutations []int
    gradients [4]Vec2
    origins [4]Vec2
}

func NewNoiseGenerator(seed int) *NoiseGenerator {
    log.Println("seed", seed)
    rng := rand.New(rand.NewSource(int64(seed)))

    gen := new(NoiseGenerator)
    gen.rgradients = make([]Vec2, TERRAIN_PERLIN_PERIOD)
    gen.permutations = rng.Perm(TERRAIN_PERLIN_PERIOD)
    for i := range gen.rgradients {
        gen.rgradients[i] = random_gradient(rng)
    }

    return gen
}

func (self *NoiseGenerator) get_gradient(x, y int) Vec2 {
    idx := self.permutations[x & (TERRAIN_PERLIN_PERIOD - 1)] + self.permutations[y & (TERRAIN_PERLIN_PERIOD - 1)]
    return self.rgradients[idx & (TERRAIN_PERLIN_PERIOD - 1)]
}

func (self *NoiseGenerator) get_gradients(x, y float64) {
    x0f := math.Floor(float64(x))
    y0f := math.Floor(float64(y))
    x0 := int(x0f)
    y0 := int(y0f)
    x1 := x0 + 1
    y1 := y0 + 1

    self.gradients[0] = self.get_gradient(x0, y0)
    self.gradients[1] = self.get_gradient(x1, y0)
    self.gradients[2] = self.get_gradient(x0, y1)
    self.gradients[3] = self.get_gradient(x1, y1)

    self.origins[0] = Vec2{float64(x0f + 0.0), float64(y0f + 0.0)}
    self.origins[1] = Vec2{float64(x0f + 1.0), float64(y0f + 0.0)}
    self.origins[2] = Vec2{float64(x0f + 0.0), float64(y0f + 1.0)}
    self.origins[3] = Vec2{float64(x0f + 1.0), float64(y0f + 1.0)}
}

func (self *NoiseGenerator) Get2D(x, y float64) float64 {
    p := Vec2{x, y}
    self.get_gradients(x, y)
    v0 := gradient(self.origins[0], self.gradients[0], p)
    v1 := gradient(self.origins[1], self.gradients[1], p)
    v2 := gradient(self.origins[2], self.gradients[2], p)
    v3 := gradient(self.origins[3], self.gradients[3], p)
    fx := smooth(x - self.origins[0].X)
    vx0 := lerp(v0, v1, fx)
    vx1 := lerp(v2, v3, fx)
    fy := smooth(y - self.origins[0].Y)
    return lerp(vx0, vx1, fy)
}

func (self *NoiseGenerator) Get2DInt(x, y int, max uint) int {
    v := self.Get2D(float64(x) * PERLIN_FREQUENCY, float64(y) * PERLIN_FREQUENCY)
    v = v * 0.5 + 0.5
    v = math.Pow(v, PERLIN_DILATION)
    return int(v * float64(max))
}

func (self *NoiseGenerator) GetCentered2DInt(x, y int, freq float64, bounds uint) int {
    v := self.Get2D(float64(x) * freq, float64(y) * freq)
    // v = math.Pow(v, PERLIN_DILATION)
    return int(v * float64(bounds))
}

func (self *NoiseGenerator) FillGrid(x, y int, grid *[][]uint, max uint) {
    // log.Println("Perlin for ", x, y)
    // log.Println(self.Get2D(0 * PERLIN_FREQUENCY, 0 * PERLIN_FREQUENCY) * 100)
    // log.Println(self.Get2D(float64(x) * PERLIN_FREQUENCY, float64(y) * PERLIN_FREQUENCY) * 100)
    for i := 0; i < len(*grid); i++ {
        for j := 0; j < len((*grid)[i]); j++ {
            (*grid)[i][j] = uint(
                // self.Get2DInt(x + j, y + i, max - 1) +
                self.GetCentered2DInt(x + j, y + i, PERLIN_BIOME_FREQUENCY, max - 1) +
                PERLIN_UPLIFT,
            )
        }
    }
}
