from copy import deepcopy
import json
import random

import constants
import entities.all as entities
import levelbuilder.buildings as buildings
from levelbuilder.levelbuilder import build_region
import levelbuilder.dungeons as dungeons
import levelbuilder.towns as towns


class Location():
    """This is a class to load resources that may be required by the game."""

    def __init__(self, location_code):
        """
        Initialize a location based on a location ID.

        All location IDs must be in the following format:

        <world>:<x>:<y>[:<sublocation>[:...]]

        A sublocation is defined as one of the following:

        - b:<x>:<y>:<building_type>
        - <sublocation_world_type>:<x>:<y>
        """
        self.location_code = location_code
        scode = location_code.split(":")
        self.world = scode[0]
        self.coords = int(scode[1]), int(scode[2])
        self.sublocations = []
        scode = scode[3:]

        self._dungeon_cache = None

        self._terrain_cache = None
        self._hitmap_cache = None
        self._portal_cache = []

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

    def _reconstitute_sublocation(self, x):
        build = []
        for item in x:
            if isinstance(item, (tuple, list)):
                build.append(":".join(map(str, item)))
            else:
                build.append(str(item))
        return ":".join(build)

    def get_slide_code(self, x, y):
        """
        Get the code for a location if the player slides in any direction.
        """
        if self.sublocations:
            sls = deepcopy(self.sublocations)
            last_sl = list(sls[-1])
            last_sl[1] = x, y
            sls[-1] = last_sl

            build = ":".join(map(self._reconstitute_sublocation, sls))
            return "%s:%d:%d:%s" % (self.world, self.coords[0], self.coords[1],
                                    build)
        else:
            return "%s:%d:%d" % (self.world, x, y)

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
        if self.coords == (1, 0):
            return True
        return random.randint(0, 5)

    def has_entities(self):
        return True

    def get_entities_to_spawn(self):
        """
        Returns a list containing class types of entities that should be
        spawned in this location when a player first visits it. The number and
        type of each entity is representative of
        """

        # Uncomment to debug
        # return [entities.Child]
        is_town = self.is_town()
        if is_town and self.sublocations:
            # TODO: Add different kinds of NPCs.
            return [entities.Child, entities.Child]
        elif is_town:
            #return [entities.Bully]
            return [entities.Trader, entities.Trader, entities.Child,
                    entities.Child, entities.Child, entities.Bully]
        else:
            is_dungeon = self.is_dungeon()
            if is_dungeon and self.sublocations:
                return dungeons.get_entities(self)
            else:
                sp_ents = []
                for i in range(random.randint(2, 5)):
                    sp_ents.append(entities.Sheep)
                return sp_ents

        return []

    def generate(self):
        """Generate the static terrain elements for a particular location."""

        if (self._terrain_cache is not None and
            self._hitmap_cache is not None and
            self._portal_cache is not None):
            return self._terrain_cache, self._hitmap_cache, self._portal_cache

        # TODO: Generate the level if it doesn't already automatically exist.

        # Only generate the world-level region if we're not in a sublocation.
        tileset, level, hitmap = None, None, None
        if not self.sublocations:
            width, height = self.width(), self.height()
            tileset, level = build_region(
                    self.coords[0], self.coords[1],
                    width, height)
            hitmap = [[0 for x in range(width)] for
                      y in range(height)]

        portals = []

        is_town = self.is_town()
        is_dungeon = self.is_dungeon()
        if is_town and self.sublocations:
            if self.sublocations[0][0] == "b":
                level, hitmap, portals = buildings.build_interior(self)
        elif is_town:
            # Already seeded by is_town method.
            level, hitmap, portals = towns.build_town(level, hitmap)
        elif is_dungeon and self.sublocations:
            level, hitmap, portals = dungeons.build_dungeon(self)
        elif self.is_dungeon():
            level, hitmap, portals = dungeons.overlay_portal(level, hitmap,
                                                             self)

        self._terrain_cache = level
        self._hitmap_cache = hitmap
        self._portal_cache = portals

        return level, hitmap, portals

    def tileset(self):
        """Return the name of the tileset to use with the location."""
        if self.is_dungeon() and self.sublocations:
            return "dungeons.png"
        elif self.is_town() and self.sublocations:
            return "interiors.png"
        return "default.png"

    def can_slide(self):
        if self.is_town() and self.sublocations:
            return False
        return True

    def height(self):
        if not self.sublocations:
            return constants.level_height
        else:
            return len(self.generate()[0])

    def width(self):
        if not self.sublocations:
            return constants.level_width
        else:
            return len(self.generate()[0][0])

    def render(self, avx, avy):
        """Render the JSON representation of the level."""

        level, hitmap, portals = self.generate()

        if not self.sublocations:
            x, y = self.coords
        else:
            x, y = self.sublocations[-1][1]

        return {"x": x,
                "y": y,
                "w": self.width(),
                "h": self.height(),
                "def_tile": 0,
                "avatar": {"x": avx, "y": avy,
                           "image": "static/images/avatar.png"},
                "images": {"npc": "static/images/npc.png",
                           "child1": "static/images/child1.png",
                           "child2": "static/images/child2.png",
                           "bully": "static/images/bully.png"},
                "tileset": self.tileset(),
                "can_slide": self.can_slide(),
                "level": level,
                "hitmap": hitmap,
                "portals": portals,
                "port": constants.port}

    def __str__(self):
        return self.location_code

