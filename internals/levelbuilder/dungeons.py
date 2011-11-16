import copy
import math
import random
from random import randint

from internals.levelbuilder.tiles import get_building_tiles, overlay


DUNGEON_PORTAL = get_building_tiles("dungeon_portal", "landscape_features")

ROOM_TYPES = ["room", "treasure_room", "mob_drop", "stairwell"]
MOVABLE_DIRECTIONS = ((0, 1), (1, 0), (0, -1), (-1, 0), )

# 20x20 playable area with 4 tiles for passages on each side.
DUNGEON_SIZE = 28, 28


def overlay_portal(grid, hitmap, location):
    """Build the portal to a dungeon in a non-sublocation."""
    width, height = DUNGEON_PORTAL[:2]
    x = randint(3, len(grid[0]) - 3 - width)
    y = randint(3, len(grid) - 3 - height)
    grid, hitmap, raw_portals = overlay(grid, hitmap, DUNGEON_PORTAL, x, y)
    portals = []
    for raw_portal in raw_portals:
        portal = copy.deepcopy(raw_portal)
        portal["x"] += x
        portal["y"] += y
        portals.append(portal)
    return grid, hitmap, portals


def build_dungeon(location):
    """Build a dungeon based on a given location object."""
    width, height = DUNGEON_SIZE

    # Default block is 1, which is the default "black" color.
    grid = [[1 for x in range(width)] for y in range(height)]
    # All blocks are non-walkable by default.
    hitmap = [[1 for x in range(width)] for y in range(height)]
    portals = []

    # Get the room that we're rendering.
    room = _get_room(location)

    def draw_tiles(x, y, w, h, tile=0, walkable=0):
        for y2 in range(y, y + h):
            for x2 in range(x, x + w):
                grid[y2][x2] = tile
                hitmap[y2][x2] = walkable

    # Draw the main floor.
    draw_tiles(4, 4, width - 8, height - 8)
    draw_tiles(4, height - 4, width - 8, 1, tile=6, walkable=False)

    if room["passages"][0, 1]:
        draw_tiles(12, 24, 4, 4)
    if room["passages"][1, 0]:
        draw_tiles(24, 12, 4, 4)
        draw_tiles(24, 16, 4, 1, tile=6, walkable=False)
    if room["passages"][0, -1]:
        draw_tiles(12, 0, 4, 4)
    if room["passages"][-1, 0]:
        draw_tiles(0, 12, 4, 4)
        draw_tiles(0, 16, 4, 1, tile=6, walkable=False)

    if room["type"] == "lobby":
        draw_tiles(11, 9, 6, 6, tile=10)
        portals.append({"x": 13,
                        "y": 10,
                        "width": 1,
                        "height": 1,
                        "destination": "..",
                        "dest_coords": (0, 0)})
        grid[10][13] = 15
    elif room["type"] == "stairwell":
        draw_tiles(11, 11, 6, 6, tile=10)
        portals.append({"x": 13,
                        "y": 12,
                        "width": 1,
                        "height": 1,
                        "destination": ":d:0:0",
                        "dest_coords": (14, 14)})
        grid[12][13] = 11

    return grid, hitmap, portals


def _get_room(location):
    dungeon = _build_dungeon_layout(location)
    sublocation = location.sublocations[-1]
    x, y = sublocation[1]
    offset_x, offset_y = get_offset(location)
    x += offset_x
    y += offset_y

    return dungeon[y][x]


def get_offset(location):
    location_x, location_y = location.coords
    random.seed(location_x + 1 / (location_y + 0.5) +
                len(location.sublocations) *
                (2 if location.world == "e" else 1))
    return randint(0, 5), randint(0,5)


def get_entities(location):
    room = _get_room(location)
    # TODO: This should return a list of entities.
    return []


def _build_dungeon_layout(location):
    """
    Build the layout for a dungeon based on the location of its portal in a
    non-sublocation.

    This function is seeded by the get_offset function.
    """
    # Offset: position of starting location from top left of dungeon grid.
    offset_x, offset_y = get_offset(location)
    # Width: size of the dungeon grid.
    width_x, width_y = randint(2, 5) + offset_x, randint(2, 5) + offset_y
    x, y = location.sublocations[-1][1]
    x += offset_x
    y += offset_y

    def default_dungeon_room():
        return {"passages": {(0, 1): False,
                             (1, 0): False,
                             (-1, 0): False,
                             (0, -1): False},
                "type": "room",
                "initial": False,
                "defined": False,
                "parent": None,
                "outbound_passages": 0}

    rooms = [[default_dungeon_room() for i in range(width_x)] for
             y in range(width_y)]
    rooms_to_process = []

    def can_move(x, y, r_x, r_y):
        """At room (x, y), can a passage be made in direction (r_x, r_y)?"""
        # No if the passage would lead out of the grid.
        if (x + r_x < 0 or x + r_x >= width_x or
            y + r_y < 0 or y + r_y >= width_y):
            return False
        # No if a passage already exists.
        if rooms[y][x]["passages"][r_x, r_y]:
            return False
        # No if the passage leads to a room that's already defined.
        if rooms[y + r_y][x + r_x]["defined"]:
            return False
        # No if the room is already set to be processed.
        if (r_x + x, r_y + y) in rooms_to_process:
            return False

        return True

    def _build_room(x, y):
        room = rooms[y][x]
        room["defined"] = True
        initial = x - offset_x == 0 and y - offset_y == 0
        room["initial"] = initial

        if initial:
            room["type"] = "lobby"
        else:
            room_type = random.choice(ROOM_TYPES)
            room["type"] = room_type

        # We use a generator comprehension so we don't have to use while loops.
        random_directions = list(MOVABLE_DIRECTIONS)
        random.shuffle(random_directions)
        # Filter out all of the directions that we can't go to.
        directions = [direction for direction in random_directions if
                      can_move(x, y, direction[0], direction[1])]
        # Randomly include only a subset of the directions.
        dir_count = len(directions)
        if not initial:
            directions = directions[:randint(min(1, dir_count), dir_count)]
        room["outbound_passages"] = dir_count

        for direction in directions:
            # Define a passage between the rooms.
            room["passages"][direction] = True

            # Define the reverse passage from the other room.
            o_x, o_y = x + direction[0], y + direction[1]
            other_room = rooms[o_y][o_x]
            other_room["passages"][direction[0] * -1, direction[1] * -1] = True
            other_room["parent"] = x, y

            # Build the other room.
            rooms_to_process.append((o_x, o_y))

    rooms_to_process.append((offset_x, offset_y))
    while rooms_to_process:
        next_room = random.choice(rooms_to_process)
        rooms_to_process.remove(next_room)
        _build_room(*next_room)

    # Get a list of all of the "dead end" rooms.
    terminal_rooms = []
    for row in rooms:
        terminal_rooms.extend(filter(lambda r: not r["outbound_passages"],
                                     row))

    # Give a bunch of the terminal rooms some stuff.
    special_rooms = ["boss", ]
    for sp_room in special_rooms:
        room = random.choice(terminal_rooms)
        terminal_rooms.remove(room)
        room["type"] = sp_room

    # Decide whether there should be a stairwell.
    if randint(0, 1):
        room = random.choice(terminal_rooms)
        terminal_rooms.remove(room)
        room["type"] = "stairwell"

    return rooms

