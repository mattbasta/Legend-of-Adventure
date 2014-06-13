package server

import (
	"strconv"

	"legend-of-adventure/server/terrain"
)

var entityNameCounter = 0

func NextEntityID() string {
	name := "e" + strconv.Itoa(entityNameCounter)
	entityNameCounter++
	return name
}

type Entity interface {
	Receive() chan<- *Event
	Setup()
	Killer(chan<- bool) // Used to notify entity it is being destroyed

	ID() string
	Position() (float64, float64)
	Size() (uint, uint)

	Dead() bool

	Location() *Region
	Inventory() *Inventory // May return nil

	GetIntroduction() string // Entity add command's body

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

type SentientAnimat interface {
	Animat
}

func IsEntityCollidingWithPortal(portal terrain.Portal, entity Entity) bool {
    ex, ey := entity.Position() // TODO: Update this to use ApproximatePosition
    ew, eh := entity.Size()
    return (uint(ex) + ew > portal.X * TILE_SIZE &&
            uint(ex) - portal.W * TILE_SIZE > portal.X * TILE_SIZE &&
            uint(ey) + eh > portal.Y * TILE_SIZE &&
            uint(ey) - portal.H * TILE_SIZE > portal.Y * TILE_SIZE)
}
