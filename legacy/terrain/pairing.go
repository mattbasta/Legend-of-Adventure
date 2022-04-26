package terrain

import "hash/crc32"
import "math/rand"

func GetCoordRNG(x, y float64) *rand.Rand {
	seed := GetCoordInt(int(x), int(y))
	return rand.New(rand.NewSource(int64(seed)))
}

func GetCoordInt(x, y int) int {
	// Cantor pairing function
	return (x+y)*(x+y+1)/2 + y
}

func GetCoordOption(x, y, oneInXChance int) bool {
	return GetCoordInt(x, y)%oneInXChance == 0
}

func GetNameRNG(name string) *rand.Rand {
	seed := GetNameInt(name)
	return rand.New(rand.NewSource(int64(seed)))
}

func GetNameInt(name string) int {
	h := crc32.NewIEEE()
	h.Write([]byte(name))
	return int(h.Sum32())
}

func GetNameChance(name string, oneInXChance int) bool {
	return GetNameInt(name)%oneInXChance == 0
}

func Chance(rng *rand.Rand) bool {
	return rng.Intn(2) == 0
}
