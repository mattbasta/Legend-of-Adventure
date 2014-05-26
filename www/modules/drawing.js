define('drawing', ['canvases', 'game', 'images', 'settings'], function(canvases, game, images, settings) {

    var tilesize = settings.tilesize;
    var tilesetTileSize = settings.tilesetTileSize;
    // var terrainScaling =

    var requestAnimationFrame = window.requestAnimationFrame || function(cb) {setTimeout(cb, 1000 / 30);};

    var changed = {
        terrain: false,
        objects: false,
        avatars: false
    };
    var order = ['terrain', 'objects', 'avatars'];
    var lastDraw;
    var drawing = false;
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

    function draw() {
        var output = canvases.getContext('output');
        if(state && (changed.terrain || changed.objects || changed.avatars)) {
            var scale;
            for(var i = 0; i < order.length; i++) {
                scale = settings.scales[order[i]];
                output.drawImage(
                    canvases.getCanvas(order[i]),
                    state[0] * scale, state[1] * scale, state[2] * scale, state[3] * scale,
                    state[4], state[5], state[6], state[7]
                );
                changed[order[i]] = false;
            }
        }
        if(settings.show_fps) {
            output.fillStyle = 'white';
            output.fillRect(0, 0, 20, 20);
            output.fillStyle = 'red';
            var now = Date.now();
            output.fillText(1000 / (now - lastDraw) | 0, 0, 10);
            lastDraw = now;
        }
        if(drawing)
            requestAnimationFrame(draw);
    }

    return {
        forceRecenter: function() {
            jgutils.level.setCenterPosition(true);
        },
        start: function() {
            if (drawing) return;
            document.body.className = '';
            drawing = true;
            draw();
        },
        stop: function() {
            document.body.className = 'loading';
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

                        spriteY = Math.floor(terrain[y][x] / tilesetSize) * tilesetTileSize;
                        spriteX = (terrain[y][x] % tilesetSize) * tilesetTileSize;

                        c.drawImage(tileset, spriteX, spriteY, tilesetTileSize, tilesetTileSize, xx, yy, tilesetTileSize, tilesetTileSize);
                        xx += tilesetTileSize;
                    }
                    yy += tilesetTileSize;
                }
                changed.terrain = true;
            });
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
        }
    };
});
