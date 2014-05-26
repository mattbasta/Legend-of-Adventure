define('drawing', ['canvases', 'game', 'images', 'settings'], function(canvases, game, images, settings) {

    var tilesize = settings.tilesize;
    var tilesetTileSize = settings.tilesetTileSize;
    // var terrainScaling =

    var requestAnimationFrame = window.requestAnimationFrame || function(callback) {setTimeout(1000 / 30, callback);};

    var changed = {
        terrain: false,
        objects: false,
        avatars: false
    };
    var order = ['terrain', 'objects', 'avatars'];
    var lastDraw;
    var drawing;
    var state;

    /*
    State is in the following form:
    1. X coord of the left edge of where the level starts to draw
    2. Y coord of the top edge of where the level starts to draw
    3. Width of the drawing surface
    4. Height of the drawing surface
    5. The X coord in the layer canvases to clip from
    6. The Y coord in the layer canvases to clip from
    7. The width of the rectangle to clip from the layer canvases
    8. The height of the rectangle to clip from the layer canvases
    */

    function redrawBackground() {
        var tileset = game.images.tileset;
        if(!tileset) return;

        var c = canvases.getContext('terrain');

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

    function draw(forced) {
        var output = canvases.getContext('output');
        if(state && (changed.terrain || changed.objects || changed.avatars) || forced === true) {
            for(var i = 0; i < order.length; i++) {
                output.drawImage(
                    canvases.getCanvas(order[i]),
                    state[0], state[1], state[2], state[3],
                    state[4], state[5], state[6], state[7]
                );
                changed[order[i]] = false;
            }
        }
        var now = Date.now();
        if(settings.show_fps) {
            output.fillStyle = 'white';
            output.fillRect(0, 0, 20, 20);
            output.fillStyle = 'red';
            output.fillText((1000 / (now - lastDraw)) | 0 + '', 0, 10);
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
            requestAnimationFrame(draw);
        },
        stop: function() {
            drawing = false;
        },
        redrawBackground: function() {  // TODO: Rename to something more apt
            var c = canvases.getContext('terrain');

            images.waitFor(game.level.tileset).done(function(tileset) {
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
            });
        },
        forceRedraw: function() {
            draw(true);
        },
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
            draw(true);
        }
    };
});
