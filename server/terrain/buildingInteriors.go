package terrain


import "log"
import "math/rand"


const (
    ROOM_LOBBY = "lobby"
    ROOM_STAIRS = "stairs"
    ROOM_PLAIN = "room"
    ROOM_BED = "bedroom"
    ROOM_STORAGE = "bedroom"

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

    var availableRooms []string

    setRoom := func(x, y int, value string) {
        layout[y * 3 + x] = value
    }
    filled := func(x, y int) bool {
        return layout[y * 3 + x] != ""
    }
    getRoomType := func() string {
        return availableRooms[rng.Intn(len(availableRooms))]
    }

    if buildingType == REGIONTYPE_SHOP {
        availableRooms = []string {
            ROOM_PLAIN,
            ROOM_STORAGE,
        }
        setRoom(1, 2, ROOM_LOBBY)
    } else {
        availableRooms = []string {
            ROOM_PLAIN,
            ROOM_BED,
        }
        setRoom(1, 2, ROOM_PLAIN)
    }

    if Chance(rng) { setRoom(0, 2, getRoomType()) }
    if Chance(rng) || !filled(0, 2) { setRoom(2, 2, getRoomType()) }
    if buildingType != REGIONTYPE_SHOP && Chance(rng) { setRoom(1, 1, getRoomType()) }
    if (filled(0, 2) || filled(1, 1)) && Chance(rng) { setRoom(0, 1, getRoomType()) }
    if (filled(2, 2) || filled(1, 1)) && Chance(rng) { setRoom(2, 1, getRoomType()) }
    if filled(0, 1) && Chance(rng) { setRoom(0, 0, getRoomType()) }
    if filled(2, 1) && Chance(rng) { setRoom(2, 0, getRoomType()) }
    if (filled(0, 0) || filled(2, 0)) && Chance(rng) { setRoom(2, 0, getRoomType()) }

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

            // If this is the lobby, draw the entrance and add the exit portal
            if y == 2 && x == 1 {
                terrain.Tiles[rY + ROOMSIZE_HEIGHT - 2][rX + ROOMSIZE_WIDTH / 2] = 42
                terrain.Tiles[rY + ROOMSIZE_HEIGHT - 2][rX + ROOMSIZE_WIDTH / 2 + 1] = 44

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
            } else if Chance(rng) {
                drawCarpet(terrain, rX, rY)
            }
        }
    }
    drawWindows(terrain, layout)

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

    // Draw room furnishings
    for y := 0; y < 3; y++ {
        for x := 0; x < 3; x++ {
            roomType := layout[y * 3 + x]
            if roomType == "" { continue }

            rX, rY := x * (ROOMSIZE_WIDTH + HORIZ_HALLWAYSIZE_WIDTH), y * (ROOMSIZE_HEIGHT + VERT_HALLWAYSIZE_HEIGHT)

            if buildingType == REGIONTYPE_SHOP && y == 2 && x == 1 {
                drawShopLobby(terrain, rX, rY, rng)
            } else if roomType == ROOM_STORAGE {
                drawStorageRoom(terrain, rX, rY, rng)
            }

        }
    }

}

func drawWindows(terrain *Terrain, layout []string) {
    for i := 0; i < 3; i++ {
        Outer:
        for j := 0; j < 3; j++ {
            room := layout[i * 3 + j]

            // First, test that the room is windowable
            if room == "" || room == ROOM_STAIRS {
                log.Println("Skipping room at ", j, i, room)
                continue
            }
            if i != 0 {
                for k := 0; k < i; k++ {
                    if layout[k * 3 + j] != "" {
                        log.Println("Not drawing windows at ", j, i)
                        continue Outer
                    }
                }
            }

            log.Println("Drawing windows at ", j, i)
            // Draw windows
            y := i * (ROOMSIZE_HEIGHT + VERT_HALLWAYSIZE_HEIGHT) + 2
            xOffset := j * (ROOMSIZE_WIDTH + HORIZ_HALLWAYSIZE_WIDTH)
            for x := 4; x < ROOMSIZE_WIDTH - 2; x += 3 {
                terrain.Tiles[y][x + xOffset] = 41
                terrain.Tiles[y + 1][x + xOffset] = 46
            }

        }
    }
}

func drawCarpet(terrain *Terrain, x, y int) {
    fillAreaInt(terrain, x + 3, y + 7, ROOMSIZE_WIDTH - 6, ROOMSIZE_HEIGHT - 10, 48)

    terrain.Tiles[y + 7][x + 3] = 42
    terrain.Tiles[y + 7][x + ROOMSIZE_WIDTH - 4] = 44
    terrain.Tiles[y + ROOMSIZE_HEIGHT - 4][x + 3] = 52
    terrain.Tiles[y + ROOMSIZE_HEIGHT - 4][x + ROOMSIZE_WIDTH - 4] = 54
    fillAreaInt(terrain, x + 4, y + 7, ROOMSIZE_WIDTH - 8, 1, 43)
    fillAreaInt(terrain, x + 4, y + ROOMSIZE_HEIGHT - 4, ROOMSIZE_WIDTH - 8, 1, 53)
    fillAreaInt(terrain, x + 3, y + 8, 1, ROOMSIZE_HEIGHT - 12, 47)
    fillAreaInt(terrain, x + ROOMSIZE_WIDTH - 4, y + 8, 1, ROOMSIZE_HEIGHT - 12, 49)
}

func drawShopLobby(terrain *Terrain, x, y int, rng *rand.Rand) {

    halfRoom := ROOMSIZE_WIDTH / 2

    fillHitmapInt(
        terrain,
        x + halfRoom - 2,
        y + 5,
        5,
        3,
    )
    clearHitmapInt(
        terrain,
        x + halfRoom - 1,
        y + 5,
        3,
        2,
    )
    terrain.Tiles[y + 5][x + halfRoom - 2] = 60
    terrain.Tiles[y + 5][x + halfRoom - 1] = 61
    terrain.Tiles[y + 5][x + halfRoom] = 64
    terrain.Tiles[y + 5][x + halfRoom + 1] = 62
    terrain.Tiles[y + 5][x + halfRoom + 2] = 63

    terrain.Tiles[y + 6][x + halfRoom - 2] = 65
    terrain.Tiles[y + 6][x + halfRoom - 1] = 66
    terrain.Tiles[y + 6][x + halfRoom] = 66
    terrain.Tiles[y + 6][x + halfRoom + 1] = 67
    terrain.Tiles[y + 6][x + halfRoom + 2] = 68

    terrain.Tiles[y + 7][x + halfRoom - 2] = 70
    terrain.Tiles[y + 7][x + halfRoom - 1] = 71
    terrain.Tiles[y + 7][x + halfRoom] = 71
    terrain.Tiles[y + 7][x + halfRoom + 1] = 72
    terrain.Tiles[y + 7][x + halfRoom + 2] = 73

    for i := x; i < x + ROOMSIZE_WIDTH; i++ {
        if terrain.Tiles[y + 5][i] != 1 { continue }
        if rng.Intn(10) < SHOP_LOBBY_CRATE_ODDS {
            if Chance(rng) {
                terrain.Tiles[y + 5][i] = uint(75 + rng.Intn(5))
            } else {
                terrain.Tiles[y + 5][i] = uint(56 + rng.Intn(2))
            }
            terrain.Hitmap[y + 5][i] = true
        }
    }

    for i := y + 5; i < y + ROOMSIZE_HEIGHT - 2; i++ {
        if terrain.Tiles[i][x + 1] != 1 { continue }
        if terrain.Tiles[i][x] == 1 && terrain.Tiles[i][x + 2] == 1 { continue }
        if rng.Intn(10) < SHOP_LOBBY_POT_ODDS {
            terrain.Tiles[i][x + 1] = 59
        }
    }
    for i := y + 5; i < y + ROOMSIZE_HEIGHT - 2; i++ {
        if terrain.Tiles[i][x + ROOMSIZE_WIDTH - 2] != 1 { continue }
        if terrain.Tiles[i][x + ROOMSIZE_WIDTH - 1] == 1 && terrain.Tiles[i][x + ROOMSIZE_WIDTH - 3] == 1 { continue }
        if rng.Intn(10) < SHOP_LOBBY_POT_ODDS {
            terrain.Tiles[i][x + ROOMSIZE_WIDTH - 2] = 59
        }
    }

}

func drawStorageRoom(terrain *Terrain, x, y int, rng *rand.Rand) {

    numChests := rng.Intn(STORAGE_ROOM_MAX_CHESTS)
    for i := 0; i < numChests; i++ {
        chestX := rng.Intn(ROOMSIZE_WIDTH - 2)
        chestY := rng.Intn(ROOMSIZE_HEIGHT - 6)

        if terrain.Tiles[chestY + y][chestX + x] != 1 {
            i--
            continue
        }

        terrain.Tiles[chestY + y][chestX + x] = 58
        terrain.Hitmap[chestY + y][chestX + x] = true
    }

}
