import json
import os

import tornado.ioloop
import tornado.web

import internals.comm
import internals.constants as constants
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
        avx, avy = self.get_argument("avx"), self.get_argument("avy")
        if avx == "null":
            avx = constants.level_width / 2
        else:
            avx = int(avx) / constants.tilesize
            if avx < 0:
                avx += constants.level_width

        if avy == "null":
            avy = constants.level_height / 2
        else:
            avy = int(avy) / constants.tilesize
            if avy < 0:
                avy += constants.level_height

        level = {"x": x,
                 "y": y,
                 "w": constants.level_width,
                 "h": constants.level_height,
                 "def_tile": 0,
                 "avatar": {"x": avx, "y": avy,
                            "image": "static/images/avatar.png"},
                 "images": {"npc": "static/images/npc.png"},
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

