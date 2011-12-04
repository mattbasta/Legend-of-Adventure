from random import randint

from items import WEAPONS, WEAPON_PREFIXES


class Harmable(object):
    """
    A harmable entity is an entity that is both capable of taking damage and
    dying.
    """

    def __init__(self, *args, **kwargs):
        super(Harmable, self).__init__(*args, **kwargs)

        self.dead = False  # Used for debugging
        self.health = 100
        self.max_health = self.health

    def harm(self, damage):
        """Harm the entity by an amount of damage."""

        print "%d damage was done to %s" % (damage, self.id)
        self.health -= damage
        if self.health <= 0:
            self.die()

    def harmed_by(self, item):
        """Harm the entity with an item."""
        if not item:
            self.harm(2)
            return

        item_code = item[1:].split(".")
        damage = WEAPON_PREFIXES.index(item_code[1]) / 2 + 1
        damage *= 1 + (int(item_code[2]) - 1) / 10

        self.harm(damage)

    def heal(self, health):
        """Heal the entity with a particular amount of health."""
        self.health = min(self.health + health, 100)

    def die(self):
        """Kill the entity."""

        self.dead = True

        print "%s has died." % self.id
        self.location.notify_location("die", self.id)
        self.location.destroy_entity(self)
        for entity in self.location.entities:
            entity.forget(self.id)

        for item_code in self.get_drops():
            code = ("%s:%s:%d:%d" % (self.id, item_code,
                                     self.position[0] + randint(-3, 3),
                                     self.position[1] + randint(-3, 3)))
            self.location.spawn_drop(code)

    def get_drops(self):
        """
        Return an iterable of item codes that the entity should drop on death.
        """
        return []

