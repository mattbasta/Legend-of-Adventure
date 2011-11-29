from items import WEAPONS, WEAPON_PREFIXES


class Harmable(object):

    def __init__(self, *args, **kwargs):
        super(Harmable, self).__init__(*args, **kwargs)

        self.health = 100

    def harm(self, damage):
        """Harm the entity by an amount of damage."""

        print "%d damage was done to %s" % (damage, self.id)
        self.health -= damage
        if self.health <= 0:
            self.die()

    def harmed_by(self, item):
        """Harm the entity with an item."""
        item_code = item[1:].split(".")
        damage = WEAPON_PREFIXES.index(item_code[1]) / 2 + 1
        damage *= 1 + (int(item_code[2]) - 1) / 10

        self.harm(damage)

    def heal(self, health):
        """Heal the entity with a particular amount of health."""
        self.health = min(self.health + health, 100)

    def die(self):
        """Kill the entity."""

        print "%s has died." % self.id
        self.location.notify_location("die", self.id)
        self.location.destroy_entity(self)

