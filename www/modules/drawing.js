define('drawing',
    ['canvases', 'comm', 'entities', 'images', 'level', 'particles', 'settings'],
    function(canvases, comm, entities, images, level, Particle, settings) {

    'use strict';

    var tilesize = settings.tilesize;
    var tilesetTileSize = settings.tilesetTileSize;
    var terrainChunkSize = settings.terrainChunkSize;
    var tilesPerRow = settings.tilesPerRow;

    var requestAnimationFrame = window.requestAnimationFrame || function(cb) {setTimeout(cb, terrainChunkSize00 / 30);};

    var lastDraw;
    var drawing = false;
    var finishingDraw = false;
    var state;

    var terrainBuffers = [];

    var activeParticles = [];

    // Particles
    comm.messages.on('par', function(body) {
        body.split('\n').forEach(function(particle) {
            if (!particle) {
                return;
            }
            var data = particle.split(' ');
            var parInst = new Particle(
                data[4] | 0,
                data[3] | 0,
                data[2]  // Color is not an integer
            );
            parInst.setPosition(
                parseFloat(data[0]) * tilesize,
                parseFloat(data[1]) * tilesize
            );
            if (data[5]) {
                parInst.init(data[5]);
            }
            if (data[6]) {
                entities.addParticle(data[6], parInst);
            } else {
                activeParticles.push(parInst);
            }
        });
    });

    // Particle macros
    comm.messages.on('pma', function(body) {
        body.split('\n').forEach(function(particle) {
            if (!particle) {
                return;
            }
            var data = particle.split(' ');
            for (var i = 0; i < (data[3] | 0); i++) {
                var parInst = Particle.macro(data[2]);
                parInst.setPosition(
                    parseFloat(data[0]) * tilesize,
                    parseFloat(data[1]) * tilesize
                );
                if (data[4]) {
                    entities.addParticle(data[4], parInst);
                } else {
                    activeParticles.push(parInst);
                }
            }
        });
    });

    /*
    State is in the following form:
    0. X coord of the left edge of where the level starts to draw
    1. Y coord of the top edge of where the level starts to draw
    2. Width of the drawing surface
    3. Height of the drawing surface
    4. The X coord in the layer canvases to clip from
    5. The Y coord in the layer canvases to clip from
    6. The width of the rectangle to clip from the layer canvases
    7. The height of the rectangle to clip from the layer canvases
    */

    function draw() {
        if (drawing) {
            requestAnimationFrame(draw);
        } else {
            finishingDraw = false;
        }

        if (!terrainBuffers.length || !terrainBuffers[0].length) return;

        var output = canvases.getContext('output');


        var i;
        if (state) {
            var scale;
            var j;

            if (settings.effect === 'drained') {
                output.globalCompositeOperation = 'luminosity';
                output.fillStyle = 'white';
                output.fillRect(state[4], state[5], state[2], state[3]);
            } else {
                output.globalCompositeOperation = null;
            }

            // Draw the terrain
            scale = settings.scales.terrain;
            var topmostTB = Math.floor(state[1] / tilesize / terrainChunkSize);
            var leftmostTB = Math.floor(state[0] / tilesize / terrainChunkSize);
            var bottommostTB = Math.ceil((state[1] + state[3]) / tilesize / terrainChunkSize);
            var rightmostTB = Math.ceil((state[0] + state[2]) / tilesize / terrainChunkSize);

            topmostTB = Math.max(Math.min(topmostTB, terrainBuffers.length - 1), 0);
            leftmostTB = Math.max(Math.min(leftmostTB, terrainBuffers[0].length - 1), 0);
            bottommostTB = Math.max(Math.min(bottommostTB, terrainBuffers.length - 1), 0);
            rightmostTB = Math.max(Math.min(rightmostTB, terrainBuffers[0].length - 1), 0);

            for (i = topmostTB; i <= bottommostTB; i++) {
                for (j = leftmostTB; j <= rightmostTB; j++) {
                    output.drawImage(
                        terrainBuffers[i][j],
                        0, 0, terrainBuffers[i][j].width, terrainBuffers[i][j].height,
                        j * tilesize * terrainChunkSize - state[0],
                        i * tilesize * terrainChunkSize - state[1],
                        tilesize * terrainChunkSize,
                        tilesize * terrainChunkSize
                    );
                }
            }

            // Draw the entities
            entities.drawAll(output, state);

            // Draw the region particles
            for (i = 0; i < activeParticles.length; i++) {
                activeParticles[i].draw(output, -1 * state[0], -1 * state[1]);
            }

            if (settings.effect === 'drained') {
                output.globalCompositeOperation = '';
            }

        }
        if (settings.show_fps) {
            output.fillStyle = 'white';
            output.fillRect(0, 0, 20, 20);
            output.fillStyle = 'red';
            var now = Date.now();
            output.fillText(1000 / (now - lastDraw) | 0, 0, 10);
            lastDraw = now;
        }
        if (settings.show_hitmappings) {
            entities.drawHitmappings(output, state);
        }

        // Update each region particle
        for (i = activeParticles.length - 1; i >= 0; i--) {
            if (activeParticles[i].tick()) {
                activeParticles.splice(i, 1);
            }
        }

        if (settings.effect === 'blindness') {
            output.fillStyle = 'rgba(0, 0, 0, 0.85)';
            output.fillRect(0, 0, output.canvas.width, output.canvas.height);
        } else if (settings.effect === 'flip') {
            output.restore();
        }
    }

    function redrawTerrain() {
        activeParticles = [];
        images.waitFor(level.getTileset()).done(function(tileset) {
            var c = canvases.getContext('terrain');
            var tileSize = tileset.width / tilesPerRow;
            var bufferSize = tileSize * terrainChunkSize;

            var terrain = level.getTerrain();
            var hitmap = settings.show_hitmap ? level.getHitmap() : null;
            var terrainH = terrain.length;
            var terrainW = terrain[0].length;

            var spriteY;
            var spriteX;

            var buffer;
            var bufferCtx;
            var cell;
            for (var y = 0; y < Math.ceil(terrainH / terrainChunkSize); y++) {
                terrainBuffers[y] = [];
                for (var x = 0; x < Math.ceil(terrainW / terrainChunkSize); x++) {
                    terrainBuffers[y][x] = buffer = document.createElement('canvas');
                    buffer.height = bufferSize;
                    buffer.width = bufferSize;
                    bufferCtx = canvases.prepareContext(buffer.getContext('2d'));
                    for (var i = 0; i < terrainChunkSize; i++) {
                        if (y * terrainChunkSize + i >= terrain.length) continue;
                        for (var j = 0; j < terrainChunkSize; j++) {
                            if (x * terrainChunkSize + j >= terrain[y * terrainChunkSize + i].length) continue;
                            var cell = terrain[y * terrainChunkSize + i][x * terrainChunkSize + j];
                            bufferCtx.drawImage(
                                tileset,
                                (cell % tilesPerRow) * tileSize,
                                Math.floor(cell / tilesPerRow) * tileSize,
                                tileSize,
                                tileSize,
                                j * tileSize,
                                i * tileSize,
                                tileSize,
                                tileSize
                            );
                            if (settings.show_hitmap && hitmap[y * terrainChunkSize + i][x * terrainChunkSize + j]) {
                                bufferCtx.strokeStyle = 'red';
                                bufferCtx.moveTo(j * tileSize, i * tileSize);
                                bufferCtx.lineTo((j + 1) * tileSize, (i + 1) * tileSize);
                                bufferCtx.moveTo((j + 1) * tileSize, i * tileSize);
                                bufferCtx.lineTo(j * tileSize, (i + 1) * tileSize);
                                bufferCtx.stroke();
                            }
                        }
                    }

                }
            }
        });
    }

    function setState(x, y, w, h, x2, y2, w2, h2) {
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

    function start() {
        if (finishingDraw) {
            drawing = true;
            return;
        }
        if (drawing) return;
        drawing = true;
        document.body.className = '';
        draw();
    }
    function stop() {
        var output = canvases.getContext('output');
        output.clearRect(0, 0, output.canvas.width, output.canvas.height);
        document.body.className = 'loading';
        if (drawing) {
            finishingDraw = true;
        }
        drawing = false;
    }

    level.on('pause', stop);
    level.on('unpause', start);
    level.on('stateUpdated', setState);
    level.on('redraw', redrawTerrain);

    return {
        start: start,
        stop: stop
    };
});
