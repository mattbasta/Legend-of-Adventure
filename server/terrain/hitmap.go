package terrain


type Hitmap [][]bool


func (self *Hitmap) Fits(x, y, w, h float64) bool {
    levW, levH := float64(len((*self)[0])), float64(len(*self))

    if x < 1 || y - h < 1 || x > levW - w - 1 || y > levH - 1 { return false }

    intX, intY := int64(x), int64(y)
    intW, intH := int64(w), int64(h)

    return !(
        (*self)[intY][intX] ||
        (*self)[intY - intH][intX] ||
        (*self)[intY][intX + intW] ||
        (*self)[intY - intH][intX + intW])
}
