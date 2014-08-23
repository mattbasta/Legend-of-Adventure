# Legend of Adventure

An action adventure MMORPG that runs in the browser!

LoA has the following goals:

* Infinitely large, procedurally generated worlds.
* Novel AI for every NPC and many non-NPCs.
* Semi-intelligent learning chatbot with individual training data for each NPC.
* To provide a high degree of replayability.
* Realtime, massively multiplayer.
* Horizontally scalable to hundreds or thousands of machines.


## Running

I absolutely hate how Go's `GOPATH` variable, since it requires your project to be in the same location as its dependencies. To get around this limitation, LoA lives in `/opt/legend-of-adventure` (I keep all of my code in `/opt`). `/opt/src` is a soft link to `/opt`. If you have your own Go workspace set up locally, you should only need to link `/opt/legend-of-adventure` to where you've `go get`'d it to and create the `/opt/src` link.

Once you have the package cloned, simply run

```bash
make  # go fmt, get, build, etc.
./server.o  # Run!
```

The server will start on port `8080` or whatever you pass as `--port`.


## Status

This project is currently undergoing a port from Python to Go. As such, most of
the Python code is considered deprecated and may not run. Most of the
functionality from the Python code has not yet been ported.

The last stable version of the Python server can be found on the `python` branch.


## Requirements

A modern browser is all that is required to play. Note that this game can be
quite resource intensive, so a fast computer is recommended.

Any server capable of compiling and running Go 1.2 or higher should be able to
run the server.

The Python version of this project relies on Redis, though this requirement is
not present in the Go port.


## Special Thanks

### Graphics

* [Henrique Lazarini](http://7soul1.deviantart.com/) - Some item sprites
* LordBagardo - Mob Sprites
* Kazzador - Zombie Sprite

### Audio

* Evil Mind Entertainment
* Josh Stitt - Music Composition
* Ralph Hinkle - Sounds
* Ron Corbin - Zombie SFX (youtube.com/mrontheborder)
