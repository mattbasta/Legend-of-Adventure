import json
import math
import random
from threading import Timer
import uuid

import internals.constants as constants


messages = ["Adventure....away!!!",
            "Haldo!",
            "I can tell your fortune for only 5 cents!"]

class NPC(object):
    """A non-playable character."""

    def __init__(self, scene, position, image_data):
        self.set_timer()
        self.scene = scene
        self.position = map(lambda p: p * constants.tilesize, position)
        self.image = image_data
        self.id = uuid.uuid4().hex

    def set_timer(self):
        self.timer = Timer(self._unexpected_time(), self.event)
        self.timer.start()

    def _unexpected_time(self):
        return random.randint(10, 20)

    def event(self):
        from internals.comm import CommHandler
        message = random.choice(messages)
        message = "<span>Stranger:</span> %s" % message

        if self.scene in CommHandler.scenes:
            for client in CommHandler.scenes[self.scene]:
                if self.within_range(client.position[0], client.position[1]):
                    client.write_message("chanpc\n%s" % message)

        self.set_timer()

    def within_range(self, x, y):
        radius = 10
        radius *= constants.tilesize
        x2, y2 = self.position[0] - x, self.position[1] - y
        distance = math.sqrt(x2 * x2 + y2 * y2)
        return distance <= radius

    def __str__(self):
        """Convert the NPC to the serialized JSON format."""
        return json.dumps({"x": self.position[0] / constants.tilesize,
                           "y": self.position[1] / constants.tilesize,
                           "movement": {"type": "static"},
                           "image": self.image})

