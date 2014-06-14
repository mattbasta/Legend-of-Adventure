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
    WORLD_OVERWORLD = "overworld"
    WORLD_ETHER     = "ether"

    REGIONTYPE_FIELD   = "field"
    REGIONTYPE_DUNGEON = "dungeon"
    REGIONTYPE_SHOP = "shop"
)

var regionSizes = map[string][2]uint {
    REGIONTYPE_FIELD: [2]uint{150, 150},
    REGIONTYPE_DUNGEON: [2]uint{30, 30},
    REGIONTYPE_SHOP: [2]uint{20, 20},
}
