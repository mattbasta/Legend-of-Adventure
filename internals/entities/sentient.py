from math import sqrt
from random import randint
import time

from internals.constants import (CHASE_DISTANCE, FLEE_DISTANCE, HURT_DISTANCE,
                                 tilesize)
from entities import Animat
from items import WEAPONS, WEAPON_PREFIXES
from internals.harmable import Harmable


FLEE = 1
CHASE = 2

REEVALUATE_TIME = 0.675


def get_guid_position(guid, self):
    """Get the position of an entity the hard way."""
    # FIXME: This function is called once per direction per update per entity. !!!!!
    # A good solution might be to have a function for the entity to precache all of
    # the stuff that it needs, then do the direction testing.
    try:
        entity = (e for e in self.location.entities if e.id == self.chasing).next()
        position = entity.position
        # Since we look it up, we'd might as well store it.
        self.remembered_positions[guid] = position
        return position
    except StopIteration:
        # It's probably a player, not an entity :-/
        return self.remembered_positions[guid]


class SentientAnimat(Harmable, Animat):
    """
    SentientAnimats are capable of expressing behaviors of living things. The
    fundamental behaviors are flee and chase, as well as attack.
    """

    def __init__(self, *args, **kwargs):
        super(SentientAnimat, self).__init__(*args, **kwargs)

        self.fleeing = set()
        self.chasing = None

        self.holding_item = None

        self.prefer_behavior = FLEE

        self.does_attack = False
        self.last_attack = 0

    def forget(self, guid):
        super(SentientAnimat, self).forget(guid)

        if guid in self.fleeing:
            self.fleeing.discard(guid)

        if self.chasing == guid:
            self.chasing = None

    def flee(self, guid):
        """Mark a GUID as an entity to avoid."""
        if guid in self.fleeing:
            return

        self.fleeing.add(guid)
        self._behavior_changed()

    def stop_fleeing(self, guid):
        """Stop fleeign from a GUID."""
        if guid not in self.fleeing:
            return

        self.fleeing.discard(guid)

    def chase(self, guid):
        """Mark a GUID as an entity to chase."""
        if guid == self.chasing:
            return

        self.chasing = guid
        self._behavior_changed()

    def _behavior_changed(self):
        if not any(self.velocity):
            best_direction = self._get_best_direction()
            if best_direction is None:
                self.move(0, 0)
                self.wander()
                return
            else:
                self.move(*best_direction)

        self.schedule(REEVALUATE_TIME + randint(5, 7) / 11,
                      self._reevaluate_behavior)

    def attack(self, guid):
        now = time.time()
        if now - self.last_attack < 1.5:
            return
        self.last_attack = now

        x, y = get_guid_position(guid, self)
        self.location.notify_location(
            "atk", "%s:%s:%d:%d" % (self.id, self.holding_item or "", x, y),
            to_entities=True)

    def wander(self):
        if self.fleeing or self.chasing:
            return

        super(SentientAnimat, self).wander()

    def stop_wandering(self):
        if self.fleeing or self.chasing:
            self._reevaluate_behavior()
            return

        super(SentientAnimat, self).stop_wandering()

    def _on_scheduled_event(self, *args, **kwargs):
        """
        Recalculate all of the distances that we've seen. Don't wait for the
        other person to move.
        """
        output = super(SentientAnimat, self)._on_scheduled_event(*args, **kwargs)
        s_x, s_y = self.position
        for guid in self.remembered_positions:
            x, y = self.remembered_positions[guid]
            self.remembered_distances[guid] = sqrt((s_x - x) ** 2 +
                                                   (s_y - y) ** 2) / tilesize

        return output

    def _reevaluate_behavior(self):
        """
        Decide whether we should still be fleeing, and if so, what direction we
        should flee in.
        """

        is_fleeing = self.fleeing
        if self.fleeing:
            if all(self.remembered_distances[x] > FLEE_DISTANCE for
                   x in self.fleeing):
                if_fleeing = False

        if not self.chasing and not is_fleeing:
            self.move(0, 0)
            self.schedule(2, self.wander)
            if not self.fleeing:
                return False
        else:

            # Toss out an attack if we can.
            if self.chasing:
                if (self.does_attack and
                    self.remembered_distances[self.chasing] <=
                        1.5 * HURT_DISTANCE):
                    self.attack(self.chasing)
                if self.remembered_distances[self.chasing] < 2:
                    self.move(0, 0)


            best_direction = self._get_best_direction(weighted=True)
            if best_direction is None:
                self.move(0, 0)
                self.schedule(3, self.wander)
                return False
            elif best_direction != self.velocity:
                self.move(*best_direction)

        self.schedule(REEVALUATE_TIME + randint(5, 7) / 11,
                      self._reevaluate_behavior)
        return True

    def _get_direction_weight(self, direction):
        """
        Returns the signed delta of distances with tracked GUIDs.
        """

        x, y = self._updated_position(*self.position,
                                      velocity=direction)

        def get_gdelta(position):
            """Return the distance of the GUID to the entity."""
            g_x, g_y = position
            return sqrt((x - g_x) ** 2 + (y - g_y) ** 2)

        def get_flee_delta():
            flee_delta = 0
            for guid in self.fleeing:
                g_delta = get_gdelta(get_guid_position(guid, self))
                g_delta -= self.remembered_distances[guid]

                flee_delta += g_delta
            return flee_delta

        def get_chase_delta():
            # Get the position straight from the location handler. We want this
            # to be incredibly fresh. Do it as a generator so it only loops
            # until we find the right one. Use next() to get the first one.
            g_delta = get_gdelta(get_guid_position(self.chasing, self))
            g_delta /= tilesize
            g_delta -= self.remembered_distances[self.chasing]

            return 0 - g_delta

        if self.fleeing and self.chasing:
            if self.prefer_behavior == FLEE:
                return get_flee_delta()
            else:
                return get_chase_delta()
        elif self.fleeing:
            return get_flee_delta()
        elif self.chasing:
            return get_chase_delta()
        else:
            return 0

    def _handle_message(self, type, message):
        """Here, we're going to intercept attack commands and process them."""

        super(SentientAnimat, self)._handle_message(type, message)

        if type != "atk":
            return

        guid, item, x, y = message.split(":")
        if guid == self.id:
            return

        position = map(float, [x, y])
        position = map(int, position)
        attack_distance = sqrt((self.position[0] - position[0]) ** 2 +
                               (self.position[1] - position[1]) ** 2)

        attack_distance /= tilesize
        self._attacked(attack_distance, guid, item)

    def _attacked(self, attack_distance, attacked_by, attacked_with):
        """
        This should not be overridden if the inheriting class's _attacked
        implementation harms the entity.
        """
        if attack_distance <= HURT_DISTANCE:
            self.harmed_by(attacked_with, guid=attacked_by)

