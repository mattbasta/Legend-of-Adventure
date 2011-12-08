from math import sqrt

from internals.constants import CHASE_DISTANCE, HURT_DISTANCE
from sentient import SentientAnimat


class HostileAnimat(SentientAnimat):
    """
    A HostileAnimat will behave like any animat, however, it will attack any
    entity or player that comes near it.
    """

    def __init__(self, *args, **kwargs):
        super(HostileAnimat, self).__init__(*args, **kwargs)
        self.does_attack = True

    def _attacked(self, attack_distance, attacked_by, attacked_with):
        if attack_distance < HURT_DISTANCE:
            self.harmed_by(attacked_with, guid=attacked_by)

            if attacked_by != self.chasing:
                self.chase(attacked_by)

    def on_player_range(self, guid, distance):
        # Ignore item entities.
        if guid.startswith("!!"):
            return

        # If the entity is what we're chasing and it's within reach, try to
        # hit it.
        if self.chasing:
            if self.chasing == guid and distance < HURT_DISTANCE:
                self.attack(guid)
            return
        elif distance < CHASE_DISTANCE:
            # If we're not chasing anyone, chase the entity
            self.chase(guid)

