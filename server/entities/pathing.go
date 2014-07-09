package entities

import (
    "log"
    "math"
    "math/rand"

    "github.com/robertkrimen/otto"
)


type PathingHelper struct {
    stageX, stageY float64
    directionStage []ventDirection
    bestDirection  *ventDirection
    repulseDirections []ventDirection
    attractDirections []ventDirection
}


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


func setUpPathing(ent *VirtualEntity) {

    ent.PathingHelper = *new(PathingHelper)

    ent.directionStage = make([]ventDirection, 0, 8)

    ent.vm.Set("isDirectionOk", func(call otto.FunctionCall) otto.Value {
        x, _ := call.Argument(0).ToFloat()
        y, _ := call.Argument(1).ToFloat()

        w, _ := call.Argument(2).ToInteger()
        h, _ := call.Argument(3).ToInteger()

        dirX, _ := call.Argument(4).ToInteger()
        dirY, _ := call.Argument(5).ToInteger()

        terrain := ent.location.GetTerrain()
        levH, levW := int64(terrain.Height), int64(terrain.Width)

        intX, intY := int64(x), int64(y)

        // If we're off the edge of the map, it's a bad direction.
        if intX + dirX <= 1 || intX + dirX + w >= levW - 1 ||
           intY + dirY - h <= 1 || intY + dirY >= levH - 1 {
            result, _ := ent.vm.ToValue(false)
            return result
        }

        hitmap := ent.location.GetTerrain().Hitmap

        if dirY < 0 { intY = intY - h }
        if dirX > 0 { intX = intX + w }

        result, _ := ent.vm.ToValue(
            !hitmap[intY + dirY][intX + dirX] &&
            !hitmap[intY + dirY - h][intX + dirX] &&
            !hitmap[intY + dirY - h][intX + dirX + w] &&
            !hitmap[intY + dirY][intX + dirX + w])
        return result

    })

    ent.vm.Set("stageAvailableTiles", func(call otto.FunctionCall) otto.Value {
        x, _ := call.Argument(0).ToFloat()
        y, _ := call.Argument(1).ToFloat()

        ent.stageX, ent.stageY = x, y

        w, _ := call.Argument(2).ToInteger()
        h, _ := call.Argument(3).ToInteger()

        terrain := ent.location.GetTerrain()
        levH, levW := int64(terrain.Height), int64(terrain.Width)

        intX, intY := int64(x), int64(y)

        minY, maxY := intY - 1, intY + 1
        if minY - h < 1 { minY = 1 + h }
        if maxY >= levH - 1 { maxY = levH - 1 }
        minX, maxX := intX - 1, intX + 1
        if minX < 1 { minX = 1 }
        if maxX + w >= levW - 1 { maxX = levW - w - 1 }

        dirStage := make([]ventDirection, 0, 8)

        hitmap := ent.location.GetTerrain().Hitmap

        for i := minY; i <= maxY; i++ {
            for j := minX; j <= maxX; j++ {
                // Skip the tile that the entity is on.
                if intY == i && intX == j { continue }
                if hitmap[i][j] || hitmap[i - h][j] { continue }
                if hitmap[i][j + w] || hitmap[i - h][j + w] { continue }
                dirStage = append(dirStage, ventDirection{int(j - intX), int(i - intY)})
            }
        }

        ent.directionStage = dirStage
        ent.repulseDirections = make([]ventDirection, 0)
        ent.attractDirections = make([]ventDirection, 0)
        return otto.Value {}
    })

    calculateDirection := func(x, y float64) ventDirection {
        // Calculate the angle of the point to the entity
        angle := math.Atan2(y - ent.stageY, x - ent.stageX) * (-180 / math.Pi)

        xDir := 0
        if math.Abs(angle) > 90 + 45 / 2 {
            xDir = -1
        } else if math.Abs(angle) < 90 - 45 / 2 {
            xDir = 1
        }

        yDir := 0
        if angle > 45 / 2 && angle < 180 - 45 / 2 {
            yDir = -1
        } else if angle < -45 / 2 / 2 && angle > -180 + 45 / 2 {
            yDir = 1
        }

        return ventDirection{xDir, yDir}

    }

    ent.vm.Set("stageRepeller", func(call otto.FunctionCall) otto.Value {
        eid, _ := call.Argument(0).ToString()
        stagedEntity := ent.location.GetEntity(eid)
        if stagedEntity == nil { return otto.Value {} }
        eX, eY := stagedEntity.Position()

        ent.repulseDirections = append(
            ent.repulseDirections,
            calculateDirection(eX, eY),
        )
        return otto.Value {}
    })
    ent.vm.Set("stageAttractor", func(call otto.FunctionCall) otto.Value {
        eid, _ := call.Argument(0).ToString()
        stagedEntity := ent.location.GetEntity(eid)
        if stagedEntity == nil { return otto.Value {} }
        eX, eY := stagedEntity.Position()
        log.Println(eX, eY)

        ent.attractDirections = append(
            ent.attractDirections,
            calculateDirection(eX, eY),
        )
        return otto.Value {}
    })

    ent.vm.Set("stageRepellerCoord", func(call otto.FunctionCall) otto.Value {
        x, _ := call.Argument(0).ToFloat()
        y, _ := call.Argument(1).ToFloat()

        ent.repulseDirections = append(
            ent.repulseDirections,
            calculateDirection(x, y),
        )
        return otto.Value {}
    })
    ent.vm.Set("stageAttractorCoord", func(call otto.FunctionCall) otto.Value {
        x, _ := call.Argument(0).ToFloat()
        y, _ := call.Argument(1).ToFloat()

        ent.attractDirections = append(
            ent.attractDirections,
            calculateDirection(x, y),
        )
        return otto.Value {}
    })

    ent.vm.Set("getDirectionToBestTile", func(call otto.FunctionCall) otto.Value {
        if len(ent.directionStage) == 0 {
            ent.bestDirection = nil
            return otto.Value {}
        }

        var tempDirs []ventDirection = ent.directionStage

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
                // log.Println("Fleeing results in no usable directions")
                tempDirs = ent.directionStage
            }
        }

        var bestDir *ventDirection = nil
        dirLen := len(tempDirs)

        if dirLen == 0 {
            result, _ := ent.vm.ToValue(nil)
            return result

        } else if dirLen == 1 {
            result, _ := ent.vm.ToValue(ventDirections[tempDirs[0]])
            return result

        } else {
            // Attempt to calculate the best direction based on attractors
            xSum, ySum := 0, 0
            for _, dir := range ent.attractDirections {
                xSum += dir[0]
                ySum += dir[1]
            }
            for _, dir := range ent.repulseDirections {
                xSum -= dir[0]
                ySum -= dir[1]
            }
            // Since there's no integer min/max :(
            if xSum < -1 { xSum = -1 }
            if xSum > 1 { xSum = 1 }
            if ySum < -1 { ySum = -1 }
            if ySum > 1 { ySum = 1 }

            for _, dir := range tempDirs {
                if dir[0] == xSum && dir[1] == ySum {
                    result, _ := ent.vm.ToValue(ventDirections[dir])
                    return result
                }
            }
        }


        bestDir = &tempDirs[ventRng.Intn(len(tempDirs))]
        result, _ := ent.vm.ToValue(ventDirections[*bestDir])
        return result
    })
}
