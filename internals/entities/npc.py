import random
from threading import Timer
import uuid

import internals.constants as constants
from animat_sprite import AnimatSprite
from entities import Animat
from markov import MarkovBot


class NPC(AnimatSprite, Animat, MarkovBot):
    """A non-playable character."""

    def __init__(self, *args):
        super(NPC, self).__init__(*args)

        self.schedule(self._unexpected_time())
        self.image = "npc"
        self.view = "animat.static.down"
        self.height, self.width = 65, 65
        #self.offset = (-7.5, -65)

        self.messages = ["Hmmmm...", "So much to do!",
                         "*dumm dumm dee deedlee*"]
        self.chattering = False
        self.last_chat = ""

    def get_prefix(self):
        return "@"

    def _unexpected_time(self):
        return random.randint(10, 20)

    def _on_event(self):
        if not self.chattering:
            # TODO: implement a way to reset this. Maybe a timer of some sort?
            message = random.choice(self.messages)
            self.write_chat(message)

        self.schedule(self._unexpected_time())

    def _npc_event(self):
        """
        This method is called when the NPC's scheduled event fires. It should
        be overridden by child classes.
        """
        message = random.choice(self.messages)
        self.write_chat(message)

    def on_chat(self, guid, message, distance=0):
        print "Received chat (%d): %s" % (distance, message)
        if distance <= 10:
            if not self.chattering:
                self.chattering = True
            response = self.response(message)
            self.write_chat(response)

            # Train the bot with this bit of conversation.
            if self.last_chat:
                self.train_response(self.last_chat, message)
            self.last_chat = message

