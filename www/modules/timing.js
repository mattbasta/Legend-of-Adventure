define('timing',
    ['avatars', 'comm', 'drawing', 'game', 'hitmapping', 'keys', 'objects', 'settings'],
    function(avatars, comm, drawing, game, hitmapping, keys, objects, settings) {

    var registers = {};
    var timer;
    var last = 0;

    function tick() {
        var ticks = Date.now();
        var ms = ticks - last;
        last = ticks;
        var speed = game.speed * ms;

        // Move Avatar
        var _x = 0;
        var _y = 0;
        if(keys.leftArrow) _x = -1;
        else if(keys.rightArrow) _x = 1;
        if(keys.upArrow) _y = -1;
        else if(keys.downArrow) _y = 1;

        var avatar = avatars.getLocal();
        var doSetCenter = false;

        function updateLocation() {
            comm.send("loc", (avatar.x | 0) + ":" + (avatar.y | 0) + ":" + _x + ":" + _y);
        }

        var playerMoving = _x || _y;
        // Adjust for diagonals
        if (_x && _y) {
            _x *= Math.SQRT1_2;
            _y *= Math.SQRT1_2;
        }

        var adjustedX = _x * speed;
        var adjustedY = _y * speed;

        var doRedrawAVS = false;

        if (playerMoving) {
            // Perform hit mapping against the terrain.
            var hitmap = avatar.hitmap;
            if (_x) {
                // Are we hitting the right hitmap?
                if (_x > 0 && avatar.x + adjustedX + game.avatar.w > hitmap[1])
                    adjustedX = hitmap[1] - avatar.x - game.avatar.w;
                // What about the left hitmap?
                else if (_x < 0 && avatar.x + adjustedX < hitmap[3])
                    adjustedX = hitmap[3] - avatar.x;

                // Mark that we aren't moving if we've adjusted the hitmap not to move.
                if(!adjustedX) _x = 0;
            }

            if (_y) {
                // Are we hitting the bottom hitmap?
                if(_y > 0 && avatar.y + adjustedY + game.avatar.h > hitmap[2])
                    adjustedY = hitmap[2] - avatar.y - game.avatar.h;
                // What about the top hitmap?
                else if(_y < 0 && avatar.y + adjustedY < hitmap[0])
                    adjustedY = hitmap[0] - avatar.y;

                if(!adjustedY) _y = 0;
            }

            // Recompute whether the player is actually moving. Useful for when
            // we're backed into a corner or something; this will make the
            // player stop walking.
            playerMoving = _x || _y
        }

        if (playerMoving) {
            var update_y_hitmap = function() {
                var y_hitmap = hitmapping.generate_y(jgame.level.hitmap, avatar.x + 7.5, avatar.y - settings.tilesize);
                avatar.hitmap[0] = y_hitmap[0];
                avatar.hitmap[2] = y_hitmap[1] + 15;
            };
            var update_x_hitmap = function() {
                var x_hitmap = hitmapping.generate_x(jgame.level.hitmap, avatar.x + 7.5, avatar.y - settings.tilesize);
                avatar.hitmap[1] = x_hitmap[1] + 7.5;
                avatar.hitmap[3] = x_hitmap[0] - 7.5;
            };
            avatar.x += adjustedX;
            avatar.y += adjustedY;

            if (_x) update_y_hitmap();
            if (_y) update_x_hitmap();

            var spriteDirection = avatars.getSpriteDirection(_x, _y);
            if(_x != avatar.direction[0] || _y != avatar.direction[1]) {
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

            function beginSwapRegion(x, y, avx, avy) {
                avx = Math.floor(avx);
                avy = Math.floor(avy);
                jgutils.level.load(x, y, avx, avy);
            }
            if (jgame.level.can_slide) {
                // TODO: This should be moved to the server.
                if(_y < 0 && avatar.y < settings.tilesize / 2)
                    begin_swap_region(jgame.level.x, jgame.level.y - 1, avatar.x, avatar.y);
                else if(_y > 0 && avatar.y >= (jgame.level.h - 1) * settings.tilesize)
                    begin_swap_region(jgame.level.x, jgame.level.y + 1, avatar.x, avatar.y);
                else if(_x < 0 && avatar.x < settings.tilesize / 2)
                    begin_swap_region(jgame.level.x - 1, jgame.level.y, avatar.x, avatar.y);
                else if(_x > 0 && avatar.x >= (jgame.level.w - 1) * settings.tilesize)
                    begin_swap_region(jgame.level.x + 1, jgame.level.y, avatar.x, avatar.y);

            }

        } else if (_x || _y) {
            avatar.position = avatars.getSpriteDirection(_x, _y)[0].position;
            avatar.direction[0] = 0;
            avatar.direction[1] = 0;
            avatar.cycle_position = 0;
            avatar.dirty = true;
            avatars.draw('local');
            doRedrawAVS = true;
            updateLocation();
        }

        doRedrawAVS = avatars.tick() || doRedrawAVS;

        if (doSetCenter) jgutils.level.setCenterPosition();
        if (doRedrawAVS) avatars.redrawAvatars();

        objects.tick(ticks, speed);

    }

    return {
        start: function() {
            if (timer) return;
            tick();
            drawing.start();
            timer = setInterval(tick, settings.fps);
        },
        stop: function() {
            if (!timer) return;
            clearInterval(timer);
            timer = null;
            last = 0;
            drawing.stop();
        },
        getLastTick: function() {
            return last || Date.now();
        }
    };
});
