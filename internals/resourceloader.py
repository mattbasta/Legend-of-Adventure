import cherrypy
import json

import constants
from levelbuilder.levelbuilder import build_region
from levelbuilder.finishing import rounding


class Loader():
    """This is a class to load resources that may be required by the game."""

    @cherrypy.expose
    def level(self, x, y):
        """Load a region to be played."""

        # TODO: Ensure that the user can access the region from their current
        # position.

        # TODO: Generate the region if it doesn't already automatically exist.

        # TODO: Return the level data.
        tileset, region = build_region(x, y, constants.level_width, constants.level_height)
        region = rounding(region, tileset)

        return region

