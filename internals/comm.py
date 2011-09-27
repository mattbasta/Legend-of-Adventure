import json
import logging
import math
import re
import time

import tornado.websocket

import internals.constants as constants
from internals.objects.npc import NPC
import internals.resourceloader as resourceloader


REQUIRE_GUID = ("pos", "dir", "ups", "cha", )
REQUIRE_SCENE = ("dir", "ups", "cha", )


def strip_tags(data):
    data = re.compile(r'<[^<]*?>').sub('', data)
    return data.replace("<", "&lt;").replace(">", "&gt;")

class CommHandler(tornado.websocket.WebSocketHandler):
    scenes = {}
    npcs = {}

    def __init__(self, application, request, **kwargs):
        super(CommHandler, self).__init__(application, request)

        # Define variables to store state information.
        self.scene = None
        self.sp_position = 0
        self.guid = None
        self.location = None

        self.chat_name = ""
        self.sent_ping = False
        self.last_update = 0

    def open(self):
        # Send welcome message
        self.write_message("elo");

    def on_close(self):
        if self.scene:
            CommHandler.del_client(self.scene, self)

    def on_message(self, message):
        if message == "pon":
            if not self.sent_ping:
                print "Invalid pong"
            else:
                print "Got Pong!"
            self.sent_ping = False
            return
        print "Server message: [%s]" % message

        callbacks = {"reg": self._register,
                     "pos": self._load_level,
                     "cha": self._on_chat,
                     "ups": self._on_position_update,
                     "dir": self._on_velocity_update}

        m_type = message[:3]

        # Filter out bad requests.
        if m_type in REQUIRE_GUID and not self.guid:
            self.write_message("errNot Registered")
            return
        if m_type in REQUIRE_SCENE and self.scene is None:
            self.write_message("errNo registered scene")
            return

        # Do the fast callbacks.
        if m_type in callbacks:
            callbacks[m_type](message[3:])
            return
        else:
            self.write_message("errUnknown Command")

    def _on_velocity_update(self, data):
        # If there is no change in position, skip this update.
        spos, x_dir, y_dir = map(int, data.split(":"))
        if not (-1 <= x_dir <= 1 or -1 <= y_dir <= 1):
            self.write_message("errBad Direction")
            return
        # TODO : This should have some sort of throttling.
        CommHandler.notify_scene(
                self.scene,
                "dir%s:%d:%d:%d" % (self.guid, spos, x_dir, y_dir),
                except_=self)
        self.sp_position = spos

    def _on_position_update(self, data):
        x, y, spos = 0, 0, 0
        try:
            x, y, spos = map(int, data.split(":"))
        except ValueError:
            self.write_message("errInvalid Position")
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
        self.sp_position = spos

        now = time.time() * 1000
        if now - self.last_update < 100:
            return
        self.last_update = now

        CommHandler.notify_scene(self.scene,
                                 "upa%s:%d:%d:%d" % (self.guid, x, y, spos),
                                 except_=self)

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

        CommHandler.notify_scene(self.scene,
                                 "cha%s\n%s" % (self.guid, data),
                                 except_=self)

        if self.scene in CommHandler.npcs:
            for npc in CommHandler.npcs[self.scene]:
                npc.feed_chat(original_data, self)

    def _handle_command(self, message):
        """Handle an admin message through chat."""
        if not self.scene:
            return

        if message.startswith("identify "):
            chat_name = message.strip().split()[-1]
            chat_name = strip_tags(chat_name)
            if chat_name:
                self.chat_name = chat_name
            self.write_message("chagod\n/Got it, thanks")
        elif message == "spawn":
            CommHandler.spawn_object(self.scene)

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
            self.write_message("errInvalid registration")
            self.close()
            return

        if avx == -1:
            avx = constants.level_width / 2
        else:
            avx = int(avx) / constants.tilesize
            if avx < 0:
                avx = constants.level_width - 1
            elif avx > constants.level_width:
                avx = 0

        if avy == -1:
            avy = constants.level_height / 2
        else:
            avy = int(avy) / constants.tilesize
            if avy < 0:
                avy = constants.level_height - 1
            elif avy > constants.level_height:
                avy = 0

        self.location = resourceloader.Location("o:%d:%d" % (x, y))
        level = {"x": x,
                 "y": y,
                 "w": constants.level_width,
                 "h": constants.level_height,
                 "def_tile": 0,
                 "avatar": {"x": avx, "y": avy,
                            "image": "static/images/avatar.png"},
                 "images": {"npc": "static/images/npc.png"},
                 "tileset": "default.png",
                 "level": self.location.render(),
                 "port": constants.port}

        self.write_message("lev%s" % json.dumps(level))

        # Unregister us from the previous scene.
        if self.scene is not None:
            CommHandler.del_client(self.scene, self)

        self.scene = (x, y)
        self.position = (avx, avy)
        CommHandler.add_client(self.scene, self)

        if self.scene in CommHandler.npcs:
            for npc in CommHandler.npcs[self.scene]:
                self.write_message("spa%s\n%s" % (npc.id, str(npc)))

    @classmethod
    def spawn_object(cls, scene, layer="inactive"):
        npc = NPC(scene,
                  (25, 25),
                  {"type": "static",
                   "image": "npc",
                   "layer": layer,
                   "sprite": {
                       "x": 32,
                       "y": 0,
                       "awidth": 65,
                       "aheight": 65,
                       "swidth": 32,
                       "sheight": 32}})

        if scene not in cls.npcs:
            cls.npcs[scene] = set()
        cls.npcs[scene].add(npc)
        cls.notify_scene(scene, "spa%s\n%s" % (npc.id, str(npc)))

    @classmethod
    def add_client(cls, scene, client):
        if scene not in cls.scenes:
            cls.scenes[scene] = set()
        else:
            cls.notify_scene(scene, "add%s" % ":".join(
                map(str, (client.guid, client.position[0],
                          client.position[1]))))
            for c in cls.scenes[scene]:
                client.write_message("add%s" % ":".join(
                    map(str, (c.guid, c.position[0],
                              c.position[1]))))
        cls.scenes[scene].add(client)

    @classmethod
    def del_client(cls, scene, client):
        if scene in cls.scenes:
            cls.scenes[scene].discard(client)
            if cls.scenes[scene]:
                cls.notify_scene(scene, "del%s" % client.guid)

    @classmethod
    def notify_scene(cls, scene, data, except_=None):
        if scene not in cls.scenes:
            return
        for client in cls.scenes[scene]:
            if except_ == client:
                continue
            try:
                client.write_message(data)
            except:
                logging.error("Error writing message", exc_info=True)
