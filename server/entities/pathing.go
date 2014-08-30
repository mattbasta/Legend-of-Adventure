package entities

import (
    "fmt"
    "log"
    "math"
    "math/rand"

    "github.com/robertkrimen/otto"

    "legend-of-adventure/server/events"
)


type PathingHelper struct {
    stageX, stageY float64
    directionStage []ventDirection
    bestDirection  *ventDirection

    repulseDirections []ventDirection
    attractDirections []ventDirection

    repulseCoords [][2]float64
    attractCoords [][2]float64

    lastPath []pathStep
    lastDirection ventDirection
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

        w, _ := call.Argument(2).ToFloat()
        h, _ := call.Argument(3).ToFloat()

        dirX, _ := call.Argument(4).ToFloat()
        dirY, _ := call.Argument(5).ToFloat()

        terrain := ent.location.GetTerrain()
        hitmap := terrain.Hitmap

        fits := hitmap.Fits(x + dirX, y + dirY, w, h)

        if !fits {
            result, _ := ent.vm.ToValue(false)
            return result
        }

        if ent.lastPath != nil && len(ent.lastPath) > 0 {
            firstStep := ent.lastPath[0]
            fsX, fsY := float64(firstStep.X), float64(firstStep.Y)
            firstDist := DistanceFromCoords(fsX, fsY, x, y)
            firstDistAfter := DistanceFromCoords(fsX, fsY, x + dirX, y + dirY)
            if len(ent.lastPath) == 1 {
                if firstDist < firstDistAfter {
                    fits = false
                }
            } else if len(ent.lastPath) >= 2 {
                if firstDist < firstDistAfter {
                    sliced := ent.lastPath[1:]
                    ent.lastPath = sliced
                    lpX, lpY := float64(ent.lastPath[0].X), float64(ent.lastPath[0].Y)
                    fits = DistanceFromCoords(lpX, lpY, x, y) < DistanceFromCoords(lpX, lpY, x + dirX, y + dirY)
                }
            }
        }

        result, _ := ent.vm.ToValue(fits)
        return result

    })

    ent.vm.Set("stageAvailableTiles", func(call otto.FunctionCall) otto.Value {
        x, _ := call.Argument(0).ToFloat()
        y, _ := call.Argument(1).ToFloat()

        ent.stageX, ent.stageY = x, y

        w, _ := call.Argument(2).ToFloat()
        h, _ := call.Argument(3).ToFloat()

        dirStage := make([]ventDirection, 0, 8)

        terrain := ent.location.GetTerrain()
        hitmap := terrain.Hitmap

        for i := y - 1; i <= y + 1; i++ {
            for j := x - 1; j <= x + 1; j++ {
                if y == i && x == j { continue }
                if !hitmap.Fits(j, i, w, h) { continue }
                dirStage = append(dirStage, ventDirection{int(j - x), int(i - y)})
            }
        }

        ent.directionStage = dirStage
        ent.repulseDirections = make([]ventDirection, 0)
        ent.attractDirections = make([]ventDirection, 0)
        ent.repulseCoords = make([][2]float64, 0)
        ent.attractCoords = make([][2]float64, 0)
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

    ent.vm.Set("clearStagedPath", func(call otto.FunctionCall) otto.Value {
        ent.lastPath = nil
        return otto.Value {}
    })

    ent.vm.Set("stageRepeller", func(call otto.FunctionCall) otto.Value {
        eid, _ := call.Argument(0).ToString()
        stagedEntity := ent.location.GetEntity(eid)
        if stagedEntity == nil { return otto.Value {} }
        eX, eY := UnpackCoords(<-(stagedEntity.Position()))

        ent.repulseDirections = append(
            ent.repulseDirections,
            calculateDirection(eX, eY),
        )
        ent.repulseCoords = append(
            ent.repulseCoords,
            [2]float64 {eX, eY},
        )
        return otto.Value {}
    })
    ent.vm.Set("stageAttractor", func(call otto.FunctionCall) otto.Value {
        eid, _ := call.Argument(0).ToString()
        stagedEntity := ent.location.GetEntity(eid)
        if stagedEntity == nil { return otto.Value {} }
        eX, eY := UnpackCoords(<-(stagedEntity.Position()))

        ent.attractDirections = append(
            ent.attractDirections,
            calculateDirection(eX, eY),
        )
        ent.attractCoords = append(
            ent.attractCoords,
            [2]float64 {eX, eY},
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
        ent.repulseCoords = append(
            ent.repulseCoords,
            [2]float64 {x, y},
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
        ent.attractCoords = append(
            ent.attractCoords,
            [2]float64 {x, y},
        )
        return otto.Value {}
    })

    getDirectionToBestTile := func(call otto.FunctionCall) otto.Value {
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
    }
    ent.vm.Set("getDirectionToBestTile", getDirectionToBestTile)

    ent.vm.Set("pathToBestTile", func(call otto.FunctionCall) otto.Value {

        entW, entH := ent.Size()

        // log.Println(
        //     ent.lastPath != nil,
        //     len(ent.lastPath) > 1,
        //     len(ent.attractCoords) == 0,
        // )

        if ent.lastPath != nil &&
           len(ent.lastPath) > 1 &&
           len(ent.attractCoords) == 0 {

            firstStep := ent.lastPath[0]
            secondStep := ent.lastPath[1]

            firstStepDirection := calculateDirection(
                float64(firstStep.X) + entW / 2,
                float64(firstStep.Y),
            )
            secondStepDirection := calculateDirection(
                float64(secondStep.X) + entW / 2,
                float64(secondStep.Y),
            )

            victorDirection := firstStepDirection
            if firstStepDirection != secondStepDirection && firstStepDirection != ent.lastDirection {
                victorDirection = secondStepDirection
                ent.lastPath = ent.lastPath[1:]
            }

            result, _ := ent.vm.ToValue(ventDirections[victorDirection])
            return result

        }
        if len(ent.attractCoords) > 0 && len(ent.repulseCoords) == 0 {
            attractMin := 10.0
            for _, coord := range ent.attractCoords {
                dist := DistanceFromCoords(
                    ent.stageX, ent.stageY,
                    coord[0], coord[1],
                )
                if dist < attractMin {
                    attractMin = dist
                }
            }
            if attractMin < ASTAR_NAIVE_FALLBACK_DIST {
                return getDirectionToBestTile(call)
            }
        }

        attractPaths := make([][]pathStep, 0, len(ent.attractCoords))

        terrain := ent.location.GetTerrain()
        hitmap := terrain.Hitmap

        // Find all paths to all attractors
        for _, coord := range ent.attractCoords {
            temp := PathAStar(
                ent.stageX, ent.stageY,
                entW, entH,
                coord[0], coord[1],
                &hitmap,
            )
            if temp == nil {
                // TODO: Trigger a forget event
                log.Println("Attractor path could not be found.")
                continue
            }
            attractPaths = append(attractPaths, temp)
        }

        viablePaths := attractPaths

        // If the entity has nowhere to go, choose some random paths that the
        // entity can go.
        if len(viablePaths) == 0 {
            // log.Println("No viable paths")

            terrain := ent.location.GetTerrain()
            hitmap := terrain.Hitmap

            tries := 0
            for i := 0; i < ASTAR_FLEE_PATH_SAMPLE; i++ {

                if tries > ASTAR_RANDOM_MAX_TRIES {
                    return otto.Value {}
                }

                randX := ventRng.Float64() * ASTAR_RANDOM_SAMPLE_DIAMETER - ASTAR_RANDOM_SAMPLE_DIAMETER / 2
                randY := ventRng.Float64() * ASTAR_RANDOM_SAMPLE_DIAMETER - ASTAR_RANDOM_SAMPLE_DIAMETER / 2


                if math.Abs(randX) + math.Abs(randY) < ASTAR_MIN_RANDOM_SAMPLE_DIAMETER {
                    i--
                    continue
                }

                if !hitmap.Fits(ent.stageX + randX, ent.stageY + randY, entW, entH) {
                    i--
                    tries++
                    // log.Println("Entity doesn't fit into attempted path")
                    continue
                }
                temp := PathAStar(
                    ent.stageX, ent.stageY,
                    entW, entH,
                    ent.stageX + randX, ent.stageY + randY,
                    &hitmap,
                )
                if temp == nil {
                    tries++
                    continue
                }
                viablePaths = append(viablePaths, temp)
            }

        }

        var mostViablePath []pathStep
        if len(viablePaths) > 1 {
            // log.Println("Multiple paths possible")
            mostViablePath = nil
            highestScore := 0
            for _, path := range viablePaths {
                score := len(path) * -1
                minPathDistance := 99999.9
                for _, ps := range path[1:] {
                    stepDist := 0.0
                    for _, repCoord := range ent.repulseCoords {
                        stepDist += DistanceFromCoords(
                            float64(ps.X), float64(ps.Y),
                            repCoord[0], repCoord[1],
                        )
                    }
                    if stepDist < minPathDistance {
                        minPathDistance = stepDist
                    }
                }
                score += int(minPathDistance)
                if mostViablePath == nil || score > highestScore {
                    mostViablePath = path
                    highestScore = score
                }

            }
        } else if len(viablePaths) == 1 {
            mostViablePath = viablePaths[0]
        } else {
            return otto.Value {}
        }

        if ASTAR_DRAW_PARTICLES {
            for _, step := range mostViablePath {
                ent.location.Broadcast(
                    ent.location.GetEvent(
                        events.PARTICLE,
                        fmt.Sprintf(
                            "%d %d red 10 20",
                            step.X,
                            step.Y,
                        ),
                        nil,
                    ),
                )
            }
        }

        firstStep := mostViablePath[0]
        if len(mostViablePath) > 1 {
            distFromFirstStep := DistanceFromCoords(
                ent.stageX,
                ent.stageY,
                float64(firstStep.X) + entW / 2,
                float64(firstStep.Y),
            )
            if distFromFirstStep < 1 {
                mostViablePath = mostViablePath[1:]
                firstStep = mostViablePath[0]
            }

        }
        firstStepDirection := calculateDirection(
            float64(firstStep.X) + entW / 2,
            float64(firstStep.Y),
        )

        ent.lastPath = mostViablePath

        result, _ := ent.vm.ToValue(ventDirections[firstStepDirection])
        return result
    })
}
