package terrain


func ApplyDungeonEntrance(terrain *Terrain) {
    tiles := GetFeatureTiles("dungeon_portal")
    tiles.Apply(terrain, 0, 0)
}
