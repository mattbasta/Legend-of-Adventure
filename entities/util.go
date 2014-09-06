package entities

func StringAsChan(input string) <-chan string {
	out := make(chan string, 1)
	out <- input
	return out
}

func CoordsAsChan(x, y float64) <-chan [2]float64 {
	out := make(chan [2]float64, 1)
	out <- [2]float64{x, y}
	return out
}

func UnpackCoords(coords [2]float64) (float64, float64) {
	return coords[0], coords[1]
}
