import random

from npc import NPC


class Trader(NPC):

    def __init__(self, location, connection):
        super(Trader, self).__init__(location, connection)
        self.messages = ["What're ya buyin?", "Greetings, stranger!",
                         "Come back anytime.",
                         "Got somethin' that might interest ya. Heh heh heh!"]

