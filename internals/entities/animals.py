from random import randint

from animat_sprite import AnimatSprite
from hostile import HostileAnimat
from peaceful import PeacefulAnimat


class Sheep(AnimatSprite, PeacefulAnimat):

    def __init__(self, *args, **kwargs):
        super(Sheep, self).__init__(*args, **kwargs)

        self.width, self.height = 65, 65
        self.image = "sheep"
        self.movement = "sheep_bounce"
        self.speed = 0.6

        self.health = 8

        self.wander()

        self.schedule(randint(4, 12))

    def get_drops(self):
        return ["f5"]

    def _on_event(self):
        self.make_sound("bleat")
        self.schedule(randint(4, 12))


class Wolf(AnimatSprite, HostileAnimat):

    def __init__(self, *args, **kwargs):
        super(Wolf, self).__init__(*args, **kwargs)

        self.width, self.height = 65, 65
        self.image = "wolf"
        self.speed = 0.90

        self.health = 24

        self.wander()

    def get_prefix(self):
        return "%swolf_" % super(Wolf, self).get_prefix()

    def on_player_range(self, guid, distance):
        """
        This keeps wolves from just up and attacking each other pointlessly.
        """
        if guid.startswith(self.get_prefix()) and guid != self.chasing:
            return

        super(Wolf, self).on_player_range(guid, distance)

