from animat_sprite import AnimatSprite
from peaceful import PeacefulAnimat


class Sheep(AnimatSprite, PeacefulAnimat):

    def __init__(self, *args, **kwargs):
        super(Sheep, self).__init__(*args, **kwargs)

        self.width, self.height = 55, 55
        self.image = "sheep"
        self.movement = "sheep_bounce"
        self.speed = 0.6

        self.wander()

