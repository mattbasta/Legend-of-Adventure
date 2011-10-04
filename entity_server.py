import json
import threading

import redis

import internals.constants as constants
from internals.resourceloader import Location


players = {}
entities = {}
locations = {}
ttls = {}


def start():
    """Start the entity server."""

    redis_host, port = constants.redis.split(":")
    r = redis.Redis(host=redis_host, port=int(port))
    pubsub = r.pubsub()

    master_events = {"enter": _on_enter,
                     "leave": _on_leave}
    for event_type in master_events:
        pubsub.subscribe(event_type)

    for event in pubsub.listen():
        # {"u": user,
        #  "l": location,
        #  "d": details,
        #  "t": type}
        data = json.parse(event["data"])
        location, user, details = data["u"], data["l"], data["d"]

        if data["t"] in master_events:
            master_events[data["t"]](location, user, details)


def _on_enter(location, user, details):
    """
    When a player enters a level, test whether we need to spawn some entities.
    If a timer is set to destroy entities, disable and delete it.
    """

    if location in ttls:
        ttls[location].cancel()
        del ttls[location]

    if location not in players:
        players[location] = set()
        entities[location] = []

        locations[location] = Location(location)
        if locations[location].has_entities():
            spawn_initial_entities(location)

    players[location].add(user)


def _on_leave(location, user, details):
    """
    If there are other players in the level, no worries. Detach any events
    tied to the player (mob following, for instance), and you're done. If
    there's nobody else around, start a timer that will destroy the entities
    after a period of time.
    """

    for entity in entities[location]:
        entity.forget(user)

    players[location].discard(user)

    if not players[location]:

        def cleanup():
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


if __name__ == "__main__":
    start()

