define('timing',
    ['avatars', 'comm', 'drawing', 'hitmapping', 'keys', 'level', 'objects', 'settings'],
    function(avatars, comm, drawing, hitmapping, keys, level, objects, settings) {

    var registers = {};
    var timer;
    var last = 0;

    var tilesize = settings.tilesize;

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

        var avatar = avatars.getLocal();
        var doSetCenter = false;

        var playerMoving = _x || _y;
        // Adjust for diagonals
        if (_x && _y) {
            _x *= Math.SQRT1_2;
            _y *= Math.SQRT1_2;
        }

        function updateLocation() {
            comm.send(
                "loc",
                (avatar.x / tilesize).toFixed(2) + ":" +
                (avatar.y / tilesize).toFixed(2) + ":" +
                _x + ":" + _y + ":" +
                avatar.direction[0] + ":" + avatar.direction[1]
            );
        }

        var adjustedX = _x * speed;
        var adjustedY = _y * speed;

        var doRedrawAVS = false;

        if (playerMoving) {
            // Perform hit mapping against the terrain.
            var hitmap = avatar.hitmap;
            if (_x) {
                // Are we hitting the right hitmap?
                if (_x > 0 && avatar.x + adjustedX + settings.avatar.w > hitmap[1])
                    adjustedX = hitmap[1] - avatar.x - settings.avatar.w;
                // What about the left hitmap?
                else if (_x < 0 && avatar.x + adjustedX < hitmap[3])
                    adjustedX = hitmap[3] - avatar.x;

                // Mark that we aren't moving if we've adjusted the hitmap not to move.
                if(!adjustedX) _x = 0;
            }

            if (_y) {
                // Are we hitting the bottom hitmap?
                if(_y > 0 && avatar.y + adjustedY + settings.avatar.h > hitmap[2])
                    adjustedY = hitmap[2] - avatar.y - settings.avatar.h;
                // What about the top hitmap?
                else if(_y < 0 && avatar.y + adjustedY < hitmap[0])
                    adjustedY = hitmap[0] - avatar.y;

                if(!adjustedY) _y = 0;
            }

            // Recompute whether the player is actually moving. Useful for when
            // we're backed into a corner or something; this will make the
            // player stop walking.
            playerMoving = _x || _y;
        }

        if (playerMoving) {
            avatar.x += adjustedX;
            avatar.y += adjustedY;

            if (_x) hitmapping.updateAvatarY(avatar);
            if (_y) hitmapping.updateAvatarX(avatar);

            var spriteDirection = avatars.getSpriteDirection(_x, _y);
            if(_x !== avatar.direction[0] || _y !== avatar.direction[1]) {
                avatar.dirty = true;
                avatar.direction[0] = _x;
                avatar.direction[1] = _y;
                avatar.position = spriteDirection[1].position;
                avatar.cycle_position = 0;
                avatar.sprite_cycle = 0;
                avatars.draw('local');
                doRedrawAVS = true;
                updateLocation();
            }

            doSetCenter = true;

            // If the user can navigate to adjacent regions by walking off the
            // edge, perform those calculations now.
            if (level.canSlide()) {
                // TODO: This should be moved to the server.
                var beginSwapRegion = function(x, y, avx, avy) {
                    level.load(x, y, avx | 0, avy | 0);
                }
                if(_y < 0 && avatar.y < settings.tilesize / 2)
                    beginSwapRegion(level.getX(), level.getY() - 1, avatar.x, avatar.y);
                else if(_y > 0 && avatar.y >= (level.getH() - 1) * settings.tilesize)
                    beginSwapRegion(level.getX(), level.getY() + 1, avatar.x, avatar.y);
                else if(_x < 0 && avatar.x < settings.tilesize / 2)
                    beginSwapRegion(level.getX() - 1, level.getY(), avatar.x, avatar.y);
                else if(_x > 0 && avatar.x >= (level.getW() - 1) * settings.tilesize)
                    beginSwapRegion(level.getX() + 1, level.getY(), avatar.x, avatar.y);

            }

        } else if ((avatar.direction[0] || avatar.direction[1]) &&
                   (avatar.velocity[0] || avatar.velocity[1]) !== (adjustedX || adjustedY)) {
            // Set the avatar into the neutral standing position for the
            // direction it is facing.
            avatar.position = avatars.getSpriteDirection(avatar.direction[0], avatar.direction[1])[0].position;
            // Reset the avatar to a downward facing rest position.
            // avatar.direction[0] = 0;
            // avatar.direction[1] = 0;
            // Reset any ongoing animation with the avatar.
            avatar.sprite_cycle = 0;
            avatar.cycle_position = 0;
            // Have the avatar redrawn.
            avatars.draw('local');
            // Indicate that the avatar layer needs to be redrawn.
            doRedrawAVS = true;
            // Send one last position update to the server indicating where the
            // user stopped moving.
            updateLocation();
        }

        avatar.velocity[0] = adjustedX;
        avatar.velocity[1] = adjustedY;

        // Perform avatar processing
        doRedrawAVS = avatars.tick(speed) || doRedrawAVS;

        if (doSetCenter) level.setCenterPosition();
        if (doRedrawAVS) avatars.redrawAvatars();

        objects.tick(ticks, speed);

    }

    function start() {
        if (timer) return;
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
