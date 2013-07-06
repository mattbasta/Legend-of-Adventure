from tiles import get_building_tiles


INTERIOR_ENTITIES = {
    "shop": get_building_tiles("shop", "interiors"),
    "house": get_building_tiles("house", "interiors"),
}


def build_interior(location):
    """Build the interior of a building."""

    building = location.sublocations[0]
    entity = INTERIOR_ENTITIES[building[-1]]

    return entity[2:]
