package terrain


// import "log"


const (
    ROOM_LOBBY = "lobby"
    ROOM_STAIRS = "stairs"
    ROOM_PLAIN = "room"

    ROOMSIZE_WIDTH = 15
    ROOMSIZE_HEIGHT = 15
    HORIZ_HALLWAYSIZE_WIDTH = 3
    HORIZ_HALLWAYSIZE_HEIGHT = 8
    VERT_HALLWAYSIZE_WIDTH = 5
    VERT_HALLWAYSIZE_HEIGHT = 3
)

type roomConnections [2]bool // right, bottom


func IsBuildingType(regType string) bool {
    return regType == REGIONTYPE_SHOP || regType == REGIONTYPE_HOUSE
}


func ApplyBuildingInterior(terrain *Terrain, buildingType, parent string) {
    stairsOdds, ok := buildingStairsOdds[buildingType]
    if !ok { stairsOdds = 3 }

    rng := GetNameRNG(parent + buildingType)

    hasStairs := rng.Intn(10) > stairsOdds

    layout := make([]string, 9)
    connections := make([]roomConnections, 9)

    setRoom := func(x, y int, value string) {
        layout[y * 3 + x] = value
    }
    filled := func(x, y int) bool {
        return layout[y * 3 + x] != ""
    }

    if buildingType == REGIONTYPE_SHOP {
        setRoom(1, 2, ROOM_LOBBY)
    } else {
        setRoom(1, 2, ROOM_PLAIN)
    }

    if Chance(rng) { setRoom(0, 2, ROOM_PLAIN) }
    if Chance(rng) || !filled(0, 2) { setRoom(2, 2, ROOM_PLAIN) }
    if buildingType != REGIONTYPE_SHOP && Chance(rng) { setRoom(1, 1, ROOM_PLAIN) }
    if (filled(0, 2) || filled(1, 1)) && Chance(rng) { setRoom(0, 1, ROOM_PLAIN) }
    if (filled(2, 2) || filled(1, 1)) && Chance(rng) { setRoom(2, 1, ROOM_PLAIN) }
    if filled(0, 1) && Chance(rng) { setRoom(0, 0, ROOM_PLAIN) }
    if filled(2, 1) && Chance(rng) { setRoom(2, 0, ROOM_PLAIN) }
    if (filled(0, 0) || filled(2, 0)) && Chance(rng) { setRoom(2, 0, ROOM_PLAIN) }

    if hasStairs {
        for i := 0; i < 9; i++ {
            if layout[i] != ROOM_PLAIN { continue }
            layout[i] = ROOM_STAIRS
            break
        }
    }

    for i := 0; i < 9; i++ {
        isEdge := i == 2 || i == 5 || i == 8
        isBottom := i > 5
        connections[i] = roomConnections{
            !isEdge && layout[i + 1] != "",
            !isBottom && layout[i + 3] != "" && !(buildingType == REGIONTYPE_SHOP && i == 4),
        }
    }

    fillHitmap(terrain, 0, 0, terrain.Width, terrain.Height)

    for y := 0; y < 3; y++ {
        for x := 0; x < 3; x++ {
            if layout[y * 3 + x] == "" { continue }

            rX, rY := x * (ROOMSIZE_WIDTH + HORIZ_HALLWAYSIZE_WIDTH), y * (ROOMSIZE_HEIGHT + VERT_HALLWAYSIZE_HEIGHT)

            fillHitmapInt(terrain, rX, rY, ROOMSIZE_WIDTH, ROOMSIZE_HEIGHT)

            // Draw the room borders
            terrain.Tiles[rY][rX] = 13
            terrain.Tiles[rY + ROOMSIZE_HEIGHT - 1][rX] = 8
            terrain.Tiles[rY][rX + ROOMSIZE_WIDTH - 1] = 12
            terrain.Tiles[rY + ROOMSIZE_HEIGHT - 1][rX + ROOMSIZE_WIDTH - 1] = 7
            fillAreaInt(terrain, rX + 1, rY, ROOMSIZE_WIDTH - 2, 1, 14)
            fillAreaInt(terrain, rX + 1, rY + ROOMSIZE_HEIGHT - 1, ROOMSIZE_WIDTH - 2, 1, 9)
            fillAreaInt(terrain, rX, rY + 1, 1, ROOMSIZE_HEIGHT - 2, 16)
            fillAreaInt(terrain, rX + ROOMSIZE_WIDTH - 1, rY + 1, 1, ROOMSIZE_HEIGHT - 2, 15)

            // Draw the back wall
            for i := rX + 1; i < rX + ROOMSIZE_WIDTH - 1; i++ {
                terrain.Tiles[rY + 1][i] = uint(20 + i % 3)
                terrain.Tiles[rY + 2][i] = uint(25 + i % 3)
                terrain.Tiles[rY + 3][i] = uint(30 + i % 3)
                terrain.Tiles[rY + 4][i] = uint(35 + i % 3)
            }

            // Draw the floor
            fillAreaInt(terrain, rX + 1, rY + 5, ROOMSIZE_WIDTH - 2, ROOMSIZE_HEIGHT - 6, 1)
            clearHitmapInt(terrain, rX + 1, rY + 5, ROOMSIZE_WIDTH - 2, ROOMSIZE_HEIGHT - 6)

            // Randomly draw a carpet
            if Chance(rng) {
                fillAreaInt(terrain, rX + 3, rY + 6, ROOMSIZE_WIDTH - 5, ROOMSIZE_HEIGHT - 9, 44)
            }

            // If this is the lobby, draw the entrance and add the exit portal
            if y == 2 && x == 1 {
                terrain.Tiles[rY + ROOMSIZE_HEIGHT - 2][rX + ROOMSIZE_WIDTH / 2] = 42
                terrain.Tiles[rY + ROOMSIZE_HEIGHT - 2][rX + ROOMSIZE_WIDTH / 2 + 1] = 43

                terrain.Portals = append(
                    terrain.Portals,
                    NewPortal(
                        uint(rX + ROOMSIZE_WIDTH / 2),
                        uint(rY + ROOMSIZE_HEIGHT - 1),
                        2, 1,
                        "..",
                        0, 0,
                    ),
                )
            }
        }
    }

    for y := 0; y < 3; y++ {
        for x := 0; x < 3; x++ {
            if layout[y * 3 + x] == "" { continue }

            rX, rY := x * (ROOMSIZE_WIDTH + HORIZ_HALLWAYSIZE_WIDTH), y * (ROOMSIZE_HEIGHT + VERT_HALLWAYSIZE_HEIGHT)


            // Draw hallways
            if connections[y * 3 + x][0] { // right
                terrain.Tiles[rY + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2][rX + ROOMSIZE_WIDTH - 1] = 10
                terrain.Tiles[rY + ROOMSIZE_HEIGHT / 2 + HORIZ_HALLWAYSIZE_HEIGHT / 2][rX + ROOMSIZE_WIDTH - 1] = 5
                terrain.Tiles[rY + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2][rX + ROOMSIZE_WIDTH - 1 + HORIZ_HALLWAYSIZE_WIDTH + 1] = 11
                terrain.Tiles[rY + ROOMSIZE_HEIGHT / 2 + HORIZ_HALLWAYSIZE_HEIGHT / 2][rX + ROOMSIZE_WIDTH - 1 + HORIZ_HALLWAYSIZE_WIDTH + 1] = 6
                fillAreaInt(terrain, rX + ROOMSIZE_WIDTH, rY + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2, HORIZ_HALLWAYSIZE_WIDTH, 1, 14)
                fillAreaInt(terrain, rX + ROOMSIZE_WIDTH, rY + ROOMSIZE_HEIGHT / 2 + HORIZ_HALLWAYSIZE_HEIGHT / 2, HORIZ_HALLWAYSIZE_WIDTH, 1, 9)
                fillAreaInt(terrain, rX + ROOMSIZE_WIDTH - 1, rY + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 1, HORIZ_HALLWAYSIZE_WIDTH + 2, HORIZ_HALLWAYSIZE_HEIGHT - 1, 1)

                // Fill the back wall
                for i := rX + ROOMSIZE_WIDTH - 1; i < rX + ROOMSIZE_WIDTH + HORIZ_HALLWAYSIZE_WIDTH + 1; i++ {
                    terrain.Tiles[rY + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 1][i] = uint(20 + i % 3)
                    terrain.Tiles[rY + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 2][i] = uint(25 + i % 3)
                    terrain.Tiles[rY + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 3][i] = uint(30 + i % 3)
                    terrain.Tiles[rY + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 4][i] = uint(35 + i % 3)
                }

                clearHitmapInt(terrain, rX + ROOMSIZE_WIDTH - 1, rY + ROOMSIZE_HEIGHT / 2 - HORIZ_HALLWAYSIZE_HEIGHT / 2 + 5, HORIZ_HALLWAYSIZE_WIDTH + 2, HORIZ_HALLWAYSIZE_HEIGHT - 5)

            }
            if connections[y * 3 + x][1] { // bottom
                terrain.Tiles[rY + ROOMSIZE_HEIGHT - 1][rX + ROOMSIZE_WIDTH / 2 - VERT_HALLWAYSIZE_WIDTH / 2] = 6
                terrain.Tiles[rY + ROOMSIZE_HEIGHT + VERT_HALLWAYSIZE_HEIGHT][rX + ROOMSIZE_WIDTH / 2 - VERT_HALLWAYSIZE_WIDTH / 2] = 11
                terrain.Tiles[rY + ROOMSIZE_HEIGHT - 1][rX + ROOMSIZE_WIDTH / 2 - 1 + VERT_HALLWAYSIZE_WIDTH / 2 + 1] = 5
                terrain.Tiles[rY + ROOMSIZE_HEIGHT + VERT_HALLWAYSIZE_HEIGHT][rX + ROOMSIZE_WIDTH / 2 - 1 + VERT_HALLWAYSIZE_WIDTH / 2 + 1] = 10
                fillAreaInt(terrain, rX + ROOMSIZE_WIDTH / 2 - VERT_HALLWAYSIZE_WIDTH / 2, rY + ROOMSIZE_HEIGHT, 1, VERT_HALLWAYSIZE_HEIGHT, 16)
                fillAreaInt(terrain, rX + ROOMSIZE_WIDTH / 2 + VERT_HALLWAYSIZE_WIDTH / 2, rY + ROOMSIZE_HEIGHT, 1, VERT_HALLWAYSIZE_HEIGHT, 15)
                fillAreaInt(terrain, rX + ROOMSIZE_WIDTH / 2 - VERT_HALLWAYSIZE_WIDTH / 2 + 1, rY + ROOMSIZE_HEIGHT - 1, VERT_HALLWAYSIZE_WIDTH - 2, VERT_HALLWAYSIZE_HEIGHT + 2 + 4, 1)
                clearHitmapInt(terrain, rX + ROOMSIZE_WIDTH / 2 - VERT_HALLWAYSIZE_WIDTH / 2 + 1, rY + ROOMSIZE_HEIGHT - 1, VERT_HALLWAYSIZE_WIDTH - 2, VERT_HALLWAYSIZE_HEIGHT + 2 + 4)
            }
        }
    }

}


func ApplyInteriorShop(terrain *Terrain) {
    GetFeatureTiles("interiors/shop").Apply(terrain, 0, 0)
}

func ApplyInteriorHouse(terrain *Terrain) {
    GetFeatureTiles("interiors/house").Apply(terrain, 0, 0)
}
