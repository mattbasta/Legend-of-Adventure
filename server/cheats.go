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
    case "hea":
        newHealth, err := strconv.ParseUint(spl[1], 10, 0)
        if err != nil {
            sayToPlayer("Invalid health", player)
        }
        player.IncrementHealth(uint(newHealth) - player.GetHealth())
        sayToPlayer("Updating health to " + strconv.Itoa(int(newHealth)), player)
        return true
    }

    return false
}
