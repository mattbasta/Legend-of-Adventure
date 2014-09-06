package entities

import (
	"fmt"
	"log"
	"math/rand"

	"legend-of-adventure/events"
)

type InventoryOwner interface {
	UpdateInventory()
	SetEffect(effect string, ttl int)
	ID() string
	Receive() chan<- *events.Event
}

type Inventory struct {
	Owner    InventoryOwner
	inv      []string
	counts   []int
	capacity int
}

func NewInventory(owner InventoryOwner, capacity int) *Inventory {
	slots := make([]string, capacity)
	counts := make([]int, capacity)
	return &Inventory{owner, slots, counts, capacity}
}

func (self *Inventory) Get(index int) (string, int) {
	return self.inv[index], self.counts[index]
}

func (self *Inventory) Capacity() int {
	return self.capacity
}

func (self *Inventory) NumItems() int {
	count := 0
	for _, v := range self.inv {
		if v != "" {
			count = count + 1
		}
	}
	return count
}

func (self *Inventory) IsFull() bool {
	for _, v := range self.inv {
		if v == "" {
			return false
		}
	}
	return true
}

func (self *Inventory) Give(item string) (bool, int) { // Success, Slot
	for i, v := range self.inv {
		if v == item && self.counts[i] < INV_MAX_STACK {
			self.counts[i]++
			self.Owner.UpdateInventory()
			return true, i
		}
	}

	if self.IsFull() {
		return false, 0
	}

	for i, v := range self.inv {
		if v == "" {
			self.inv[i] = item
			self.counts[i] = 1
			self.Owner.UpdateInventory()
			return true, i
		}
	}
	return false, 0
}

func (self *Inventory) Clear() {
	for i := 0; i < self.capacity; i++ {
		self.ClearSlot(i)
	}
}

func (self *Inventory) ClearSlot(index int) {
	self.inv[index] = ""
	self.counts[index] = 0
}

func (self *Inventory) Consolidate() {
	for i := 0; i < self.capacity-1; i++ {
		if self.inv[i] != "" {
			continue
		}
		for j := i + 1; j < self.capacity; j++ {
			if self.inv[j] != "" {
				self.inv[i] = self.inv[j]
				self.counts[i] = self.counts[j]
				self.inv[j] = ""
				self.counts[j] = 0
				break
			}
		}
		if self.inv[i] == "" {
			break
		}
	}
}

func (self *Inventory) Cycle(command string) {
	self.Consolidate()
	count := self.NumItems()

	if command == "b" {
		first, firstCount := self.inv[0], self.counts[0]
		for i := 0; i <= count-2; i++ {
			self.inv[i] = self.inv[i+1]
			self.counts[i] = self.counts[i+1]
		}
		self.inv[count-1], self.counts[count-1] = first, firstCount
	} else {
		last, lastCount := self.inv[count-1], self.counts[count-1]
		for i := count - 1; i > 0; i-- {
			self.inv[i] = self.inv[i-1]
			self.counts[i] = self.counts[i-1]
		}
		self.inv[0], self.counts[0] = last, lastCount
	}
	self.Owner.UpdateInventory()
}

func (self *Inventory) Use(index uint, holder Animat) {
	if int(index) > self.capacity || self.inv[index] == "" {
		return
	}

	log.Println(holder.ID() + " using " + self.inv[index])

	x, y := UnpackCoords(<-(holder.Position()))

	switch self.inv[index][0] {
	case 'f':
		// Don't let the player waste the food.
		if holder.IsAtMaxHealth() {
			return
		}
		holder.IncrementHealth(FOOD_HEALTH_INCREASE)
		self.Remove(index)

		holder.Receive() <- holder.Location().GetEvent(
			events.PARTICLE_MACRO, "0.5 -0.5 eatfood 10 local", holder,
		)

		holder.Location().Broadcast(
			holder.Location().GetEvent(
				events.PARTICLE_MACRO,
				fmt.Sprintf("0.5 -0.5 eatfood 10 %s", holder.ID()),
				holder,
			),
		)

	case 'w':
		holder.Location().Broadcast(
			holder.Location().GetEvent(
				events.DIRECT_ATTACK,
				fmt.Sprintf("%f %f %s", x, y, self.inv[index]),
				holder,
			),
		)

	case 'p':
		self.Remove(index)

		effectN := rand.Intn(4)
		var effect string
		switch effectN {
		case 0:
			effect = "flip"
		case 1:
			effect = "invincible"
		case 2:
			effect = "blindness"
		case 3:
			effect = "drained"
		}
		holder.SetEffect(effect, rand.Intn(10)+10)

		holder.Location().Broadcast(
			holder.Location().GetEvent(
				events.SOUND,
				fmt.Sprintf("potion%d:%f:%f", rand.Intn(2), x, y),
				nil,
			),
		)
	}

}

func (self *Inventory) Remove(index uint) {
	self.counts[index]--
	if self.counts[index] == 0 {
		self.inv[index] = ""
	}
	self.Consolidate()
	self.Owner.UpdateInventory()
}

func (self *Inventory) Drop(dropper EntityThatCanThrow) {
	if self.inv[0] == "" {
		return
	}

	log.Println(dropper.ID() + " dropping " + self.inv[0])

	reg := dropper.Location()
	item := NewItemEntity(self.inv[0], dropper)
	self.counts[0]--
	if self.counts[0] == 0 {
		self.inv[0] = ""
	}
	reg.AddEntity(item)
	self.Consolidate()
	self.Owner.UpdateInventory()

}
