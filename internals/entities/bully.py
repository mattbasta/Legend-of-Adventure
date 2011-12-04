from child import Child


class Bully(Child):

    def __init__(self, *args):
        super(Bully, self).__init__(*args)
        self.messages = ["Come 'ere, dork!", "What a loser!",
                         "You gonna run home to your mommy?"]
        self.image = "bully"

        self.speed = 1

    def get_prefix(self):
        """We need to postfix the prefix so children know to run away."""
        return "%bly_"

    def on_player_range(self, guid, distance):
        """Find and chase children."""
        if not guid.startswith("%chi_"):
            return

        if (not self.chasing or
            self.remembered_distances[guid] <
                self.remembered_distances[self.chasing]):
            self.chase(guid)

