from math import floor
import os
import random

from internals.constants import level_width, level_height


def get_building_tiles(building):
    """
    Open a tiles file, parse the contents, and output the building entity.
    """

    def read_building(f):
        output = []
        for line in f:
            line = line.strip()
            row = []
            for tile in line.split():
                row.append(int(tile))
            output.append(row)
        return output

    with open(os.path.join(os.path.dirname(__file__),
                           "buildings/",
                           "%s.tiles" % building)) as building_file:

        output = read_building(building_file)

    hitmap_file = os.path.join(os.path.dirname(__file__),
                               "buildings/",
                               "%s.hitmap" % building)
    if os.path.exists(hitmap_file):
        with open(hitmap_file) as hitmap_file:
            hitmap = read_building(hitmap_file)
    else:
        hitmap = [[0 for i in range(len(output[j]))] for
                  j in range(len(output))]

    return (len(output[0]), len(output), output, hitmap, )


BUILDINGS = ("plaza", "well", "town_hall", "church", "clock", "library",
             "graveyard", "shop", "house", )
TOWN_CENTERS = ("plaza", "well", "town_hall", )
BUILDING_ENTITIES = dict(zip(BUILDINGS, map(get_building_tiles, BUILDINGS)))
REPEATABLE_BUILDINGS = ("shop", "house", )
ROAD_WIDTH = 4


def overlay(grid, hitmap, building, x, y):
    """Place a building on the tile grid."""

    width, height, bt, hm = building
    for row_num in range(height):
        for tile in range(width):
            grid[y + row_num][x + tile] = bt[row_num][tile]
            hitmap[y + row_num][x + tile] = hm[row_num][tile]

    return grid, hitmap


def build_town(grid, hitmap, seed=0):
    """Run the town building algorithm on a tile grid."""

    available_buildings = list(BUILDINGS)

    center = random.choice(TOWN_CENTERS)
    center_entity = BUILDING_ENTITIES[center]

    midpoint_x, midpoint_y = floor(level_width / 2), floor(level_height / 2)

    center_x = int(midpoint_x - floor(center_entity[0] / 2))
    center_y = int(midpoint_y - floor(center_entity[1] / 2))

    # Boundaries are in the form (top, right, bottom, left)
    town_boundaries = [center_y, center_x + center_entity[0],
                       center_y + center_entity[1], center_x]

    overlay(grid, hitmap, center_entity, center_x, center_y)

    available_buildings.remove(center)

    ###########################

    building_limit = random.randint(6, 15)
    building_count = 0

    direction_defs = {0: (0, 0),
                      1: (-1, 0),
                      2: (-1, -1),
                      3: (0, -1)}

    while (all(10 < x < 90 for x in town_boundaries) and
           building_count <= building_limit):

        old_boundaries = town_boundaries[:]

        # 0 - right, 1 - bottom, 2 - left, 3 - right
        for direction in range(4):

            # Step 1: Place an object in the direction that we're now facing.
            if direction == 0:
                x, y = old_boundaries[1] + ROAD_WIDTH, old_boundaries[0]
            elif direction == 1:
                x, y = old_boundaries[1], old_boundaries[2] + ROAD_WIDTH
            elif direction == 2:
                x, y = old_boundaries[3] - ROAD_WIDTH, old_boundaries[2]
            elif direction == 3:
                x, y = old_boundaries[3], old_boundaries[0] - ROAD_WIDTH

            # Set conditions (per direction) for when the town border has been
            # surpassed.
            border_conds = {0: lambda: y > old_boundaries[2],
                            1: lambda: x < old_boundaries[3],
                            2: lambda: y < old_boundaries[0],
                            3: lambda: x > old_boundaries[1]}

            widest_building = 0
            building_w, building_h = 0, 0
            while not border_conds[direction]():
                building = random.choice(available_buildings)
                if building not in REPEATABLE_BUILDINGS:
                    available_buildings.remove(building)

                building_entity = BUILDING_ENTITIES[building]

                # Determine the building's offset from the spiral's position.
                building_w, building_h, temp, temp2 = building_entity
                offset_x, offset_y = direction_defs[direction]
                offset_x *= building_w
                offset_y *= building_h

                overlay(grid, hitmap, building_entity, x + offset_x, y + offset_y)

                if direction == 0:
                    y += building_h
                    if building_entity[0] > widest_building:
                        widest_building = building_w
                elif direction == 1:
                    x -= building_w
                    if building_h > widest_building:
                        widest_building = building_h
                elif direction == 2:
                    y -= building_h
                    if building_w > widest_building:
                        widest_building = building_w
                elif direction == 3:
                    x += building_w
                    if building_h > widest_building:
                        widest_building = building_h

                building_count += 1

            if direction == 0:
                town_boundaries[2] = y + building_h
                town_boundaries[1] = x + widest_building
            elif direction == 1:
                town_boundaries[3] = x - building_w
                town_boundaries[2] = y + widest_building
            elif direction == 0:
                town_boundaries[2] = y - building_h
                town_boundaries[1] = x + widest_building
            elif direction == 0:
                town_boundaries[3] = x + building_w
                town_boundaries[1] = y + widest_building

            if building_count > building_limit:
                break


    ##########################

    return grid, hitmap


