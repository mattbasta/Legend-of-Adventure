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
    "legend-of-adventure/server/terrain"
)

var globalEntityRng = rand.New(rand.NewSource(38503))


type VirtualEntity struct {
    PathingHelper
    EntityVM

    id         string
    closing    chan bool
    receiver   chan *events.Event
    taskQueue  chan func()

    location   EntityRegion

    lastTick   int64

    x, y            float64
    width, height   float64
}

func NewVirtualEntity(entityName string) *VirtualEntity {
    ent := new(VirtualEntity)
    ent.id = NextEntityID()

    ent.closing = make(chan bool, 1)
    ent.receiver = make(chan *events.Event, VIRTUAL_ENTITY_QUEUE_SIZE)
    ent.taskQueue = make(chan func(), VIRTUAL_ENTITY_TASK_QUEUE_SIZE)

    ent.width, ent.height = 1, 1

    ent.EntityVM = *GetEntityVM(entityName)
    ent.vm.Set("ID", ent.id)

    setUpPathing(ent)

    return ent
}



func (self *VirtualEntity) SetLocation(location EntityRegion) {
    self.location = location

    self.vm.Set("getX", func(call otto.FunctionCall) otto.Value {
        result, _ := self.vm.ToValue(self.x)
        return result
    })

    self.vm.Set("getY", func(call otto.FunctionCall) otto.Value {
        result, _ := self.vm.ToValue(self.y)
        return result
    })

    self.vm.Set("setCoords", func(call otto.FunctionCall) otto.Value {
        x, _ := call.Argument(0).ToFloat()
        y, _ := call.Argument(1).ToFloat()
        self.x, self.y = x, y
        return otto.Value {}
    })

    self.vm.Set("setSize", func(call otto.FunctionCall) otto.Value {
        width, _ := call.Argument(0).ToFloat()
        height, _ := call.Argument(1).ToFloat()
        self.width, self.height = width, height
        return otto.Value {}
    })

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

        x, y := self.BlockingPosition()
        dist := DistanceFrom(entity, x, y)
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
        x, y := self.BlockingPosition()

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

        itemCodes := self.Call("getDrops")
        if itemCodes != "\"\"" && itemCodes != "undefined" {
            items := strings.Split(itemCodes, "\n")
            posX, posY := self.BlockingPosition()
            for _, item := range items {
                item = item[1:len(item) - 1]
                log.Println(self.id + " is dropping " + item)
                go func() {
                    itemEnt := NewItemEntityInstance(item)
                    itemEnt.location = self.location
                    itemEnt.x = posX + (globalEntityRng.Float64() * 3 - 1.5)
                    itemEnt.y = posY + (globalEntityRng.Float64() * 3 - 1.5)
                    self.location.AddEntity(itemEnt)
                }()
            }
        }

        self.location.RemoveEntity(self)

        self.closing <- true

        return otto.Value{}
    })

    self.vm.Set("spawn", func(call otto.FunctionCall) otto.Value {
        entType := call.Argument(0).String()
        radius, _ := call.Argument(1).ToFloat()

        entX, entY := self.BlockingPosition()
        rng := terrain.GetCoordRNG(entX, entY)
        terrain := self.location.GetTerrain()
        hitmap := terrain.Hitmap

        newEntW, newEntH := self.Size()

        for {
            newEntX := entX + (rng.Float64() - 0.5) * radius * 2
            newEntY := entY + (rng.Float64() - 0.5) * radius * 2
            if !hitmap.Fits(newEntX, newEntY, newEntW, newEntH) { continue }

            log.Println(self.id + " spawning " + entType, newEntX, newEntY)
            go self.location.Spawn(entType, newEntX, newEntY)
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
            case task := <-self.taskQueue:
                task()
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
        splitBody := strings.Split(event.Body, "\n")
        self.Pass("entered", splitBody[0])
        fallthrough
    case events.ENTITY_UPDATE:
        ent := self.location.GetEntity(event.Origin)
        if ent == nil { return }

        splitBody := strings.Split(event.Body, "\n")
        coodsStr := strings.Split(
            splitBody[1],
            " ",
        )
        coordX, _ := strconv.ParseFloat(coodsStr[0], 64)
        coordY, _ := strconv.ParseFloat(coodsStr[1], 64)

        x, y := self.BlockingPosition()
        dist := DistanceFromCoords(x, y, coordX, coordY)

        if dist > ENTITY_VISION { return }

        self.Pass(
            "seenEntity",
            fmt.Sprintf(
                "'%s', %s, %f",
                event.Origin,
                splitBody[0],
                dist,
            ),
        )

    case events.DEATH:
        fallthrough
    case events.REGION_EXIT:
        self.Pass("forget", "'" + event.Body + "'")

    case events.DIRECT_ATTACK:
        split := strings.Split(event.Body, " ")
        x, _ := strconv.ParseFloat(split[0], 64)
        y, _ := strconv.ParseFloat(split[1], 64)
        item := split[2]

        entX, entY := self.BlockingPosition()
        entW, entH := self.Size()

        // TODO: Figure out how to calculate this
        damage := 10

        attackDetails := fmt.Sprintf("'%s', %d, '%s'", event.Origin, damage, item)

        if x < entX - ATTACK_WIGGLE_ROOM ||
           x > entX + entW + ATTACK_WIGGLE_ROOM ||
           y < entY - entH - ATTACK_WIGGLE_ROOM ||
           y > entY + ATTACK_WIGGLE_ROOM {
            self.Pass("seenAttack", attackDetails)
            return
        }

        log.Println("Direct hit by " + event.Origin + " on " + self.id)

        self.Pass("attacked", attackDetails)

    case events.CHAT:
        split := strings.Split(event.Body, "\n")
        coords := strings.Split(split[0], " ")
        x, _ := strconv.ParseFloat(coords[0], 64)
        y, _ := strconv.ParseFloat(coords[1], 64)
        data, _ := json.Marshal(split[1])
        self.Pass("heard", fmt.Sprintf("%f, %f, %s", x, y, data))
    }
}


func (self *VirtualEntity) BlockingString() string {
    return <-(self.String())
}
func (self *VirtualEntity) String() <-chan string {
    out := make(chan string, 1)

    self.taskQueue <- func() {
        data := self.Call("getData")

        out <- (
            "{\"id\":\"" + self.ID() + "\"," +
            data[1:])
    }

    return out
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

func (self *VirtualEntity) BlockingPosition() (float64, float64) {
    return self.x, self.y
}
func (self *VirtualEntity) Position() <-chan [2]float64 {
    return CoordsAsChan(self.x, self.y)
}

func (self *VirtualEntity) Size() (float64, float64) {
    return self.width, self.height
}


func (self *VirtualEntity) BlockingType() string {
    return <-(self.Type())
}
func (self *VirtualEntity) Type() <-chan string {
    out := make(chan string, 1)

    self.taskQueue <- func() {
        eType := self.Call("type")
        if eType == "" {
            out <- "generic"
        }
        eType = eType[1:len(eType)-1]
        out <- eType
    }

    return out

}

func (self VirtualEntity) ID() string                   { return self.id }
func (self VirtualEntity) Location() EntityRegion       { return self.location }
func (self VirtualEntity) Inventory() *Inventory        { return nil }
