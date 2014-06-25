define('timing',
    ['entities', 'comm', 'drawing', 'hitmapping', 'keys', 'level', 'settings'],
    function(entities, comm, drawing, hitmapping, keys, level, settings) {

    'use strict';

    var registers = {};
    var timer;
    var last = 0;

    var tilesize = settings.tilesize;


    function beginSwapRegion(x, y) {
        level.load(x, y);
    }

    function updateLocation() {
        var avatar = entities.getLocal();
        comm.send(
            "loc",
            (avatar.x).toFixed(2) + ":" +
            (avatar.y).toFixed(2) + ":" +
            avatar.velocity[0] + ":" + avatar.velocity[1] + ":" +
            avatar.direction[0] + ":" + avatar.direction[1]
        );
    }

    function tick() {
        var ticks = Date.now();
        var ms = ticks - last;
        last = ticks;
        var speed = settings.speed * ms;

        // Move Avatar
        var _x = 0;
        var _y = 0;
        if(keys.leftArrow) _x = -1;
        else if(keys.rightArrow) _x = 1;
        if(keys.upArrow) _y = -1;
        else if(keys.downArrow) _y = 1;

        var avatar = entities.getLocal();
        var doSetCenter = false;

        var playerMoving = _x || _y;

        var adjustedX = _x * speed;
        var adjustedY = _y * speed;
        // Adjust for diagonals
        if (_x && _y) {
            adjustedX *= Math.SQRT1_2;
            adjustedY *= Math.SQRT1_2;
        }

        var genXHitmap = !!_x;
        var genYHitmap = !!_y;

        // If the player is moving, perform hitmapping. Then reompute whether
        // the player is still moving.
        if (playerMoving) {
            // Perform hit mapping against the terrain.
            var hitmap = avatar.hitmap;
            if (_x) {
                // Are we hitting the right hitmap?
                if (_x > 0 && avatar.x + adjustedX + settings.entityPrototypes.avatar.width / tilesize >= hitmap[1]) {
                    adjustedX = 0;
                    avatar.x = hitmap[1] - settings.entityPrototypes.avatar.width / tilesize;
                    _x = 0;
                    doSetCenter = true;
                }
                // What about the left hitmap?
                else if (_x < 0 && avatar.x + adjustedX <= hitmap[3]) {
                    adjustedX = 0;
                    avatar.x = hitmap[3];
                    _x = 0;
                    doSetCenter = true;
                }
                // If we aren't moving, adjust our Y speed to what it was.
                if (!_x) {
                    adjustedY = _y * speed;
                }
            }

            if (_y) {
                // Are we hitting the bottom hitmap?
                if(_y > 0 && avatar.y + adjustedY >= hitmap[2]) {
                    adjustedY = 0;
                    avatar.y = hitmap[2];
                    _y = 0;
                    doSetCenter = true;
                }
                // What about the top hitmap?
                else if(_y < 0 && avatar.y + adjustedY - (settings.entityPrototypes.avatar.height) / tilesize <= hitmap[0]) {
                    avatar.y = hitmap[0] + (settings.entityPrototypes.avatar.height) / tilesize;
                    adjustedY = 0;
                    _y = 0;
                    doSetCenter = true;
                }
                if (!_y) {
                    adjustedX = _x * speed;
                }
            }

            // Recompute whether the player is actually moving. Useful for when
            // we're backed into a corner or something; this will make the
            // player stop walking.
            playerMoving = _x || _y;
        }

        // If the player is moving, perform updates.
        if (playerMoving) {
            avatar.x += adjustedX;
            avatar.y += adjustedY;

            if(_x !== avatar.velocity[0] || _y !== avatar.velocity[1]) {
                avatar.dirty = true;
                avatar.velocity[0] = _x;
                avatar.velocity[1] = _y;
                avatar.direction[0] = Math.round(_x);
                avatar.direction[1] = Math.round(_y);
                var spriteDirection = entities.getSpriteDirection(avatar.direction[0], avatar.direction[1]);
                avatar.position = spriteDirection[1].position;
                avatar.cycle_position = 0;
                avatar.sprite_cycle = 0;
                entities.draw('local');
                updateLocation();
            }

            doSetCenter = true;

            // If the user can navigate to adjacent regions by walking off the
            // edge, perform those calculations now.
            // TODO: This should be moved to the server.
            // TODO: This should also update location
            if (level.canSlide()) {
                if(_y < 0 && avatar.y < 1.25) {
                    avatar.y = level.getH() - 0.5;
                    level.load(level.getX(), level.getY() - 1);
                } else if(_y > 0 && avatar.y >= level.getH() - 0.5) {
                    avatar.y = settings.entityPrototypes.avatar.height / settings.tilesize + 0.5;
                    level.load(level.getX(), level.getY() + 1);
                } else if(_x < 0 && avatar.x < 0.25) {
                    avatar.x = level.getW() - settings.entityPrototypes.avatar.width / settings.tilesize - 0.5;
                    level.load(level.getX() - 1, level.getY());
                } else if(_x > 0 && avatar.x >= level.getW() - 1.25) {
                    avatar.x = 0.5;
                    level.load(level.getX() + 1, level.getY());
                }
            }

        } else if ((avatar.velocity[0] || avatar.velocity[1]) &&
                   (avatar.velocity[0] || avatar.velocity[1]) !== (_x || _y)) {
            avatar.velocity[0] = _x;
            avatar.velocity[1] = _y;
            // Set the avatar into the neutral standing position for the
            // direction it is facing.
            avatar.position = entities.getSpriteDirection(avatar.direction[0], avatar.direction[1])[0].position;
            // Reset the avatar to a downward facing rest position.
            // avatar.direction[0] = 0;
            // avatar.direction[1] = 0;
            // Reset any ongoing animation with the avatar.
            avatar.sprite_cycle = 0;
            avatar.cycle_position = 0;
            // Have the avatar redrawn.
            entities.draw('local');
            // Send one last position update to the server indicating where the
            // user stopped moving.
            updateLocation();
        }

        if (doSetCenter) {
            if (genYHitmap) hitmapping.updateAvatarY(avatar);
            if (genXHitmap) hitmapping.updateAvatarX(avatar);
        }

        // Perform entity processing
        entities.tick(ms);

        if (doSetCenter) level.setCenterPosition();

    }

    function start() {
        if (timer) return;
        last = Date.now() - 10;
        tick();
        timer = setInterval(tick, settings.fps);
    }
    function stop() {
        if (!timer) return;
        clearInterval(timer);
        timer = null;
        last = 0;
    }

    level.on('pause', stop);
    level.on('unpause', start);

    return {
        start: start,
        stop: stop,
        getLastTick: function() {
            return last || Date.now();
        }
    };
});
