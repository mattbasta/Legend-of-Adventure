import json
import os

import brukva
import tornado.ioloop
import tornado.web

import internals.comm
import internals.constants as constants
import internals.brukva_setup as brukva_setup


current_dir = os.path.dirname(os.path.abspath(__file__))

brukva_client = None
local_settings = {"port": constants.port,
                  "tilesize": constants.tilesize}


index_cache = None
class LOAHandler(tornado.web.RequestHandler):
    """Server of the main page."""

    def get(self):
        global index_cache
        if not index_cache:
            with open("www/index.html") as index:
                index_cache = index.read()
                for setting in local_settings:
                    index_cache = index_cache.replace(
                            "%%(%s)s" % setting,
                            str(local_settings[setting]))

        self.write(index_cache)


settings = {"static_path": os.path.join(current_dir, "www"),
            "auto_reload": True}
application = tornado.web.Application([
    (r"/", LOAHandler),
    (r"/socket", internals.comm.CommHandler),
], **settings)


def start():
    global brukva_client

    config_path = os.path.join(os.path.dirname(__file__),
                               "config.conf")
    new_local_settings = {}
    if os.path.exists(config_path):
        with open(config_path) as config_file:
            new_local_settings = json.loads(config_file.read())
    local_settings.update(new_local_settings)
    port = local_settings["port"]
    application.listen(local_settings["port"])

    redis_host, redis_port = constants.redis.split(":")
    brukva_client = brukva.Client(host=redis_host, port=int(redis_port))
    brukva_client.connect()

    internals.comm.brukva = brukva_client
    brukva_setup.setup_brukva(brukva_client)

    tornado.ioloop.IOLoop.instance().start()

if __name__ == "__main__":
    start()
