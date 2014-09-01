package entities

import (
    "fmt"
    "log"
    "strconv"
    "strings"

    "legend-of-adventure/server/events"
)


type ChestEntity struct {
    id         string
    closing    chan bool

    inventory *Inventory

    x, y       float64
    location   EntityRegion

    hasAddedItems bool

    receiver   chan *events.Event
}


const CHEST_HIT_WIGGLE_ROOM_X = 0.35
const CHEST_HIT_WIGGLE_ROOM_Y = 1.25


func NewChestEntity(location EntityRegion, x, y float64) *ChestEntity {
    chest := new(ChestEntity)
    chest.id = NextEntityID()
    chest.closing = make(chan bool, 1)
    chest.receiver = make(chan *events.Event, 128)
    chest.location = location

    chest.inventory = NewInventory(chest, CHEST_INV_SIZE)

    chest.x, chest.y = x, y

    go func() {
        for {
            select {
            case <-chest.closing:
                chest.closing <- true
                return
            case event := <-chest.receiver:
                chest.handle(event)
            }
        }
    }()

    return chest
}

func (self *ChestEntity) AddItem(code string) {
    self.hasAddedItems = true
    ok, _ := self.inventory.Give(code)
    if !ok {
        log.Println("Could not add item to chest entity")
    }
}


func (self *ChestEntity) Receive() chan<- *events.Event {
    return self.receiver
}

func (self *ChestEntity) handle(event *events.Event) {
    switch event.Type {
    case events.DIRECT_ATTACK:
        split := strings.Split(event.Body, " ")
        x, _ := strconv.ParseFloat(split[0], 64)
        y, _ := strconv.ParseFloat(split[1], 64)

        entX, entY := UnpackCoords(<-(self.Position()))
        entW, entH := self.Size()

        if x < entX - CHEST_HIT_WIGGLE_ROOM_X ||
           x > entX + entW + CHEST_HIT_WIGGLE_ROOM_X ||
           y < entY - entH - CHEST_HIT_WIGGLE_ROOM_Y ||
           y > entY + CHEST_HIT_WIGGLE_ROOM_Y {

            log.Println("Attack too far away")
            return
        }

        log.Println("Dropping item")
        self.inventory.Drop(self)

        if self.inventory.NumItems() == 0 {
            self.location.Broadcast(
                self.location.GetEvent(
                    events.SOUND,
                    fmt.Sprintf(
                        "chest_smash:%f:%f",
                        self.x,
                        self.y,
                    ),
                    self,
                ),
            )

            self.location.RemoveEntity(self)
            self.closing <- true
        }

    }
}

func (self *ChestEntity) BlockingString() string {
    width, height := self.Size()
    return (
        "{\"proto\":\"chest\"," +
        "\"id\":\"" + self.ID() + "\"," +
        fmt.Sprintf(
            "\"x\":%f," +
            "\"y\":%f," +
            "\"width\":%f," +
            "\"height\":%f,",
            self.x,
            self.y,
            width,
            height,
        ) +
        "\"type\":\"chest\"" +
        "}")
}
func (self *ChestEntity) String() <-chan string {

    out := make(chan string, 1)
    out <- self.BlockingString()
    return out
}

func (self ChestEntity) Killer(in chan bool)          { return }
func (self ChestEntity) SetEffect(effect string, ttl int) { return }
func (self ChestEntity) UpdateInventory()             { return }

func (self ChestEntity) ID() string                   { return self.id }
func (self ChestEntity) BlockingPosition() (float64, float64)  { return self.x, self.y }
func (self ChestEntity) Position() <-chan [2]float64  { return CoordsAsChan(self.x, self.y) }
func (self ChestEntity) BlockingSize() (float64, float64)  { return 1, 1 }
func (self ChestEntity) Size() (float64, float64)     { return 1.5, 1.5 }
func (self ChestEntity) BlockingType() string         { return "chest" }
func (self ChestEntity) Type() <-chan string          { return StringAsChan(self.BlockingType()) }
func (self ChestEntity) Location() EntityRegion       { return self.location }
func (self ChestEntity) Inventory() *Inventory        { return self.inventory }
func (self ChestEntity) Direction() (int, int)        { return 0, 1 }
