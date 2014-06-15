package entities

import (
    "log"
    "legend-of-adventure/server/events"
    "legend-of-adventure/server/regions"
)


type ItemEntity struct {
    id         string
    closing    chan bool

    itemCode   string
    x, y       float64
    location   *regions.Region
}

type EntityThatCanThrow interface {
    ID() string
    Location() *regions.Region
    Position() (float64, float64)
    Direction() (int, int)
}

func NewItemEntity(code string, from EntityThatCanThrow) *ItemEntity {
    item := new(ItemEntity)
    item.id = NextEntityID()
    item.closing = make(chan bool)
    item.itemCode = code

    fromX, fromY := from.Position()
    fromDirX, fromDirY := from.Direction()
    item.x, item.y = fromX + TILE_SIZE * float64(fromDirX), fromY + TILE_SIZE * float64(fromDirY)

    return item
}


func (self *ItemEntity) Receive() chan<- *events.Event {
    // TODO: Perform pickup processing here
    receiver := make(chan *events.Event)

    go func() {
        for {
            select {
            case event := <-receiver:
                log.Println(event)
                continue
            case <-self.closing:
                self.closing <- true
                return
            }
        }
    }()
    return receiver
}

func (self ItemEntity) GetIntroduction() string {
    return "item " + self.itemCode
}

func (self ItemEntity) String() string {
    return "item " + self.itemCode
}

func (self ItemEntity) Setup()                      { return }
func (self ItemEntity) Killer(in chan<- bool)       { return }
func (self ItemEntity) ID() string                     { return self.id }
func (self ItemEntity) Position() (float64, float64)   { return self.x, self.y }
func (self ItemEntity) Size() (uint, uint)   { return 35, 35 }
func (self ItemEntity) Dead() bool   { return false }
func (self ItemEntity) Location() *regions.Region   { return self.location }
func (self ItemEntity) Inventory() *Inventory   { return nil }
