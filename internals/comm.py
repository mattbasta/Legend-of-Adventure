import tornado.websocket

class CommHandler(tornado.websocket.WebSocketHandler):
    scenes = {}

    def open(self):
        self.write_message("elo");
        pass

    def on_close(self):
        pass

    def on_message(self, message):
        if message == "pon":
            print "Got Pong!"
            return
        print "Server message: [%s]" % message
        self.write_message("pin");
        pass
