package server

import (
	"code.google.com/p/go.net/websocket"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"legend-of-adventure/server/terrain"
)

var playerCounter = 0

type Player struct {
	connection *websocket.Conn
	location   *Region

	outbound     chan *Event
	outbound_raw chan string
	closing      chan bool

	name       string
	x, y       float64
	velX, velY int
	dirX, dirY int
	isDead     bool

	inventory *Inventory
}

func NewPlayer(conn *websocket.Conn) *Player {
	if conn == nil {
		panic("WebSocket connection required")
	}

	outbound := make(chan *Event, SOCKET_BUFFER_SIZE)
	outbound_raw := make(chan string, SOCKET_BUFFER_SIZE)
	closing := make(chan bool)

	// Get the region and make it active.
	reg := GetRegion(terrain.WORLD_OVERWORLD, terrain.REGIONTYPE_FIELD, 0, 0)
	// Let the region know to stay alive.
	reg.KeepAlive <- true

	player := Player{conn, reg,
		outbound, outbound_raw, closing,
		NextEntityID(),
		REGION_WIDTH / 2, REGION_HEIGHT / 2, 0, 0, 0, 1,
		false,
		nil}
	reg.AddEntity(&player)
	player_ent := (Entity)(player)

	// Set up the player's inventory
	player.inventory = NewInventory(&player_ent, PLAYER_INV_SIZE)

	player.startPinging()

	// Send the player the initial level
	outbound_raw <- "lev{" + reg.String() + "}"

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
			websocket.Message.Send(self.connection, msg.String())
		case msg := <-self.outbound_raw:
			websocket.Message.Send(self.connection, msg)
		case <-self.closing:
			log.Println("Client disconnecting.")

			// Tell the region that the client is going away.
			self.location.RemoveEntity(self)

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
	case "cyc": // cyc == cycle inventory
		self.inventory.Cycle(split[1])
		self.update_inventory()

	case "cha": // cha == chat
		body := fmt.Sprintf("%f %f\n%s", self.x, self.y, split[1])
		self.location.Broadcast(
			self.location.GetEvent(CHAT, body, self),
			self.ID(),
		)

	case "loc": // loc == location
		posdata := strings.Split(split[1], ":")
		if len(posdata) < 4 {
			self.closing <- true
			return
		}
		// TODO: Perform more cheat testing here
		newX, err := strconv.ParseFloat(posdata[0], 64)
		if err != nil {
			return
		}
		newY, err := strconv.ParseFloat(posdata[1], 64)
		if err != nil {
			return
		}
		if newX < 0 || newX > float64(self.location.terrain.Width) ||
			newY < 0 || newY > float64(self.location.terrain.Height) {
			log.Println("User attempted to exceed bounds of the level")
			self.closing <- true
		}
		velX, err := strconv.ParseInt(posdata[2], 10, 0)
		if err != nil {
			return
		}
		velY, err := strconv.ParseInt(posdata[3], 10, 0)
		if err != nil {
			return
		}
		if velX < -1 || velX > 1 || velY < -1 || velX > 1 {
			log.Println("User attempted to go faster than possible")
			self.closing <- true
			return
		}
		dirX, err := strconv.ParseInt(posdata[4], 10, 0)
		if err != nil {
			return
		}
		dirY, err := strconv.ParseInt(posdata[5], 10, 0)
		if err != nil {
			return
		}
		if dirX < -1 || dirX > 1 || dirY < -1 || dirX > 1 {
			log.Println("User attempted face invalid direction")
			self.closing <- true
			return
		}
		self.x = newX
		self.y = newY
		self.velX = int(velX)
		self.velY = int(velY)
		self.dirX = int(dirX)
		self.dirY = int(dirY)

		self.location.Broadcast(
			self.location.GetEvent(LOCATION, self.String(), self),
			self.ID(),
		)
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

func (self Player) GetIntroduction() string {
	return "player " + self.String()
}

func (self Player) String() string {
	return fmt.Sprintf(
		"%s %f %f %d %d %d %d",
		self.ID(),
		self.x,
		self.y,
		self.velX,
		self.velY,
		self.dirX,
		self.dirY,
	)
}
