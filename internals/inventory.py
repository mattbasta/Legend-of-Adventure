
class InventoryManager(object):

    def __init__(self, *args):
        super(InventoryManager, self).__init__(*args)

        self.inventory = {}

    def registered(self):
        self.inventory[0] = "wsw.sharp.12"
        self.inventory[1] = "f5"
        self.update_inventory()

    def give_item(self, item_code):
        """Give an item with code `item_code` to this manager."""
        if self.inventory_full():
            return False

        for i in range(5):
            if i in self.inventory:
                continue
            self.inventory[i] = item_code
            self.update_inventory(i, item_code)
            return True

    def use_item(self, slot):
        slot = int(slot)
        if slot not in self.inventory:
            return

        item = self.inventory[slot]
        self.write_message("chaitem daemon\nUsed %s" % item)

    def inventory_full(self):
        """Returns whether the inventory is full."""
        return len(self.inventory) == 5

    def update_inventory(self, slot=None):
        def get_line(slot):
            if slot not in self.inventory:
                return
            return "%d:%s" % (slot, self.inventory[slot])
        if slot:
            self.write_message("inv%s" % get_line(slot))
        else:
            message = filter(None, map(get_line, range(5)))
            self.write_message("inv%s" % "\n".join(message))


