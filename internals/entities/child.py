import random

from npc import NPC


class Child(NPC):

    def __init__(self, *args):
        super(Child, self).__init__(*args)
        self.messages = ["Na na na na na!", "Hahaha!",
                         "Bet I can run faster than you!"]
        # Choose a random child graphic for the child.
        self.image = "child%d" % random.randint(1, 2)

        self.speed = 1

        # Have the child wander around.
        self.wander()

        self._movement_properties += ("speed", )

    def get_prefix(self):
        return "%chi_"

    def on_player_range(self, guid, distance):
        if distance > 6:
            if guid in self.fleeing:
                self.stop_fleeing(guid)
                if not self.fleeing:
                    self.speed = 1
            return
        if guid.startswith("%bly_"):
            self.speed = 1.1
            self.flee(guid)

