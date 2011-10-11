import random
from threading import Timer
import uuid

import internals.constants as constants
from entities import Animat
from markov import MarkovBot


class NPC(Animat, MarkovBot):
    """A non-playable character."""

    def __init__(self, location, connection):
        super(NPC, self).__init__(location, connection)

        # TODO: If we're not simulating the NPC and we're only using it for,
        # say, harvesting values on the web server, then this shouldn't be
        # fired as part of __init__.
        self.schedule(self._unexpected_time())
        self.image = "npc"

        self.messages = ["Hmmmm...", "So much to do!",
                         "*dumm dumm dee deedlee*"]
        self.chatbot = MarkovBot()
        self.chattering = False
        self.last_chat = ""

    def _unexpected_time(self):
        return random.randint(10, 20)

    def _on_event(self):
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

    def on_chat(self, guid, message, distance):
        if distance <= 10:
            if not self.chattering:
                self.chattering = True
            response = self.chatbot.response(message)
            self.write_chat(response)

            # Train the bot with this bit of conversation.
            if self.last_chat:
                self.chatbot.addRespond(self.last_chat, message)
            self.last_chat = message

