from internals.constants import FLEE_DISTANCE, HURT_DISTANCE
from sentient import SentientAnimat


class PeacefulAnimat(SentientAnimat):
    """
    A PeacefulAnimat will behave like any animat, however, it will flee when
    it is attacked.
    """

    def _attacked(self, attack_distance, attacked_by, attacked_with):
        """
        This method is called when an attack is received within a relatively
        close proximity to the entity.
        """

        if attack_distance < FLEE_DISTANCE:
            self.flee(attacked_by)

        if attack_distance < HURT_DISTANCE:
            self.harmed_by(attacked_with, guid=attacked_by)
