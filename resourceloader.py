import cherrypy
import json

import levelbuilder


class Loader():
    """This is a class to load resources that may be required by the game."""

    @cherrypy.expose
    def level(self, x, y):
        """Load a region to be played."""

        # TODO: Ensure that the user can access the region from their current
        # position.

        # TODO: Generate the region if it doesn't already automatically exist.

        # TODO: Return the level data.
        return levelbuilder.build_region(x, y, 100, 100)

