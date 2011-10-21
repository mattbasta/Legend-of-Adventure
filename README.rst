===================
Legend of Adventure
===================

An action adventure MMORPG that runs in the browser!

------------------
Basic Requirements
------------------

To play LoA, you need a web browser that is capable of both WebSockets (Firefox 6+, Chrome) and <canvas> (just about everybody). A performant machine would also be recommended, as the game may be somewhat resource intensive.


Server Requirements
===================

The server will only run on *NIX-based systems. The server can only be started as root (e.g.: with ``sudo``).


Server Dependencies
===================

* Python 2.6+ (not Python 3)
* Redis
* Memcached

Other dependencies can be resolved with: ::

    pip install -r requirements.txt

