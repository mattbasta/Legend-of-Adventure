package main

import (
	"os"
	"strconv"
)

var server_id = ""

func GetOriginServerID() string {
	if server_id != "" {
		return server_id
	}
	hostname, err := os.Hostname()
	if err != nil {
		hostname = "unknown"
	}
	pid := strconv.Itoa(os.Getpid())
	server_id = hostname + "." + pid
	return server_id
}

type EventType string

// Event types
const (
	// A new entity has entered the region.
	//   Body: Entity description information
	REGION_ENTRANCE EventType = "entr"
	// An entity has left the region.
	//   Body: empty
	REGION_EXIT EventType = "exit"
	// An entity has spawned another entity. An appropriate spawning behavior
	// should be implemented by the client. The Origin is the spawning entity.
	//   Body: New entity information
	SPAWN EventType = "spwn"
	// The Origin entity has died. An appropriate death behavior should be
	// implemented by the client. This event extends `REGION_EXIT`.
	//   Body: empty
	DEATH EventType = "dead"
	// A location and velocity update for an entity.
	//   Body: x y vx vy
	LOCATION EventType = "loca"
	// A property update for an entity.
	//   Body: prop=<json> [\n prop=<json>] ...
	ENTITY_UPDATE EventType = "eupd"
	// A communication between two entities. If the Origin is nil, the message
	// is a console message.
	//   Body: x y body
	CHAT EventType = "chat"
	// An event which signifies damage to nearby entities caused by an entity
	// attack. Damage is to be calculated by those within the radius.
	//   Body: x y radius spread item_code
	//     radius: Radius is tile units of the attack (splash radius)
	//     spread: {0: linear, 1: solid}
	//     item_code: The full code for the item producing the attack
	SPLASH_ATTACK EventType = "satk"
	// An event which signifies damage to a single nearby entity caused by an
	// entity attack. Damage is to be calculated by the attacked.
	//    Body: target_id item_code
	DIRECT_ATTACK EventType = "datk"
	// A sound command. 
	//   Body: sound_id x y radius spread
	//     sound_id: The ID of the sound to play
	//     (other properties are the same as `SPLASH_ATTACK`)
	SOUND EventType = "soun"
	// Inventory update command. The `target_id` entity is expected to collect
	// the item. If the item cannot be given, the target should spawn the item
	// as an entity.
	//   Body: target_id item_code
	GIVE EventType = "give"
)

type Event struct {
	Location     string    // The ID of the region
	Type         EventType // A value from the above entity types
	Origin       string    // The originating entity ID
	OriginServer string    // The originating server ID

	Body string
}

func (self *Event) String() string {
	// XXX: This might someday need to include the location.
	return (string(self.Type) + "\n" +
		self.OriginServer + "::" + self.Origin + "\n" +
		self.Body)
}
