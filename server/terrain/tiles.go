package terrain

import (
    "bufio"
    "log"
    "os"
    "strconv"
    "strings"
)


type FeatureTiles struct {
    Width uint
    Height uint

    Tiles  [][]uint
    Hitmap [][]bool
}


var tilesetCache = make(map[string]*FeatureTiles)


func strToUintArr(strings []string) []uint {
    arr := make([]uint, len(strings))
    for i, s := range strings {
        x, _ := strconv.ParseUint(s, 10, 0)
        arr[i] = uint(x)
    }
    return arr
}
func strToBoolArr(strings []string) []bool {
    arr := make([]bool, len(strings))
    for i, s := range strings {
        x, _ := strconv.ParseBool(s)
        arr[i] = x
    }
    return arr
}

func GetFeatureTiles(setName string) *FeatureTiles {
    if tileset, ok := tilesetCache[setName]; ok {
        return tileset
    }

    tileFile, err := os.Open("resources/tilesets/" + setName + ".tiles")
    if err != nil {
        log.Println("Could not open tileset '" + setName + "'")
        return nil
    }
    hitmapFile, err := os.Open("resources/tilesets/" + setName + ".hitmap")
    if err != nil {
        log.Println("Could not open hitmap '" + setName + "'")
        return nil
    }

    tileset := new(FeatureTiles)

    tiles := make([][]uint, 0)
    hitmap := make([][]bool, 0)

    tileScan := bufio.NewScanner(tileFile)
    hitmapScan := bufio.NewScanner(hitmapFile)
    for tileScan.Scan() {
        hitmapScan.Scan()

        tileSplit := strings.Split(tileScan.Text(), " ")
        hitmapSplit := strings.Split(hitmapScan.Text(), " ")
        tiles = append(tiles, strToUintArr(tileSplit))
        hitmap = append(hitmap, strToBoolArr(hitmapSplit))
    }

    tileset.Tiles = tiles
    tileset.Hitmap = hitmap

    tileset.Height = uint(len(tiles))
    tileset.Width = uint(len(tiles[0]))

    tilesetCache[setName] = tileset

    return tileset
}

func (self FeatureTiles) Apply(terrain *Terrain, x, y int) {
    for i := range self.Tiles {
        for j := range self.Tiles[i] {
            terrain.Tiles[i + y][j + x] = self.Tiles[i][j]
            terrain.Hitmap[i + y][j + x] = self.Hitmap[i][j] || terrain.Hitmap[i + y][j + x]
        }
    }
}
