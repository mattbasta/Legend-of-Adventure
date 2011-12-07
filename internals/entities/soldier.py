import random

from internals.constants import HURT_DISTANCE
from npc import NPC
from sentient import CHASE


PLACEABLE_LOCATIONS = (131, 96, )


class Soldier(NPC):

    def __init__(self, *args, **kwargs):
        super(Soldier, self).__init__(*args, **kwargs)
        self.disable_chatbot = True
        self.talking = False
        self.image = "soldier%d" % random.randint(1, 3)

        self.speed = 1.25

        self.health = 75
        self.prefer_behavior = CHASE

        self._chase_queue = []

        self.holding_item = "wsw.forged.70"
        self.does_attack = True

        self.messages = ["Get back here, criminal!",
                         "We don't take kindly to your type around here!",
                         "Get out of our town!"]

    def get_prefix(self):
        return "%ssoldier_" % super(Soldier, self).get_prefix()

    def _get_unexpected_time(self):
        return random.randint(2, 4)

    def _attacked(self, attack_distance, attacked_by, attacked_with):
        """Always attack any attacker."""
        if attacked_by.startswith(self.get_prefix()):
            return
        super(Soldier, self)._attacked(attack_distance, attacked_by,
                                       attacked_with)

        # If we're already chasing someone, fight off the person that's now
        # attacking us.
        if attack_distance < HURT_DISTANCE and self.chasing != attacked_by:
            self._chase_queue.insert(0, self.chasing)
            self.chasing = None

        self.chase(attacked_by)

    def can_place_at(self, x, y, grid, hitmap):
        return grid[y][x] in PLACEABLE_LOCATIONS

    def get_placeable_locations(self, grid, hitmap):
        """
        Return a list of acceptable coordinates to place the soldier at. We
        can place them on plazas and sidewalks.
        """
        street_locations = []
        for y in range(len(grid)):
            for x in range(len(grid[y])):
                if grid[y][x] in PLACEABLE_LOCATIONS:
                    street_locations.append((x, y))
        return street_locations

    def chase(self, guid):
        if self.chasing == guid or guid in self._chase_queue:
            return

        if self.chasing:
            self._chase_queue.append(guid)
        else:
            super(Soldier, self).chase(guid)

        if self.chasing:
            print "Soldier set to talk"
            self.talking = True

    def forget(self, guid):
        if guid in self._chase_queue:
            self._chase_queue.remove(guid)
        elif self.chasing == guid:
            self.chasing = None
            if self._chase_queue:
                # Pop the first element in the chase queue and start chasing it.
                to_chase = self._chase_queue[0]
                self._chase_queue = self._chase_queue[1:]
                self.chase(to_chase)

        super(Soldier, self).forget(guid)

        if not self.chasing:
            print "Soldier set to silent"
            self.talking = False

