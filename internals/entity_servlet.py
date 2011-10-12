import json
import random
import os
import threading

import redis

import internals.constants as constants
from internals.entities.entities import Animat
from internals.locations import Location


redis_host, port = constants.redis.split(":")

MESSAGES_TO_IGNORE = ("spa", "epu", )
MESSAGES_TO_INSPECT = ("del", "cha", )


class LocationHandler(object):
    """
    A location handler manages all entities and entity interactions for a
    single location.
    """

    def __init__(self, location, message_data=None):

        self.location = Location(location)

        # Fork the process.
        self.pid = os.fork()
        if self.pid:  # The server daemon should continue on.
            print "Forked process (%d)" % self.pid
            return

        redis_host, port = constants.redis.split(":")
        self.outbound_redis = redis.Redis(host=redis_host, port=int(port))

        self.entities = []
        self.players = set()
        self.ttl = None

        if message_data:
            self.on_enter(message_data)

        try:
            self.run()
        except KeyboardInterrupt:
            print "Forcing quit for %s" % self.location

            # Cancel any TTL timer.
            if self.ttl:
                self.ttl.cancel()

            # Destroy entities that still exist.
            for entity in self.entities:
                entity.destroy()

            os._exit(0)

    def run(self):
        inbound_redis = redis.Redis(host=redis_host, port=int(port))
        pubsub = inbound_redis.pubsub()
        pubsub.subscribe("global::enter")
        pubsub.subscribe("location::%s" % self.location)

        for event in pubsub.listen():
            if event["type"] != "message":
                continue

            message = event["data"]
            location, message_data = message.split(">", 1)
            if (event["channel"] == "global::enter" and
                location == str(self.location)):
                self.on_enter(message_data)
                continue

            message_type, message_data = message_data[:3], message_data[3:]
            if (message_type in MESSAGES_TO_IGNORE or
                (message_type in MESSAGES_TO_INSPECT and
                 message_data.startswith("@"))):
                continue
            if message_type == "del":
                # We don't need to split message_data because it's only one
                # value.
                self.on_leave(message_data)

            # TODO: Event handling code goes here.

    def on_enter(self, message_data):
        """
        When a player enters a level, test whether we need to spawn some
        entities. If a timer is set to destroy entities, disable and delete it.
        """
        if self.ttl:
            print "Cleanup of %s cancelled." % self.location
            self.ttl.cancel()

        if self.location.has_entities():
            self.spawn_initial_entities(self.location)

        guid = message_data.split(":")[0]
        print "Registering user %s" % guid
        self.players.add(guid)

    def on_leave(self, user):
        """
        If there are other players in the level, no worries. Detach any events
        tied to the player (mob following, for instance), and you're done. If
        there's nobody else around, start a timer that will destroy the
        entities after a period of time.
        """
        print "Unregistering player %s" % user

        for entity in self.entities:
            entity.forget(user)

        self.players.discard(user)
        if not self.players:
            print "Last player left %s, preparing for cleanup." % self.location

            def cleanup():
                print "Cleaning up mobs at %s" % self.location
                for entity in self.entities:
                    entity.destroy()

                os._exit(0)

            t = threading.Timer(constants.entity_despawn_time, cleanup)
            self.ttl = t
            t.start()

    def spawn_initial_entities(self, location):
        """
        Using data from a location, spawn the initial entities that will roam a
        particular level.
        """
        print "Spawning mobs at %s" % self.location
        spawn_entities = self.location.get_entities_to_spawn()

        for entity in spawn_entities:
            # Initialize the new entity.
            e = entity(location, self.outbound_redis)

            level = self.location.generate()
            placeable_locations = e.get_placeable_locations(*level)

            # Look at the avaialable locations for the entity.
            if placeable_locations is None:
                # There are not available locations.
                continue
            elif not placeable_locations:
                # The entity can be placed anywhere.
                x = random.randint(0.1 * constants.level_width,
                                   0.9 * constants.level_width)
                y = random.randint(0.1 * constants.level_height,
                                   0.9 * constants.level_height)
            else:
                x, y = random.choice(placeable_locations)

            print "  > %s at (%d, %d)" % (str(entity), x, y)

            e.place(x * constants.tilesize, y * constants.tilesize)
            placeable_locations = None  # Free up that memory!
            self.entities.append(e)
            self.spawn_entity(e)

    def spawn_entity(self, entity):
        """Send the command necessary to spawn an entity to the client."""
        self.outbound_redis.publish("location::%s" % self.location,
                                    "%s>spa%s\n%s" % (self.location, entity.id,
                                                      str(entity)))

