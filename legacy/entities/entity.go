package entities

import (
	"strconv"

	"legend-of-adventure/events"
	"legend-of-adventure/terrain"

	"github.com/mattbasta/sojourner"
)

var entityNameCounter = 0

func NextEntityID() string {
	// TODO: Make this thread safe
	name := "e" + strconv.Itoa(entityNameCounter)
	entityNameCounter++
	return name
}

type EntityRegion interface {
	AddEntity(entity Entity)
	RemoveEntity(entity Entity)
	GetEntity(ID string) Entity

	Broadcast(event *events.Event)
	GetEvent(type_ events.EventType, body string, origin Entity) *events.Event

	GetTerrain() *terrain.Terrain

	Spawn(entityType string, x, y float64) string
}

type Entity interface {
	Receive() chan<- *events.Event
	Kill() // Used to notify entity it is being destroyed

	ID() string
	Size() (float64, float64)

	Location() EntityRegion
	Inventory() *Inventory // May return nil

	BlockingPosition() (float64, float64)
	Position() <-chan [2]float64
	BlockingType() string
	Type() <-chan string
	BlockingString() string
	String() <-chan string

	GetSnapshot() *sojourner.PerformanceSnapshot
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
	IncrementHealth(amount int)
	SetEffect(effect string, ttl int)
}
