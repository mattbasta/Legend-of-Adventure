import random
from threading import Timer
import uuid

import internals.constants as constants
from entities import Animat
from markov import MarkovBot


class NPC(Animat, MarkovBot):
    """A non-playable character."""

    def __init__(self, *args):
        super(NPC, self).__init__(*args)

        self.schedule(self._unexpected_time())
        self.image = "npc"
        self.view = "npc.static.down"
        self.height, self.width = 65, 65

        self.messages = ["Hmmmm...", "So much to do!",
                         "*dumm dumm dee deedlee*"]
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

    def _get_properties(self):
        baseline = super(NPC, self)._get_properties()
        baseline["view"] = self.view
        baseline["image"] = self.image
        return baseline

    def move(self, x_vel, y_vel):
        """Start the npc moving in any direction, or stop it from moving."""
        changed = x_vel != self.velocity[0] or y_vel != self.velocity[1]
        if not changed:
            return

        old_velocity = self.velocity
        self.velocity = [x_vel, y_vel]
        self.layer = 1 if x_vel or y_vel else 0

        views = {(1, 0): "npc.%s.right",
                 (1, 1): "npc.%s.right",
                 (0, 1): "npc.%s.down",
                 (-1, 1): "npc.%s.left",
                 (-1, 0): "npc.%s.left",
                 (-1, -1): "npc.%s.left",
                 (0, -1): "npc.%s.up",
                 (1, -1): "npc.%s.right"}

        if any(self.velocity):
            self.view = views[tuple(self.velocity)] % "spr"
        elif any(old_velocity):
            self.view = views[tuple(old_velocity)] % "static"

        self.broadcast_changes("x_vel", "y_vel", "layer", "view")

