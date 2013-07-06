import random

from npc import NPC


HOMELY_IMAGES = ["old_woman1", "old_woman2", "homely1", "homely2"]

class Homely(NPC):

    def __init__(self, *args):
        super(Homely, self).__init__(*args)
        self.talking = False
        self.image = random.choice(HOMELY_IMAGES)

        self.speed = 0.7

        self.health = 30

        self.wander()
