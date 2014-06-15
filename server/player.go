package server

import (
    "code.google.com/p/go.net/websocket"
    "fmt"
    "log"
    "strconv"
    "strings"
    "time"

    "legend-of-adventure/server/entities"
    "legend-of-adventure/server/events"
    "legend-of-adventure/server/regions"
    "legend-of-adventure/server/terrain"
)

var playerCounter = 0

type Player struct {
    connection *websocket.Conn
    location   *regions.Region

    outbound     chan *events.Event
    outbound_raw chan string
    closing      chan bool

    name       string
    x, y       float64
    velX, velY int
    dirX, dirY int
    isDead     bool
    health     uint

    inventory *entities.Inventory
}

func NewPlayer(conn *websocket.Conn) *Player {
    if conn == nil {
        panic("WebSocket connection required")
    }

    outbound := make(chan *events.Event, SOCKET_BUFFER_SIZE)
    outbound_raw := make(chan string, SOCKET_BUFFER_SIZE)
    closing := make(chan bool)

    // Get the region and make it active.
    reg := regions.GetRegion(terrain.WORLD_OVERWORLD, terrain.REGIONTYPE_FIELD, 0, 0)
    // Let the region know to stay alive.
    reg.KeepAlive <- true

    player := Player{conn, reg,
        outbound, outbound_raw, closing,
        entities.NextEntityID(),
        float64(reg.Terrain.Width) / 2, float64(reg.Terrain.Height) / 2, 0, 0, 0, 1,
        false,
        PLAYER_MAX_HEALTH,
        nil,
    }
    reg.AddEntity(&player)

    go player.startPinging()
    go player.gameTick()

    // Send the player the initial level
    outbound_raw <- "lev{" + reg.String() + "}"

    return &player
}

func (self *Player) startPinging() {
    ticker := time.NewTicker(1 * time.Minute)
    defer ticker.Stop()
    for {
        select {
        case <-ticker.C:
            self.location.KeepAlive <- true
        case <-self.closing:
            self.closing <- true
            return
        }
    }
}

func (self *Player) gameTick() {
    ticker := time.NewTicker(250 * time.Millisecond)
    defer ticker.Stop()
    for {
        select {
        case <-ticker.C:
            if self.location == nil {
                continue
            }
            for _, portal := range self.location.Terrain.Portals {
                if entities.IsEntityCollidingWithPortal(portal, self) {
                    log.Println("Player in contact with portal")
                    var target string
                    if portal.Target == ".." {
                        target = self.location.ParentID
                    } else if portal.Target == "." {
                        target = self.location.ID()
                    } else {
                        target = self.location.ID() + "," + portal.Target
                    }

                    self.x, self.y = portal.DestX, portal.DestY
                    self.outbound_raw <- (
                        "eup{\"id\":\"local\"," +
                        fmt.Sprintf("\"x\":%d,\"y\":%d", int(portal.DestX), int(portal.DestY)) +
                        "}")
                    parent, type_, x, y := regions.GetRegionData(target)
                    self.sendToLocation(parent, type_, x, y)
                }
            }
        case <-self.closing:
            self.closing <- true
            return
        }
    }
}

func (self *Player) listenOutbound() {
    for {
        select {
        case msg := <-self.outbound:
            // `msg` gets cast to a string
            websocket.Message.Send(self.connection, msg.String())
        case msg := <-self.outbound_raw:
            websocket.Message.Send(self.connection, msg)
        case <-self.closing:
            log.Println("Client disconnecting.")

            // Tell the region that the client is going away.
            self.location.RemoveEntity(self)

            self.closing <- true
            return
        }
    }

}

func (self *Player) Listen() {
    defer self.connection.Close()
    go self.listenOutbound()

    websocket.Message.Send(self.connection, "haldo")

    for {
        select {
        case <-self.closing:
            self.closing <- true
            return
        default:
            var msg string
            err := websocket.Message.Receive(self.connection, &msg)
            if err != nil {
                self.closing <- true
                return
            } else {
                go self.handle(msg)
            }
        }
    }

}

func (self *Player) Setup() {
    // TODO: Add inventory persistence
    // Set up the player's inventory
    self.inventory = entities.NewInventory(self, PLAYER_INV_SIZE)
    self.inventory.Give("wsw.sharp.12")
    self.inventory.Give("f5")
    self.updateInventory()

    // TODO: Do lookup of player location here.

}

func (self *Player) handle(msg string) {
    split := strings.Split(msg, "\n")
    // Handle invalid input.
    if len(split) < 2 {
        self.closing <- true
        return
    }

    switch split[0] {
    case "cyc": // cyc == cycle inventory
        self.inventory.Cycle(split[1])
        self.updateInventory()

    case "cha": // cha == chat
        body := fmt.Sprintf("%f %f\n%s", self.x, self.y, split[1])
        if HandleCheat(split[1], self) {
            return
        }
        self.location.Broadcast(
            self.location.GetEvent(events.CHAT, body, self),
            self.ID(),
        )

    case "loc": // loc == location
        posdata := strings.Split(split[1], ":")
        if len(posdata) < 4 {
            self.closing <- true
            return
        }
        // TODO: Perform more cheat testing here
        newX, err := strconv.ParseFloat(posdata[0], 64)
        if err != nil {
            return
        }
        newY, err := strconv.ParseFloat(posdata[1], 64)
        if err != nil {
            return
        }
        if newX < 0 || newX > float64(self.location.Terrain.Width) ||
            newY < 0 || newY > float64(self.location.Terrain.Height) {
            log.Println("User attempted to exceed bounds of the level")
            self.closing <- true
        }
        velX, err := strconv.ParseInt(posdata[2], 10, 0)
        if err != nil {
            return
        }
        velY, err := strconv.ParseInt(posdata[3], 10, 0)
        if err != nil {
            return
        }
        if velX < -1 || velX > 1 || velY < -1 || velX > 1 {
            log.Println("User attempted to go faster than possible")
            self.closing <- true
            return
        }
        dirX, err := strconv.ParseInt(posdata[4], 10, 0)
        if err != nil {
            return
        }
        dirY, err := strconv.ParseInt(posdata[5], 10, 0)
        if err != nil {
            return
        }
        if dirX < -1 || dirX > 1 || dirY < -1 || dirX > 1 {
            log.Println("User attempted face invalid direction")
            self.closing <- true
            return
        }
        self.x = newX
        self.y = newY
        self.velX = int(velX)
        self.velY = int(velY)
        self.dirX = int(dirX)
        self.dirY = int(dirY)

        self.location.Broadcast(
            self.location.GetEvent(events.LOCATION, self.String(), self),
            self.ID(),
        )

    case "use":
        index, err := strconv.ParseUint(split[1], 10, 0)
        if err != nil {
            return
        }
        self.inventory.Use(uint(index), self)
        self.updateInventory()

    case "dro":
        self.inventory.Drop(self)
        self.updateInventory()

    case "lev":
        pos := strings.Split(split[1], ":")
        xPos, err := strconv.ParseInt(pos[0], 10, 0)
        if err != nil {
            return
        }
        yPos, err := strconv.ParseInt(pos[1], 10, 0)
        if err != nil {
            return
        }

        if Iabs(self.location.X - int(xPos)) > 1 ||
           Iabs(self.location.Y - int(yPos)) > 1 {
            return
        }

        self.sendToLocation(self.location.ParentID, self.location.Type, int(xPos), int(yPos))

    }
}

func (self *Player) sendToLocation(parentID, type_ string, x, y int) {
    if self.location != nil {
        self.location.RemoveEntity(self)
    }

    newLocation := regions.GetRegion(parentID, type_, x, y)
    newLocation.KeepAlive <- true
    newLocation.AddEntity(self)
    self.location = newLocation
    // Send the player the initial level
    self.outbound_raw <- "flv"
    self.outbound_raw <- "lev{" + newLocation.String() + "}"
}

func (self *Player) updateInventory() {
    out := "inv"
    first := true
    for i := 0; i < self.inventory.Capacity(); i++ {

        if !first {
            out += "\n"
        }

        out += strconv.Itoa(i) + ":"
        item := self.inventory.Get(i)
        if item != "" {
            out += item
        }
        first = false
    }
    self.outbound_raw <- out
}

// Entity Implementation

func (self Player) Receive() chan<- *events.Event {
    return (chan<- *events.Event)(self.outbound)
}

func (self Player) Dead() bool                   { return self.isDead }
func (self Player) Direction() (int, int)        { return self.dirX, self.dirY }
func (self Player) GetHealth() uint              { return self.health }
func (self Player) ID() string                   { return self.name }
func (self Player) Inventory() *entities.Inventory  { return self.inventory }
func (self Player) IsAtMaxHealth() bool          { return self.health == PLAYER_MAX_HEALTH }
func (self Player) Killer(in chan<- bool)        { return }
func (self Player) Location() *regions.Region    { return self.location }
func (self Player) MovementEffect() string       { return "" }
func (self Player) Position() (float64, float64) { return self.x, self.y }
func (self Player) Size() (uint, uint)           { return 50, 50 }
func (self Player) Velocity() (int, int)         { return self.velX, self.velY }

func (self *Player) String() string {
    width, height := self.Size()
    return (
        "{\"proto\":\"avatar\"," +
        "\"id\":\"" + self.ID() + "\"," +
        fmt.Sprintf(
            "\"x\":\"%f\"," +
            "\"y\":\"%f\"," +
            "\"width\":\"%d\"," +
            "\"height\":\"%d\"," +
            "\"velocity\":[%d, %d]," +
            "\"direction\":[%d, %d],",
            self.x,
            self.y,
            width,
            height,
            self.velX,
            self.velY,
            self.dirX,
            self.dirY,
        ) +
        // "\"\":\"\"," +
        "\"type\":\"person\"" +
        "}")
}

func (self *Player) IncrementHealth(amount uint) {
    self.health += amount
    if self.health > PLAYER_MAX_HEALTH {
        self.health = PLAYER_MAX_HEALTH
    } else if self.health < 0 {
        self.health = 0
        self.isDead = true
        // TODO: Add death handler here
    }
    self.outbound_raw <- "hea" + strconv.Itoa(int(self.health))
}
