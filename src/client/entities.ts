import * as canvases from "./canvases";
import * as comm from "./comm";
import entitymovement from "./entitymovement";
import * as hitmapping from "./hitmapping";
import * as images from "./images";
import * as level from "./level";
import settings from "./settings";
import { Particle } from "./particles";

type SpriteSnapshot = { position: number; duration: number };
type Sprite = {
  left: ReadonlyArray<SpriteSnapshot>;
  right: ReadonlyArray<SpriteSnapshot>;
  up: ReadonlyArray<SpriteSnapshot>;
  down: ReadonlyArray<SpriteSnapshot>;
};

type Entity = {
  created: number;
  eid: string;

  canvas: HTMLCanvasElement;
  image: images.GameImages;

  speed: number;

  clip: false | { x: number; y: number; width: number; height: number };
  sprite?: Sprite;
  movement?: keyof typeof entitymovement;
  composite: null | GlobalCompositeOperation;
  xOffset: number;
  cycle_position: number;
  sprite_cycle: number;
  nametag: string | null;
  position: number;
  direction: [number, number];
  velocity: [number, number];
  hitmap: [number, number, number, number];
  x: number;
  y: number;
  width: number;
  height: number;

  particles: Array<Particle>;
};

const registry: Record<string, Entity> = {};
let follow = "local";

const avatarHeight = 32;
const avatarWidth = 32;
const avatarScale = settings.scales.entities;

// Add entity
comm.messages.on("add", function (body) {
  var break_ = body.indexOf("\n");
  if (break_ !== -1) {
    body = body.substr(0, break_);
  }

  const parsed = JSON.parse(body);
  const proto = parsed.proto;
  if (proto) {
    delete parsed.proto;
  }
  register(parsed, proto);
});

// Remove entity
comm.messages.on("del", function (body) {
  if (!(body in registry)) return;
  delete registry[body];
});

// Change entity properties
comm.messages.on("epu", function (body, origin) {
  if (!origin || !(origin in registry)) return;

  var break_ = body.indexOf("\n");
  if (break_ !== -1) {
    body = body.substr(0, break_);
  }

  var data = JSON.parse(body);
  var entity = registry[origin];
  if ("x" in data) {
    entity.x = data.x;
    delete data.x;
  }
  if ("y" in data) {
    entity.y = data.y;
    delete data.y;
  }

  if (data.direction) {
    entity.direction[0] = data.direction[0] | 0;
    entity.direction[1] = data.direction[1] | 0;
    delete data.direction;
  }

  if (data.velocity) {
    var oldVX = entity.velocity[0];
    var oldVY = entity.velocity[1];

    entity.velocity[0] = data.velocity[0] | 0;
    entity.velocity[1] = data.velocity[1] | 0;

    var sp_dir = getSpriteDirection(entity.direction[0], entity.direction[1]);
    if (!entity.velocity[0] && !entity.velocity[1] && (oldVX || oldVY)) {
      entity.position = sp_dir[0].position;
    } else {
      entity.position = sp_dir[1].position;
    }
    entity.cycle_position = 0;
    entity.sprite_cycle = 0;
    delete data.velocity;
  }

  if ("nametag" in data) {
    entity.nametag = data.nametag;
    delete data.nametag;
  }

  if ("width" in data) {
    data.width *= settings.tilesize;
  }

  if ("height" in data) {
    data.height *= settings.tilesize;
  }

  // for (var key in data) {
  //   if (!data.hasOwnProperty(key)) continue;
  //   entity[key] = data[key];
  // }

  if (follow === origin) {
    level.setCenterPosition();
  }

  draw(origin);
});

export function register(
  props: Partial<Entity> & {
    eid: string;
    x: number;
    y: number;
    width: number;
    height: number;
    image: images.GameImages;
  },
  proto?: keyof typeof settings.entityPrototypes
) {
  const entity: Entity = {
    created: Date.now(),

    nametag: null,
    speed: 0,
    position: settings.entityPrototypes.avatar.sprite.down[0].position,
    xOffset: 0,
    velocity: [0, 0],
    direction: [0, 1],
    hitmap: [0, Infinity, Infinity, 0],

    cycle_position: 0,
    sprite_cycle: 0,

    clip: false,
    composite: null,
    particles: [],
    ...props,
    ...(proto && settings.entityPrototypes[proto]),

    canvas: document.createElement("canvas"),
  };

  entity.width *= settings.tilesize;
  entity.height *= settings.tilesize;

  entity.canvas.width = entity.width;
  entity.canvas.height = entity.height;

  registry[entity.eid] = entity;
  draw(entity.eid);
}

export async function draw(id: string) {
  var entity = registry[id];
  var context = entity.canvas.getContext("2d")!;
  canvases.prepareContext(context);

  const [img] = await images.waitFor(entity.image);
  context.clearRect(0, 0, entity.width, entity.height);
  if (entity.sprite) {
    context.drawImage(
      img,
      ((entity.position % 3) * img.width) / 3,
      (((entity.position / 3) | 0) * img.height) / 4,
      img.width / 3,
      img.height / 4,
      0,
      0,
      entity.width,
      entity.height
    );
  } else if (entity.clip) {
    context.drawImage(
      img,
      entity.clip.x,
      entity.clip.y,
      entity.clip.width,
      entity.clip.height,
      0,
      0,
      entity.width,
      entity.height
    );
  } else {
    context.drawImage(img, 0, 0, img.width, img.height);
  }
}

export function getFollowing() {
  return registry[follow];
}

export function getSpriteDirection(x: number, y: number) {
  if (x < 0) return settings.entityPrototypes.avatar.sprite.left;
  else if (x > 0) return settings.entityPrototypes.avatar.sprite.right;
  else if (y < 0) return settings.entityPrototypes.avatar.sprite.up;
  else return settings.entityPrototypes.avatar.sprite.down;
}

register(
  {
    eid: "local",
    x: 0,
    y: 0,
    direction: [0, 0],
    speed: 0.0075,
    image: "avatar",
    width: 1,
    height: 1,
  },
  "avatar"
);

var firstLevel = true;
level.on("newLevel", function (width, height, hitmap) {
  var entity = registry.local;
  if (firstLevel) {
    entity.x = width / 2;
    entity.y = height / 2;
    firstLevel = false;
  }
  if (hitmap) {
    hitmapping.updateAvatarX(entity, hitmap);
    hitmapping.updateAvatarY(entity, hitmap);
  }
});

level.on("unload", function () {
  for (var entity in registry) {
    if (entity === "local") continue;
    delete registry[entity];
  }
  follow = "local";
});

export const getLocal = () => registry.local;

export function tick(ms: number) {
  for (const entity in registry) {
    const a = registry[entity];

    if (a.particles.length) {
      for (var i = a.particles.length - 1; i >= 0; i--) {
        if (a.particles[i].tick()) {
          a.particles.splice(i, 1);
        }
      }
    }

    let a_x = a.velocity[0];
    let a_y = a.velocity[1];
    if (!a_x && !a_y) continue;

    if (entity !== "local") {
      if (a_x && a_y) {
        a_x *= Math.SQRT1_2;
        a_y *= Math.SQRT1_2;
      }
      a.x += a_x * a.speed * ms;
      a.y += a_y * a.speed * ms;
    }

    const spriteDirection = getSpriteDirection(a.direction[0], a.direction[1]);
    if (a.sprite_cycle++ === spriteDirection[a.cycle_position].duration) {
      a.sprite_cycle = 0;
      a.cycle_position = a.cycle_position + 1 === 3 ? 1 : 2;
      a.position = spriteDirection[a.cycle_position].position;
      draw(entity);
    }
  }
}

export function drawAll(
  context: CanvasRenderingContext2D,
  state: [number, number, number, number, number, number, number, number]
) {
  var now = Date.now();
  var entities = [];

  // Ignore entities that are not onscreen.
  var entity;
  for (entity in registry) {
    var a = registry[entity];
    if (
      (state[0] > 0 &&
        (a.x < (state[0] - 1) / settings.tilesize ||
          a.x > (state[0] + state[2] + 1) / settings.tilesize)) ||
      (state[1] > 0 &&
        (a.y < (state[1] - 1) / settings.tilesize ||
          a.y - a.height > (state[1] + state[3] + 1) / settings.tilesize))
    ) {
      continue;
    }
    entities.push(a);
  }

  // Sort such that entities with a lower Y are further back.
  if (entities.length > 1) {
    entities.sort(function (a, b) {
      return a.y - b.y;
    });
  }

  const origCO = context.globalCompositeOperation;

  // Draw each entity in turn.
  for (const entity of entities) {
    let comp = entity.composite;

    let destX = entity.x * settings.tilesize + entity.xOffset - state[0];
    let destY = entity.y * settings.tilesize - entity.height - state[1];

    if (entity.movement) {
      const [movementX, movementY] = entitymovement[entity.movement];
      destX += movementX(now - entity.created);
      destY += movementY(now - entity.created);
    }

    if (entity.eid === "local") {
      if (settings.effect === "flip") {
        context.save();
        context.scale(1, -1);
        destY *= -1;
        destY -= entity.height;
      } else if (settings.effect === "invincible") {
        comp = "difference";
      }
    }

    if (comp) {
      context.globalCompositeOperation = comp;
    }

    context.drawImage(
      entity.canvas,
      0,
      0,
      entity.canvas.width,
      entity.canvas.height,
      destX,
      destY,
      entity.width,
      entity.height
    );

    if (entity.eid === "local") {
      if (settings.effect === "flip") {
        context.restore();
      }
    }
    if (comp) {
      context.globalCompositeOperation = origCO;
    }

    if (entity.nametag) {
      context.font = "30px VT323";
      const temp = context.measureText(entity.nametag);
      context.fillStyle = "rgba(0, 0, 0, 0.2)";
      context.fillRect(
        entity.width / 2 + destX - (temp.width + 20) / 2,
        destY - 10 - 15 - 20,
        temp.width + 20,
        15 + 20
      );
      context.fillStyle = "#000";
      context.fillText(
        entity.nametag,
        entity.width / 2 + destX - temp.width / 2 + 2,
        destY - 10 - 10 + 2
      );
      context.fillStyle = "#fff";
      context.fillText(
        entity.nametag,
        entity.width / 2 + destX - temp.width / 2,
        destY - 10 - 10
      );
    }

    if (entity.particles.length) {
      for (var j = 0; j < entity.particles.length; j++) {
        entity.particles[j].draw(
          context,
          entity.x * settings.tilesize - state[0],
          entity.y * settings.tilesize - state[1]
        );
      }
    }
  }
}

export function drawHitmappings(
  context: CanvasRenderingContext2D,
  state: [number, number, number, number, number, number, number, number]
) {
  const local = registry.local;
  context.lineWidth = 3;
  context.strokeStyle = "red";
  context.strokeRect(
    local.hitmap[3] * settings.tilesize - state[0],
    local.hitmap[0] * settings.tilesize - state[1],
    (local.hitmap[1] - local.hitmap[3]) * settings.tilesize,
    (local.hitmap[2] - local.hitmap[0]) * settings.tilesize
  );
}

export function resetFollow() {
  follow = "local";
}

export function addParticle(eid: string, particle: Particle) {
  if (!registry[eid]) return;
  registry[eid].particles.push(particle);
}
