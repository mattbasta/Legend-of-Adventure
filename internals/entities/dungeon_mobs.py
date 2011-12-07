from random import choice, randint

from internals.constants import HURT_DISTANCE, tilesize
from animat_sprite import AnimatSprite
from hostile import HostileAnimat
from npc import NPC
from sentient import CHASE, SentientAnimat


class EvilDoer(AnimatSprite):

    def get_prefix(self):
        """Carat is the new evil."""
        return "^"

    def chase(self, guid):
        if guid.startswith("^"):
            return
        super(EvilDoer, self).chase(guid)

    def _attacked(self, attack_distance, attacked_by, attacked_with):
        if attacked_by.startswith("^"):
            return
        super(EvilDoer, self)._attacked(attack_distance, attacked_by,
                                        attacked_with)

    def on_player_range(self, guid, distance):
        if guid.startswith("^"):
            return
        super(EvilDoer, self).on_player_range(guid, distance)


class Zombie(EvilDoer, HostileAnimat):

    def __init__(self, *args, **kwargs):
        super(Zombie, self).__init__(*args, **kwargs)

        self.width, self.height = 65, 65
        self.image = "zombie"
        self.speed = 0.4

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
        if self.chasing and guid != self.chasing:
            return

        super(Zombie, self).on_player_range(guid, distance)


class DeathWaker(EvilDoer, SentientAnimat):
    """
    Death Wakers will summon additional zombies, but won't actually actively
    seek out players to do damage.
    """

    def __init__(self, *args, **kwargs):
        super(DeathWaker, self).__init__(*args, **kwargs)

        self.width, self.height = 65, 65
        self.image = "death_waker"
        self.speed = 0.4

        self.health = 40

        self.wander()

        self.schedule(randint(30, 35))

    def _on_event(self):
        self.write_chat("AIIAIIIGGHHH!!")
        self.move(0, 0, broadcast=False)

        self.movement = "shake"
        self.broadcast_changes("x", "y", "x_vel", "y_vel", "movement")

        self.schedule(4, self._spawn_zombies)

    def _spawn_zombies(self):
        """Spawn zombies in the vicinity of the waker."""

        self.movement = None
        self.wander()

        # Don't spawn any more if we're over 20 entities.
        if len(self.location.entities) > 15:
            self.schedule(25)
            return

        x, y = map(int, (self.position[0] / tilesize,
                         self.position[1] / tilesize))
        print "Waker spawning around", x, y
        level = self.location.location.generate()

        for i in range(randint(3, 5)):
            new_zombie = Zombie(self.location)
            x_delta, y_delta = randint(-3, 3), randint(-3, 3)
            while not new_zombie.can_place_at(x + x_delta, y + y_delta,
                                              level[0], level[1]):
                x_delta, y_delta = randint(-3, 3), randint(-3, 3)

            new_zombie.place((x + x_delta) * tilesize,
                             (y + y_delta) * tilesize)
            self.location.entities.append(new_zombie)
            self.location.spawn_entity(new_zombie)

        self.schedule(randint(20, 25))

    def chase(self, guid):
        """We don't want death wakers to chase anyone."""
        return


class FallenAngel(NPC):
    """
    Fallen Angels are dungeon-dwelling characters that spawn in special, rare
    dungeon rooms. They trade weapons for identical weapons with higher levels
    or prefixes.
    """

    def __init__(self, *args, **kwargs):
        super(FallenAngel, self).__init__(*args, **kwargs)
        self.image = "fallen_angel"

        self.health = 10000
        self.prefer_behavior = CHASE

        self.holding_item = "wsw.ancie.50"

        self.messages = ["Give me your weapon and I shall bless it.",
                         "I will bless your weapon, hero, in exchange for "
                         "your blessing.",
                         "I have been here for a very long time.",
                         "I will work towards redemption by aiding you in your "
                         "quest."]

        self.wander()

    def _attacked(self, attack_distance, attacked_by, attacked_with):
        if attack_distance < HURT_DISTANCE:
            self.chase(attacked_by)

