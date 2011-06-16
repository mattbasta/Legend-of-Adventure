import json
import os

import cherrypy
from cherrypy.lib.static import serve_file

import internals.resourceloader as resourceloader


current_dir = os.path.dirname(os.path.abspath(__file__))


class LOAServer:
    """Main server instance for Legend of Adventure"""

    @cherrypy.expose
    def index(self):
        return open("www/index.html").read()

    @cherrypy.expose
    def level(self, x, y):
        """Return a level area."""
        x, y = int(x), int(y)
        level = {"x": x,
                 "y": y,
                 "w": 50,
                 "h": 50,
                 "def_tile": 0,
                 "avatar": {"x": 25, "y": 25, "image": "static/images/avatar.png"},
                 "tileset": "default.gif",
                 "level": resourceloader.Loader().level(x, y)}
        return json.dumps(level)

    @cherrypy.expose
    def static(self, *args):
        """Serve static files."""
        # TODO : Make sure this is safe.
        return serve_file(os.path.join(current_dir,
                                       "www",
                                       "/".join(args)))


if __name__ == "__main__":
    loa = LOAServer()
    loa.load = resourceloader.Loader()
    cherrypy.quickstart(loa, "/", "loa.conf")
