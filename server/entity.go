package main

import (
	"strconv"
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
	Killer(chan<- bool) chan<- bool // Used to notify entity it is being destroyed

	ID() string
	Position() (float64, float64)

	Dead() bool

	Location() *Region
	Inventory() *Inventory // May return nil
}

type Animat interface {
	Entity

	Properties() (int, string, string) // Layer, image, view

	Direction() (float64, float64)
	Speed() float64

	ShouldWeightDirections() bool
	MovementEffect() string
}
