package main

type Inventory struct {
	Owner    *Entity
	inv      []string
	capacity int
}

func NewInventory(owner *Entity, capacity int) *Inventory {
	slots := make([]string, capacity)
	return &Inventory{owner, slots, capacity}
}

func (self *Inventory) Get(index int) string {
	return self.inv[index]
}

func (self *Inventory) Capacity() int {
	return self.capacity
}

func (self *Inventory) IsFull() bool {
	for i := 0; i < self.capacity; i++ {
		if self.inv[i] == "" {
			return false
		}
	}
	return true
}

func (self *Inventory) Give(item string) (bool, int) { // Success, Slot
	if self.IsFull() {
		return false, 0
	}

	for i := 0; i < self.capacity; i++ {
		if self.inv[i] == "" {
			self.inv[i] = item
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
}
