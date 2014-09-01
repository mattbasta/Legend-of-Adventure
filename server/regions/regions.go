package regions

import (
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"legend-of-adventure/server/entities"
	"legend-of-adventure/server/events"
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
				reg.killer = make(chan bool, 1)
				reg.doTTL()

				reg.entities = make([]*entities.Entity, 0, 32)
				reg.Terrain = terrain.Get(reg)

				if reg.IsTown() {
					terrain.ApplyTown(reg.Terrain)

				} else if reg.IsDungeonEntrance() {
					terrain.ApplyDungeonEntrance(reg.Terrain)

				} else if reg.Type == terrain.REGIONTYPE_DUNGEON {
					terrain.ApplyDungeon(parent, reg.Terrain)

				} else if terrain.IsBuildingType(reg.Type) {
					terrain.ApplyBuildingInterior(reg.Terrain, reg.Type, parent)
				}

				reg.PopulateEntities();

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

	Terrain  *terrain.Terrain
	entities []*entities.Entity
}

func (self *Region) Broadcast(evt *events.Event) {
	for _, entity := range self.entities {
		if (*entity).ID() == evt.Origin {
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

func (self *Region) GetEvent(evt_type events.EventType, body string, origin entities.Entity) *events.Event {
	str_origin := ""
	if origin != nil {
		str_origin = origin.ID()
	}

	return &events.Event{self.ID(), evt_type, str_origin, body}
}

func (self *Region) AddEntity(entity entities.Entity) {
	entity.Killer(self.killer)

	// Add the entity to the list of entities.
	self.entities = append(self.entities, &entity)

	// Tell everyone else that the entity is here.
	x, y := entity.BlockingPosition()
	self.Broadcast(
		self.GetEvent(
			events.REGION_ENTRANCE,
			fmt.Sprintf(
				"%s\n%f %f",
				entity.BlockingString(),
				x, y,
			),
			entity,
		),
	)

	// Tell the entity about everyone else.
	for _, regEnt := range self.entities {
		if regEnt == &entity { continue }

		x, y := (*regEnt).BlockingPosition()
		entity.Receive() <- self.GetEvent(
			events.REGION_ENTRANCE,
			fmt.Sprintf(
				"%s\n%f %f",
				<-((*regEnt).String()),
				x, y,
			),
			*regEnt,
		)
	}

}

func (self *Region) RemoveEntity(entity entities.Entity) {
	entity.Killer(self.killer)

	// Tell everyone else that the entity is leaving.
	self.Broadcast(self.GetEvent(events.REGION_EXIT, entity.ID(), entity))

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
	return self.Terrain.String() + ", \"tileset\": \"" + tileset + "\", \"can_slide\": true"
}

func (self Region) GetRoot() string {
	parent := self.ParentID
	for parent != terrain.WORLD_OVERWORLD && parent != terrain.WORLD_ETHER {
		parent, _, _, _ = GetRegionData(parent)
	}
	return parent
}

func (self Region) GetTerrain() *terrain.Terrain {
	return self.Terrain
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

func (self Region) GetEntity(ID string) entities.Entity {
	for _, entity := range self.entities {
		if (*entity).ID() == ID {
			return *entity
		}
	}
	return nil
}

func (self *Region) PopulateEntities() {
	rng := terrain.GetCoordRNG(float64(self.X), float64(self.Y))

	placeEntity := func(entType string) {
		// TODO: Find a way to figure this out.
		entW, entH := 1.0, 1.0
		for {
			x := rng.Float64() * float64(self.Terrain.Width - 2 - uint(entW)) + 1
			y := rng.Float64() * float64(self.Terrain.Height - 2 - uint(entH)) + 1 + entH
			if !self.Terrain.Hitmap.Fits(x, y, entW, entH) { continue }
			self.Spawn(entType, x, y)
			return
		}
	}

	switch self.Type {
	case terrain.REGIONTYPE_FIELD:
		entCount := rng.Intn(MAX_ENTITIES_PER_FIELD)
		for i := 0; i < entCount; i++ {
			var entType string
			if i % WOLF_ODDS == 0 {
				entType = "wolf"
			} else {
				entType = "sheep"
			}
			placeEntity(entType)
		}

		if self.IsTown() {
			soldierCount := rng.Intn(MAX_SOLDIERS_PER_TOWN - MIN_SOLDIERS_PER_TOWN) + MIN_SOLDIERS_PER_TOWN
			for i := 0; i < soldierCount; i++ {
				placeEntity("soldier")
			}

			placeEntity("bully")
			placeEntity("child")
			placeEntity("child")
			placeEntity("child")

			// placeEntity("trader")

			// self.Spawn("test", 50, 50)
		}

	case terrain.REGIONTYPE_SHOP:
		placeEntity("homely")
		placeEntity("homely")

		fallthrough
	case terrain.REGIONTYPE_HOUSE:
		placeEntity("homely")
		placeEntity("homely")

		if rng.Intn(SOLDIER_IN_HOUSE_ODDS) == 0 {
			placeEntity("soldier")
		}
		if rng.Intn(TRADER_IN_HOUSE_ODDS) == 0 {
			placeEntity("trader")
		}

		totalTiles := self.Terrain.Width * self.Terrain.Height
		for i := uint(0); i < totalTiles; i++ {
			tile := self.Terrain.Tiles[i % self.Terrain.Height][i / self.Terrain.Width]
			if tile != 58 { continue }

			chest := entities.NewChestEntity(self, float64(i / self.Terrain.Width), float64(i % self.Terrain.Height) + 1.25)
			self.AddEntity(chest)

			items := rng.Intn(MAX_ITEMS_PER_SHOP_CHEST - MIN_ITEMS_PER_SHOP_CHEST) + MIN_ITEMS_PER_SHOP_CHEST
			for j := 0; j < items; j++ {
				var code string
				if rng.Intn(10) < ODDS_SHOP_CHEST_SWORD {
					code = fmt.Sprintf(
						"wsw.%s.%d",
						entities.WEAPON_RAW_PREFIXES[rng.Intn(len(entities.WEAPON_RAW_PREFIXES))],
						rng.Intn(SHOP_CHEST_SWORD_MAX_LEV),
					)
				} else {
					var idx int
					if rng.Intn(10) < ODDS_SHOP_CHEST_POTION {
						code = "p"
						idx = rng.Intn(10)
					} else {
						code = "f"
						idx = rng.Intn(9)
					}
					code = fmt.Sprintf("%s%d", code, idx)
				}
				log.Println("Adding " + code + " to a chest")
				chest.AddItem(code)
			}
		}

	case terrain.REGIONTYPE_DUNGEON:
		entCount := rng.Intn(MAX_ENTITIES_PER_DUNGEON)
		for i := 0; i < entCount; i++ {
			var entType string
			if i % DEATH_WAKER_ODDS == 0 {
				entType = "zombie"
			} else {
				entType = "death_waker"
			}
			placeEntity(entType)
		}
	}

}

func (self *Region) Spawn(entType string, x, y float64) {
	ent := entities.NewVirtualEntity(entType)
	ent.SetLocation(self)
	ent.SetPosition(x, y)
	self.AddEntity(ent)
}


// Helper Methods:

func isTownPos(x, y int) bool {
	// Always force spawn to be a town.
	return x == 0 && y == 0 || terrain.GetCoordOption(x, y, ODDS_TOWN)
}

func (self Region) IsDungeonEntrance() bool {
	if self.ParentID != terrain.WORLD_OVERWORLD && self.ParentID != terrain.WORLD_ETHER {
		return false
	}
	return isDungeonPos(self.X, self.Y)
}

func isDungeonPos(x, y int) bool {
	// Always force 1 0 to be a dungeon.
	return x == 1 && y == 0 || terrain.GetCoordOption(x, y, ODDS_DUNGEON)
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
