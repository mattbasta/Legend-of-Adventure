from animat_sprite import AnimatSprite
from peaceful import PeacefulAnimat


class Sheep(PeacefulAnimat):

    def __init__(self, *args, **kwargs):
        super(Sheep, self).__init__(*args, **kwargs)

        self.image = "sheep"

        self.wander()

