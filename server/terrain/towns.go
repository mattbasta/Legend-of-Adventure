package terrain

import (
    "log"
    "math/rand"
)

var buildings = [...]string{
    "plaza",
    "well",
    // "church",
    "clock",
    // "library",
    "graveyard",
    "shop",
    "house",
}
var townCenters = [...]string{
    "plaza",
    "well",
}
var repeatableBuildings = map[string]bool{
    "shop": true,
    "house": true,
}

var roadWidth uint = 4
var roadMaterial uint = 81

var roadMajorTiles = Tileset{
    Tile{1, 1, 1, 1}: 81,
    Tile{1, 1, 0, 0}: 85,
    Tile{1, 0, 0, 1}: 87,
    Tile{0, 1, 1, 0}: 75,
    Tile{0, 0, 1, 1}: 77,
    Tile{1, 1, 0, 1}: 86,
    Tile{0, 1, 1, 1}: 76,
    Tile{1, 0, 1, 1}: 82,
    Tile{1, 1, 1, 0}: 80,
}
var roadMinorTiles = Tileset{
    Tile{0, 1, 1, 1}: 78,
    Tile{1, 0, 1, 1}: 79,
    Tile{1, 1, 0, 1}: 83,
    Tile{1, 1, 1, 0}: 84,
}

var directionDefs = [4][2]int{
    [2]int{0, 0},
    [2]int{-1, 0},
    [2]int{-1, -1},
    [2]int{0, -1},
}

func isRoad(val uint) uint {
    if val == roadMaterial {
        return 1
    } else {
        return 0
    }
}

func isRoadMaterial(val uint) uint {
    if val > 77 && val < 88 {
        return 1
    } else {
        return 0
    }
}


func smoothRoads(tiles [][]uint) {
    rowLen := len(tiles[0])
    for i := 1; i < len(tiles) - 1; i++ {
        for j := 1; j < rowLen - 1; j++ {
            cell := tiles[i][j]
            if isRoad(cell) != 1 {
                continue
            }

            major := Tile{
                isRoad(tiles[i - 1][j]),
                isRoad(tiles[i][j + 1]),
                isRoad(tiles[i + 1][j]),
                isRoad(tiles[i][j - 1]),
            }
            newValue, newValOk := roadMajorTiles[major]
            if !newValOk {
                continue
            }
            if newValue != roadMaterial {
                tiles[i][j] = newValue
            }

            minor := Tile{
                isRoad(tiles[i - 1][j - 1]),
                isRoad(tiles[i - 1][j + 1]),
                isRoad(tiles[i + 1][j - 1]),
                isRoad(tiles[i + 1][j + 1]),
            }
            if minor[0] == 1 && minor[1] == 1 && minor[2] == 1 && minor[3] == 1 {
                continue
            }
            tiles[i][j] = roadMinorTiles[minor]
        }
    }
}

func fillRoad(terrain *Terrain, x, y, w, h uint) {
    var i, j uint
    for i = 0; i < h; i++ {
        for j = 0; j < w; j++ {
            terrain.Tiles[i + y][j + x] = roadMaterial
        }
    }
}


func ApplyTown(terrain *Terrain) {
    buildingEntities := make(map[string]*FeatureTiles)
    for _, buildingType := range buildings {
        buildingEntities[buildingType] = GetFeatureTiles(buildingType)
    }

    availableBuildings := make([]string, len(buildings))
    for i, building := range buildings {
        availableBuildings[i] = building
    }

    // TODO: Initialize portal slice here

    // TODO: Use a real pairing function
    rng := rand.New(rand.NewSource(int64(terrain.X * terrain.Y)))

    centerIndex := rng.Intn(len(townCenters))
    center := townCenters[centerIndex]
    centerEntity := buildingEntities[center]

    midpointX, midpointY := uint(terrain.Width / 2), uint(terrain.Height / 2)

    // There is no need for `floor` here because `/` on uint returns uint.
    centerX := uint(midpointY - centerEntity.Width / 2)
    centerY := uint(midpointX - centerEntity.Height / 2)

    // Boundaries are in the form (top, right, bottom, left)
    townBoundaries := [...]uint{
        centerY,
        centerX + centerEntity.Width,
        centerY + centerEntity.Height + roadWidth,
        centerX,
    }

    log.Println("Drawing " + center)
    centerEntity.Apply(terrain, int(centerX), int(centerY))

    // TODO: Add portal overlay code here

    delete(buildingEntities, center)
    availableBuildings = append(availableBuildings[:centerIndex], availableBuildings[centerIndex+1:]...)

    buildingLimit := rng.Intn(BUILDINGS_MAX - BUILDINGS_MIN) + BUILDINGS_MIN
    buildingCount := 0

    // The internal position is represented with a point that's located
    // somewhere along the internal spiral. Since this isn't the coordinate
    // that the building is actually going to be placed at (since the building's
    // actual location is potentially (x - width) or (y - height) from this
    // point), we use these defs to offset this point by the building's height
    // and width.

    iteration := 0

    for (townBoundaries[0] > TOWN_MIN_EDGE && townBoundaries[0] < TOWN_MAX_EDGE &&
         townBoundaries[1] > TOWN_MIN_EDGE && townBoundaries[1] < TOWN_MAX_EDGE &&
         townBoundaries[2] > TOWN_MIN_EDGE && townBoundaries[2] < TOWN_MAX_EDGE &&
         townBoundaries[3] > TOWN_MIN_EDGE && townBoundaries[3] < TOWN_MAX_EDGE &&
         buildingCount <= buildingLimit) {

        iteration += 1

        oldBoundaries := [...]uint{
            townBoundaries[0],
            townBoundaries[1],
            townBoundaries[2],
            townBoundaries[3],
        }

        // 0 - down, 1 - left, 2 - up, 3 - right
        for direction := 0; direction < 4; direction++ {
            var x, y uint

            switch direction {
                case 0:
                    x, y = oldBoundaries[1] + roadWidth, oldBoundaries[0]
                case 1:
                    x, y = oldBoundaries[1], oldBoundaries[2]
                case 2:
                    x, y = oldBoundaries[3] - roadWidth, oldBoundaries[2]
                case 3:
                    x, y = oldBoundaries[3], oldBoundaries[0] - roadWidth
            }

            // Set conditions (per direction) for when the town border has been
            // surpassed.
            borderConds := [...]func(x, y uint) bool{
                func(x, y uint) bool { return y > oldBoundaries[2] },
                func(x, y uint) bool { return x < oldBoundaries[3] },
                func(x, y uint) bool { return y < oldBoundaries[0] },
                func(x, y uint) bool { return x > oldBoundaries[1] },
            }

            var widestBuilding uint = 0
            for !borderConds[direction](x, y) {
                buildingIndex := rng.Intn(len(availableBuildings))
                building := availableBuildings[buildingIndex]
                buildingEntity := buildingEntities[building]

                if _, ok := repeatableBuildings[building]; !ok {
                    delete(buildingEntities, building)
                    availableBuildings = append(availableBuildings[:buildingIndex], availableBuildings[buildingIndex+1:]...)
                }

                bOffsetX, bOffsetY := directionDefs[direction][0], directionDefs[direction][1]
                bOffsetX *= int(buildingEntity.Width)
                bOffsetY *= int(buildingEntity.Height)

                // Place the building on the grid
                buildingEntity.Apply(terrain, int(x) + bOffsetX, int(y) + bOffsetY)

                // TODO: Place portal overlay code here

                switch direction {
                case 0:
                    y += buildingEntity.Height
                    if buildingEntity.Width > widestBuilding {
                        widestBuilding = buildingEntity.Width
                    }
                case 1:
                    x -= buildingEntity.Width
                    if buildingEntity.Height > widestBuilding {
                        widestBuilding = buildingEntity.Height
                    }
                case 2:
                    y -= buildingEntity.Height
                    if buildingEntity.Width > widestBuilding {
                        widestBuilding = buildingEntity.Width
                    }
                case 3:
                    x += buildingEntity.Width
                    if buildingEntity.Height > widestBuilding {
                        widestBuilding = buildingEntity.Height
                    }
                }

                buildingCount++

                switch direction {
                case 0:
                    fillRoad(
                        terrain,
                        oldBoundaries[1],
                        oldBoundaries[0],
                        roadWidth, y - oldBoundaries[0],
                    )
                    if y < townBoundaries[2] {
                        townBoundaries[2] = y
                    }
                    townBoundaries[1] = x + widestBuilding
                case 1:
                    if iteration == 1 {
                        fillRoad(
                            terrain,
                            x - buildingEntity.Width,
                            oldBoundaries[2] - roadWidth,
                            UintMax(
                                oldBoundaries[1] - x + buildingEntity.Width,
                                centerEntity.Width + roadWidth,
                            ),
                            roadWidth,
                        )
                    }
                    fillRoad(
                        terrain,
                        x - buildingEntity.Width,
                        y + widestBuilding,
                        oldBoundaries[1] - x + buildingEntity.Width,
                        roadWidth,
                    )
                    if x < townBoundaries[3] {
                        townBoundaries[3] = x
                    }
                    townBoundaries[2] = y + widestBuilding + roadWidth
                    // Draw the extension of the road to the right.
                    fillRoad(
                        terrain,
                        oldBoundaries[1],
                        oldBoundaries[2],
                        roadWidth,
                        townBoundaries[2] - oldBoundaries[2],
                    )
                case 2:
                    fillRoad(
                        terrain,
                        x,
                        UintMin(y, oldBoundaries[0]),
                        roadWidth,
                        UintMax(
                            oldBoundaries[2] - y,
                            oldBoundaries[2] - oldBoundaries[0],
                        ),
                    )
                    townBoundaries[3] = x - widestBuilding
                    if y > townBoundaries[0] {
                        townBoundaries[0] = y
                    }
                case 3:
                    fillRoad(
                        terrain,
                        oldBoundaries[3],
                        y,
                        UintMax(
                            x - oldBoundaries[3],
                            townBoundaries[1] - oldBoundaries[3],
                        ),
                        roadWidth,
                    )
                    if x > townBoundaries[1] {
                        townBoundaries[1] = x
                    }
                    townBoundaries[0] = y - widestBuilding
                }

                if buildingCount > buildingLimit {
                    break
                }

            }

        }
    }

    smoothRoads(terrain.Tiles)

}
