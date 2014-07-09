package entities

import (
    "fmt"
    "log"
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
    ent.closing = make(chan bool)

    ent.receiver = make(chan *events.Event)

    go func() {
        for {
            select {
            case <-ent.closing:
                ent.closing <- true
                return
            case event := <-ent.receiver:
                ent.handle(event)
            }
        }
    }()

    ent.EntityVM = *GetEntityVM(entityName)

    ent.vm.Set("sendEvent", func(call otto.FunctionCall) otto.Value {
        if ent.location == nil {
            return otto.Value {}
        }
        ent.location.Broadcast(
            ent.location.GetEvent(
                events.GetType(call.Argument(0).String()),
                call.Argument(1).String(),
                ent,
            ),
        )
        return otto.Value {}
    })

    ent.vm.Set("getType", func(call otto.FunctionCall) otto.Value {
        eid, _ := call.Argument(0).ToString()
        entity := ent.location.GetEntity(eid)
        if entity == nil { return otto.Value {} }
        result, _ := ent.vm.ToValue(entity.Type())
        return result
    })

    ent.vm.Set("getDistance", func(call otto.FunctionCall) otto.Value {
        entity := ent.location.GetEntity(call.Argument(0).String())
        if entity == nil {
            result, _ := ent.vm.ToValue(nil)
            return result
        }
        // TODO: This might be really costly if it has to look up the
        // position form the VM
        dist := Distance(ent, entity)
        result, _ := ent.vm.ToValue(dist)
        return result
    })

    ent.vm.Set("getDistanceFrom", func(call otto.FunctionCall) otto.Value {
        entity := ent.location.GetEntity(call.Argument(0).String())

        x, _ := call.Argument(1).ToFloat()
        y, _ := call.Argument(2).ToFloat()
        dist := DistanceFrom(entity, x, y)
        result, _ := ent.vm.ToValue(dist)
        return result
    })

    ent.vm.Set("attack", func(call otto.FunctionCall) otto.Value {
        x, _ := call.Argument(0).ToFloat()
        y, _ := call.Argument(1).ToFloat()

        weapon := call.Argument(2).String()

        ent.location.Broadcast(
            ent.location.GetEvent(
                events.DIRECT_ATTACK,
                fmt.Sprintf("%f %f %s", x, y, weapon),
                ent,
            ),
        )

        return otto.Value{}
    })

    ent.vm.Set("say", func(call otto.FunctionCall) otto.Value {
        message := call.Argument(0).String()
        x, y := ent.Position()
        ent.location.Broadcast(
            ent.location.GetEvent(
                events.CHAT,
                fmt.Sprintf("%f %f\n%s", x, y, message),
                ent,
            ),
        )

        return otto.Value{}
    })

    ent.vm.Set("die", func(call otto.FunctionCall) otto.Value {
        log.Println("Entity death: ", ent.id)
        ent.location.Broadcast(
            ent.location.GetEvent(events.DEATH, "", ent),
        )

        ent.location.RemoveEntity(ent)

        ent.closing <- true

        return otto.Value{}
    })

    setUpPathing(ent)

    return ent
}



func (self *VirtualEntity) SetLocation(location EntityRegion) {
    self.location = location

    self.vm.Set("getLevWidth", func(call otto.FunctionCall) otto.Value {
        result, _ := self.vm.ToValue(self.location.GetTerrain().Width)
        return result
    })

    self.vm.Set("getLevHeight", func(call otto.FunctionCall) otto.Value {
        result, _ := self.vm.ToValue(self.location.GetTerrain().Height)
        return result
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
        ticker := time.NewTicker(250 * time.Millisecond)
        self.lastTick = time.Now().UnixNano() / 1e6
        defer ticker.Stop()
        for {
            select {
            case <-ticker.C:
                now := time.Now().UnixNano() / 1e6
                self.Pass("tick", fmt.Sprintf("%d, %d", now, now - self.lastTick))
                self.lastTick = now
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
    case events.REGION_ENTRANCE:
        self.Pass("entered", event.Body)
        fallthrough
    case events.ENTITY_UPDATE:
        ent := self.location.GetEntity(event.Origin)
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
    return eType
}

func (self VirtualEntity) ID() string                   { return self.id }
func (self VirtualEntity) Location() EntityRegion       { return self.location }
func (self VirtualEntity) Inventory() *Inventory        { return nil }
