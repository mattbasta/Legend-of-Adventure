package entities

import (
    "math"
    "math/rand"

    "legend-of-adventure/server/terrain"
)


var rng = rand.New(rand.NewSource(123123))

type pathStep struct {
    X, Y int
    F, G, H int
    Parent *pathStep
}

func (self *pathStep) relativeDistance() int {
    parent := self.Parent
    hor := (int)(math.Abs((float64)(self.X - parent.X)))
    ver := (int)(math.Abs((float64)(self.Y - parent.Y)))
    return hor + ver
}

func (self *pathStep) updateWeight(destX, destY float64) {
    if self.relativeDistance() == 1 {
        self.G = self.Parent.G + 10
    } else {
        self.G = self.Parent.G + 14
    }
    absx := int(math.Abs(destX - float64(self.X)))
    absy := int(math.Abs(destY - float64(self.Y)))
    self.H = (absx + absy) * 10
    self.F = self.G + self.H
}

func (self *pathStep) getPath() []pathStep {
    revOutput := make([]pathStep, 0)
    next := self
    for parent := next.Parent; parent != nil; parent = next.Parent {
        revOutput = append(revOutput, *next)
        next = parent
    }

    // reverse the output
    lenPath := len(revOutput)
    output := make([]pathStep, lenPath)
    for i, pS := range revOutput {
        output[lenPath - i - 1] = pS
    }
    return output
}


func pathContains(x, y int, haystack *[]pathStep) bool {
    for _, step := range *haystack {
        if step.X == x && step.Y == y { return true }
    }
    return false
}

func pathIndex(x, y int, haystack *[]pathStep) int {
    for i, step := range *haystack {
        if step.X == x && step.Y == y { return i }
    }
    return -1
}

func pathRemove(needle *pathStep, haystack *[]pathStep) *[]pathStep {
    for i, step := range *haystack {
        if step.X == needle.X && step.Y == needle.Y {
            temp := append((*haystack)[:i], (*haystack)[i+1:]...)
            return &temp
        }
    }
    return haystack
}


func PathAStar(sx, sy, w, h, dx, dy float64, hitmap *terrain.Hitmap) *[]pathStep {
    openList := make([]pathStep, 1)

    closedCoords := make(map[[2]int]bool, 1024)

    intSX, intSY := int(sx), int(sy)
    // intDX, intDY := int(dx), int(dy)

    // Add the origin to the path
    openList[0] = pathStep {
        intSX, intSY,
        0, 0, 0,
        nil,
    }

    getFMin := func() *pathStep {
        if len(openList) == 0 { return nil }
        index := 0
        for i, ps := range openList {
            if ps.F < openList[index].F {
                index = i
            }
        }
        return &openList[index]
    }

    getNeighbors := func(from *pathStep) []pathStep {
        output := make([]pathStep, 0, 8)
        for i := -1; i < 2; i++ {
            for j := -1; j < 2; j++ {
                // Ignore the tile we're currently enumerating.
                if i == 0 && j == 0 { continue }

                x, y := from.X + j, from.Y + i

                // Ignore tiles that the entity can't enter.
                if !hitmap.Fits(float64(x), float64(y), w, h) { continue }
                // Ignore tiles that we've already enumerated.
                if _, ok := closedCoords[[...]int {x, y}]; ok { continue }

                // TODO: Don't allow diagonals if the tile can't be reached directly

                output = append(output, pathStep {
                    x, y,
                    0, 0, 0,
                    from,
                })
            }
        }
        return output
    }

    // Begin the search
    for {
        current := getFMin()

        if current == nil {
            return nil
        }

        // Move current from the open list to the close list
        openList = *pathRemove(current, &openList)
        if current.X == int(dx) && current.Y == int(dy) {
            finalPath := current.getPath()
            return &finalPath
        }
        closedCoords[[...]int {current.X, current.Y}] = true

        walkable := getNeighbors(current)
        for _, ps := range walkable {
            ps.updateWeight(dx, dy)
            if !pathContains(ps.X, ps.Y, &openList) {
                openList = append(openList, ps)
            } else {
                idx := pathIndex(ps.X, ps.Y, &openList)
                if openList[idx].F > ps.F {
                    openList[idx].Parent = ps.Parent
                }
            }

        }

    }
}
