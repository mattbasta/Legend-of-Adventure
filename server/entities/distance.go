package entities

import (
    "math"

    "legend-of-adventure/server/terrain"
)

type positionedEntity interface {
    Position() (float64, float64)
    Size() (uint, uint)
}


func Distance(e1 positionedEntity, e2 positionedEntity) float64 {
    e1X, e1Y := e1.Position()
    e2X, e2Y := e2.Position()
    return math.Hypot(
        e1X - e2X,
        e1Y - e2Y,
    )
}

func DistanceFrom(e1 positionedEntity, x, y float64) float64 {
    e1X, e1Y := e1.Position()
    return math.Hypot(
        e1X - x,
        e1Y - y,
    )
}

func IsEntityCollidingWithPortal(portal terrain.Portal, entity positionedEntity) bool {
    ex, ey := entity.Position() // TODO: Update this to use ApproximatePosition
    ew, eh := entity.Size()
    ewT, ehT := float64(ew / TILE_SIZE), float64(eh / TILE_SIZE)
    return (ex + ewT >= float64(portal.X) &&
            float64(portal.X + portal.W) >= ex &&
            ey >= float64(portal.Y) &&
            float64(portal.Y + portal.H) >= ey - ehT)
}
