import json
from math import sqrt
import threading
import uuid

import internals.constants as constants


class Entity(object):
    """An entity is any non-player, non-terrain element of the game."""

    def __init__(self, location, connection, x=None, y=None, id=None):
        self.id = id if id else "@%s" % uuid.uuid4().hex
        self.position = x, y
        self.location = location
        self.connection = connection

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
            self._notify_location("del%s" % self.id)

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

    def _notify_location(self, message):
        loc_str = str(self.location)
        self.connection.publish("location::%s" % loc_str,
                                "%s>%s" % (loc_str, message))

    def __str__(self):
        """Convert the NPC to the serialized JSON format."""
        return json.dumps({"x": self.position[0] / constants.tilesize,
                           "y": self.position[1] / constants.tilesize,
                           "movement": {"type": "static"},
                           "image": {"type": "static",
                                     "image": self.image,
                                     "sprite": {"x": 0, "y": 0,
                                                "swidth": 32, "sheight": 32,
                                                "awidth": 65, "aheight": 65}}})


class Animat(Entity):
    """
    An animat is a game entity that is capable of performing animations and
    actions on its own.
    """

    def __init__(self, *args, **kwargs):
        super(Animat, self).__init__(*args, **kwargs)
        self.timer = None

    def schedule(self, seconds, callback=None):
        if not callback:
            callback = self._on_event
        self.timer = threading.Timer(seconds, callback)
        self.timer.start()

    def _on_event(self):
        """
        This method will be called when the event time has fired. It should be
        overridden by child classes.
        """
        pass

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
        self._notify_location("cha%s:%d:%d\n%s" % (self.id, self.position[0],
                                                   self.position[1], message))

