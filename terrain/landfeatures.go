package terrain

func ApplyDungeonEntrance(terrain *Terrain) {
	rng := GetCoordRNG(float64(terrain.X), float64(terrain.Y))
	tiles := GetFeatureTiles("tilesets/dungeon_portal")
	tiles.Apply(
		terrain,
		rng.Intn(int(terrain.Width-tiles.Width-1)),
		rng.Intn(int(terrain.Height-tiles.Height-1)),
	)
}
