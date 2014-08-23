package server

import (
    "code.google.com/p/go.net/websocket"
    "fmt"
    "log"
    "math/rand"
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
    lastUpdate int64

    health     uint

    nametag    string

    inventory *entities.Inventory

    coordStack [][2]float64

    godMode    bool

    effectTTL  int
}

func NewPlayer(conn *websocket.Conn) *Player {
    if conn == nil {
        panic("WebSocket connection required")
    }

    outbound := make(chan *events.Event, SOCKET_BUFFER_SIZE)
    outbound_raw := make(chan string, SOCKET_BUFFER_SIZE)
    closing := make(chan bool, 1)

    // Get the region and make it active.
    reg := regions.GetRegion(terrain.WORLD_OVERWORLD, terrain.REGIONTYPE_FIELD, 0, 0)
    // Let the region know to stay alive.
    reg.KeepAlive <- true

    player := Player{conn, reg,
        outbound, outbound_raw, closing,
        entities.NextEntityID(),
        float64(reg.Terrain.Width) / 2, float64(reg.Terrain.Height) / 2, 0, 0, 0, 1,
        time.Now().UnixNano(),
        PLAYER_MAX_HEALTH,
        "",
        nil,
        make([][2]float64, 0),
        false,
        0,
    }
    reg.AddEntity(&player)

    // Set up the player's inventory
    player.inventory = entities.NewInventory(&player, PLAYER_INV_SIZE)
    player.inventory.Give("wsw.sharp.12")
    player.inventory.Give("f5")
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
    ticker := time.NewTicker(PLAYER_TICK_FREQ * time.Millisecond)
    defer ticker.Stop()
    for {

        select {
        case <-ticker.C:
            if self.location == nil {
                continue
            }

            now := time.Now().UnixNano()
            delta := float64((now - self.lastUpdate) / 1000000)
            if self.velX != 0 || self.velY != 0 {
                velX, velY := float64(self.velX), float64(self.velY)
                if velX != 0 && velY != 0 {
                    velX = velX * SQRT1_2
                    velY = velY * SQRT1_2
                }
                self.x += velX * PLAYER_SPEED * delta
                self.y += velY * PLAYER_SPEED * delta

                self.lastUpdate = now
            }

            if self.godMode && rand.Intn(3) == 0 {
                self.outbound <- self.location.GetEvent(events.PARTICLE_MACRO, "0.5 -0.5 godmode 3 local", nil)
                self.location.Broadcast(
                    self.location.GetEvent(events.PARTICLE_MACRO, "0.5 -0.5 godmode 3 " + self.ID(), self),
                )
            }

            for _, portal := range self.location.Terrain.Portals {
                if entities.IsEntityCollidingWithPortal(portal, self) {
                    log.Println("Player in contact with portal")
                    var target string
                    currentCoords := [2]float64 {self.x, self.y}

                    destX, destY := portal.DestX, portal.DestY
                    if portal.Target == ".." {
                        target = self.location.ParentID
                        if len(self.coordStack) > 0 {
                            coords := self.coordStack[len(self.coordStack) - 1]
                            self.x, self.y = coords[0], coords[1] + 1
                            destX, destY = self.x, self.y
                            self.coordStack = self.coordStack[:len(self.coordStack) - 1]
                        }
                    } else if portal.Target == "." {
                        target = self.location.ID()
                        if len(self.coordStack) > 0 {
                            self.coordStack[len(self.coordStack) - 1] = currentCoords
                        }
                        self.x, self.y = portal.DestX, portal.DestY
                    } else {
                        target = self.location.ID() + "," + portal.Target
                        self.coordStack = append(self.coordStack, currentCoords)
                        self.x, self.y = portal.DestX, portal.DestY
                    }

                    parent, type_, x, y := regions.GetRegionData(target)
                    self.sendToLocation(parent, type_, x, y, destX, destY)
                }
            }

            if self.effectTTL > 0 {
                self.effectTTL--
                if self.effectTTL == 0 {
                    self.outbound <- self.location.GetEvent(events.EFFECT_CLEAR, "", nil)
                }
            }
        case <-self.closing:
            self.closing <- true
            return
        }
    }
}

func (self *Player) SetEffect(effect string, ttl int) {
    self.effectTTL = ttl
    self.outbound <- self.location.GetEvent(events.EFFECT, effect, nil)
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
        // entW, entH := self.Size()
        entW, entH := 1, 1

        if x < entX || x > entX + float64(entW) || y < entY - float64(entH) || y > entY { return true }

        // TODO: Figure out how to calculate this
        damage := 10

        self.IncrementHealth(-1 * damage)


        // Show blood spatter particles
        self.outbound <- self.location.GetEvent(events.PARTICLE_MACRO, "0.5 0 bloodspatter 5 local", nil)
        self.location.Broadcast(
            self.location.GetEvent(events.PARTICLE_MACRO, "0.5 0 bloodspatter 5 " + self.ID(), self),
        )

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
                log.Println(err)
                self.closing <- true
                return
            }
            self.handle(msg)
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
            return
        }
        // TODO: Perform more cheat testing here
        newX, err := strconv.ParseFloat(posdata[0], 64)
        if err != nil { return }
        newY, err := strconv.ParseFloat(posdata[1], 64)
        if err != nil { return }
        if newX < 0 || newX > float64(self.location.Terrain.Width) ||
            newY < 0 || newY > float64(self.location.Terrain.Height) {
            log.Println("User attempted to exceed bounds of the level")
            self.closing <- true
        }
        velX, err := strconv.ParseInt(posdata[2], 10, 0)
        if err != nil { return }
        velY, err := strconv.ParseInt(posdata[3], 10, 0)
        if err != nil { return }
        if velX < -1 || velX > 1 || velY < -1 || velX > 1 {
            log.Println("User attempted to go faster than possible")
            self.closing <- true
            return
        }
        dirX, err := strconv.ParseInt(posdata[4], 10, 0)
        if err != nil { return }
        dirY, err := strconv.ParseInt(posdata[5], 10, 0)
        if err != nil { return }
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

        self.lastUpdate = time.Now().UnixNano()

        self.location.Broadcast(
            self.location.GetEvent(
                events.ENTITY_UPDATE,
                "{" + self.PositionString() + "}",
                self,
            ),
        )

    case "use":
        index, err := strconv.ParseUint(split[1], 10, 0)
        if err != nil { return }
        self.inventory.Use(uint(index), self)

    case "dro":
        self.inventory.Drop(self)

    case "lev":
        pos := strings.Split(split[1], ":")
        xPos, err := strconv.ParseInt(pos[0], 10, 0)
        if err != nil { return }
        yPos, err := strconv.ParseInt(pos[1], 10, 0)
        if err != nil { return }

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

    self.x, self.y = newX, newY

    if newLocation == self.location {
        self.location.Broadcast(
            self.location.GetEvent(
                events.ENTITY_UPDATE,
                "{" + self.PositionString() + "}",
                self,
            ),
        )
        self.outbound_raw <- (
            "epuevt:local\n{" +
            fmt.Sprintf("\"x\":%f,\"y\":%f", newX, newY) +
            "}")
        return
    }

    if newLocation == nil {
        log.Println("Requested region that does not exist:", parentID, type_, x, y)
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

        item, count := self.inventory.Get(i)
        out += fmt.Sprintf("%d:%s:%d", i, item, count)
        first = false
    }
    self.outbound_raw <- out
}

// Entity Implementation

func (self Player) Receive() chan<- *events.Event {
    return (chan<- *events.Event)(self.outbound)
}

func (self Player) Direction() (int, int)        { return self.dirX, self.dirY }
func (self Player) GetHealth() uint              { return self.health }
func (self Player) ID() string                   { return self.name }
func (self Player) Inventory() *entities.Inventory  { return self.inventory }
func (self Player) IsAtMaxHealth() bool          { return self.health == PLAYER_MAX_HEALTH }
func (self Player) Killer(in chan bool)          { return }
func (self Player) Location() entities.EntityRegion { return self.location }
func (self Player) MovementEffect() string       { return "" }
func (self Player) Position() (float64, float64) { return self.x, self.y }
func (self Player) Type() string                 { return "player" }
func (self Player) Size() (float64, float64)     { return 1, 1 }
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
            "\"width\":\"%f\"," +
            "\"height\":\"%f\",",
            width,
            height,
        ) +
        // "\"\":\"\"," +
        "\"type\":\"person\"" +
        "}")
}

func (self *Player) IncrementHealth(amount int) {
    newHealth := int(self.health) + amount
    if newHealth > PLAYER_MAX_HEALTH {
        self.health = PLAYER_MAX_HEALTH
    } else if newHealth <= 0 {
        self.health = 0
        if !self.godMode {
            self.death()
        }
    } else {
        self.health = uint(newHealth)
    }
    self.outbound_raw <- "hea" + strconv.Itoa(int(self.health))
}

func (self *Player) death() {

    self.location.Broadcast(
        self.location.GetEvent(events.PARTICLE_MACRO, fmt.Sprintf("%f %f deathFlake 25", self.x, self.y), self),
    )

    for self.inventory.NumItems() > 0 {
        self.inventory.Drop(self)
    }

    self.sendToLocation(terrain.WORLD_OVERWORLD, terrain.REGIONTYPE_FIELD, 0, 0, 50, 50)
    self.health = PLAYER_MAX_HEALTH
    self.outbound_raw <- "dea"
}
