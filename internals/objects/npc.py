import json
import random
from threading import Timer
import uuid


class NPC(object):
    """A non-playable character."""

    def __init__(self, scene, position, image_data):
        self.set_timer()
        self.scene = scene
        self.position = position
        self.image = image_data
        self.id = uuid.uuid4().hex

    def set_timer(self):
        self.timer = Timer(self._unexpected_time(), self.event)
        self.timer.start()

    def _unexpected_time(self):
        return random.randint(10, 20)

    def event(self):
        from internals.comm import CommHandler
        CommHandler.notify_scene(self.scene, "chanpc:Hello!")
        if self.scene in CommHandler.scenes:
            for client in CommHandler.scenes[self.scene]:
                pass
        self.set_timer()

    def __str__(self):
        """Convert the NPC to the serialized JSON format."""
        return json.dumps({"x": self.position[0],
                           "y": self.position[1],
                           "movement": {"type": "static"},
                           "image": self.image})

