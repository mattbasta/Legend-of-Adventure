package terrain


const HM_BUFF_DIST = 0.000001


type Hitmap [][]bool


func (self *Hitmap) Fits(x, y, w, h float64) bool {
    levW, levH := float64(len((*self)[0])), float64(len(*self))

    if x < 1 || y - h < 1 || x > levW - w - 1 || y > levH - 1 { return false }

    return !(
        (*self)[int64(y - HM_BUFF_DIST)][int64(x)] ||
        (*self)[int64(y - h + HM_BUFF_DIST)][int64(x)] ||
        (*self)[int64(y - HM_BUFF_DIST)][int64(x + w - HM_BUFF_DIST)] ||
        (*self)[int64(y - h + HM_BUFF_DIST)][int64(x + w - HM_BUFF_DIST)])
}
