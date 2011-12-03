from math import sqrt

from internals.constants import CHASE_DISTANCE, HURT_DISTANCE
from sentient import SentientAnimat


class HostileAnimat(SentientAnimat):
    """
    A HostileAnimat will behave like any animat, however, it will attack any
    entity or player that comes near it.
    """

    def _attacked(self, attack_distance, attacked_by, attacked_with):
        if attacked_by != self.chasing:
            self.chase(attacked_by)

        if attack_distance < HURT_DISTANCE:
            self.harmed_by(attacked_with)

    def on_player_range(self, guid, distance):
        if distance < CHASE_DISTANCE:
            self.chase(guid)

