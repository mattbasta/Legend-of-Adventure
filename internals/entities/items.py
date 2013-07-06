from entities import Entity


class ItemEntity(Entity):

    def __init__(self, item_code, x, y, *args):
        super(ItemEntity, self).__init__(*args)

        self.position = x, y
        self.height, self.width = 40, 40

        self.item_code = item_code

    def get_prefix(self):
        return "!!"

    def on_player_range(self, guid, distance):
        if distance >= 1 or guid.startswith("%"):
            return

        # Give thine self to a nearby entity/player.
        self.location.notify_location("giv", "%s:%s" % (guid, self.item_code))

        # Destroy thine self.
        self.location.destroy_entity(self)

    def _get_properties(self):
        weapon = self.item_code.startswith("w")
        sprite_x = 5 * 24 if weapon else 0
        if not weapon:
            code = int(self.item_code[1:])
            sprite_x += code % 5 * 24
            sprite_y = int(code / 5) * 24
        else:
            weapon, prefix, level = self.item_code[1:].split(".")
            sprite_y = WEAPONS.index(weapon) * 24
            sprite_x = WEAPON_PREFIXES.index(prefix) * 24 + 120

        base = super(ItemEntity, self)._get_properties()
        base.update({
            "image": "items",
            "layer": 3,
            "view": {
                "type": "static",
                "sprite": {
                    "x": sprite_x,
                    "y": sprite_y,
                    "swidth": 24,
                    "sheight": 24,
                },
            },
            "movement": {
                "type": "callback",
                "callback": "item_hover",
            }
        })
        return base
