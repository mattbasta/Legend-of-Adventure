package terrain

import (
    "math/rand"
)


func ApplyDungeonEntrance(terrain *Terrain) {
    rng := rand.New(rand.NewSource(int64(terrain.X * terrain.Y)))
    tiles := GetFeatureTiles("dungeon_portal")
    tiles.Apply(
        terrain,
        rng.Intn(int(terrain.Width - tiles.Width - 1)),
        rng.Intn(int(terrain.Height - tiles.Height - 1)))
}
