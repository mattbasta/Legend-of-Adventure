package terrain


func IntMax(a, b int) int {
    if a > b {
        return a
    } else {
        return b
    }
}
func UintMax(a, b uint) uint {
    if a > b {
        return a
    } else {
        return b
    }
}

func IntMin(a, b int) int {
    if a < b {
        return a
    } else {
        return b
    }
}
func UintMin(a, b uint) uint {
    if a < b {
        return a
    } else {
        return b
    }
}


func fillArea(terrain *Terrain, x, y, w, h, material uint) {
    for i := uint(0); i < h; i++ {
        for j := uint(0); j < w; j++ {
            terrain.Tiles[i + y][j + x] = material
        }
    }
}
func fillAreaInt(terrain *Terrain, x, y, w, h, material int) {
    fillArea(terrain, uint(x), uint(y), uint(w), uint(h), uint(material))
}

func fillHitmap(terrain *Terrain, x, y, w, h uint) {
    for i := uint(0); i < h; i++ {
        for j := uint(0); j < w; j++ {
            terrain.Hitmap[i + y][j + x] = true
        }
    }
}
func clearHitmap(terrain *Terrain, x, y, w, h uint) {
    for i := uint(0); i < h; i++ {
        for j := uint(0); j < w; j++ {
            terrain.Hitmap[i + y][j + x] = false
        }
    }
}
func fillHitmapInt(terrain *Terrain, x, y, w, h int) {
    fillHitmap(terrain, uint(x), uint(y), uint(w), uint(h))
}
func clearHitmapInt(terrain *Terrain, x, y, w, h int) {
    clearHitmap(terrain, uint(x), uint(y), uint(w), uint(h))
}
