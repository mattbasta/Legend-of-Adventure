import uuid


class Entity(object):

    def __init__(self, location, coordinates):
        self.id = uuid.uuid4().hex
        self.x, self.y = coordinates

