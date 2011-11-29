from math import sqrt

from internals.constants import FLEE_DISTANCE, HURT_DISTANCE
from entities import Animat
from items import WEAPONS, WEAPON_PREFIXES
from harmable import Harmable


FLEE_TIME = 1.5


class PeacefulAnimat(Harmable, Animat):
    """
    A PeacefulAnimat will behave like any animat, however, it will flee when
    it is attacked.
    """

    def __init__(self, *args, **kwargs):
        super(PeacefulAnimat, self).__init__(*args, **kwargs)

        self.fleeing = set()

    def forget(self, guid):
        super(PeacefulAnimat, self).forget(guid)

        if guid in self.fleeing:
            self.fleeing.discard(guid)

    def flee(self, guid):
        """Mark a GUID as an entity to avoid."""
        self.fleeing.add(guid)
        self.scheduler.event_happened()

        if not any(self.velocity):
            best_direction = self._get_best_direction()
            self.move(*best_direction)

        self.schedule(FLEE_TIME, self.reevaluate_flee)

    def wander(self):
        if self.fleeing:
            return

        super(PeacefulAnimat, self).wander()

    def stop_wandering(self):
        if self.fleeing:
            self.reevaluate_flee()
            return

        super(PeacefulAnimat, self).stop_wandering()

    def reevaluate_flee(self):
        """
        Decide whether we should still be fleeing, and if so, what direction we
        should flee in.
        """

        flee = self.fleeing

        if flee:
            flee = any(self.remembered_distances[x] < FLEE_DISTANCE * 1.5 for
                       x in self.fleeing)

        if not self.fleeing:
            self.move(0, 0)
            self.schedule(3, self.wander)
            return False
        else:
            best_direction = self._get_best_direction(weighted=True)
            if best_direction != self.velocity:
                self.move(*best_direction)

            self.schedule(FLEE_TIME, self.reevaluate_flee)
            return True

    def _get_direction_weight(self, direction):
        """
        Returns the signed delta of distances with tracked GUIDs.
        """
        x, y = self._updated_position(*self.position,
                                      velocity=direction)
        delta = 0
        for guid in self.fleeing:
            g_x, g_y = self.remembered_positions[guid]
            g_delta = sqrt((x - g_x) ** 2 + (y - g_y) ** 2)
            if g_delta > 1.5 * FLEE_DISTANCE:
                continue
            g_delta -= self.remembered_distances[guid]

            delta += g_delta

        return delta

    def _handle_message(self, type, message):
        """Here, we're going to intercept attack commands and process them."""

        super(PeacefulAnimat, self)._handle_message(type, message)

        if type != "atk":
            return

        print "Calculating attack, %s" % self.id
        guid, item, x, y = message.split(":")
        position = map(float, [x, y])
        position = map(int, position)
        attack_distance = sqrt((self.position[0] - position[0]) ** 2 +
                               (self.position[1] - position[1]) ** 2)

        self.write_chat("Beh. %d" % int(attack_distance))

        if attack_distance < FLEE_DISTANCE:
            self.write_chat("Baaahhh!")
            self.flee(guid)

        if attack_distance < HURT_DISTANCE:
            self.write_chat("OH CRAP!")
            self.harmed_by(item)

