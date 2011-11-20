from math import sqrt

from entities import Animat


class PeacefulAnimat(Animat):
    """
    A PeacefulAnimat will behave like any animat, however, it will flee when
    it is attacked.
    """

    def __init__(self, *args, **kwargs):
        super(PeacefulAnimat, self).__init__(*args, **args)

        self.fleeing = set()

    def forget(self, guid):
        super(PeacefulAnimat, self).forget(guid)

        if guid in self.fleeing:
            self.fleeing.discard(guid)

    def flee(self, guid):
        """Mark a GUID as an entity to avoid."""
        self.fleeing.add(guid)
        self.scheduler.event_happened()

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
            g_delta -= self.remembered_distances[guid]

            delta += g_delta

        return delta

