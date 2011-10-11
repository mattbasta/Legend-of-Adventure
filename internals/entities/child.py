import random

from npc import NPC


class Child(NPC):

    def __init__(self, location, connection):
        super(Child, self).__init__(location, connection)
        self.messages = ["Na na na na na!", "Hahaha!",
                         "Bet I can run faster than you!"]
        # Choose a random child graphic for the child.
        self.image = "child%d" % random.randint(1, 2)

