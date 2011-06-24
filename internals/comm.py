import logging
import math
import re
import time

import tornado.websocket

from internals.objects.npc import NPC


def strip_tags(data):
    return re.compile(r'<[^<]*?>').sub('', data)

class CommHandler(tornado.websocket.WebSocketHandler):
    scenes = {}
    npcs = {}

    def open(self):
        # Send welcome message
        self.write_message("elo");

        # Define variables to store state information.
        self.scene = None
        self.sp_position = 0
        self.guid = None

        self.chat_name = ""
        self.sent_ping = False
        self.last_update = 0

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

        if message.startswith("reg"):
            # REG : Client registration
            self._register(message[3:])
            return
        elif message.startswith("pos"):
            if not self.guid:
                return
            # POS : Client position data
            self._position(message[3:])
            return
        elif message.startswith("dir"):
            if not self.guid or self.scene is None:
                return
            # If there is no change in position, skip this update.
            spos = int(message[3:])
            if self.sp_position == spos:
                return
            CommHandler.notify_scene(self.scene,
                                     "dir%s:%s" % (self.guid, message[3:]),
                                     except_=self)
            self.sp_position = spos
            return
        elif message.startswith("ups"):
            if not self.guid:
                self.write_message("errNot registered")
                return
            if self.scene is None:
                self.write_message("errNo scene registered")
                return

            x, y, spos = 0, 0, 0
            try:
                x, y, spos = map(int, message[3:].split(":"))
            except:
                self.write_message("errInvalid update")
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
                    "upa%s:%d:%d:%d" % (self.guid, x, y, spos), except_=self)
            return
        elif message.startswith("cha"):
            if not self.guid or self.scene is None:
                return
            data = message[3:]
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
            return

        self.write_message("pin");
        self.sent_ping = True
        pass

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

    def _register(self, guid):
        if guid in ("local", ):
            self.write_message("errBad GUID")
            return
        self.guid = guid

    def _position(self, data):
        """Register the user position in the world."""
        x, y, av_x, av_y = 0, 0, 0, 0
        try:
            x, y, av_x, av_y = map(int, data.split(":"))
        except ValueError:
            self.write_message("errInvalid registration")
            self.close()
            return

        # TODO: Check that the user can register with this scene at the
        # position that they're requesting.

        # Unregister previous scene.
        if self.scene is not None:
            CommHandler.del_client(self.scene, self)

        self.scene = (x, y)
        self.position = (av_x, av_y)
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
