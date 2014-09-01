package entities

import (
    "fmt"
    "log"
    "strconv"
    "strings"

    "legend-of-adventure/server/events"
)


type PotEntity struct {
    id         string
    closing    chan bool

    inventory *Inventory
    type_      int

    x, y       float64
    location   EntityRegion

    hasAddedItem bool

    receiver   chan *events.Event
}

const POT_HIT_WIGGLE_ROOM_X = 0.3
const POT_HIT_WIGGLE_ROOM_Y = 0.4


func NewPotEntity(location EntityRegion, type_ int, x, y float64) *PotEntity {
    pot := new(PotEntity)
    pot.id = NextEntityID()
    pot.closing = make(chan bool, 1)
    pot.receiver = make(chan *events.Event, 128)
    pot.location = location
    pot.type_ = type_

    pot.inventory = NewInventory(pot, CHEST_INV_SIZE)

    pot.x, pot.y = x, y

    go func() {
        for {
            select {
            case <-pot.closing:
                pot.closing <- true
                return
            case event := <-pot.receiver:
                pot.handle(event)
            }
        }
    }()

    return pot
}

func (self *PotEntity) AddItem(code string) {
    if self.hasAddedItem {
        return
    }
    self.hasAddedItem = true
    ok, _ := self.inventory.Give(code)
    if !ok {
        log.Println("Could not add item to pot entity")
    }
}


func (self *PotEntity) Receive() chan<- *events.Event {
    return self.receiver
}

func (self *PotEntity) handle(event *events.Event) {
    switch event.Type {
    case events.DIRECT_ATTACK:
        split := strings.Split(event.Body, " ")
        x, _ := strconv.ParseFloat(split[0], 64)
        y, _ := strconv.ParseFloat(split[1], 64)

        entX, entY := UnpackCoords(<-(self.Position()))
        entW, entH := self.Size()

        if x < entX - POT_HIT_WIGGLE_ROOM_X ||
           x > entX + entW + POT_HIT_WIGGLE_ROOM_X ||
           y < entY - entH - POT_HIT_WIGGLE_ROOM_Y ||
           y > entY + POT_HIT_WIGGLE_ROOM_Y {

            return
        }

        log.Println("Dropping item")
        self.inventory.Drop(self)

        if self.inventory.NumItems() == 0 {

            sound := "pot_smash"
            if self.type_ > 1 {
                sound = "chest_smash"
            }

            self.location.Broadcast(
                self.location.GetEvent(
                    events.SOUND,
                    fmt.Sprintf(
                        "%s:%f:%f",
                        sound,
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

func (self *PotEntity) BlockingString() string {
    width, height := self.Size()
    return (
        "{\"proto\":\"pot\"," +
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
        "\"type\":\"pot\"," +
        "\"image\":\"pots\"," +
        "\"clip\":{" +
        "\"x\":0," +
        fmt.Sprintf("\"y\":%d,", self.type_ * 32) +
        "\"width\":32," +
        "\"height\":32" +
        "}" +
        "}")
}
func (self *PotEntity) String() <-chan string {

    out := make(chan string, 1)
    out <- self.BlockingString()
    return out
}

func (self PotEntity) Killer(in chan bool)          { return }
func (self PotEntity) SetEffect(effect string, ttl int) { return }
func (self PotEntity) UpdateInventory()             { return }

func (self PotEntity) ID() string                   { return self.id }
func (self PotEntity) BlockingPosition() (float64, float64)  { return self.x, self.y }
func (self PotEntity) Position() <-chan [2]float64  { return CoordsAsChan(self.x, self.y) }
func (self PotEntity) BlockingSize() (float64, float64)  { return 1, 1 }
func (self PotEntity) Size() (float64, float64)     { return 1, 1 }
func (self PotEntity) BlockingType() string         { return "pot" }
func (self PotEntity) Type() <-chan string          { return StringAsChan(self.BlockingType()) }
func (self PotEntity) Location() EntityRegion       { return self.location }
func (self PotEntity) Inventory() *Inventory        { return self.inventory }
func (self PotEntity) Direction() (int, int)        { return 0, 1 }
