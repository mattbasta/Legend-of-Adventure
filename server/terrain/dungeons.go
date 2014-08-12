package terrain

import (
    "hash/crc32"
    "log"
    "math/rand"
)


var roomTypes = [...]string {
    "room",
    "treasure_room",
    "mob_drop",
}
var movableDirections = [][2]int {
    {0, 1}, {1, 0}, {0, -1}, {-1, 0},
}


type DungeonPassageDirection [2]int
type DungeonRoom struct {
    Passages map[DungeonPassageDirection]bool
    Type string  // The type of room
    Initial bool  // Coords relative to the entrance
    Defined bool  // Whether the room has been initialized
    Parent [2]int  // Coords of the room that spawned this room
    OutboundPassages uint  // Number of outbound passages
    ToBeProcessed bool  // Whether the room is staged to be processed
}

func (self *DungeonRoom) HasPassage(x, y int) bool {
    return self.Passages[DungeonPassageDirection{x, y}]
}


func getDefaultDungeonRoom() *DungeonRoom {
    room := new(DungeonRoom)
    room.Passages = make(map[DungeonPassageDirection]bool, 4)
    room.Passages[DungeonPassageDirection{0, 1}] = false
    room.Passages[DungeonPassageDirection{1, 0}] = false
    room.Passages[DungeonPassageDirection{-1, 0}] = false
    room.Passages[DungeonPassageDirection{0, -1}] = false
    room.Type = "room"
    room.Initial = false
    room.Defined = false
    room.ToBeProcessed = false
    return room
}

type DungeonLayout struct {
    Grid [][]*DungeonRoom
    EntranceX int
    EntranceY int
}

// Map of parent ID to room map
var dungeonCache = make(map[string]*DungeonLayout, 0)
// TODO: Make this into a LRU cache

func GetDungeonLayout(parent string) *DungeonLayout {
    if layout, ok := dungeonCache[parent]; ok {
        return layout
    }

    h := crc32.NewIEEE()
    h.Write([]byte(parent))
    rng := rand.New(rand.NewSource(int64(h.Sum32())))

    dWidth := rng.Intn(DUNGEON_MAX_SIZE - DUNGEON_MIN_SIZE) + DUNGEON_MIN_SIZE
    dHeight := rng.Intn(DUNGEON_MAX_SIZE - DUNGEON_MIN_SIZE) + DUNGEON_MIN_SIZE
    log.Println("Dungeon size: ", dWidth, dHeight)

    // Initialize the dungeon layout
    layout := new(DungeonLayout)
    layout.Grid = make([][]*DungeonRoom, dHeight)
    for i := range layout.Grid {
        layout.Grid[i] = make([]*DungeonRoom, dWidth)
    }

    // Figure out where to place the dungeon level's entrance
    entranceX, entranceY := rng.Intn(dWidth), rng.Intn(dHeight)
    layout.EntranceX, layout.EntranceY = entranceX, entranceY

    for i := range layout.Grid {
        for j := range layout.Grid[i] {
            layout.Grid[i][j] = getDefaultDungeonRoom()
        }
    }

    roomsToProcess := [][2]int{
        [2]int{entranceX, entranceY},
    }
    layout.Grid[entranceY][entranceX].ToBeProcessed = true

    // Helper function to determine if a passage can be built
    canMove := func(x, y, dirX, dirY int) bool {
        // You can't build a passage if it would lead out of the grid.
        if (x + dirX < 0 || x + dirX >= dWidth ||
            y + dirY < 0 || y + dirY >= dHeight) {
            return false
        }
        return !(
            // No if the passage already exists
            layout.Grid[y][x].Passages[DungeonPassageDirection{dirX, dirY}] ||
            // No if the passage leads to a defined or staged room
            layout.Grid[y + dirY][x + dirX].Defined ||
            layout.Grid[y + dirY][x + dirX].ToBeProcessed)
    }

    // Helper function to build a room
    buildRoom := func(x, y int, room *DungeonRoom) {
        room.Defined = true
        room.Initial = x - entranceX == 0 && y - entranceY == 0

        if room.Initial {
            room.Type = "lobby"
        } else {
            room.Type = roomTypes[rng.Intn(len(roomTypes))]
        }

        directions := make([][2]int, len(movableDirections))
        copy(directions, movableDirections)
        dirPerms := rng.Perm(len(movableDirections))
        for i, v := range dirPerms {
            directions[v] = movableDirections[i]
        }
        // Filter out inviable directions
        viableDirections := make([][2]int, 0)
        for _, direction := range directions {
            if canMove(x, y, direction[0], direction[1]) {
                viableDirections = append(viableDirections, direction)
            }
        }

        if !room.Initial && len(viableDirections) > 1 {
            viableDirections = viableDirections[:rng.Intn(len(viableDirections) - 1) + 1]
        }

        room.OutboundPassages = uint(len(viableDirections))
        for _, direction := range viableDirections {
            // Define a passage between the rooms
            room.Passages[direction] = true

            // Define the reverse passage from the other room
            oppositeX, oppositeY := x + direction[0], y + direction[1]
            log.Println("Generating path from ", x, y, " to ", oppositeX, oppositeY)
            otherRoom := layout.Grid[oppositeY][oppositeX]
            otherRoom.Passages[DungeonPassageDirection{direction[0] * -1, direction[1] * -1}] = true
            otherRoom.Parent = [2]int{x, y}

            roomsToProcess = append(roomsToProcess, [2]int{oppositeX, oppositeY})
            otherRoom.ToBeProcessed = true
        }
    }

    for len(roomsToProcess) > 0 {
        nextRoomIndex := rng.Intn(len(roomsToProcess))
        nextRoom := roomsToProcess[nextRoomIndex]
        nextRoomObj := layout.Grid[nextRoom[1]][nextRoom[0]]
        roomsToProcess = append(roomsToProcess[:nextRoomIndex], roomsToProcess[nextRoomIndex+1:]...)
        buildRoom(nextRoom[0], nextRoom[1], nextRoomObj)
        nextRoomObj.ToBeProcessed = false
    }

    terminalRooms := make([]*DungeonRoom, 0)
    for i := range layout.Grid {
        for _, room := range layout.Grid[i] {
            if room.OutboundPassages == 0 {
                terminalRooms = append(terminalRooms, room)
            }
        }
    }

    if rng.Intn(2) == 0 {
        room := terminalRooms[rng.Intn(len(terminalRooms))]
        log.Println("Generating stairwell down")
        room.Type = "stairwell"
    }

    // Generate boss room?
    if len(terminalRooms) > 0 && rng.Intn(3) == 0 {
        roomIndex := rng.Intn(len(terminalRooms))
        terminalRooms[roomIndex].Type = "boss"
        log.Println("Generating boss room")
        terminalRooms = append(terminalRooms[:roomIndex], terminalRooms[roomIndex+1:]...)
    }
    // Generate angel room?
    if len(terminalRooms) > 0 && rng.Intn(2) == 0 {
        roomIndex := rng.Intn(len(terminalRooms))
        terminalRooms[roomIndex].Type = "angel"
        log.Println("Generating angel room")
        terminalRooms = append(terminalRooms[:roomIndex], terminalRooms[roomIndex+1:]...)
    }


    dungeonCache[parent] = layout
    return layout
}


func ApplyDungeon(parent string, terrain *Terrain) {
    dungeonLayout := GetDungeonLayout(parent)

    roomX, roomY := terrain.X + dungeonLayout.EntranceX, terrain.Y + dungeonLayout.EntranceY

    if roomY >= len(dungeonLayout.Grid) || roomX >= len(dungeonLayout.Grid[roomY]) {
        return
    }

    // Fill the dungeon with the default color (1)
    fillArea(terrain, 0, 0, terrain.Width, terrain.Height, 1)
    fillHitmap(terrain, 0, 0, terrain.Width, terrain.Height)

    // Draw the main floor
    fillArea(terrain, 4, 4, terrain.Width - 8, terrain.Height - 8, 0)
    fillArea(terrain, 4, terrain.Height - 4, terrain.Width - 8, 1, 6)
    clearHitmap(terrain, 4, 4, terrain.Width - 8, terrain.Height - 8)

    room := dungeonLayout.Grid[roomY][roomX]

    if room.HasPassage(0, 1) {
        fillArea(terrain, 12, 24, 4, 4, 0)
        clearHitmap(terrain, 12, 24, 4, 4)
    }
    if room.HasPassage(1, 0) {
        fillArea(terrain, 24, 12, 4, 4, 0)
        fillArea(terrain, 24, 16, 4, 1, 6)
        clearHitmap(terrain, 24, 12, 4, 4)
    }
    if room.HasPassage(0, -1) {
        fillArea(terrain, 12, 0, 4, 4, 0)
        clearHitmap(terrain, 12, 0, 4, 4)
    }
    if room.HasPassage(-1, 0) {
        fillArea(terrain, 0, 12, 4, 4, 0)
        fillArea(terrain, 0, 16, 4, 1, 6)
        clearHitmap(terrain, 0, 12, 4, 4)
    }

    if room.Type == "lobby" {
        fillArea(terrain, 11, 9, 6, 6, 10)
        fillArea(terrain, 13, 10, 1, 1, 15)
        terrain.Portals = append(
            terrain.Portals,
            NewPortal(
                12, 9,
                2, 2,
                "..",
                14, 14,  // TODO: figure out what to do with this
            ),
        )
    } else if room.Type == "stairwell" {
        fillArea(terrain, 11, 9, 6, 6, 10)
        fillArea(terrain, 13, 12, 1, 1, 11)
        terrain.Portals = append(
            terrain.Portals,
            NewPortal(
                12, 9,
                2, 2,
                "dungeon:0:0",
                14, 14,
            ),
        )
    }

}
