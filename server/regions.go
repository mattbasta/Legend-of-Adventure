package server

import (
	"log"
	"strconv"
	"strings"
	"time"

	"legend-of-adventure/server/terrain"
)

// Region IDs should be structured like this:
//     parent:type x y
// parent: The ID of the parent or the name of the world
// type: The type of area that the region is
// x: The X coordinate of the area
// y: The Y coordinate of the area
// Examples:
//     overworld,field:0:0
//     overworld,field:0:0,house0 1 0
//     overworld,field:123:456,dungeon:0:0
//     overworld,field:123:456,dungeon:2:3,dungeon:1:1
//     overworld,field:123:456,dungeon:2:3,dungeon:1:1

type regionRequest struct {
	ID       string
	Receiver chan *Region
}

var regionCache = make(map[string]*Region)
var regionGetter = make(chan regionRequest, 64)
var startedRegionGetter = false

func startRegionGetter() {
	startedRegionGetter = true
	go func() {
		for {
			select {
			case request := <-regionGetter:
				parent, regType, x, y := GetRegionData(request.ID)
				reg := new(Region)
				reg.ParentID = parent
				reg.Type = regType
				reg.X = x
				reg.Y = y
				reg.killer = make(chan bool)
				reg.doTTL()

				reg.entities = make([]*Entity, 0, 32)
				reg.terrain = terrain.Get(reg)

				if reg.IsTown() {
					terrain.ApplyTown(reg.terrain)
				} else if reg.IsDungeonEntrance() {
					terrain.ApplyDungeonEntrance(reg.terrain)
				} else if reg.Type == terrain.REGIONTYPE_DUNGEON {
					terrain.ApplyDungeon(parent, reg.terrain)
				}

				regionCache[request.ID] = reg

				request.Receiver <- reg
			}
		}
	}()
}

func getRegionID(parent, regType string, x, y int) string {
	return parent + "," + regType + ":" + strconv.Itoa(x) + ":" + strconv.Itoa(y)
}
func GetRegionData(ID string) (string, string, int, int) {
	parentSplit := strings.Split(ID, ",")
	if len(parentSplit) < 2 {
		return terrain.WORLD_OVERWORLD, terrain.REGIONTYPE_FIELD, 0, 0
	}
	regSplit := strings.Split(parentSplit[len(parentSplit) - 1], ":")
	if len(regSplit) != 3 {
		return terrain.WORLD_OVERWORLD, terrain.REGIONTYPE_FIELD, 0, 0
	}
	parent := strings.Join(parentSplit[:len(parentSplit) - 1], ",")
	x, _ := strconv.ParseInt(regSplit[1], 10, 0)
	y, _ := strconv.ParseInt(regSplit[2], 10, 0)
	return parent, regSplit[0], int(x), int(y)
}

func GetRegion(parent, regType string, x, y int) *Region {
	if !startedRegionGetter {
		startRegionGetter()
	}

	regionID := getRegionID(parent, regType, x, y)

	if !IsValidRegionID(regionID) {
		log.Println("Invalid region ID requested: " + regionID)
		return nil
	}

	if reg, ok := regionCache[regionID]; ok {
		return reg
	}

	responseChan := make(chan *Region, 1)
	request := regionRequest{
		regionID,
		responseChan,
	}
	regionGetter <- request

	return <-responseChan
}

type Region struct {
	ParentID string
	Type     string
	X, Y     int

	// Bits and pieces to clean up the region.
	KeepAlive chan bool
	killer    chan bool

	terrain  *terrain.Terrain
	entities []*Entity
}

func (self *Region) Broadcast(evt *Event, except string) {
	for _, entity := range self.entities {
		if (*entity).ID() == except {
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
			case <-self.KeepAlive:
				log.Println("Keeping region " + self.ID() + " alive.")

			case <-time.After(2 * time.Minute):
				log.Println("Region " + self.ID() + " timed out.")
				// Remove references to the region from the region cache.
				delete(regionCache, self.ID())
				// Tell the entities that are listening that they need to clean up.
				self.killer <- true
				close(self.KeepAlive)

				return
			}
		}
	}(self)
}

func (self Region) ID() string {
	return getRegionID(self.ParentID, self.Type, self.X, self.Y)
}

func (self *Region) GetEvent(evt_type EventType, body string, origin Entity) *Event {
	str_origin := ""
	if origin != nil {
		str_origin = origin.ID()
	}

	return &Event{self.ID(), evt_type, str_origin, GetOriginServerID(), body}
}

func (self *Region) AddEntity(entity Entity) {
	entity.Killer(self.killer)

	// Tell everyone else that the entity is here.
	self.Broadcast(
		self.GetEvent(REGION_ENTRANCE, entity.GetIntroduction(), entity),
		entity.ID(),
	)

	// Tell the entity about everyone else.
	for _, regEnt := range self.entities {
		entity.Receive() <- self.GetEvent(REGION_ENTRANCE, (*regEnt).GetIntroduction(), *regEnt)
	}

	// Add the entity to the list of entities.
	self.entities = append(self.entities, &entity)

}

func (self *Region) RemoveEntity(entity Entity) {
	entity.Killer(self.killer)

	// Tell everyone else that the entity is leaving.
	self.Broadcast(
		self.GetEvent(REGION_EXIT, entity.ID(), entity),
		entity.ID(),
	)

	// Find the entity
	location := -1
	for i, e := range self.entities {
		if *e == entity {
			location = i
			break
		}
	}

	if location == -1 {
		log.Println("Could not find entity to remove!")
		return
	}

	// ...and remove it
	self.entities = append(self.entities[:location], self.entities[location+1:]...)

}

func (self *Region) String() string {
	tileset := terrain.GetTileset(self.GetRoot(), self.GetType())
	return self.terrain.String() + ", \"tileset\": \"" + tileset + "\", \"can_slide\": true"
}

func (self Region) GetRoot() string {
	parent := self.ParentID
	for parent != terrain.WORLD_OVERWORLD && parent != terrain.WORLD_ETHER {
		parent, _, _, _ = GetRegionData(parent)
	}
	return parent
}

func (self Region) GetParent() string {
	return self.ParentID
}

func (self Region) GetType() string {
	return self.Type
}

func (self Region) GetX() int {
	return self.X
}

func (self Region) GetY() int {
	return self.Y
}

func (self Region) IsTown() bool {
	if self.ParentID != terrain.WORLD_OVERWORLD &&
		self.ParentID != terrain.WORLD_ETHER &&
		self.Type != terrain.REGIONTYPE_FIELD {
		return false
	}
	return isTownPos(self.X, self.Y)
}

func isTownPos(x, y int) bool {
	// Always force spawn to be a town.
	if x == 0 && y == 0 {
		return true
	}
	return false
}

func (self Region) IsDungeonEntrance() bool {
	if self.ParentID != terrain.WORLD_OVERWORLD && self.ParentID != terrain.WORLD_ETHER {
		return false
	}
	return isDungeonPos(self.X, self.Y)
}

func isDungeonPos(x, y int) bool {
	// Always force 1 0 to be a dungeon.
	if x == 1 && y == 0 {
		return true
	}
	return false
}

func IsValidRegionID(ID string) bool {
	parent, regType, _, _ := GetRegionData(ID)
	if parent == terrain.WORLD_OVERWORLD || parent == terrain.WORLD_ETHER {
		return regType == terrain.REGIONTYPE_FIELD
	}

	if !IsValidRegionID(parent) {
		return false
	}

	_, parentType, parentX, parentY := GetRegionData(parent)

	if regType == terrain.REGIONTYPE_DUNGEON {
		return (parentType == terrain.REGIONTYPE_DUNGEON ||
			parentType == terrain.REGIONTYPE_FIELD && isDungeonPos(parentX, parentY))
	}
	if regType == terrain.REGIONTYPE_FIELD {
		return parentType == terrain.WORLD_OVERWORLD || parentType == terrain.WORLD_ETHER
	}

	return true
}
