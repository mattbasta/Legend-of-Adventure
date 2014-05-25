define('drawing', ['game', 'settings'], function(game, settings) {

    var tilesize = settings.tilesize;
    var tilesetTileSize = 5;

    var requestAnimationFrame = window.requestAnimationFrame || function(callback) {setTimeout(1000 / 30, callback);};

    var changed = {
        terrain: false,
        objects: false,
        avatars: false
    };
    var order = ['terrain', 'objects', 'avatars'];
    var state;
    var lastDraw;
    var drawing;

    function redrawBackground() {
        var output = game.canvases.terrain;
        var tileset = game.images.tileset;

        if(!tileset) return;

        var c = output.getContext("2d");
        c.mozImageSmoothingEnabled = false;

        var terrain = game.level.level;
        var tilesetSize = tileset.width / tilesetTileSize;

        var spriteY;
        var spriteX;

        var xx;
        var yy = 0;
        for(var y = 0; y < game.level.h; y++) {
            xx = 0;
            for(var x = 0; x < game.level.w; x++) {

                spriteY = Math.floor(terrain[y][x] / tilesetTileSize) * tilesetSize;
                spriteX = (terrain[y][x] % tilesetTileSize) * tilesetSize;

                c.drawImage(tileset, spriteX, spriteY, tilesetSize, tilesetSize, xx, yy, tilesize, tilesize);
                xx += tilesize;
            }
            yy += tilesize;
        }
        changed.terrain = true;
    }

    redrawBackground();

    function draw() {
        var output = game.canvases.output.getContext("2d");
        if(state && (changed.terrain || changed.objects || changed.avatars)) {
            for(var i = 0; i < order.length; i++) {
                output.drawImage(
                    game.canvases[order[i]],
                    state[0], state[1], state[2], state[3],
                    state[4], state[5], state[6], state[7]
                );
                changed[order[i]] = false;
            }
        }
        var now = Date.now();
        if(settings.show_fps) {
            output.fillText((1000 / (now - lastDraw)) | 0 + '', 0, 20);
        }
        lastDraw = now;
        if(drawing)
            requestAnimationFrame(draw);
    }

    return {
        forceRecenter: function() {
            jgutils.level.setCenterPosition(true);
        },
        start: function() {
            drawing = true;
            reqAnimFrame(draw);
        },
        stop: function() {
            drawing = false;
        },
        redrawBackground: redrawBackground,
        forceRedraw: draw,
        setChanged: function(element) {
            if (!(element in changed)) return;
            changed[element] = true;
        },
        setState: function(x, y, w, h, x2, y2, w2, h2) {
            if (!state) state = [];
            state[0] = x;
            state[1] = y;
            state[2] = w;
            state[3] = h;
            state[4] = x2;
            state[5] = y2;
            state[6] = w2;
            state[7] = h2;
        }
    };
});
