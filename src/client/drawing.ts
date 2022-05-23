import * as canvases from "./canvases";
import * as comm from "./comm";
import * as entities from "./entities";
import * as images from "./images";
import * as level from "./level";
import * as particles from "./particles";
import settings from "./settings";

var drawnTileSize = settings.tilesize;
var terrainChunkSize = settings.terrainChunkSize;
var tilesPerRow = settings.tilesPerRow;

let lastDraw = Date.now();
let drawing = false;
var finishingDraw = false;
let state: [number, number, number, number, number, number, number, number] = [
  0, 0, 0, 0, 0, 0, 0, 0,
];

var terrainBuffers: Array<Array<HTMLCanvasElement>> = [];

const activeParticles: Array<particles.Particle> = [];

// Particles
comm.messages.on("par", function (body) {
  body.split("\n").forEach(function (particle) {
    if (!particle) {
      return;
    }
    var data = particle.split(" ");
    var parInst = new particles.RawParticle(
      parseFloat(data[4]),
      parseFloat(data[3]),
      data[2] // Color is not an integer
    );
    parInst.setPosition(
      parseFloat(data[0]) * drawnTileSize,
      parseFloat(data[1]) * drawnTileSize
    );
    // if (data[5]) {
    //   parInst.init(data[5]);
    // }
    if (data[6]) {
      entities.addParticle(data[6], parInst);
    } else {
      activeParticles.push(parInst);
    }
  });
});

// Particle macros
comm.messages.on("pma", function (body) {
  body.split("\n").forEach(function (particle) {
    if (!particle) {
      return;
    }
    const data = particle.split(" ");
    for (let i = 0; i < parseFloat(data[3]); i++) {
      const parInst = particles.macro(data[2]);
      parInst.setPosition(
        parseFloat(data[0]) * drawnTileSize,
        parseFloat(data[1]) * drawnTileSize
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

  var output = canvases.getContext("output");

  var i;
  if (state) {
    var scale;
    var j;

    if (settings.effect === "drained") {
      output.globalCompositeOperation = "luminosity";
      output.fillStyle = "white";
      output.fillRect(state[4], state[5], state[2], state[3]);
    } else {
      output.globalCompositeOperation = "source-over";
    }

    // Draw the terrain
    scale = settings.scales.terrain;
    var topmostTB = Math.floor(state[1] / drawnTileSize / terrainChunkSize);
    var leftmostTB = Math.floor(state[0] / drawnTileSize / terrainChunkSize);
    var bottommostTB = Math.ceil(
      (state[1] + state[3]) / drawnTileSize / terrainChunkSize
    );
    var rightmostTB = Math.ceil(
      (state[0] + state[2]) / drawnTileSize / terrainChunkSize
    );

    topmostTB = Math.max(Math.min(topmostTB, terrainBuffers.length - 1), 0);
    leftmostTB = Math.max(
      Math.min(leftmostTB, terrainBuffers[0].length - 1),
      0
    );
    bottommostTB = Math.max(
      Math.min(bottommostTB, terrainBuffers.length - 1),
      0
    );
    rightmostTB = Math.max(
      Math.min(rightmostTB, terrainBuffers[0].length - 1),
      0
    );

    for (i = topmostTB; i <= bottommostTB; i++) {
      for (j = leftmostTB; j <= rightmostTB; j++) {
        output.drawImage(
          terrainBuffers[i][j],
          0,
          0,
          terrainBuffers[i][j].width,
          terrainBuffers[i][j].height,
          j * drawnTileSize * terrainChunkSize - state[0],
          i * drawnTileSize * terrainChunkSize - state[1],
          drawnTileSize * terrainChunkSize,
          drawnTileSize * terrainChunkSize
        );
      }
    }

    // Draw the entities
    entities.drawAll(output, state);

    // Draw the region particles
    for (i = 0; i < activeParticles.length; i++) {
      activeParticles[i].draw(output, -1 * state[0], -1 * state[1]);
    }

    if (settings.effect === "drained") {
      output.globalCompositeOperation = "source-over";
    }
  }
  if (settings.show_fps) {
    output.fillStyle = "white";
    output.fillRect(0, 0, 20, 20);
    output.fillStyle = "red";
    var now = Date.now();
    output.fillText(String(Math.floor(1000 / (now - lastDraw))), 0, 10);
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

  if (settings.effect === "blindness") {
    output.fillStyle = "rgba(0, 0, 0, 0.85)";
    output.fillRect(0, 0, output.canvas.width, output.canvas.height);
  } else if (settings.effect === "flip") {
    output.restore();
  }
}

async function redrawTerrain() {
  activeParticles.splice(0, activeParticles.length);
  const [tileset] = await images.waitFor(level.getTileset());
  const tileSize = tileset.width / tilesPerRow;
  const bufferSize = tileSize * terrainChunkSize;

  const terrain = level.getTerrain();
  const hitmap = level.getHitmap();
  const terrainH = terrain.length;
  const terrainW = terrain[0].length;

  for (let y = 0; y < Math.ceil(terrainH / terrainChunkSize); y++) {
    const buf = new Array(Math.ceil(terrainW / terrainChunkSize));
    for (let x = 0; x < Math.ceil(terrainW / terrainChunkSize); x++) {
      const buffer = document.createElement("canvas");
      buf[x] = buffer;
      buffer.height = bufferSize;
      buffer.width = bufferSize;
      const bufferCtx = canvases.prepareContext(buffer.getContext("2d")!);
      for (let i = 0; i < terrainChunkSize; i++) {
        if (y * terrainChunkSize + i >= terrain.length) continue;
        for (let j = 0; j < terrainChunkSize; j++) {
          if (
            x * terrainChunkSize + j >=
            terrain[y * terrainChunkSize + i].length
          )
            continue;
          const cell =
            terrain[y * terrainChunkSize + i][x * terrainChunkSize + j];
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
          if (settings.show_hitmap) {
            if (hitmap[y * terrainChunkSize + i][x * terrainChunkSize + j]) {
              bufferCtx.strokeStyle = "red";
              bufferCtx.beginPath();
              bufferCtx.moveTo(j * tileSize, i * tileSize);
              bufferCtx.lineTo((j + 1) * tileSize, (i + 1) * tileSize);
              bufferCtx.moveTo((j + 1) * tileSize, i * tileSize);
              bufferCtx.lineTo(j * tileSize, (i + 1) * tileSize);
              bufferCtx.stroke();
              bufferCtx.closePath();
            }
          }
          if (settings.show_tileval) {
            bufferCtx.fillStyle = "blue";
            bufferCtx.font = "8px monospace";
            bufferCtx.fillText(String(cell), j * tileSize, i * tileSize + 8);
          }
        }
      }

      if (settings.show_hitmap) {
        for (const portal of level.getPortals()) {
          const hostChunkX = Math.floor(portal.x / terrainChunkSize);
          const hostChunkY = Math.floor(portal.y / terrainChunkSize);
          // Only draw portals in this chunk
          if (hostChunkX !== x || hostChunkY !== y) {
            continue;
          }
          const bufferX =
            (portal.x / terrainChunkSize - hostChunkX) *
            terrainChunkSize *
            tileSize;
          const bufferY =
            (portal.y / terrainChunkSize - hostChunkY) *
            terrainChunkSize *
            tileSize;
          bufferCtx.beginPath();
          bufferCtx.moveTo(bufferX, bufferY);
          bufferCtx.fillStyle = "yellow";
          bufferCtx.font = "10px monospace";
          bufferCtx.fillText(portal.target, bufferX, bufferY);
          bufferCtx.strokeStyle = "green";
          bufferCtx.lineTo(bufferX + tileSize * portal.width, bufferY);
          bufferCtx.lineTo(
            bufferX + tileSize * portal.width,
            bufferY + tileSize * portal.height
          );
          bufferCtx.lineTo(bufferX, bufferY + tileSize * portal.height);
          bufferCtx.lineTo(bufferX, bufferY);
          bufferCtx.stroke();
          bufferCtx.closePath();
        }
      }
    }
    terrainBuffers[y] = buf;
  }
}

function setState(
  x: number,
  y: number,
  w: number,
  h: number,
  x2: number,
  y2: number,
  w2: number,
  h2: number
) {
  if (!state) state = [] as any;
  state[0] = x;
  state[1] = y;
  state[2] = w;
  state[3] = h;
  state[4] = x2;
  state[5] = y2;
  state[6] = w2;
  state[7] = h2;
}

export function start() {
  if (finishingDraw) {
    drawing = true;
    return;
  }
  if (drawing) return;
  drawing = true;
  document.body.className = "";
  draw();
}
export function stop() {
  var output = canvases.getContext("output");
  output.clearRect(0, 0, output.canvas.width, output.canvas.height);
  document.body.className = "loading";
  if (drawing) {
    finishingDraw = true;
  }
  drawing = false;
}

level.on("pause", stop);
level.on("unpause", start);
level.on("stateUpdated", setState);
level.on("redraw", redrawTerrain);
