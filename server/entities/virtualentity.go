package entities

import (
    "fmt"
    "log"
    "math"
    "math/rand"
    "strconv"
    "time"

    "github.com/robertkrimen/otto"

    "legend-of-adventure/server/events"
)


var ventRng = rand.New(rand.NewSource(8675309))

type ventDirection [2]int

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

    stageX, stageY float64
    directionStage []ventDirection
    bestDirection  *ventDirection
    repulseDirections []ventDirection
    attractDirections []ventDirection
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
        x, _ := call.Argument(0).ToFloat()
        y, _ := call.Argument(1).ToFloat()
        // TODO: Consider width
        w, _ := call.Argument(2).ToInteger()
        h, _ := call.Argument(3).ToInteger()

        terrain := ent.location.GetTerrain()
        levH, levW := int(terrain.Height), int(terrain.Width)

        intX, intY := int(x), int(y)

        minY, maxY := intY - 1, intY + 1
        if minY - int(h) < 0 { minY = 0 }
        if maxY >= levH { minY = levH }
        minX, maxX := intX - 1, intX + 1
        if minX < 0 { minX = 0 }
        if maxX + int(w) >= levW { minX = levW }

        dirStage := make([]ventDirection, 0, 8)

        for i := minY; i <= maxY; i++ {
            for j := minX; j <= maxX; j++ {
                // Skip the tile that the player is on.
                if intY == i || intX == j { continue }
                dirStage = append(dirStage, ventDirection{j - intX, i - intY})
            }
        }

        // TODO: filter staged directions by hitmap

        ent.directionStage = dirStage
        ent.repulseDirections = make([]ventDirection, 0)
        ent.attractDirections = make([]ventDirection, 0)
        return otto.Value {}
    })

    calculateDirection := func(x, y float64) ventDirection {
        // Calculate the angle of the point to the entity
        angle := math.Atan2(y - ent.stageY, x - ent.stageX) * (-180 / math.Pi)

        // TODO: The below algorithms might be a bit wonky. Instead of choosing
        // the proper angle based on 45-degree markers, the angle should be
        // chosen based on the efficiency of each direction. For instance, if
        // the target is slightly more than 45 degrees away, the algorithm may
        // choose to move vertically or horizontally, even though the most
        // efficient direciton is at an angle.
        // Remedying this may be as simple as adjusting the angles to be based
        // on 30-degree increments rather than 45-degree increments.

        xDir := 0
        if math.Abs(angle) > 135 {
            xDir = -1
        } else if math.Abs(angle) < 45 {
            xDir = 1
        }

        yDir := 0
        if angle > 45 && angle < 135 {
            yDir = -1
        } else if angle < -45 && angle > -135 {
            yDir = 1
        }

        return ventDirection{xDir, yDir}

    }

    ent.vm.vm.Set("stageRepeller", func(call otto.FunctionCall) otto.Value {
        eid, _ := call.Argument(0).ToString()
        eX, eY := ent.location.GetEntity(eid).Position()

        ent.repulseDirections = append(
            ent.repulseDirections,
            calculateDirection(eX, eY),
        )
        return otto.Value {}
    })
    ent.vm.vm.Set("stageAttractor", func(call otto.FunctionCall) otto.Value {
        eid, _ := call.Argument(0).ToString()
        eX, eY := ent.location.GetEntity(eid).Position()

        ent.attractDirections = append(
            ent.attractDirections,
            calculateDirection(eX, eY),
        )
        return otto.Value {}
    })
    ent.vm.vm.Set("getDirectionToBestTile", func(call otto.FunctionCall) otto.Value {
        if len(ent.directionStage) == 0 {
            ent.bestDirection = nil
            return otto.Value {}
        }

        var tempDirs []ventDirection = nil

        // If there are any repellers, try removing them from the list
        // of available directions.
        if len(ent.repulseDirections) > 0 {
            tempDirs = make([]ventDirection, len(ent.directionStage))
            copy(tempDirs, ent.directionStage)

            // Attempt to remove each of the repellers
            for _, dir := range ent.repulseDirections {
                for i := 0; i < len(tempDirs); i++ {
                    if tempDirs[i] != dir {
                        continue
                    }
                    tempDirs = append(tempDirs[:i], tempDirs[i + 1:]...)
                    break
                }
            }
            if len(tempDirs) == 0 {
                tempDirs = ent.directionStage
            }
        }

        var bestDir *ventDirection = nil
        dirLen := len(tempDirs)

        if dirLen == 0 {
            result, _ := ent.vm.vm.ToValue(nil)
            return result

        } else if dirLen == 1 {
            result, _ := ent.vm.vm.ToValue(ventDirections[tempDirs[0]])
            return result

        } else {
            // Attempt to calculate the best direction based on attractors
            xSum, ySum := 0, 0
            for _, dir := range ent.attractDirections {
                xSum += dir[0]
                ySum += dir[1]
            }
            // Since there's no integer min/max :(
            if xSum < -1 { xSum = -1 }
            if xSum > 1 { xSum = 1 }
            if ySum < -1 { ySum = -1 }
            if ySum > 1 { ySum = 1 }

            for _, dir := range tempDirs {
                if dir[0] == xSum && dir[1] == ySum {
                    result, _ := ent.vm.vm.ToValue(ventDirections[dir])
                    return result
                }
            }
        }


        bestDir = &tempDirs[ventRng.Intn(len(tempDirs))]
        result, _ := ent.vm.vm.ToValue(ventDirections[*bestDir])
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
