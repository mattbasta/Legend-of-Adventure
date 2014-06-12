package server


func Iabs(val int) int {
    if val < 0 {
        return val * -1
    } else {
        return val
    }
}
