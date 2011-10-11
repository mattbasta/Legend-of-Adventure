import json
import logging
import math
import re
import time

import redis
import tornado.websocket

import internals.constants as constants
from internals.locations import Location


REQUIRE_GUID = ("pos", "dir", "ups", "cha", )
REQUIRE_SCENE = ("dir", "ups", "cha", )

redis_host, redis_port = constants.redis.split(":")
outbound_redis = redis.Redis(host=redis_host, port=int(redis_port))

# This should get set by web_server.py
brukva = None
connections = []
locations = {}


def strip_tags(data):
    data = re.compile(r'<[^<]*?>').sub('', data)
    return data.replace("<", "&lt;").replace(">", "&gt;")

class CommHandler(tornado.websocket.WebSocketHandler):

    def __init__(self, application, request, **kwargs):
        super(CommHandler, self).__init__(application, request)

        # Define variables to store state information.
        self.guid = None
        self.location = None

        self.chat_name = ""
        self.last_update = 0

    def open(self):
        self.write_message("elo")
        connections.append(self)

    def on_close(self):
        CommHandler.del_client(self)
        connections.remove(self)

    def on_message(self, message):
        print "Server message: [%s]" % message

        callbacks = {"reg": self._register,
                     "lev": self._load_level,
                     "cha": self._on_chat,
                     "loc": self._on_position_update,}

        m_type = message[:3]

        # Filter out bad requests.
        if m_type in REQUIRE_GUID and not self.guid:
            self.write_message("errNot Registered")
            return
        if m_type in REQUIRE_SCENE and self.location is None:
            self.write_message("errNo registered scene")
            return

        # Do the fast callbacks.
        if m_type in callbacks:
            callbacks[m_type](message[3:])
            return
        else:
            self.write_message("errUnknown Command")

    def _on_position_update(self, data):
        x, y, x_dir, y_dir = 0, 0, 0, 0
        try:
            x, y, x_dir, y_dir = map(int, map(float, data.split(":")))
        except ValueError:
            raise
            self.write_message("errInvalid Position")
            return

        if not (-1 <= x_dir <= 1 or -1 <= y_dir <= 1):
            self.write_message("errBad Direction")
            return

        if (x < 0 or x > constants.level_width * constants.tilesize or
            y < 0 or y > constants.level_height * constants.tilesize):
            self.write_message("errBad Position")
            return

        if self.position and False:
            x2 = x - self.position[0]
            y2 = y - self.position[1]
            dist = math.sqrt(x2 * x2 + y2 * y2)
            # TODO: This should take into account the time of last update.
            if dist > 200:
                self.write_message("errMoving too fast")
                return

        # Perform the global position update before broadcasting in case
        # we're getting update spammed.
        self.position = (x, y)
        outbound_redis.set("l:p:%s" % self.guid,
                           "%s:%d:%d" % (self.guid, x, y))

        now = time.time() * 1000
        if now - self.last_update < 5:
            return
        self.last_update = now

        self._notify_location(self.location,
                              "loc%s:%d:%d:%d:%d" %
                                  (self.guid, x, y, x_dir, y_dir))

    def _on_chat(self, data):
        original_data = data
        if data.startswith("/"):
            return self._handle_command(data[1:])
        print "Chat: %s" % data

        # Strip tags
        data = strip_tags(data)

        # Put in the chat name
        if self.chat_name:
            data = '<span>%s</span>%s' % (self.chat_name, data)

        self._notify_location(self.location,
                "cha%s:\n%s" % (self.guid, data))

    def _handle_command(self, message):
        """Handle an admin message through chat."""
        if not self.location:
            return

        if message.startswith("identify "):
            chat_name = message.strip().split()[-1]
            chat_name = strip_tags(chat_name)
            if chat_name:
                self.chat_name = chat_name
            self.write_message("chagod\n/Got it, thanks")

    def _register(self, data):
        if data in ("local", ):
            self.write_message("errBad GUID")
            return
        self.guid = data
        # TODO: Once database access is available, this should pull the player
        # location from the database.
        return self._load_level("%d:%d:%d:%d" % (0, 0, -1, -1))

    def _load_level(self, data):
        x, y, avx, avy = 0, 0, 0, 0
        try:
            x, y, avx, avy = map(int, data.split(":"))
        except ValueError:
            self.write_message("errInvalid level id")
            return

        if avx == -1:
            avx = constants.level_width / 2
        else:
            avx = int(avx) / constants.tilesize
            if avx < 2:
                avx = constants.level_width - 1
            elif avx > constants.level_width - 2:
                avx = 0

        if avy == -1:
            avy = constants.level_height / 2
        else:
            avy = int(avy) / constants.tilesize
            if avy < 2:
                avy = constants.level_height - 1
            elif avy > constants.level_height - 2:
                avy = 0

        if self.location:
            CommHandler.del_client(self)

        # Create the location
        self.location = Location("o:%d:%d" % (x, y))
        self.write_message(
                "lev%s" % json.dumps(self.location.render(avx, avy)))

        self.position = (avx, avy)
        CommHandler.add_client(self.location, self)

    @classmethod
    def add_client(cls, location, client):
        loc_str = str(location)
        x, y = client.position

        if loc_str not in locations:
            locations[loc_str] = []
        locations[loc_str].append(client)

        # Subscribe to the location if we aren't subscribed already.
        brukva.subscribe("location::%s" % loc_str)
        # Let everyone know that we're here.
        client._notify_global(
                "enter",
                "%s>%s:%d:%d" % (loc_str, client.guid, x, y))

        client_set = "l:c:%s" % loc_str
        for rclient in outbound_redis.smembers(client_set):
            client_location = outbound_redis.get("l:p:%s" % rclient)
            client.write_message("add%s" % client_location)
        outbound_redis.sadd(client_set, client.guid)
        outbound_redis.set("l:p:%s" % client.guid,
                           "%s:%d:%d" % (client.guid, client.position[0],
                                         client.position[1]))

    @classmethod
    def del_client(cls, client):
        if not client.location or not client.guid:
            return

        outbound_redis.srem("l:c:%s" % str(client.location), client.guid)
        outbound_redis.delete("l:p:%s" % client.guid)
        client._notify_location(client.location, "del%s" % client.guid)

        loc_str = str(client.location)
        locations[loc_str].remove(client)
        if not locations[loc_str]:
            del locations[loc_str]
            brukva.unsubscribe("location::%s" % loc_str)

    def _notify_location(self, location, data):
        """
        Broadcast a blob of data to all of the other listeners in a particular
        location.
        """
        outbound_redis.publish("location::%s" % location,
                               "%s>%s" % (location, data))

    def _notify_global(self, data_type, data):
        """
        Broadcast a message to all nodes that are listening on the various
        global channels. This should be used sparingly, as these messages reach
        all of the entity server and all of the web server instances.
        """
        outbound_redis.publish("global::%s" % data_type, data)

