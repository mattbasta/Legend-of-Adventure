package entities

import (
    "encoding/json"
    "fmt"
    "log"
    "math/rand"
    "strconv"
    "strings"
    "time"

    "github.com/robertkrimen/otto"

    "legend-of-adventure/server/events"
)


type VirtualEntity struct {
    PathingHelper
    EntityVM

    id         string
    closing    chan bool
    receiver   chan *events.Event

    location   EntityRegion

    lastTick   int64
}

func NewVirtualEntity(entityName string) *VirtualEntity {
    ent := new(VirtualEntity)
    ent.id = NextEntityID()
    ent.closing = make(chan bool, 1)

    ent.receiver = make(chan *events.Event, 128)

    ent.EntityVM = *GetEntityVM(entityName)

    setUpPathing(ent)

    return ent
}



func (self *VirtualEntity) SetLocation(location EntityRegion) {
    self.location = location

    self.vm.Set("sendEvent", func(call otto.FunctionCall) otto.Value {
        if self.location == nil {
            return otto.Value {}
        }
        self.location.Broadcast(
            self.location.GetEvent(
                events.GetType(call.Argument(0).String()),
                call.Argument(1).String(),
                self,
            ),
        )
        return otto.Value {}
    })

    self.vm.Set("getType", func(call otto.FunctionCall) otto.Value {
        eid, _ := call.Argument(0).ToString()
        entity := self.location.GetEntity(eid)
        if entity == nil { return otto.Value {} }
        result, _ := self.vm.ToValue(entity.Type())
        return result
    })

    self.vm.Set("getDistance", func(call otto.FunctionCall) otto.Value {
        entity := self.location.GetEntity(call.Argument(0).String())
        if entity == nil { return otto.Value {} }
        // TODO: This might be really costly if it has to look up the
        // position from the VM
        dist := Distance(self, entity)
        result, _ := self.vm.ToValue(dist)
        return result
    })

    self.vm.Set("getDistanceFrom", func(call otto.FunctionCall) otto.Value {
        entity := self.location.GetEntity(call.Argument(0).String())

        x, _ := call.Argument(1).ToFloat()
        y, _ := call.Argument(2).ToFloat()
        dist := DistanceFrom(entity, x, y)
        result, _ := self.vm.ToValue(dist)
        return result
    })

    self.vm.Set("getDistanceTo", func(call otto.FunctionCall) otto.Value {
        x, _ := call.Argument(0).ToFloat()
        y, _ := call.Argument(1).ToFloat()
        dist := DistanceFrom(self, x, y)
        result, _ := self.vm.ToValue(dist)
        return result
    })

    self.vm.Set("getLevWidth", func(call otto.FunctionCall) otto.Value {
        result, _ := self.vm.ToValue(self.location.GetTerrain().Width)
        return result
    })

    self.vm.Set("getLevHeight", func(call otto.FunctionCall) otto.Value {
        result, _ := self.vm.ToValue(self.location.GetTerrain().Height)
        return result
    })

    self.vm.Set("attack", func(call otto.FunctionCall) otto.Value {
        x, _ := call.Argument(0).ToFloat()
        y, _ := call.Argument(1).ToFloat()

        weapon := call.Argument(2).String()

        self.location.Broadcast(
            self.location.GetEvent(
                events.DIRECT_ATTACK,
                fmt.Sprintf("%f %f %s", x, y, weapon),
                self,
            ),
        )

        return otto.Value {}
    })

    self.vm.Set("say", func(call otto.FunctionCall) otto.Value {
        message := call.Argument(0).String()
        x, y := self.Position()

        nametag := self.Call("nametag")
        if nametag != "undefined" {
            nametag = nametag[1:len(nametag)-1]
            message = fmt.Sprintf("<span class=\"nametag\">%s:</span> %s", nametag, message)
        }

        self.location.Broadcast(
            self.location.GetEvent(
                events.CHAT,
                fmt.Sprintf("%f %f\n%s", x, y, message),
                self,
            ),
        )

        return otto.Value {}
    })

    self.vm.Set("die", func(call otto.FunctionCall) otto.Value {
        log.Println("Entity death: ", self.id)
        self.location.Broadcast(
            self.location.GetEvent(events.DEATH, "", self),
        )

        self.location.RemoveEntity(self)

        self.closing <- true

        return otto.Value{}
    })

    self.vm.Set("spawn", func(call otto.FunctionCall) otto.Value {
        entType := call.Argument(0).String()
        radius, _ := call.Argument(1).ToFloat()

        entX, entY := self.Position()
        rng := rand.New(rand.NewSource(int64(entX * entY)))
        terrain := self.location.GetTerrain()
        hitmap := terrain.Hitmap

        // TODO: Make this use real values
        newEntW, newEntH := 1.0, 1.0

        for {
            newEntX := entX + (rng.Float64() - 0.5) * radius * 2
            newEntY := entY + (rng.Float64() - 0.5) * radius * 2
            if !hitmap.Fits(newEntX, newEntY, newEntW, newEntH) { continue }

            log.Println(self.id + " spawning " + entType, newEntX, newEntY)
            self.location.Spawn(entType, newEntX, newEntY)
            break
        }

        return otto.Value {}
    })

    self.Pass("setup", "null")

    self.gameTick()
}

func (self *VirtualEntity) SetPosition(x, y float64) {
    self.Pass("setPosition", fmt.Sprintf("%f, %f", x, y))
}

func (self *VirtualEntity) gameTick() {
    if self.lastTick != 0 { return }
    go func() {
        ticker := time.NewTicker(VIRTUAL_ENTITY_TICK_MS * time.Millisecond)
        self.lastTick = time.Now().UnixNano() / 1e6
        defer ticker.Stop()
        for {
            select {
            case <-ticker.C:
                now := time.Now().UnixNano() / 1e6
                self.Pass("tick", fmt.Sprintf("%d, %d", now, now - self.lastTick))
                self.lastTick = now
            case event := <-self.receiver:
                self.handle(event)
            case <-self.closing:
                self.closing <- true
                return
            }
        }
    }()
}


func (self *VirtualEntity) Receive() chan<- *events.Event {
    return self.receiver
}

func (self *VirtualEntity) handle(event *events.Event) {
    switch event.Type {
    case events.SPAWN:
        fallthrough
    case events.REGION_ENTRANCE:
        self.Pass("entered", event.Body)
        fallthrough
    case events.ENTITY_UPDATE:
        ent := self.location.GetEntity(event.Origin)
        if ent == nil { return }
        dist := Distance(ent, self)
        if dist > ENTITY_VISION { return }
        self.Pass("seenEntity", fmt.Sprintf("'%s', %s, %f", event.Origin, event.Body, dist))

    case events.DEATH:
        fallthrough
    case events.REGION_EXIT:
        self.Pass("forget", "'" + event.Body + "'")

    case events.DIRECT_ATTACK:
        split := strings.Split(event.Body, " ")
        x, _ := strconv.ParseFloat(split[0], 10)
        y, _ := strconv.ParseFloat(split[1], 10)
        item := split[2]

        entX, entY := self.Position()
        // entW, entH := self.Size()
        entW, entH := 1, 1

        // TODO: Figure out how to calculate this
        damage := 10

        attackDetails := fmt.Sprintf("'%s', %d, '%s'", event.Origin, damage, item)

        if x < entX - ATTACK_WIGGLE_ROOM ||
           x > entX + float64(entW) + ATTACK_WIGGLE_ROOM ||
           y < entY - float64(entH) - ATTACK_WIGGLE_ROOM ||
           y > entY + ATTACK_WIGGLE_ROOM {
            self.Pass("seenAttack", attackDetails)
            return
        }

        log.Println("Direct hit by " + event.Origin + " on " + self.id)

        self.Pass("attacked", attackDetails)

    case events.CHAT:
        split := strings.Split(event.Body, "\n")
        coords := strings.Split(split[0], " ")
        x, _ := strconv.ParseFloat(coords[0], 10)
        y, _ := strconv.ParseFloat(coords[1], 10)
        data, _ := json.Marshal(split[1])
        self.Pass("heard", fmt.Sprintf("%f, %f, %s", x, y, data))
    }
}


func (self *VirtualEntity) String() string {
    data := self.Call("getData")

    return (
        "{\"id\":\"" + self.ID() + "\"," +
        data[1:])
}

func (self *VirtualEntity) Killer(in chan bool) {
    go func() {
        select {
        case <- in:
            log.Println("Destroying entity " + self.ID())
            self.closing <- true
            in <- true
        case <- self.closing:
            log.Println("Closing entity " + self.ID())
            self.closing <- true
        }
    }()
}


func (self *VirtualEntity) Position() (float64, float64) {
    x, y := self.Call("getX"), self.Call("getY")
    xF, _ := strconv.ParseFloat(x, 64)
    yF, _ := strconv.ParseFloat(y, 64)
    return xF, yF
}
func (self *VirtualEntity) Size() (uint, uint) {
    width, height := self.Call("getWidth"), self.Call("getHeight")
    widthUint, _ := strconv.ParseUint(width, 10, 0)
    heightUint, _ := strconv.ParseUint(height, 10, 0)
    return uint(widthUint), uint(heightUint)
}

func (self *VirtualEntity) Type() string {
    eType := self.Call("type")
    if eType == "" {
        return "generic"
    }
    eType = eType[1:len(eType)-1]
    return eType
}

func (self VirtualEntity) ID() string                   { return self.id }
func (self VirtualEntity) Location() EntityRegion       { return self.location }
func (self VirtualEntity) Inventory() *Inventory        { return nil }
