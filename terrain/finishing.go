package terrain

func isVertical(t Tile) bool {
	return t[0] == t[2] && t[1] == t[3] && isVerticalGradient(t)
}
func isHorizontal(t Tile) bool {
	return t[0] == t[1] && t[2] == t[3] && isHorizontalGradient(t)
}

func isVerticalGradient(t Tile) bool {
	return t[0] != t[1] && t[2] != t[3]
}
func isHorizontalGradient(t Tile) bool {
	return t[0] != t[2] && t[1] != t[3]
}

func fillTile(t *Tile, value uint) {
	t[0] = value
	t[1] = value
	t[2] = value
	t[3] = value
}

func TerrainRounding(terrain [][]uint, tileset Tileset) {
	rowCount := len(terrain)
	colCount := len(terrain[0])

	// Create the rounding grid and fill it with default values
	base := make([][]Tile, rowCount)
	for i := range base {
		base[i] = make([]Tile, colCount)
		row := base[i]
		for j := 0; j < colCount; j++ {
			val := terrain[i][j]
			row[j] = Tile{val, val, val, val}
		}
	}

	// First pass, horiz and vertical gradients
	for y := 0; y < rowCount; y++ {
		for x := 0; x < colCount; x++ {
			here := terrain[y][x]

			// Weed out any single dots or vertical tips
			if y > 0 && x > 0 && y < rowCount-1 && x < colCount-1 && here != terrain[y][x-1] && here != terrain[y-1][x] && here != terrain[y][x+1] {
				temp := terrain[y-1][x]
				terrain[y][x] = temp
				fillTile(&base[y][x], temp)
				continue
			}

			// Second column and up, test for horiz gradient.
			if x > 0 && terrain[y][x] != terrain[y][x-1] {
				base[y][x][0] = terrain[y][x-1]
				base[y][x][2] = terrain[y][x-1]
				continue
			}

			// Second row and down, test for vertical gradient.
			if y > 0 && terrain[y][x] != terrain[y-1][x] && base[y-1][x][2] == base[y-1][x][3] {
				base[y][x][0] = terrain[y-1][x]
				base[y][x][1] = terrain[y-1][x]
			}
		}
	}

	// Second pass, basic corner matching. Also contains an optimized version
	// of the third pass to save resources
	for y := 0; y < rowCount; y++ {
		for x := 0; x < colCount; x++ {
			hLeftC := x > 0 && isVertical(base[y][x-1])
			hRightC := x < colCount-1 && isVertical(base[y][x+1])

			// Optimize the third pass by squashing it into the second.
			if isHorizontalGradient(base[y][x]) {
				if hLeftC {
					if base[y][x][0] == base[y][x-1][1] && base[y][x][2] == base[y][x-1][2] {
						base[y][x-1][2] = base[y][x][2]
						base[y][x-1][3] = base[y][x][2]
					} else if base[y][x][0] == base[y][x-1][2] && base[y][x][2] == base[y][x-1][3] {
						base[y][x-1][0] = base[y][x][0]
						base[y][x-1][1] = base[y][x][0]
					}
				}
				if hRightC {
					if base[y][x][1] == base[y][x+1][0] && base[y][x][3] == base[y][x+1][1] {
						base[y][x+1][2] = base[y][x][3]
						base[y][x+1][3] = base[y][x][3]
					} else if base[y][x][1] == base[y][x+1][3] && base[y][x][3] == base[y][x+1][2] {
						base[y][x+1][0] = base[y][x][1]
						base[y][x+1][1] = base[y][x][1]
					}
				}
				continue
			}

			if isVerticalGradient(base[y][x]) {
				// There is nothing for us here except pain.
				continue
			}

			// Perform second pass operations.
			if y == 0 || base[y-1][x][2] == base[y-1][x][3] {
				continue
			}

			if hLeftC && base[y-1][x][2] == base[y][x-1][0] && base[y-1][x][3] == base[y][x-1][3] {
				temp1, temp2 := base[y-1][x][2], base[y-1][x][3]
				// TODO: Make this recycle the old Tile?
				base[y][x] = Tile{temp1, temp2, temp2, temp2}
				base[y][x-1][1] = temp1
				continue
			}
			if hRightC && base[y-1][x][2] == base[y][x+1][2] && base[y-1][x][3] == base[y][x+1][1] {
				temp1, temp2 := base[y-1][x][2], base[y-1][x][3]
				// TODO: Make this recycle the old Tile?
				base[y][x] = Tile{temp1, temp2, temp1, temp1}
				base[y][x+1][0] = temp2
			}
		}
	}

	// Third pass is done above: intersection handling.

	// Fourth pass, perform final step corner matching.
	for y := 0; y < rowCount; y++ {
		for x := 0; x < colCount; x++ {
			// Ignore corners and edges.
			if isHorizontalGradient(base[y][x]) || isVerticalGradient(base[y][x]) {
				continue
			}

			if y == 0 || base[y-1][x][2] == base[y-1][x][3] {
				continue
			}

			hLeftC := x > 0 && base[y][x-1][1] != base[y][x-1][3]

			if hLeftC && base[y][x-1][1] == base[y-1][x][2] && base[y][x-1][3] == base[y-1][x][3] {
				temp := base[y-1][x][3]
				base[y][x] = Tile{base[y][x-1][1], temp, temp, temp}
				continue
			}

			hRightC := x < colCount-1 && base[y][x+1][0] != base[y][x+1][2]

			if hRightC && base[y][x+1][0] == base[y-1][x][3] && base[y][x+1][2] == base[y-1][x][2] {
				temp := base[y-1][x][2]
				base[y][x] = Tile{temp, base[y-1][x][3], temp, temp}
			}

		}
	}

	// Perform final tile replacement
	for i, row := range base {
		for j, cell := range row {
			tile, ok := tileset[cell]
			// log.Println(cell.String())
			if ok {
				terrain[i][j] = tile
			} else {
				terrain[i][j] = cell[0]
			}
		}
	}

}
