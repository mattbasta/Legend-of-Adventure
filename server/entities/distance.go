package entities

import (
    "math"

    "legend-of-adventure/server/terrain"
)

type positionedEntity interface {
    BlockingPosition() (float64, float64)
    Size() (float64, float64)
}


func DistanceFrom(e1 positionedEntity, x, y float64) float64 {
    e1X, e1Y := e1.BlockingPosition()
    return math.Hypot(
        e1X - x,
        e1Y - y,
    )
}

func DistanceFromCoords(x1, y1, x2, y2 float64) float64 {
    return math.Hypot(
        x1 - x2,
        y1 - y2,
    )
}

func IsEntityCollidingWithPortal(portal terrain.Portal, entity positionedEntity) bool {
    ex, ey := entity.BlockingPosition()
    ew, eh := entity.Size()
    return (ex + ew >= float64(portal.X) &&
            float64(portal.X + portal.W) >= ex &&
            ey >= float64(portal.Y) &&
            float64(portal.Y + portal.H) >= ey - eh)
}
