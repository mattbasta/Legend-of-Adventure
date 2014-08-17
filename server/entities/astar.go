package entities

import (
    "math"

    "legend-of-adventure/server/terrain"
)


type pathStep struct {
    X, Y int
    F, G, H float64
    Parent *pathStep
    pX, pY int
    updated bool
}


func (self *pathStep) updateWeight(destX, destY float64) {
    self.G = self.Parent.G + 10
    if self.X - self.Parent.X != 0 && self.Y - self.Parent.Y != 0 {
        self.G += 4
    }
    distX, distY := destX - float64(self.X), destY - float64(self.Y)
    self.H = math.Sqrt(distX * distX + distY * distY)
    self.F = self.G + self.H
}

func (self pathStep) getPath(set map[[2]int]pathStep) []pathStep {
    revOutput := make([]pathStep, 0)
    var nX, nY int
    nX, nY = self.pX, self.pY
    for {
        parent := set[[2]int {nX, nY}]
        revOutput = append(revOutput, parent)
        if parent.pX == -1 || parent.pY == -1 { break }
        nX, nY = parent.pX, parent.pY
    }

    // reverse the output
    lenPath := len(revOutput)
    output := make([]pathStep, lenPath)
    for i, pS := range revOutput {
        output[lenPath - i - 1] = pS
    }
    return output
}


func pathContains(x, y int, haystack []pathStep) bool {
    for _, step := range haystack {
        if step.X == x && step.Y == y { return true }
    }
    return false
}

func pathIndex(x, y int, haystack []pathStep) int {
    for i, step := range haystack {
        if step.X == x && step.Y == y { return i }
    }
    return -1
}

func pathRemove(needle pathStep, haystack []pathStep) []pathStep {
    for i, step := range haystack {
        if step.X == needle.X && step.Y == needle.Y {
            return append(haystack[:i], haystack[i+1:]...)
        }
    }
    return haystack
}


func PathAStar(sx, sy, w, h, dx, dy float64, hitmap *terrain.Hitmap) []pathStep {
    openList := make([]pathStep, 1)

    closedCoords := make(map[[2]int]pathStep, 1024)

    // Add the origin to the path
    origin := pathStep {
        int(sx), int(sy),
        0, 0, 0,
        nil,
        -1, -1,
        false,
    }
    openList[0] = origin

    getFMin := func() pathStep {
        index := 0
        for i, ps := range openList {
            if ps.F < openList[index].F {
                index = i
            }
        }
        return openList[index]
    }

    getNeighbors := func(from pathStep) []pathStep {
        output := make([]pathStep, 0, 8)
        for i := -1; i < 2; i++ {
            for j := -1; j < 2; j++ {
                // Ignore the tile we're currently enumerating.
                if i == 0 && j == 0 { continue }

                x, y := from.X + j, from.Y + i


                // Ignore tiles that the entity can't enter.
                if !hitmap.Fits(float64(x), float64(y), w, h) { continue }
                // Ignore tiles that we've already enumerated.
                if _, ok := closedCoords[[2]int {x, y}]; ok { continue }

                // Don't allow the entity to cut corners
                if i != 0 && j != 0 {
                    if !hitmap.Fits(float64(from.X + j), float64(from.Y), w, h) { continue }
                    if !hitmap.Fits(float64(from.X), float64(from.Y + i), w, h) { continue }
                }

                newStep := new(pathStep)
                newStep.X, newStep.Y = x, y
                newStep.Parent = &from
                newStep.pX, newStep.pY = from.X, from.Y

                output = append(output, *newStep)
            }
        }
        return output
    }

    // Begin the search
    for {
        if len(openList) == 0 { return nil }
        current := getFMin()

        // Move current from the open list to the close list
        openList = pathRemove(current, openList)
        if current.X == int(dx) && current.Y == int(dy) {
            finalPath := current.getPath(closedCoords)
            return finalPath
        }
        closedCoords[[...]int {current.X, current.Y}] = current

        walkable := getNeighbors(current)
        for _, ps := range walkable {
            ps.updateWeight(dx, dy)
            if !pathContains(ps.X, ps.Y, openList) {
                openList = append(openList, ps)
            } else {
                idx := pathIndex(ps.X, ps.Y, openList)
                if openList[idx].F > ps.F {
                    openList[idx].Parent = ps.Parent
                    openList[idx].updated = true
                    openList[idx].pX, openList[idx].pY = ps.Parent.X, ps.Parent.Y
                }
            }

        }

    }
}
