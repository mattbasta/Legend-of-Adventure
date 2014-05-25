package main

import (
	"code.google.com/p/go.net/websocket"
	"log"
	"strconv"
	"strings"
	"time"
)

var playerCounter = 0

type Player struct {
	connection *websocket.Conn
	location   *Region

	outbound     chan *Event
	outbound_raw chan string
	closing      chan bool

	name   string
	x, y   float64
	isDead bool

	inventory *Inventory
}

func NewPlayer(conn *websocket.Conn, reg *Region) *Player {
	if conn == nil {
		panic("WebSocket connection required")
	} else if reg == nil {
		panic("Player must exist in region")
	}

	outbound := make(chan *Event, SOCKET_BUFFER_SIZE)
	outbound_raw := make(chan string, SOCKET_BUFFER_SIZE)
	closing := make(chan bool)

	player := Player{conn, reg,
		outbound, outbound_raw, closing,
		NextEntityID(), REGION_WIDTH / 2, REGION_HEIGHT / 2, false,
		nil}
	player_ent := (Entity)(player)
	player.inventory = NewInventory(&player_ent, PLAYER_INV_SIZE)

	player.location = GetRegion(WORLD_OVERWORLD, 0, 0) // Get the region and make it active.
	player.location.KeepAlive <- true                  // Let the region know to stay alive.
	player.location.AddEntity(&player)
	player.startPinging()

	return &player
}

func (self *Player) startPinging() {
	go func(self *Player) {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				self.location.KeepAlive <- true
			case <-self.closing:
				self.closing <- true
				return
			}
		}
	}(self)
}

func (self *Player) listenOutbound() {
	for {
		select {
		case msg := <-self.outbound:
			// `msg` gets cast to a string
			websocket.Message.Send(self.connection, msg)
		case msg := <-self.outbound_raw:
			websocket.Message.Send(self.connection, msg)
		case <-self.closing:
			log.Println("Client disconnecting.")
			self.closing <- true
			return
		}
	}

}

func (self *Player) Listen() {
	defer self.connection.Close()
	go self.listenOutbound()

	websocket.Message.Send(self.connection, "haldo")

	for {
		select {
		case <-self.closing:
			self.closing <- true
			return
		default:
			var msg string
			err := websocket.Message.Receive(self.connection, &msg)
			if err != nil {
				self.closing <- true
				return
			} else {
				go self.handle(msg)
			}
		}
	}

}

func (self Player) Setup() {
	// TODO: Add inventory persistence
	self.inventory.Give("wsw.sharp.12")
	self.inventory.Give("f5")
	self.update_inventory()

	// TODO: Do lookup of player location here.

}

func (self *Player) handle(msg string) {
	split := strings.Split(msg, "\n")
	// Handle invalid input.
	if len(split) < 2 {
		self.closing <- true
		return
	}

	switch split[0] {
	case "reg": // reg == register
		name := strings.TrimSpace(split[1])
		// You cannot choose the name "local".
		if name == "" || name == "local" {
			self.closing <- true
			return
		}
		self.name = name
		return

	case "lev": // lev == level
		self.outbound_raw <- "lev{" + self.location.String() + "}"
		return

	case "cyc": // cyc == cycle inventory
		self.inventory.Cycle(split[1])
		self.update_inventory()
		return
	}
}

func (self *Player) update_inventory() {
	out := "inv"
	first := true
	for i := 0; i < self.inventory.Capacity(); i++ {

		if !first {
			out += "\n"
		}

		out += strconv.Itoa(i) + ":"
		item := self.inventory.Get(i)
		if item != "" {
			out += item
		}
		first = false
	}
	self.outbound_raw <- out
}

// Entity Implementation

func (self Player) Receive() chan<- *Event {
	return (chan<- *Event)(self.outbound)
}

func (self Player) ID() string                   { return self.name }
func (self Player) Position() (float64, float64) { return self.x, self.y }
func (self Player) Dead() bool                   { return self.isDead }
func (self Player) Location() *Region            { return self.location }
func (self Player) Inventory() *Inventory        { return self.inventory }
func (self Player) Killer(in chan<- bool)        { return }
