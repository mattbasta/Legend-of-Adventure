package terrain

import "strconv"

type Tile [4]uint
func (self Tile) String() string {
    return strconv.Itoa(int(self[0])) + "," +strconv.Itoa(int(self[1])) + "," + strconv.Itoa(int(self[2])) + "," + strconv.Itoa(int(self[3]))
}

type Tileset map[Tile]uint

var FieldTileset = Tileset{
    Tile{5, 5, 5, 4}: 0,
    Tile{5, 5, 4, 4}: 1,
    Tile{5, 5, 4, 5}: 2,
    Tile{5, 4, 4, 4}: 3,
    Tile{4, 5, 4, 4}: 4,
    Tile{5, 4, 5, 4}: 5,
    Tile{4, 4, 4, 4}: 6,
    Tile{4, 5, 4, 5}: 7,
    Tile{4, 4, 5, 4}: 8,
    Tile{4, 4, 4, 5}: 9,
    Tile{5, 4, 5, 5}: 10,
    Tile{4, 4, 5, 5}: 11,
    Tile{4, 5, 5, 5}: 12,
    Tile{4, 5, 5, 4}: 13,
    Tile{5, 4, 4, 5}: 14,

    Tile{6, 6, 6, 5}: 15,
    Tile{6, 6, 5, 5}: 16,
    Tile{6, 6, 5, 6}: 17,
    Tile{6, 5, 5, 5}: 18,
    Tile{5, 6, 5, 5}: 19,
    Tile{6, 5, 6, 5}: 20,
    Tile{5, 5, 5, 5}: 21,
    Tile{5, 6, 5, 6}: 22,
    Tile{5, 5, 6, 5}: 23,
    Tile{5, 5, 5, 6}: 24,
    Tile{6, 5, 6, 6}: 25,
    Tile{5, 5, 6, 6}: 26,
    Tile{5, 6, 6, 6}: 27,
    Tile{5, 6, 6, 5}: 28,
    Tile{6, 5, 5, 6}: 29,

    Tile{7, 7, 7, 6}: 30,
    Tile{7, 7, 6, 6}: 31,
    Tile{7, 7, 6, 7}: 32,
    Tile{7, 6, 6, 6}: 33,
    Tile{6, 7, 6, 6}: 34,
    Tile{7, 6, 7, 6}: 35,
    Tile{6, 6, 6, 6}: 36,
    Tile{6, 7, 6, 7}: 37,
    Tile{6, 6, 7, 6}: 38,
    Tile{6, 6, 6, 7}: 39,
    Tile{7, 6, 7, 7}: 40,
    Tile{6, 6, 7, 7}: 41,
    Tile{6, 7, 7, 7}: 42,
    Tile{6, 7, 7, 6}: 43,
    Tile{7, 6, 6, 7}: 44,

    Tile{4, 4, 4, 3}: 45,
    Tile{4, 4, 3, 3}: 46,
    Tile{4, 4, 3, 4}: 47,
    Tile{4, 3, 3, 3}: 48,
    Tile{3, 4, 3, 3}: 49,
    Tile{4, 3, 4, 3}: 50,
    Tile{3, 3, 3, 3}: 51,
    Tile{3, 4, 3, 4}: 52,
    Tile{3, 3, 4, 3}: 53,
    Tile{3, 3, 3, 4}: 54,
    Tile{4, 3, 4, 4}: 55,
    Tile{3, 3, 4, 4}: 56,
    Tile{3, 4, 4, 4}: 57,
    Tile{3, 4, 4, 3}: 58,
    Tile{4, 3, 3, 4}: 59,

    Tile{8, 8, 8, 7}: 60,
    Tile{8, 8, 7, 7}: 61,
    Tile{8, 8, 7, 8}: 62,
    Tile{8, 7, 7, 7}: 63,
    Tile{7, 8, 7, 7}: 64,
    Tile{8, 7, 8, 7}: 65,
    Tile{7, 7, 7, 7}: 66,
    Tile{7, 8, 7, 8}: 67,
    Tile{7, 7, 8, 7}: 68,
    Tile{7, 7, 7, 8}: 69,
    Tile{8, 7, 8, 8}: 70,
    Tile{7, 7, 8, 8}: 71,
    Tile{7, 8, 8, 8}: 72,
    Tile{7, 8, 8, 7}: 73,
    Tile{8, 7, 7, 8}: 74,
}

var AvailableTilesets = map[string]Tileset {
    "field": FieldTileset,
}
