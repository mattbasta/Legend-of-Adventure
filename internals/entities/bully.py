from child import Child


class Bully(Child):

    def __init__(self, location, connection):
        super(Bully, self).__init__(location, connection)
        self.messages = ["Come 'ere, dork!", "What a loser!",
                         "You gonna run home to your mommy?"]
        self.image = "bully"

