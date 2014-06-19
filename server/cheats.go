package server

import (
    "fmt"
    "log"
    "strconv"
    "strings"

    "legend-of-adventure/server/events"
    "legend-of-adventure/server/regions"
)


func sayToPlayer(message string, player *Player) {
    player.Receive() <- player.location.GetEvent(events.CHAT, "0 0\n" + message, nil)
}


func HandleCheat(message string, player *Player) bool {
    spl := strings.SplitN(message, " ", 2)
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
            player.UpdateInventory()
        }
        return true

    case "tel":
        telSplit := strings.SplitN(spl[1], " ", 3)

        xPos, err := strconv.ParseUint(telSplit[0], 10, 0)
        if err != nil {
            return false
        }
        yPos, err := strconv.ParseUint(telSplit[1], 10, 0)
        if err != nil {
            return false
        }

        player.x = float64(xPos)
        player.y = float64(yPos)
        player.velX = 0
        player.velY = 0
        player.dirX = 0
        player.dirY = 0

        player.outbound_raw <- (
            "eup{\"id\":\"local\"," +
            fmt.Sprintf("\"x\":%d,\"y\":%d", int(xPos), int(yPos)) +
            "}")

        // If the player is already in the region, don't run sendToLocation
        if telSplit[2] != player.location.ID() {
            parentID, type_, x, y := regions.GetRegionData(telSplit[2])
            player.sendToLocation(parentID, type_, x, y)

            // TODO: make sure xPos and yPos are within the region
            // TODO: warn the user if those coords are hitmapped.
        }
        return true

    }

    return false
}
