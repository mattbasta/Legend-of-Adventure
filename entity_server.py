import json
import random
import threading

import redis

import internals.constants as constants
from internals.entities.entities import Animat
from internals.locations import Location


redis_host, port = constants.redis.split(":")
r = redis.Redis(host=redis_host, port=int(port))
outbound_r = redis.Redis(host=redis_host, port=int(port))
pubsub = r.pubsub()

# TODO: Make a class for this or something.
players = {}
entities = {}
locations = {}
ttls = {}


MESSAGES_TO_IGNORE = ("spa", "epu", )
MESSAGES_TO_INSPECT = ("del", "cha", )


def run():
    """Start the entity server."""

    master_events = {"global::enter": _on_enter}
    for event_type in master_events:
        pubsub.subscribe(event_type)

    for event in pubsub.listen():
        if event["type"] != "message":
            continue

        message = event["data"]
        location, message_data = message.split(">", 1)
        # Route the messsage immediately if it's a global channel.
        if event["channel"] in master_events:
            master_events[event["channel"]](location, message_data)
            continue

        message_type, message_data = message_data[:3], message_data[3:]
        if (message_type in MESSAGES_TO_IGNORE or
            (message_type in MESSAGES_TO_INSPECT and
             message_data.startswith("@"))):
            continue
        if message_type == "del" and location in locations:
            # We don't need to split message_data because it's only one value.
            _on_leave(location, message_data)
            continue

        if event["channel"] in master_events:
            master_events[event["channel"]](location, message_data)


def _on_enter(location, message_data):
    """
    When a player enters a level, test whether we need to spawn some entities.
    If a timer is set to destroy entities, disable and delete it.
    """

    if location in ttls:
        print "Cleanup of %s cancelled." % location
        ttls[location].cancel()
        del ttls[location]

    if location not in players:
        players[location] = set()
        entities[location] = []

        loc = Location(location)
        locations[location] = loc
        if loc.has_entities():
            spawn_initial_entities(loc)
    else:
        # TODO: Use Redis to pump these out as they're created. This is slow
        # and bad.
        for entity in entities[location]:
            spawn_entity(entity, location)

    guid = message_data.split(":")[0]
    players[location].add(guid)

    pubsub.subscribe("location::%s" % location)


def _on_leave(location, user):
    """
    If there are other players in the level, no worries. Detach any events
    tied to the player (mob following, for instance), and you're done. If
    there's nobody else around, start a timer that will destroy the entities
    after a period of time.
    """

    print "Unregistering player %s" % user
    for entity in entities[location]:
        entity.forget(user)

    players[location].discard(user)

    if not players[location]:
        print "Last player left %s, preparing for cleanup." % location

        def cleanup():
            print "Cleaning up mobs at %s" % location
            for entity in entities[location]:
                entity.destroy()

            del players[location]
            del entities[location]
            del locations[location]
            del ttls[location]

        t = threading.Timer(constants.entity_despawn_time, cleanup)
        ttls[location] = t
        t.start()


def spawn_initial_entities(location):
    """
    Using data from a location, spawn the initial entities that will roam a
    particular level.
    """
    loc_str = str(location)
    print "Spawning mobs at %s" % loc_str
    spawn_entities = location.get_entities_to_spawn()
    for entity in spawn_entities:
        e = entity(location, outbound_r)
        placeable_locations = e.get_placeable_locations(*location.generate())
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
        placeable_locations = None  # Free up that memory as quick as possible.
        entities[str(location)].append(e)
        spawn_entity(loc_str, e)


def spawn_entity(location, entity):
    """Send the command necessary to spawn an entity to the client."""
    outbound_r.publish("location::%s" % location,
                       "%s>spa%s\n%s" % (location, entity.id, str(entity)))


def start():
    try:
        run()
    except KeyboardInterrupt:
        for location in entities:
            for entity in entities[location]:
                if isinstance(entity, Animat):
                    entity.timer.cancel()

        for location in ttls:
            ttls[location].cancel()

if __name__ == "__main__":
    start()

