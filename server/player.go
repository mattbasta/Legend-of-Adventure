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

    nametag    string

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
        "",
        nil,
    }
    reg.AddEntity(&player)

    // Set up the player's inventory
    player.inventory = entities.NewInventory(&player, PLAYER_INV_SIZE)
    player.inventory.Give("wsw.sharp.12")
    player.inventory.Give("f5")

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
                    parent, type_, x, y := regions.GetRegionData(target)
                    self.sendToLocation(parent, type_, x, y, portal.DestX, portal.DestY)
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
            if self.handleOutbound(msg) { continue }
            self.outbound_raw <- msg.String()
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


func (self *Player) handleOutbound(evt *events.Event) bool {
    switch evt.Type {
    case events.DEATH:
        self.outbound_raw <- "delevt:" + evt.Origin + "\n" + evt.Origin

    case events.DIRECT_ATTACK:
        split := strings.Split(evt.Body, " ")
        x, _ := strconv.ParseFloat(split[0], 10)
        y, _ := strconv.ParseFloat(split[1], 10)
        // item := split[2]

        entX, entY := self.Position()
        entW, entH := self.Size()

        if x < entX || x > entX + float64(entW) || y < entY - float64(entH) || y > entY { return true }

        // TODO: Figure out how to calculate this
        damage := 10

        self.IncrementHealth(-1 * damage)

    default:
        return false
    }
    return true
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

    case "cha": // cha == chat
        body := fmt.Sprintf("%f %f\n%s", self.x, self.y, split[1])
        if HandleCheat(split[1], self) {
            return
        }
        self.location.Broadcast(self.location.GetEvent(events.CHAT, body, self))

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
            self.location.GetEvent(
                events.ENTITY_UPDATE,
                "{" + self.PositionString() + "}",
                self,
            ),
        )

    case "use":
        index, err := strconv.ParseUint(split[1], 10, 0)
        if err != nil {
            return
        }
        self.inventory.Use(uint(index), self)

    case "dro":
        self.inventory.Drop(self)

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

        log.Println("Player sliding to ", xPos, yPos)
        self.sendToLocation(
            self.location.ParentID,
            self.location.Type,
            int(xPos), int(yPos),
            self.x, self.y,
        )

    }
}

func (self *Player) sendToLocation(parentID, type_ string, x, y int, newX, newY float64) {
    newLocation := regions.GetRegion(parentID, type_, x, y)

    if newLocation == nil {
        return
    }

    if self.location != nil {
        self.location.RemoveEntity(self)
    }

    newLocation.KeepAlive <- true
    self.location = newLocation
    // Send the player the initial level
    self.outbound_raw <- "flv"
    self.outbound_raw <- (
        "epuevt:local\n{" +
        fmt.Sprintf("\"x\":%f,\"y\":%f", newX, newY) +
        "}")
    newLocation.AddEntity(self)
    self.outbound_raw <- "lev{" + newLocation.String() + "}"
}

func (self *Player) UpdateInventory() {
    log.Println("Updating user inventory")
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
func (self Player) Killer(in chan bool)          { return }
func (self Player) Location() entities.EntityRegion { return self.location }
func (self Player) MovementEffect() string       { return "" }
func (self Player) Position() (float64, float64) { return self.x, self.y }
func (self Player) Size() (uint, uint)           { return 50, 50 }
func (self Player) Velocity() (int, int)         { return self.velX, self.velY }

func (self *Player) PositionString() string {
    return fmt.Sprintf(
        "\"x\":%f," +
        "\"y\":%f," +
        "\"velocity\":[%d, %d]," +
        "\"direction\":[%d, %d]",
        self.x,
        self.y,
        self.velX,
        self.velY,
        self.dirX,
        self.dirY,
    )
}

func (self *Player) String() string {
    width, height := self.Size()

    nametagData := ""
    if self.nametag != "" {
        nametagData = "\"nametag\":\"" + self.nametag + "\","
    }

    return (
        "{\"proto\":\"avatar\"," +
        nametagData +
        "\"id\":\"" + self.ID() + "\"," +
        self.PositionString() + "," +
        fmt.Sprintf(
            "\"width\":\"%d\"," +
            "\"height\":\"%d\",",
            width,
            height,
        ) +
        // "\"\":\"\"," +
        "\"type\":\"person\"" +
        "}")
}

func (self *Player) IncrementHealth(amount int) {
    self.health = uint(int(self.health) + amount)
    if self.health > PLAYER_MAX_HEALTH {
        self.health = PLAYER_MAX_HEALTH
    } else if self.health < 0 {
        self.health = 0
        self.isDead = true
        // TODO: Add death handler here
    }
    self.outbound_raw <- "hea" + strconv.Itoa(int(self.health))
}
