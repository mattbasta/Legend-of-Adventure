package main

import (
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"strings"

	"code.google.com/p/go.net/websocket"
)

var HTTP_PORT int

func httphandler(w http.ResponseWriter, r *http.Request) {
	b, err := ioutil.ReadFile("www/index.html")
	if err != nil {
		panic(err)
	}

	page := string(b)
	page = strings.Replace(page, "%(port)s", strconv.Itoa(HTTP_PORT), 1)

	fmt.Fprintf(w, page)
}

func getWSHandler() websocket.Handler {
	return websocket.Handler(func(ws *websocket.Conn) {
		addr := ws.Request().RemoteAddr
		log.Println("Client connected: " + addr)

		player := NewPlayer(ws)
		player.Listen()
	})
}

func main() {
	flag.IntVar(&HTTP_PORT, "port", 8080, "The port to run the web server on")
	log.Println("Starting server...")

	http.HandleFunc("/", httphandler)
	http.Handle("/static/", http.StripPrefix("/static", http.FileServer(http.Dir("www/"))))
	http.Handle("/socket", getWSHandler())

	http.ListenAndServe(":"+strconv.Itoa(HTTP_PORT), nil)

}
