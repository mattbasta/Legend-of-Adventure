#!/usr/bin/env python
import os

pid = os.fork()
if pid:
    import web_server
    web_server.start()
else:
    import entity_server
    entity_server.start()

