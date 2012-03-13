import os
import signal

import redis

import internals.constants as constants
from internals.entity_servlet import EntityServlet
from internals.locations import Location


redis_host, port = constants.redis.split(":")
r = redis.Redis(host=redis_host, port=int(port))
pubsub = r.pubsub()

locations = {}

MESSAGES_TO_IGNORE = ("spa", "epu", )
MESSAGES_TO_INSPECT = ("del", "cha", )


def run():
    """Start the entity server."""

    master_events = {"global::enter": _on_enter}
    for event_type in master_events:
        pubsub.subscribe(event_type)

    for event in pubsub.listen():
        if (event["type"] != "message" or
            event["channel"] not in master_events):
            continue

        message = event["data"]
        location, message_data = message.split(">", 1)

        master_events[event["channel"]](location, message_data)


def _on_enter(location, message_data):
    """
    When a player spawns in a level, test whether we should create a new level
    handler object. If so, fork the process and do the deed.
    """

    # TODO: Put sharding code here.

    if location in locations:
        # See whether the process has despawned.
        try:
            os.getsid(locations[location].pid)
        except OSError:
            # Explicitly tell the GC that we're done with that location
            # handler.
            del locations[location]
        else:
            return

    loc = EntityServlet(location, message_data)
    loc.start()
    locations[location] = loc


def start():
    try:
        run()
    except KeyboardInterrupt, SystemExit:
        for location in locations:
            try:
                os.kill(locations[location].pid, signal.CTRL_C_EVENT)
            except:
                pass


if __name__ == "__main__":
    start()

