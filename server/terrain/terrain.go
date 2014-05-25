package terrain

import "bytes"
import "strconv"


type Terrain struct {
    Height int
    Width int
    X int
    Y int
	Tiles  [][]uint
	Hitmap [][]bool
}

type Portal struct {
    X int
    Y int
    Width int
    Height int
    Destination string
    DestinationX float32
    DestinationY float32
}

func New(world string, height, width, x, y int) *Terrain {
    tiles := make([][]uint, width)
    hitmap := make([][]bool, width)
    for i := range tiles {
        tiles[i] = make([]uint, height)
        hitmap[i] = make([]bool, height)
    }

    terrain := new(Terrain)
    terrain.Tiles = tiles
    terrain.Hitmap = hitmap
    terrain.Height = height
    terrain.Width = width
    terrain.X = x
    terrain.Y = y

    perlin := NewNoiseGenerator(DEFAULT_SEED)
    perlin.FillGrid(&tiles, 10)

    return terrain
}

func (self *Terrain) String() string {
    var buf bytes.Buffer
    buf.WriteString("\"level\": [")
    firstOuter := true
    for colno := range self.Tiles {
        col := self.Tiles[colno]
        if !firstOuter {
            buf.WriteString(",\n");
        }
        buf.WriteString("[")
        firstOuter = false
        first := true
        for cellno := range col {
            cell := col[cellno]
            if !first {
                buf.WriteString(",")
            }
            first = false
            buf.WriteString(strconv.FormatUint(uint64(cell), 10))
        }
        buf.WriteString("]")
    }

    buf.WriteString("],\"hitmap\": [")
    firstOuter = true
    for colno := range self.Hitmap {
        col := self.Hitmap[colno]
        if !firstOuter {
            buf.WriteString(",");
        }
        buf.WriteString("[")
        firstOuter = false
        first := true
        for cellno := range col {
            cell := col[cellno]
            if !first {
                buf.WriteString(",")
            }
            first = false
            if cell {
                buf.WriteString("1")
            } else {
                buf.WriteString("0")
            }
        }
        buf.WriteString("]")
    }
    buf.WriteString("], \"h\": ")
    buf.WriteString(strconv.Itoa(self.Height))
    buf.WriteString(", \"w\": ")
    buf.WriteString(strconv.Itoa(self.Width))
    buf.WriteString(", \"x\": ")
    buf.WriteString(strconv.Itoa(self.X))
    buf.WriteString(", \"y\": ")
    buf.WriteString(strconv.Itoa(self.Y))
    return buf.String()
}
