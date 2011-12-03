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

    def get_drops(self):
        return ["f5"]


class Wolf(AnimatSprite, HostileAnimat):

    def __init__(self, *args, **kwargs):
        super(Wolf, self).__init__(*args, **kwargs)

        self.width, self.height = 65, 65
        self.image = "wolf"
        self.speed = 0.85

        self.health = 20

        self.wander()

