package entities

import (
    "fmt"
    "log"
    "math/rand"
    "strconv"
    "time"

    "github.com/robertkrimen/otto"

    "legend-of-adventure/server/events"
)


var ventRng = rand.New(rand.NewSource(8675309))

type ventDirection [2]int8

// This corresponds to /resources/entities/sentient.js
var ventDirections = map[ventDirection]int {
    ventDirection{1, 0}: 0,
    ventDirection{1, 1}: 1,
    ventDirection{0, 1}: 2,
    ventDirection{-1, 1}: 3,
    ventDirection{-1, 0}: 4,
    ventDirection{-1, -1}: 5,
    ventDirection{0, -1}: 6,
    ventDirection{1, -1}: 7,
}


type VirtualEntity struct {
    id         string
    closing    chan bool

    location   EntityRegion

    vm         *EntityVM

    lastTick   int64

    directionStage []ventDirection
    bestDirection  ventDirection
}

func NewVirtualEntity(entityName string) *VirtualEntity {
    ent := new(VirtualEntity)
    ent.id = NextEntityID()
    ent.closing = make(chan bool)

    ent.vm = GetEntityVM(entityName)

    ent.vm.vm.Set("sendEvent", func(call otto.FunctionCall) otto.Value {
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

    ent.vm.vm.Set("getDistance", func(call otto.FunctionCall) otto.Value {
        entity := ent.location.GetEntity(call.Argument(0).String())
        // TODO: This might be really costly if it has to look up the
        // position form the VM
        dist := Distance(ent, entity)
        result, _ := ent.vm.vm.ToValue(dist)
        return result
    })

    ent.vm.vm.Set("getDistanceFrom", func(call otto.FunctionCall) otto.Value {
        entity := ent.location.GetEntity(call.Argument(0).String())

        x, _ := call.Argument(1).ToFloat()
        y, _ := call.Argument(2).ToFloat()
        dist := DistanceFrom(entity, x, y)
        result, _ := ent.vm.vm.ToValue(dist)
        return result
    })

    ent.directionStage = make([]ventDirection, 0, 8)

    ent.vm.vm.Set("stageAvailableTiles", func(call otto.FunctionCall) otto.Value {
        // maxDist, _ := call.Argument(0).ToFloat()
        x, _ := call.Argument(1).ToFloat()
        y, _ := call.Argument(2).ToFloat()
        // TODO: Consider width
        w, _ := call.Argument(3).ToInteger()
        h, _ := call.Argument(4).ToInteger()

        terrain := ent.location.GetTerrain()
        levH, levW := int(terrain.Height), int(terrain.Width)

        minY, maxY := int(y - 1), int(y + 1 + w)
        if minY - int(h) < 0 { minY = 0 }
        if maxY >= levH { minY = levH }
        minX, maxX := int(x - 1), int(x + 1)
        if minX < 0 { minX = 0 }
        if maxX >= levW { minX = levW }

        dirStage := make([]ventDirection, 0, 8)

        for i := minY; i <= maxY; i++ {
            for j := minX; j <= maxX; j++ {
                // Skip the tile that the player is on.
                if int(y) == i || int(x) == j { continue }
                dirStage = append(dirStage, ventDirection{int8(j), int8(i)})
            }
        }

        // TODO: filter staged directions by hitmap

        ent.directionStage = dirStage
        return otto.Value {}
    })
    ent.vm.vm.Set("calculateBestDirection", func(call otto.FunctionCall) otto.Value {
        // TODO: Make this actually calculate something
        ent.bestDirection = ent.directionStage[ventRng.Intn(len(ent.directionStage))]
        return otto.Value {}
    })
    ent.vm.vm.Set("getDirectionToBestTile", func(call otto.FunctionCall) otto.Value {
        result, _ := ent.vm.vm.ToValue(ventDirections[ent.bestDirection])
        return result
    })

    return ent
}



func (self *VirtualEntity) SetLocation(location EntityRegion) {
    self.location = location

    self.vm.vm.Set("getLevWidth", func(call otto.FunctionCall) otto.Value {
        result, _ := self.vm.vm.ToValue(self.location.GetTerrain().Width)
        return result
    })

    self.vm.vm.Set("getLevHeight", func(call otto.FunctionCall) otto.Value {
        result, _ := self.vm.vm.ToValue(self.location.GetTerrain().Height)
        return result
    })

    self.vm.Pass("setup", "null")

    go self.gameTick()
}

func (self *VirtualEntity) SetPosition(x, y float64) {
    self.vm.Pass("setPosition", fmt.Sprintf("%f, %f", x, y))
}

func (self *VirtualEntity) gameTick() {
    ticker := time.NewTicker(250 * time.Millisecond)
    self.lastTick = time.Now().UnixNano() / 1e6
    defer ticker.Stop()
    for {
        select {
        case <-ticker.C:
            now := time.Now().UnixNano() / 1e6
            self.vm.Pass("tick", fmt.Sprintf("%d, %d", now, now - self.lastTick))
            self.lastTick = now
        case <-self.closing:
            self.closing <- true
            return
        }
    }
}


func (self *VirtualEntity) Receive() chan<- *events.Event {
    receiver := make(chan *events.Event)

    go func() {
        for {
            select {
            case <-self.closing:
                self.closing <- true
                return
            case event := <-receiver:
                self.handle(event)
            }
        }
    }()
    return receiver
}

func (self *VirtualEntity) handle(event *events.Event) {
    switch event.Type {
    case events.ENTITY_UPDATE:
        //
    }
}


func (self *VirtualEntity) String() string {
    data := self.vm.Call("getData")

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


func (self VirtualEntity) Position() (float64, float64) {
    x, y := self.vm.Call("getX"), self.vm.Call("getY")
    xF, _ := strconv.ParseFloat(x, 64)
    yF, _ := strconv.ParseFloat(y, 64)
    return xF, yF
}
func (self VirtualEntity) Size() (uint, uint) {
    width, height := self.vm.Call("getWidth"), self.vm.Call("getHeight")
    widthUint, _ := strconv.ParseUint(width, 10, 0)
    heightUint, _ := strconv.ParseUint(height, 10, 0)
    return uint(widthUint), uint(heightUint)
}

func (self VirtualEntity) ID() string                   { return self.id }
func (self VirtualEntity) Dead() bool                   { return false }
func (self VirtualEntity) Location() EntityRegion       { return self.location }
func (self VirtualEntity) Inventory() *Inventory        { return nil }
