package events

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
	REGION_ENTRANCE        EventType = "add"
	// An entity has left the region.
	//   Body: empty
	REGION_EXIT EventType = "del"
	// An entity has spawned another entity. An appropriate spawning behavior
	// should be implemented by the client. The Origin is the spawning entity.
	//   Body: New entity information
	SPAWN EventType = "spn"
	// The Origin entity has died. An appropriate death behavior should be
	// implemented by the client. This event extends `REGION_EXIT`.
	//   Body: empty
	DEATH EventType = "ded"
	// A property update for an entity.
	ENTITY_UPDATE EventType = "epu"
	// A communication between two entities. If the Origin is nil, the message
	// is a console message.
	//   Body: x y body
	CHAT EventType = "cha"
	// An event which signifies damage to nearby entities caused by an entity
	// attack. Damage is to be calculated by those within the radius.
	//   Body: x y radius spread item_code
	//     radius: Radius is tile units of the attack (splash radius)
	//     spread: {0: linear, 1: solid}
	//     item_code: The full code for the item producing the attack
	SPLASH_ATTACK EventType = "sak"
	// An event which signifies damage to a single point caused by an entity
	// attack. Damage is to be calculated by the attacked.
	//    Body: x y item_code
	DIRECT_ATTACK EventType = "dak"
	// A sound command.
	//   Body: sound_id:x:y
	//     sound_id: The ID of the sound to play
	//     (other properties are the same as `SPLASH_ATTACK`)
	SOUND EventType = "snd"
	// Inventory update command. The `target_id` entity is expected to collect
	// the item. If the item cannot be given, the target should spawn the item
	// as an entity.
	//   Body: target_id item_code
	GIVE EventType = "giv"
	// Particle spawn command.
	//   Body: x y color diameter ticks constructor[ entity][\n ...]
	PARTICLE EventType = "par"
	// Particle macro command.
	//   Body: x y macro repeat[ entity][\n ...]
	PARTICLE_MACRO EventType = "pma"
	// Effect set command
	//   Body: <effect name>
	EFFECT EventType = "efx"
	// Effect set command
	EFFECT_CLEAR EventType = "efc"
)

type Event struct {
	Location     string    // The ID of the region
	Type         EventType // A value from the above entity types
	Origin       string    // The originating entity ID

	Body string
}

func (self *Event) String() string {
	// XXX: This might someday need to include the location.
	return (
		string(self.Type) + "evt:" +
		self.Origin + "\n" +
		self.Body)
}


func GetType(event string) EventType {
	return EventType(event)
}
