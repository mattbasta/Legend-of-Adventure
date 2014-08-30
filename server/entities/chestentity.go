package entities

import (
    "fmt"
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

    receiver   chan *events.Event
}



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
    self.inventory.Give(code)
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

        if x < entX - ATTACK_WIGGLE_ROOM ||
           x > entX + entW + ATTACK_WIGGLE_ROOM ||
           y < entY - entH - ATTACK_WIGGLE_ROOM ||
           y > entY + ATTACK_WIGGLE_ROOM {
            return
        }

        self.inventory.Drop(self)

    }
}

func (self *ChestEntity) String() <-chan string {
    width, height := self.Size()

    out := make(chan string, 1)
    out <- (
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
    return out
}


func (self ChestEntity) Killer(in chan bool)          { return }
func (self ChestEntity) UpdateInventory()             { return }
func (self ChestEntity) SetEffect(effect string, ttl int) { return }

func (self ChestEntity) ID() string                   { return self.id }
func (self ChestEntity) BlockingPosition() (float64, float64)  { return self.x, self.y }
func (self ChestEntity) Position() <-chan [2]float64  { return CoordsAsChan(self.x, self.y) }
func (self ChestEntity) BlockingSize() (float64, float64)  { return 1, 1 }
func (self ChestEntity) Size() (float64, float64)     { return 1, 1 }
func (self ChestEntity) BlockingType() string         { return "chest" }
func (self ChestEntity) Type() <-chan string          { return StringAsChan(self.BlockingType()) }
func (self ChestEntity) Location() EntityRegion       { return self.location }
func (self ChestEntity) Inventory() *Inventory        { return self.inventory }
func (self ChestEntity) Direction() (int, int)        { return 0, 1 }
