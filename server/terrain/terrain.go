package terrain

import "bytes"
import "strconv"

const (
    WORLD_OVERWORLD = "overworld"
    WORLD_ETHER     = "ether"

    REGIONTYPE_FIELD   = "field"
    REGIONTYPE_DUNGEON = "field"
)

type Region interface {
    IsTown() bool
    IsDungeonEntrance() bool

    GetParent() string
    GetType() string
    GetX() int
    GetY() int
}


type Terrain struct {
    Height uint
    Width uint
    X int
    Y int
	Tiles  [][]uint
	Hitmap [][]bool
    Portals []Portal
}

func Get(region Region, height, width uint) *Terrain {
    terrain := New(height, width)
    terrain.X = region.GetX()
    terrain.Y = region.GetY()

    perlin := NewNoiseGenerator(DEFAULT_SEED)

    regType := region.GetType()
    if regType == REGIONTYPE_FIELD {
        perlin.FillGrid(&terrain.Tiles, TERRAIN_PERLIN_MAX)
    }
    TerrainRounding(terrain.Tiles, FieldTileset)

    return terrain
}


func New(height, width uint) *Terrain {
    tiles := make([][]uint, height)
    hitmap := make([][]bool, height)
    for i := range tiles {
        tiles[i] = make([]uint, width)
        hitmap[i] = make([]bool, width)
    }

    terrain := new(Terrain)
    terrain.Tiles = tiles
    terrain.Hitmap = hitmap
    terrain.Portals = make([]Portal, 0)
    terrain.Height = height
    terrain.Width = width

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
    buf.WriteString(strconv.Itoa(int(self.Height)))
    buf.WriteString(", \"w\": ")
    buf.WriteString(strconv.Itoa(int(self.Width)))
    buf.WriteString(", \"x\": ")
    buf.WriteString(strconv.Itoa(self.X))
    buf.WriteString(", \"y\": ")
    buf.WriteString(strconv.Itoa(self.Y))
    return buf.String()
}
