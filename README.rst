===================
Legend of Adventure
===================

An action adventure MMORPG that runs in the browser!

LoA has the following goals:

* Infinitely large, procedurally generated worlds.
* Novel AI for every NPC and many non-NPCs.
* Semi-intelligent learning chatbot with individual training data for each NPC.
* To provide a high degree of replayability.
* Realtime, massively multiplayer.
* Horizontally scalable to hundreds or thousands of machines.


------------------
Basic Requirements
------------------

To play LoA, you need a web browser that is capable of both WebSockets (Firefox 6+, Chrome) and <canvas> (just about everybody). A performant machine would also be recommended, as the game may be somewhat resource intensive.


Server Requirements
===================

The server will only run on \*NIX-based systems. The server can only be started as root (e.g.: with ``sudo``).


Server Dependencies
===================

* Python 2.6+ (not Python 3)
* Redis
* Memcached

Other dependencies can be resolved with: ::

    pip install -r requirements.txt


