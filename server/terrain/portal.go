package terrain


func NewPortal(x, y, w, h uint, destination string, destX, destY float64) Portal {
    portal := new(Portal)
    portal.X, portal.Y = x, y
    portal.W, portal.H = w, h
    portal.Target = destination
    portal.DestX, portal.DestY = destX, destY
    return *portal
}


type Portal struct {
    X, Y uint
    W, H uint
    Target string
    DestX, DestY float64
}
