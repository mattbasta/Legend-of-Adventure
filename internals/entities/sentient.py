from math import sqrt

from internals.constants import CHASE_DISTANCE, FLEE_DISTANCE, HURT_DISTANCE
from entities import Animat
from items import WEAPONS, WEAPON_PREFIXES
from harmable import Harmable


FLEE = 1
CHASE = 2

REEVALUATE_TIME = 1


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

    def chase(self, guid):
        """Mark a GUID as an entity to chase."""
        if guid == self.chasing:
            return

        self.chasing = guid
        self._behavior_changed()

    def _behavior_changed(self):
        self.scheduler.event_happened()

        if not any(self.velocity):
            best_direction = self._get_best_direction()
            self.move(*best_direction)

        self.schedule(REEVALUATE_TIME, self._reevaluate_behavior)

    def wander(self):
        if self.fleeing or self.chasing:
            return

        super(SentientAnimat, self).wander()

    def stop_wandering(self):
        if self.fleeing or self.chasing:
            self._reevaluate_behavior()
            return

        super(SentientAnimat, self).stop_wandering()

    def _reevaluate_behavior(self):
        """
        Decide whether we should still be fleeing, and if so, what direction we
        should flee in.
        """

        if not (self.chasing or
                any(self.remembered_distances[x] < FLEE_DISTANCE * 1.5 for
                    x in self.fleeing)):
            self.move(0, 0)
            self.schedule(3, self.wander)
            return False
        else:
            best_direction = self._get_best_direction(weighted=True)
            if best_direction != self.velocity:
                self.move(*best_direction)

            self.schedule(REEVALUATE_TIME, self._reevaluate_behavior)
            return True

    def _get_direction_weight(self, direction):
        """
        Returns the signed delta of distances with tracked GUIDs.
        """
        x, y = self._updated_position(*self.position,
                                      velocity=direction)
        def get_gdelta(guid):
            """Return the distance of the GUID to the entity."""
            g_x, g_y = self.remembered_positions[guid]
            return sqrt((x - g_x) ** 2 + (y - g_y) ** 2)

        def get_flee_delta():
            flee_delta = 0
            for guid in self.fleeing:
                g_delta = get_gdelta(guid)
                if g_delta > 1.5 * FLEE_DISTANCE:
                    return 0
                g_delta -= self.remembered_distances[guid]

                flee_delta += g_delta
            return flee_delta

        def get_chase_delta():
            g_delta = get_gdelta(self.chasing)
            if g_delta > 2.5 * CHASE_DISTANCE:
                return 0
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

    def _handle_message(self, type, message):
        """Here, we're going to intercept attack commands and process them."""

        super(SentientAnimat, self)._handle_message(type, message)

        if type != "atk":
            return

        guid, item, x, y = message.split(":")
        position = map(float, [x, y])
        position = map(int, position)
        attack_distance = sqrt((self.position[0] - position[0]) ** 2 +
                               (self.position[1] - position[1]) ** 2)

        self._attacked(attack_distance, guid, item)

    def _attacked(attack_distance, attacked_by, attacked_with):
        pass

