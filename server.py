import json
import os

import tornado.ioloop
import tornado.web

import internals.comm
import internals.resourceloader as resourceloader


current_dir = os.path.dirname(os.path.abspath(__file__))

class LOAHandler(tornado.web.RequestHandler):
    """Server of the main page."""

    def get(self):
        with open("www/index.html") as index:
            self.write(index.read())

class LevelHandler(tornado.web.RequestHandler):
    """Server of the level generator."""

    def get(self):
        """Return a level area."""
        x, y = int(self.get_argument("x")), int(self.get_argument("y"))
        level = {"x": x,
                 "y": y,
                 "w": 50,
                 "h": 50,
                 "def_tile": 0,
                 "avatar": {"x": 25, "y": 25, "image": "static/images/avatar.png"},
                 "tileset": "default.png",
                 "level": resourceloader.Loader().level(x, y)}

        self.set_header("Content-Type", "application/json");
        self.write(json.dumps(level))


settings = {"static_path": os.path.join(current_dir, "www")}
application = tornado.web.Application([
    (r"/", LOAHandler),
    (r"/level/", LevelHandler),
    (r"/socket", internals.comm.CommHandler),
], **settings)

if __name__ == "__main__":
    application.listen(8080)
    tornado.ioloop.IOLoop.instance().start()

