import json
import logging
import math
import random
import re
import time

import redis
import tornado.websocket

import internals.constants as constants
from internals.harmable import Harmable
from internals.inventory import InventoryManager
from internals.locations import Location
from internals.scheduler import Scheduler


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

class CommHandler(Harmable, InventoryManager,
                  tornado.websocket.WebSocketHandler):

    def __init__(self, application, request, **kwargs):
        super(CommHandler, self).__init__(application, request)

        # Define variables to store state information.
        self.id = None
        self.location = None

        self.position = 0, 0
        self.parent_positions = []
        self.velocity = 0, 0
        self.direction = 0, 1
        self.old_velocity = 0, 0

        self.chat_name = ""
        self.last_update = 0

        self.scheduler = Scheduler(constants.tilesize / constants.speed / 1000,
                                   self._on_schedule_event)

    def open(self):
        super(CommHandler, self).open()
        self.write_message("elo")
        connections.append(self)

    def on_close(self):
        CommHandler.del_client(self)
        connections.remove(self)
        self.location = None

    def on_message(self, message):
        callbacks = {"reg": self._register,
                     "lev": self._level_slide,
                     "cha": self._on_chat,
                     "loc": self._on_position_update,
                     "use": self.use_item,
                     "dro": self.drop_item,
                     "cyc": self.cycle_items}

        m_type = message[:3]

        if m_type not in ("loc", ):
            print "Message: [%s]" % message

        # Filter out bad requests.
        if m_type in REQUIRE_GUID and not self.id:
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
            self.write_message("errInvalid Position")
            return

        if not (-1 <= x_dir <= 1 or -1 <= y_dir <= 1):
            self.write_message("errBad Direction")
            return

        if (x < 0 or x > constants.level_width * constants.tilesize or
            y < 0 or y > constants.level_height * constants.tilesize):
            self.write_message("errBad Position")
            return

        # Perform the global position update before broadcasting in case
        # we're getting update spammed.
        self.position = x, y
        self.velocity = x_dir, y_dir
        if any((x_dir, y_dir)):
            self.direction = x_dir, y_dir

        # Also perform the rescheduling before we hit the database so the
        # hitmapping isn't blocked on Redis.
        self.scheduler.event_happened()

        outbound_redis.set("l:p:%s" % self.id,
                           "%s:%d:%d" % (self.id, x, y))

        now = time.time() * 1000
        if now - self.last_update < 5:
            return
        self.last_update = now

        #self._notify_location(self.location,
        #                      "loc%s:%d:%d:%d:%d" %
        #                          (self.id, x, y, x_dir, y_dir))

    def _on_chat(self, data):
        original_data = data
        if data.startswith("/"):
            return self._handle_command(data[1:])

        # Strip tags
        data = strip_tags(data)

        # Put in the chat name
        if self.chat_name:
            data = '<span>%s</span>%s' % (self.chat_name, data)

        self._notify_location(self.location,
                "cha%s:%d:%d\n%s" % (self.id, self.position[0],
                                     self.position[1], data))

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
        if message.startswith("warp "):
            location, avx, avy = message[5:].split(" ")
            avx, avy = int(avx), int(avy)
            self.write_message("flv%s" % location)
            self._load_level(location, avx, avy)
            self.write_message("chagod\n/Warping...")

    def _register(self, data):
        if data in ("local", ):
            self.write_message("errBad GUID")
            return
        self.id = data
        self.registered()
        # TODO: Once database access is available, this should pull the player
        # location from the database.
        return self._level_slide("%d:%d:%d:%d" % (0, 0, -1, -1))

    def _level_slide(self, data):
        x, y, avx, avy = 0, 0, 0, 0
        try:
            x, y, avx, avy = map(int, data.split(":"))
        except ValueError:
            self.write_message("errInvalid level id")
            return

        try:
            level_width = self.location.width()
            level_height = self.location.height()
        except AttributeError:
            level_width = constants.level_width
            level_height = constants.level_height

        if avx == -1:
            avx =  level_width / 2
        else:
            avx = int(avx) / constants.tilesize
            if avx < 2:
                avx = level_width - 1
            elif avx > level_width - 2:
                avx = 0

        if avy == -1:
            avy = level_height / 2
        else:
            avy = int(avy) / constants.tilesize
            if avy < 2:
                avy = level_height - 1
            elif avy > level_height - 2:
                avy = 0

        if not self.location:
            self._load_level("o:0:0", avx, avy)
        else:
            self._load_level(self.location.get_slide_code(x, y), avx, avy)

    def _load_level(self, data, avx=None, avy=None):
        """Send the client a level to load as the active level."""
        sl = self.location
        if sl:
            CommHandler.del_client(self)

        # Create the location
        if data.startswith(":"):
            self.parent_positions.append(self.position)
            self.location = Location(str(sl) + data)
        elif data == "..":
            sublocs = map(sl._reconstitute_sublocation,
                          sl.sublocations[:-1])
            sublocs = ":%s" % ":".join(sublocs) if sublocs else ""

            loc = "%s:%s%s" % (sl.world, "%d:%d" % sl.coords, sublocs)
            self.location = Location(loc)
            self.position = self.parent_positions.pop()
            avx, avy = map(lambda x: x / constants.tilesize, self.position)
            avy += 1.3  # So we don't land back on the portal
        else:
            self.location = Location(data)
            self.position = avx, avy

        level = self.location.render(avx, avy)
        level["health"] = self.health
        self.write_message("lev%s" % json.dumps(level))

        CommHandler.add_client(self.location, self)

    def _on_schedule_event(self, scheduled):
        """Handle scheduled events regarding position."""

        # If the user terminates while moving, stop updating them.
        if not self.location:
            return

        velocity = self.old_velocity if not scheduled else self.velocity
        old_velocity = self.old_velocity
        self.old_velocity = velocity

        # Recalculate the new approximate position.
        x, y = self.position
        if scheduled:
            duration = time.time() - self.scheduler.last_tick
            duration *= 1000
            x += velocity[0] * duration * constants.speed
            y += velocity[1] * duration * constants.speed
            self.position = x, y

        self._notify_location(self.location,
                              "loc%s:%d:%d:%d:%d" %
                                  (self.id, x, y,
                                   self.velocity[0], self.velocity[1]),
                              for_entities=scheduled)

        portals = self.location.generate()[2]
        x_t, y_t = x / constants.tilesize, y / constants.tilesize
        def touching_portal(p):
            """Return whether the user is touching a portal, p."""
            px, py, pw, ph = p["x"], p["y"], p["width"], p["height"]
            return not (px + pw < x_t or x_t + 1 < px or
                        py + ph < y_t - 1 or y_t < py)

        # Perform portal hit testing if the user is in transit or has just
        # stopped.
        if scheduled or all(map(lambda x: not x, self.velocity)):
            for portal in portals:
                if touching_portal(portal):
                    destination = portal["destination"]
                    if destination.startswith(":"):
                        destination = "%s:%s" % (str(self.location),
                                                 destination)

                    self.write_message("flv%s" % portal["destination"])
                    self.velocity = 0, 0
                    self._load_level(portal["destination"],
                                     portal["dest_coords"][0],
                                     portal["dest_coords"][1])
                    break

        return any(self.velocity)

    def _attacked(self, attack_distance, attacked_by, attacked_with):
        """Handle an attack on the player."""
        if attacked_by == self.id:
            return
        print self.id, "attacked by", attacked_by
        if attack_distance < constants.HURT_DISTANCE:
            self.harmed_by(attacked_with, guid=attacked_by)

    def update_health(self):
        if self.health == 0:
            self.write_message("dth")
        else:
            self.write_message("hea%s" % self.health)

    def harm(self, damage):
        super(CommHandler, self).harm(damage)
        self.update_health()

    def die(self):
        """
        Since the Harmable class implements die() for entities, we need to
        build a player-compatible version.
        """

        print self.id, "has died."
        # Notify everyone that we've died.
        self._notify_location(self.location, "die%s" % self.id)

        # Spit out all of our items.
        for item_id in self.inventory:
            if self.inventory[item_id] is None:
                # We could probably break, but I want to be sure I don't change
                # this in the future.
                continue
            self.drop_item(item_id, direction=(random.randint(-1, 1),
                                               random.randint(-1, 1)),
                           update=False)

        # Clear out the inventory.
        self.empty_inventory()

        # Go back to the start.
        self._handle_command("warp o:0:0 50 50")

        self.health = self.max_health
        self.update_health()

    def get_drops(self):
        return self.inventory.values()

    @classmethod
    def add_client(cls, location, client):
        """Add a client to a level in the game."""
        loc_str = str(location)
        x, y = client.position

        if loc_str not in locations:
            locations[loc_str] = []
        locations[loc_str].append(client)

        # Subscribe to the location if we aren't subscribed already.
        brukva.subscribe("location::p::%s" % loc_str)
        brukva.subscribe("location::e::%s" % loc_str)
        # Let everyone know that we're here.
        client._notify_global(
                "enter",
                "%s>%s:%d:%d" % (loc_str, client.id, x, y))

        client_set = "l:c:%s" % loc_str
        for rclient in outbound_redis.smembers(client_set):
            client_location = outbound_redis.get("l:p:%s" % rclient)
            client.write_message("add%s" % client_location)
        outbound_redis.sadd(client_set, client.id)
        outbound_redis.set("l:p:%s" % client.id,
                           "%s:%d:%d" % (client.id, client.position[0],
                                         client.position[1]))

    @classmethod
    def del_client(cls, client):
        if not client.location or not client.id:
            return

        outbound_redis.srem("l:c:%s" % str(client.location), client.id)
        outbound_redis.delete("l:p:%s" % client.id)
        client._notify_location(client.location, "del%s" % client.id)

        loc_str = str(client.location)
        locations[loc_str].remove(client)
        if not locations[loc_str]:
            del locations[loc_str]
            brukva.unsubscribe("location::p::%s" % loc_str)
            brukva.unsubscribe("location::e::%s" % loc_str)

    def _notify_location(self, location, data, for_entities=False):
        """
        Broadcast a blob of data to all of the other listeners in a particular
        location.

        If for_entities is True, the message will not be broadcast to other
        players and will only be received by the appropriate entity server.
        """
        channel = "location::p::%s" if not for_entities else "location::pe::%s"
        outbound_redis.publish(channel % location,
                               "%s>%s" % (location, data))

    def _notify_global(self, data_type, data):
        """
        Broadcast a message to all nodes that are listening on the various
        global channels. This should be used sparingly, as these messages reach
        all of the entity server and all of the web server instances.
        """
        outbound_redis.publish("global::%s" % data_type, data)

