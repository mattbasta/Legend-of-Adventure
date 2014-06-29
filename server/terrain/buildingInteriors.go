package terrain


func ApplyInteriorShop(terrain *Terrain) {
    GetFeatureTiles("interiors/shop").Apply(terrain, 0, 0)
}

func ApplyInteriorHouse(terrain *Terrain) {
    GetFeatureTiles("interiors/house").Apply(terrain, 0, 0)
}
