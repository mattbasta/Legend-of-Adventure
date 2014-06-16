define('level',
    ['canvases', 'comm', 'events', 'offset', 'settings'],
    function(canvases, comm, events, offset, settings) {

    'use strict';

    var tilesize = settings.tilesize;

    var levelEvents = new events.EventTarget();

    window.addEventListener('resize', function() {
        offset.w = document.body.offsetWidth;
        offset.h = document.body.offsetHeight;
        setCenterPosition(true);
    });

    var levelData;

    function setCenterPosition(resize) {
        var level_h = levelData.h * tilesize;
        var level_w = levelData.w * tilesize;

        // Resize the terrain canvas if the window size has changed.
        var output_buffer = canvases.getCanvas('output');
        output_buffer.height = offset.h;
        output_buffer.width = offset.w;

        if(offset.h > level_h)
            offset.y = ((offset.h / 2 - level_h / 2) | 0) * -1;
        if(offset.w > level_w)
            offset.x = ((offset.w / 2 - level_w / 2) | 0) * -1;

        var avatar = require('entities').getFollowing();
        var x = avatar.x * tilesize;
        var y = avatar.y * tilesize;

        var c_offsetw = offset.w,
            c_offseth = offset.h;

        var moveavatar_x = true,
            moveavatar_y = true;

        var temp;

        if (level_w > c_offsetw) { // The scene isn't narrower than the canvas

            var half_w = c_offsetw / 2;

            if (x < half_w) {
                offset.x = 0;
            } else if (x > (temp = (level_w - half_w))) {
                offset.x = temp - half_w;
            } else {
                offset.x = x - half_w;
                moveavatar_x = false;
            }

        } else {
            offset.x = (c_offsetw / 2 - level_w / 2) * -1;
        }

        offset.x = offset.x | 0;

        if (level_h > c_offseth) { // The scene isn't narrower than the canvas

            var half_h = c_offseth / 2;

            if (y < half_h) {
                offset.y = 0;
            } else if (y > (temp = level_h - half_h)) {
                offset.y = temp - half_h;
            } else {
                offset.y = y - half_h;
                moveavatar_y = false;
            }

        } else {
            offset.y = (c_offseth / 2 - level_h / 2) * -1;
        }

        offset.y = offset.y | 0;

        var n_x = offset.x * -1;
        var n_y = offset.y * -1;

        levelEvents.fire(
            'stateUpdated',
            offset.x, offset.y,
            Math.min(output_buffer.clientWidth, level_w), Math.min(output_buffer.clientHeight, level_h),
            Math.max(n_x, 0), Math.max(n_y, 0),
            Math.min(output_buffer.clientWidth, level_w), Math.min(output_buffer.clientHeight, level_h)
        );
    }

    var alreadyListening = false;
    function registerLevel(position) {
        if (alreadyListening) return;
        unload();
        alreadyListening = true;
        comm.ready.done(function() {
            comm.messages.one('lev', function(body) {
                alreadyListening = false;
                prepare(JSON.parse(body));
            });
            if (position) comm.send('lev', position);
        });
    }

    // Location change notification
    comm.messages.on('flv', function() {
        registerLevel(); // We want to strip the args.
    });

    function prepare(data) {
        levelData = data;
        canvases.setSizes(data.w * tilesize, data.h * tilesize);
        levelEvents.fire('newLevel', data.w, data.h, data.hitmap);

        init();
    }

    function init() {
        setCenterPosition();
        require('defer').when.apply(
            null,
            levelEvents.fire('redraw')
        ).done(function() {
            // Start everything back up
            setCenterPosition();
            console.log('Unpausing game');
            levelEvents.fire('unpause');
        });
    }

    function unload() {
        // Remove everything level-specific
        console.log('Pausing game');
        levelEvents.fire('pause');
        levelEvents.fire('unload');
    }

    // Bind initial startup handlers.
    registerLevel();

    return {
        load: function(x, y) {
            registerLevel(x + ':' + y);
        },
        setCenterPosition: setCenterPosition,
        canSlide: function() {return !!levelData.can_slide;},
        getTileset: function() {return levelData.tileset;},
        getHitmap: function() {return levelData.hitmap;},
        getTerrain: function() {return levelData.level;},
        getX: function() {return levelData.x;},
        getY: function() {return levelData.y;},
        getH: function() {return levelData.h;},
        getW: function() {return levelData.w;},
        on: levelEvents.on
    };
});
