from child import Child


class Bully(Child):

    def __init__(self, *args):
        super(Bully, self).__init__(*args)
        self.messages = ["Come 'ere, dork!", "What a loser!",
                         "You gonna run home to your mommy?"]
        self.image = "bully"

    def get_prefix(self):
        """We need to postfix the prefix so children know to run away."""
        return "%sbly_" % super(Bully, self).get_prefix()

