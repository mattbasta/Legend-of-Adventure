# Legend of Adventure

An action adventure MMORPG that runs in the browser!

LoA has the following goals:

* Infinitely large, procedurally generated worlds.
* Novel AI for every NPC and many non-NPCs.
* Semi-intelligent learning chatbot with individual training data for each NPC.
* To provide a high degree of replayability.
* Realtime, massively multiplayer.
* Horizontally scalable to hundreds or thousands of machines.


## Status

This project is currently undergoing a port from Python to Go. As such, most of
the Python code is considered deprecated and may not run. Most of the
functionality from the Python code has not yet been ported.

Additionally, a major refactor of the JavaScript is underway, which may mean
that the client contains many nasty bugs.


## Requirements

A modern browser is all that is required to play. Note that this game can be
quite resource intensive, so a fast computer is recommended.

Any server capable of compiling and running Go 1.2 or higher should be able to
run the server.

The Python version of this project relies on Redis, though this requirement is
not present in the Go port.


## Special Thanks

### Graphics

* LordBagardo - Mob Sprites
* Kazzador - Zombie Sprite

### Audio

* Josh Stitt - Music Composition
* Ralph Hinkle - Sounds
* Ron Corbin - Zombie SFX (youtube.com/mrontheborder)
