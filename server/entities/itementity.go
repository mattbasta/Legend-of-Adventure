package entities

import (
    "fmt"
    "log"
    "strconv"
    "strings"

    "legend-of-adventure/server/events"
)

var WEAPONS = map[string]uint {
    "sw": 0,
    "bo": 1,
    "ma": 2,
    "ax": 3,
    "ha": 4,
    "st": 5,
}
var WEAPON_PREFIXES = map[string]uint {
    "plain": 0,
    "forged": 1,
    "sharp": 2,
    "broad": 3,
    "old": 4,
    "leg": 5,
    "fla": 6,
    "agile": 7,
    "bane": 8,
    "ench": 9,
    "evil": 10,
    "spite": 11,
    "ether": 12,
    "ancie": 13,
}


type ItemEntity struct {
    id         string
    closing    chan bool

    itemCode   string
    x, y       float64
    location   EntityRegion

    receiver   chan *events.Event
}

type EntityThatCanThrow interface {
    ID() string
    Location() EntityRegion
    Position() (float64, float64)
    Direction() (int, int)
}

func NewItemEntity(code string, from EntityThatCanThrow) *ItemEntity {
    item := new(ItemEntity)
    item.id = NextEntityID()
    item.closing = make(chan bool)
    item.itemCode = code
    item.location = from.Location()

    fromX, fromY := from.Position()
    fromDirX, fromDirY := from.Direction()
    item.x, item.y = fromX + float64(fromDirX), fromY + float64(fromDirY)

    item.receiver = make(chan *events.Event)

    go func() {
        for {
            select {
            case <-item.closing:
                item.closing <- true
                return
            case event := <-item.receiver:
                item.handle(event)
            }
        }
    }()

    return item
}


func (self *ItemEntity) Receive() chan<- *events.Event {
    return self.receiver
}

func (self *ItemEntity) handle(event *events.Event) {
    switch event.Type {
    case events.ENTITY_UPDATE:
        entity := self.location.GetEntity(event.Origin)
        if entity == nil { return }

        dist := Distance(self, entity)
        if dist > ITEM_PICK_UP_DIST { return }

        eInv := entity.(Entity).Inventory()
        if eInv == nil { return }

        given, _ := eInv.Give(self.itemCode)
        if given {
            self.location.RemoveEntity(self)
            self.closing <- true
            return
        }
    }
}


func (self *ItemEntity) Clipping() (uint, uint, uint, uint) {
    width, height := self.Size()
    var clipX, clipY uint

    if self.itemCode[0] == 'w' {
        weaponData := strings.Split(self.itemCode[1:], ".")
        clipY = WEAPONS[weaponData[0]] * 24
        clipX = WEAPON_PREFIXES[weaponData[1]] * 24 + (5 * 24)
    } else {
        code, _ := strconv.ParseUint(self.itemCode[1:], 10, 0)
        clipX = uint(code) % 5 * 24
        clipY = uint(code) / 5 * 24
    }

    return clipX, clipY, width, height
}

func (self *ItemEntity) String() string {
    width, height := self.Size()
    clipX, clipY, _, _ := self.Clipping()
    return (
        "{\"proto\":\"item\"," +
        "\"id\":\"" + self.ID() + "\"," +
        fmt.Sprintf(
            "\"x\":\"%f\"," +
            "\"y\":\"%f\"," +
            "\"width\":\"%d\"," +
            "\"height\":\"%d\",",
            self.x,
            self.y,
            width,
            height,
        ) +
        "\"clip\": {" +
        fmt.Sprintf(
            "\"x\":\"%d\"," +
            "\"y\":\"%d\"," +
            "\"width\":\"%d\"," +
            "\"height\":\"%d\"",
            clipX,
            clipY,
            width,
            height,
        ) +
        "}," +
        // "\"\":\"\"," +
        "\"type\":\"item\"" +
        "}")
}


func (self *ItemEntity) Killer(in chan bool) {
    go func() {
        select {
        case <- in:
            log.Println("Destroying item entity " + self.ID())
            self.closing <- true
            in <- true
        case <- self.closing:
            log.Println("Closing item entity " + self.ID())
            self.closing <- true
        }
    }()
}

func (self ItemEntity) ID() string                   { return self.id }
func (self ItemEntity) Position() (float64, float64) { return self.x, self.y }
func (self ItemEntity) Size() (uint, uint)           { return 24, 24 }
func (self ItemEntity) Dead() bool                   { return false }
func (self ItemEntity) Location() EntityRegion       { return self.location }
func (self ItemEntity) Inventory() *Inventory        { return nil }
