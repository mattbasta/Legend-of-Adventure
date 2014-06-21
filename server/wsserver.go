package server

import (
	"code.google.com/p/go.net/websocket"
	"log"
)

func handler(ws *websocket.Conn) {
	addr := ws.Request().RemoteAddr
	log.Println("Client connected: " + addr)

	player := NewPlayer(ws)
	player.Listen()
}

func GetWSHandler() websocket.Handler {
	return websocket.Handler(handler)
}
