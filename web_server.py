import json
import os

import brukva
import tornado.ioloop
import tornado.web

import internals.comm
import internals.constants as constants
import internals.resourceloader as resourceloader
import internals.brukva_setup as brukva_setup


current_dir = os.path.dirname(os.path.abspath(__file__))

brukva_client = None


class LOAHandler(tornado.web.RequestHandler):
    """Server of the main page."""

    def get(self):
        with open("www/index.html") as index:
            self.write(index.read())


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
    local_settings = {"port": constants.port}
    if os.path.exists(config_path):
        with open(config_path) as config_file:
            local_settings = json.loads(config_file.read())
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
