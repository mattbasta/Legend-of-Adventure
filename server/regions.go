package main

import (
	"log"
	"strconv"
	"time"
)

const (
	WORLD_OVERWORLD  = "overworld"
	WORLD_MIRROR     = "mirror"
	WORLD_UNDERWORLD = "underworld"
)

var regionCache = make(map[string]*Region)

func getRegionID(world string, x int, y int) {
	return world + ":" + strconv.Itoa(x) + ":" + strconv.Itoa(y)
}

func GetRegion(world string, x int, y int) *Region {
	regionID := getRegionID(world, x, y)
	reg, ok := regionCache[regionID]
	if ok {
		return reg
	}

	// FIXME: There might be a very slim race condition here, where two
	// clients can create a new region simultaneously.
	reg = new(Region)
	regionCache[regionID] = reg
	reg.World = world
	reg.X = x
	reg.Y = y
	reg.killer = make(chan bool)
	reg.doTTL()

	reg.terrain = new(Terrain)
	// TODO: Do level building here

	reg.entities = make([]*Entity, 0, 32)

	return reg
}

type Region struct {
	World string
	X, Y  int

	// Bits and pieces to clean up the region.
	KeepAlive chan bool
	killer    chan bool

	terrain  *Terrain
	entities []*Entity
}

func (self *Region) Broadcast(evt *Event, except string) {
	for _, entity := range self.entities {
		if except != "" && (*entity).ID() == except {
			continue
		}
		(*entity).Receive() <- evt
	}
}

func (self *Region) doTTL() {
	self.KeepAlive = make(chan bool)
	go func(self *Region) {
		for {
			select {
			case <-self.keepAlive:
				log.Println("Keeping region " + self.ID() + " alive.")
			case <-time.After(2 * time.Minute):
				// Remove references to the region from the region cache.
				delete(regionCache, self.ID())
				// Tell the entities that are listening that they need to clean up.
				self.killer <- true

				log.Println("Region " + self.ID() + " timed out.")
				return
			}
		}
	}(self)
}

func (self Region) ID() string {
	return getRegionID(self.World, self.X, self.Y)
}

func (self *Region) GetEvent(evt_type EventType, body string, origin Entity) *Event {
	str_origin := ""
	if origin != nil {
		str_origin = origin.ID()
	}

	return &Event{self.ID(), evt_type, str_origin, GetOriginServerID(), body}
}

func (self *Region) AddEntity(entity *Entity) {
	append(self.entities, entity)
	entity.Killer(self.killer)
}
