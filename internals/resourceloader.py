import json
import random

import constants
from levelbuilder.levelbuilder import build_region
import levelbuilder.towns as towns


class Location():
    """This is a class to load resources that may be required by the game."""

    def __init__(self, location_code):
        scode = location_code.split(":")
        self.world = scode[0]
        self.coords = int(scode[1]), int(scode[2])
        self.sublocations = []
        scode = scode[3:]

        # Parse sublocation information.
        while scode:
            subloc_type = scode[0]
            coords = int(scode[1]), int(scode[2])
            if subloc_type != "b":
                self.sublocations.append((subloc_type, coords))
                scode = scode[3:]
            else:
                self.sublocations.append((subloc_type, coords, scode[3]))
                scode = scode[4:]

    def is_town(self):
        random.seed(self.coords[0] * 1000 + self.coords[1])

        # We need to seed before we test for forced towns because this also
        # seeds the town generator.
        if self.coords == (0, 0):
            return True
        return random.randint(0, 5) == 0

    def is_dungeon(self):
        if self.is_town():
            return False
        random.seed(self.coords[0] * 1001 + self.coords[1] * 2 + 1)
        return random.randint(0, 5)

    def render(self):
        """Load a region to be played."""

        # TODO: Ensure that the user can access the region from their current
        # position.

        # TODO: Generate the region if it doesn't already automatically exist.

        tileset, region = build_region(self.coords[0], self.coords[1],
                                       constants.level_width, constants.level_height)
        if self.is_town():
            # Already seeded by is_town method.
            region = towns.build_town(region)  # Add buildings if there is a town.

        return region

