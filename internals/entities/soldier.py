import random

from npc import NPC
from sentient import CHASE


class Soldier(NPC):

    def __init__(self, *args):
        super(Soldier, self).__init__(*args)
        self.disable_chatbot = True
        self.talking = False
        self.image = "soldier%d" % random.randint(1, 3)

        self.speed = 1.25

        self.health = 75
        self.prefer_behavior = CHASE

    def _attacked(self, attack_distance, attacked_by, attacked_with):
        """Always attack any attacker."""
        super(Soldier, self)._attacked(attack_distance, attacked_by, attacked_with)
        self.chase(attacked_by)

    def get_placeable_locations(self, grid, hitmap):
        """
        Return a list of acceptable coordinates to place the soldier at. We
        can place them on plazas and sidewalks.
        """
        street_locations = []
        for y in range(len(grid)):
            for x in range(len(grid[y])):
                if grid[y][x] in (131, 96, ):
                    street_locations.append((x, y))
        return street_locations

