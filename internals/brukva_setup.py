import brukva

import internals.comm as comm
import internals.constants as constants


def setup_brukva(client):
    """Adds the appropriate handlers for a brukva client connection."""

    print "Setting up brukva redis connection..."

    def get_guid(message):
        message_type = message[:3]
        if message_type not in constants.MESSAGES_WITH_GUIDS:
            return None
        return message[3:].split(":", 1)[0]

    def on_notify_location(location, message):
        """
        Handle an inbound message for a location that we're subscribed to.
        """
        guid = get_guid(message)

        if location in comm.locations:
            for client in comm.locations[location]:
                message_type = message[:3]
                if message_type == "giv":
                    if client.guid == guid:
                        client.give_item(message.split(":")[1])
                    continue
                if guid and client.guid == guid:
                    continue
                client.write_message(message)

    def on_enter(message):
        """
        Hande an inbound message for a player that's joining a new location.
        """
        location, client_data = message.split(">", 1)
        guid, foo = client_data.split(":", 1)
        if location in comm.locations:
            for client in comm.locations[location]:
                if client.guid == guid:
                    continue
                client.write_message("add%s" % client_data)

    # Define the different kinds of messages that we can receive.
    channels = {"global::enter": on_enter}

    def on_message(message):
        """Route an inbound message to the proper function."""

        if isinstance(message, brukva.ResponseError):
            print "Encountered Brukva ResponseError"
            print message
            return

        # Subscription and unsubscription messages should be ignored.
        if message.kind != "message":
            return

        if message.channel in channels:
            channels[message.channel](message.body)
        else:
            location, message = message.body.split(">", 1)
            on_notify_location(location, message)

    client.subscribe("global::enter")
    client.listen(on_message)

