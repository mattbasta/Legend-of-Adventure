package entities

import (
    "strconv"

    "legend-of-adventure/server/events"
    "legend-of-adventure/server/regions"
)

var entityNameCounter = 0

func NextEntityID() string {
    name := "e" + strconv.Itoa(entityNameCounter)
    entityNameCounter++
    return name
}

type Entity interface {
    Receive() chan<- *events.Event
    Setup()
    Killer(chan<- bool) // Used to notify entity it is being destroyed

    ID() string
    Position() (float64, float64)
    Size() (uint, uint)

    Dead() bool

    Location() *regions.Region
    Inventory() *Inventory // May return nil

    String() string
}

type Animat interface {
    Entity

    // Properties() (int, string, string) // Layer, image, view

    Direction() (int, int)
    Velocity() (int, int)

    // ShouldWeightDirections() bool
    MovementEffect() string

    GetHealth() uint
    IsAtMaxHealth() bool
    IncrementHealth(amount uint)
}
