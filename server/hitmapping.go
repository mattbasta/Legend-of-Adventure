package server

import (
	"math"

	"legend-of-adventure/server/terrain"
)

type Hitmap struct {
	Top, Right, Bottom, Left int
}

func GetHitmap(entity *Entity, terrain *terrain.Terrain) *Hitmap {
	fleft, ftop := (*entity).Position()
	fleft = math.Max(math.Min(fleft, REGION_WIDTH), 0)
	ftop = math.Max(math.Min(ftop, REGION_HEIGHT), 0)
	left, top := int(fleft), int(ftop)

	fright := math.Min(fleft+1, REGION_WIDTH)
	fbottom := math.Min(ftop+1, REGION_HEIGHT)
	right, bottom := int(fright), int(fbottom)

	hitmap := terrain.Hitmap

	for i := left; i > -1; i-- {
		if hitmap[top][i] || hitmap[top+1][i] {
			left = i
			break
		}
	}

	for i := left + 1; i < REGION_WIDTH; i++ {
		if hitmap[top][i] || hitmap[top+1][i] {
			right = i
			break
		}
	}

	for i := top; i > -1; i-- {
		if hitmap[i][left] || hitmap[i][left+1] {
			top = i
			break
		}
	}

	for i := top + 1; i < REGION_WIDTH; i++ {
		if hitmap[i][left] || hitmap[i][left+1] {
			bottom = i
			break
		}
	}

	return &Hitmap{top, right, bottom, left}
}
