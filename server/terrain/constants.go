package terrain

const (
    MAX_LOADED_REGIONS = 256

    DEFAULT_SEED = 125
    TERRAIN_PERLIN_PERIOD = 256
    TERRAIN_PERLIN_MAX = 6
    PERLIN_FREQUENCY = 0.1
    PERLIN_DILATION = 3
    PERLIN_UPLIFT = 5

    BUILDINGS_MIN = 9
    BUILDINGS_MAX = 15
    TOWN_MIN_EDGE = 10
    TOWN_MAX_EDGE = 190

    DUNGEON_MIN_SIZE = 3
    DUNGEON_MAX_SIZE = 7

    WORLD_OVERWORLD = "overworld"
    WORLD_ETHER     = "ether"

    REGIONTYPE_FIELD   = "field"
    REGIONTYPE_DUNGEON = "dungeon"
    REGIONTYPE_SHOP = "shop"
    REGIONTYPE_HOUSE = "house"
)

var regionSizes = map[string][2]uint {
    REGIONTYPE_FIELD: [2]uint{100, 100},
    REGIONTYPE_DUNGEON: [2]uint{28, 28},
    // Building interiors
    REGIONTYPE_SHOP: [2]uint{30, 30},
    REGIONTYPE_HOUSE: [2]uint{30, 30},
}


type tilePair [2]string
var regionTilesets = map[tilePair]string {
    tilePair{WORLD_OVERWORLD, REGIONTYPE_FIELD}: "tileset_default",
    tilePair{WORLD_OVERWORLD, REGIONTYPE_DUNGEON}: "tileset_dungeons",
    tilePair{WORLD_OVERWORLD, REGIONTYPE_SHOP}: "tileset_interiors",
    tilePair{WORLD_OVERWORLD, REGIONTYPE_HOUSE}: "tileset_interiors",
}
