package server

import (
    "log"
    "os"
    "regexp"
    "runtime/pprof"
    "strconv"
    "strings"

    "legend-of-adventure/server/events"
    "legend-of-adventure/server/regions"
)


func sayToPlayer(message string, player *Player) {
    player.Receive() <- player.location.GetEvent(events.CHAT, "0 0\n" + message, nil)
}


func HandleCheat(message string, player *Player) bool {
    if len(message) == 0 || message[0] != '/' {
        return false
    }
    spl := strings.SplitN(message[1:], " ", 2)
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

    case "pan":

        if spl[1] != "sure" {
            sayToPlayer("You must be sure.", player)
            return true
        }

        pprof.Lookup("goroutine").WriteTo(os.Stdout, 1)
        panic("Debug Panic")

    case "hea":
        newHealth, err := strconv.ParseInt(spl[1], 10, 0)
        if err != nil {
            sayToPlayer("Invalid health", player)
            return true
        }
        player.IncrementHealth(int(newHealth) - int(player.GetHealth()))
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

        // If the player is already in the region, don't run sendToLocation
        if telSplit[2] != player.location.ID() {
            parentID, type_, x, y := regions.GetRegionData(telSplit[2])
            player.sendToLocation(parentID, type_, x, y, float64(xPos), float64(yPos))

            // TODO: make sure xPos and yPos are within the region
            // TODO: warn the user if those coords are hitmapped.
        }
        return true

    case "nam":
        if safe, _ := regexp.MatchString("^[a-zA-Z0-9 ]+$", spl[1]); !safe {
            sayToPlayer("Invalid name", player)
            return true
        }
        player.nametag = spl[1]
        player.location.Broadcast(
            player.location.GetEvent(events.ENTITY_UPDATE, player.String(), player),
        )

        player.outbound_raw <- "epuevt:local\n{\"nametag\":\"" + spl[1] + "\"}"
        return true

    case "epu":
        epuSplit := strings.SplitN(spl[1], " ", 2)
        if safe, _ := regexp.MatchString("^[a-zA-Z0-9\\.]+$", epuSplit[0]); !safe {
            sayToPlayer("Invalid entity key", player)
            return true
        }
        if safe, _ := regexp.MatchString("^[a-zA-Z0-9\\._\\-]+$", epuSplit[1]); !safe {
            sayToPlayer("Invalid entity value", player)
            return true
        }
        player.location.Broadcast(
            player.location.GetEvent(
                events.ENTITY_UPDATE,
                "{\"" + epuSplit[0] + "\":\"" + epuSplit[1] + "\"}",
                player,
            ),
        )

        player.outbound_raw <- "epuevt:local\n{\"" + epuSplit[0] + "\":\"" + epuSplit[1] + "\"}"
        return true

    }

    return false
}
