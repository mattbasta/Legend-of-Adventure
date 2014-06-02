package server

import (
    "log"
    "strconv"
    "strings"
)


func sayToPlayer(message string, player *Player) {
    player.Receive() <- player.location.GetEvent(CHAT, "0 0\n" + message, nil)
}


func HandleCheat(message string, player *Player) bool {
    spl := strings.Split(message, " ")
    // All command have at least two components.
    if len(spl) < 2 {
        return false
    }
    // All commands must start with a three-letter directive.
    if len(spl[0]) != 3 {
        return false
    }

    log.Println("Reading cheat code '" + spl[0] + "' with body '" + spl[1] + "'")

    switch spl[0] {
    case "get":

        switch spl[1] {
        case "#health":
            sayToPlayer(strconv.Itoa(int(player.GetHealth())), player)
            return true
        }

    case "hea":
        newHealth, err := strconv.ParseUint(spl[1], 10, 0)
        if err != nil {
            sayToPlayer("Invalid health", player)
            return true
        }
        player.IncrementHealth(uint(newHealth) - player.GetHealth())
        sayToPlayer("Updating health to " + strconv.Itoa(int(player.GetHealth())), player)
        return true

    case "giv":
        if player.inventory.IsFull() {
            sayToPlayer("Your inventory is full.", player)
            return true
        }

        ok, slot := player.inventory.Give(spl[1])
        if !ok {
            sayToPlayer("Item could not be given", player)
        } else {
            sayToPlayer("Item is in slot " + strconv.Itoa(slot), player)
            player.updateInventory()
        }
        return true
    }

    return false
}
