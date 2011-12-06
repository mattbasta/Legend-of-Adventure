from random import choice, randint

from animat_sprite import AnimatSprite
from hostile import HostileAnimat


class Zombie(AnimatSprite, HostileAnimat):

    def __init__(self, *args, **kwargs):
        super(Zombie, self).__init__(*args, **kwargs)

        self.width, self.height = 65, 65
        self.image = "zombie"
        self.speed = 0.3

        self.health = 60

        self.wander()

        self.schedule(randint(5, 8))

    def _on_event(self):
        self.write_chat(choice(["UURrrrrGGHHHH", "auughghhhHHHHH",
                                "MMMUuuuhhhhhh", "BLLuuuhhrrrrrrr"]))
        self.schedule(randint(5, 8))

    def get_prefix(self):
        return "%szombie_" % super(Zombie, self).get_prefix()

    def on_player_range(self, guid, distance):
        """
        Prevent zombies from attacking each other needlessly.
        """
        if guid.startswith(self.get_prefix()) and guid != self.chasing:
            return

        super(Zombie, self).on_player_range(guid, distance)

