package entities


const FOOD_HEALTH_INCREASE = 75
const ITEM_PICK_UP_DIST = 0.5
const ENTITY_VISION = 20

const INV_MAX_STACK = 32

const ATTACK_WIGGLE_ROOM = 0.5

const VIRTUAL_ENTITY_TICK_MS = 200

// This constant is the number of random paths that will be generated when a
// pathing entity has no attractors and one or more repulsors in order to find
// a suitable fleeing route.
const ASTAR_FLEE_PATH_SAMPLE = 6

const ASTAR_MIN_RANDOM_SAMPLE_DIAMETER = 3
const ASTAR_RANDOM_SAMPLE_DIAMETER = 30
const ASTAR_RANDOM_MAX_TRIES = 25

// Within this distance, we fall back on naive pathing instead of full-on
// A* pathing.
const ASTAR_NAIVE_FALLBACK_DIST = 2.5
