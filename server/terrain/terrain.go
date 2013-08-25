package main

type Terrain struct {
	Tiles  [REGION_HEIGHT][REGION_WIDTH]int
	Hitmap [REGION_WIDTH][REGION_HEIGHT]bool
}
