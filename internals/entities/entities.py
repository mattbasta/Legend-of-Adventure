import json
from math import sqrt
import random
import threading
import time
import uuid

import internals.constants as constants


class Entity(object):
    """An entity is any non-player, non-terrain element of the game."""

    def __init__(self, location, x=None, y=None, id=None):
        self.id = id if id else "@%s" % uuid.uuid4().hex
        self.height, self.width = 0, 0
        self.position = x, y
        self.location = location

        self.remembered_distances = {}

    def forget(self, guid):
        """
        This function is called when a user has left the level, or when the
        server decides that the entity should not recognize the user. This
        method may be overridden, but this method should always be called
        with super().
        """
        if guid in self.remembered_distances:
            del self.remembered_distances[guid]

    def can_despawn(self):
        # TODO: Implement this!
        return True

    def destroy(self, notify=True):
        """
        When this function is called, the entity should be fully cleaned up.
        All resources pointing to this entity should be properly dereferenced.
        """
        if notify:
            self.location.notify_location("del", self.id)

    def place(self, x, y):
        """Set the entity's position at X,Y coordinates."""
        self.position = x, y

    def can_place_at(self, x, y, grid, hitmap):
        """
        Return a boolean value representing whether the entity can be placed at
        an X,Y coordinate on a grid. By default, we return True, but this can
        (and should) be overridden by classes that implement this class.
        """
        return True

    def get_placeable_locations(self, grid, hitmap):
        """
        Return a list of 2-tuples containing the X,Y coordinates of locations
        that the entity can be placed at. This is used to randomly place
        entities in a location.
        """
        return []

    def handle_message(self, message):
        """
        Process and route messages to their appropriate handler functions.
        """
        type, message = message[:3], message[3:]
        if type == "loc":
            guid, x, y, xvel, yvel = message.split(":")
            self._player_movement(guid, x, y)
        elif type == "cha":
            guid, chat_data = message.split(":", 1)

            # Filter out chat from entities, this should be handled directly.
            if guid.startswith("@"):  # Entity IDs start with an '@'.
                print "Un-optimal message passing. int.ent.entities.Entity#70"
                return

            chat_data = chat_data.split("\n", 1)[1]
            if guid not in self.remembered_distances:
                self.on_chat(guid, chat_data)
            else:
                self.on_chat(guid, chat_data,
                             distance=self.remembered_distances[guid])

    def _player_movement(self, guid, x, y):
        """
        This is an internal function to manage player movement relative to the
        entity. It should only be called when a new, updated position for a
        player is available. Old data should never be posted.

        Player position should be passed in pixels, not tiles.
        """
        distance = sqrt((x - self.x) ** 2 + (y - self.y) ** 2)
        distance /= constants.tilesize
        distance = round(distance / constants.PLAYER_RANGES)
        distance *= constants.PLAYER_RANGES
        if distance > 35:  # The threshold of uncaring.
            return

        if guid in self.remembered_distances:
            old_distance = self.remembered_distances[guid]
            if old_distance == distance:
                return
        self.on_player_range(guid, distance)
        self.remembered_distances[guid] = distance

    def on_player_range(self, guid, distance):
        """
        This method is called when the player's distance from the entity
        changes by a unit of constants.PLAYER_RANGES. It should be overridden
        by child classes.
        """
        print "Player %s within %d of %s" % (guid, distance, self.id)
        pass

    def on_chat(self, guid, message, distance=0):
        """
        This method is called when a chat is sent to the current location.
        If distance is available, it is set, otherwise, the value is zero and
        the chat should appear to be coming from a position very near to the
        entity.
        """
        pass

    def _get_properties(self):
        return {"x": self.position[0] / constants.tilesize,
                "y": self.position[1] / constants.tilesize,
                "height": self.height,
                "width": self.width,
                "layer": 0,
                "x_vel": 0,
                "y_vel": 0,
                "movement": {"type": "static"},
                "image": None,
                "view": {"type": "static"}}

    def __str__(self):
        return json.dumps(self._get_properties())

    def broadcast_changes(self, *args):
        """
        Broadcast a set of changed properties to the location. This should also
        update other entities of relevant information.
        """
        props = self._get_properties()
        def get_prop(key, value=None):
            if value is None:
                value = props
            if "|" in key:
                new_key = key.split("|", 1)
                return get_prop(new_key[1], props[new_key[0]])
            else:
                return value[key]

        builder = lambda x: "%s=%s" % (x, json.dumps(get_prop(x)))
        command = "\n".join(map(builder, args))

        self.location.notify_location("epu", "%s:%s" % (self.id, command))


class Animat(Entity):
    """
    An animat is a game entity that is capable of performing animations and
    actions on its own.
    """

    def __init__(self, *args, **kwargs):
        super(Animat, self).__init__(*args, **kwargs)
        self.timers = []

        self.velocity = [0, 0]
        self.movement_effect = ""

    def destroy(self, notify=True):
        super(Animat, self).destroy(notify)

        # Since we're being destroyed, delete all of our planned events.
        self.deschedule_all()

    def forget(self, guid):
        """
        We want to make sure we unregister all scheduled events that are
        focused around the user being despawned.
        """
        for timer in self.timers:
            if timer[2] == guid:
               timer[1].cancel()
               self.timers.remove(timer)

    def schedule(self, seconds, callback=None, focus=None):
        if not callback:
            callback = self._on_event

        ts = int(time.time()) + seconds

        # Provide a means of cleaning up the timer list.
        def callback_wrapper():
            for t in self.timers:
                if t[0] == ts:
                    self.timers.remove(t)
                elif t[0] > ts:
                    break
            callback()

        timer = threading.Timer(seconds, callback_wrapper)
        timer.start()

        index = 0
        for t_ts, t_timer, t_focus in self.timers:
            index += 1
            if t_ts < ts:
                self.timers.insert(index, (ts, timer, focus))
                return
        self.timers.append((ts, timer, focus))

    def deschedule_all(self):
        """Deschedule all of the events in the timer queue."""
        for t_ts, t_timer, t_focus in self.timers:
            t_timer.cancel()

    def _on_event(self):
        """
        This method will be called when the event time has fired. It should be
        overridden by child classes.
        """
        pass

    def move(self, x_vel, y_vel):
        """Start the sprite moving in any direction, or stop it from moving."""
        changed = x_vel != self.velocity[0] or y_vel != self.velocity[1]
        if not changed:
            return
        self.velocity = [x_vel, y_vel]
        self.layer = 1 if x_vel or y_vel else 0
        self.broadcast_changes("x_vel", "y_vel", "layer")

    def wander(self):
        directions = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1),
                      (0, -1), (1, -1)]
        def callback():
            self.move(*(random.choice(directions)))
            self.wandering = True
            self.schedule(random.randint(1, 4), self.stop_wandering)
        # Move the callback into the future so we can finish initializing the
        # entity.
        self.schedule(0.25, callback)

    def stop_wandering(self):
        self.move(0, 0)
        self.wandering = False
        self.schedule(random.randint(1, 3), self.wander)

    def get_placeable_locations(self, grid, hitmap):
        """
        We only want animats to be able to spawn on walkable surfaces, so only
        return those locations.
        """
        # Make our life easy: if everything's walkable, tell the server to just
        # pick a random location.
        if all(all(not cell for cell in row) for row in hitmap):
            return []

        locations = []
        for rownum in range(len(hitmap)):
            row = hitmap[rownum]
            for cellnum in range(len(row)):
                if not row[cellnum]:
                    locations.append((cellnum, rownum))
        return locations if locations else None

    def write_chat(self, message):
        """Write a line of text to the chats of nearby users."""
        self.location.notify_location(
                "cha",
                "%s:%d:%d\n%s" % (self.id, self.position[0],
                                  self.position[1], message))

    def _get_properties(self):
        baseline = super(Animat, self)._get_properties()
        baseline["x_vel"] = self.velocity[0]
        baseline["y_vel"] = self.velocity[1]
        return baseline

        #"sprite": {"x": 0, "y": 0,
        #           "swidth": 32, "sheight": 32,
        #           "awidth": 65, "aheight": 65}

