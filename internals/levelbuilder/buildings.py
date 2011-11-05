
from tiles import get_building_tiles


INTERIORS = ("shop", "house", )
INTERIOR_ENTITIES = {}
for i in INTERIORS:
    INTERIOR_ENTITIES[i] = get_building_tiles(i, "interiors")

def build_interior(location):
    """Build the interior of a building."""

    building = location.sublocations[0]
    entity = INTERIOR_ENTITIES[building[-1]]

    return entity[2:]

