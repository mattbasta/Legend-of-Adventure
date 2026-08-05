import { describe, it } from "node:test";
import * as assert from "assert";

import { linearize } from "../src/entities/npc/behavior.ts";
import { NpcEntity } from "../src/entities/npc/npcEntity.ts";
import { Animat } from "../src/entities/npc/behaviors/animat.ts";
import { Harmable } from "../src/entities/npc/behaviors/harmable.ts";
import { Peaceful } from "../src/entities/npc/behaviors/peaceful.ts";
import { Sentient } from "../src/entities/npc/behaviors/sentient.ts";
import { Sheep } from "../src/entities/npc/species/sheep.ts";
import { Event, EventType } from "../src/events.ts";
import { MT } from "../src/rng.ts";
import { Hitmap } from "../src/terrain.ts";
import type { Region } from "../src/regions.ts";
import type { Entity, EntityType } from "../src/types.ts";
import { entityUpdateBody } from "../src/wire.ts";

/**
 * A minimal in-memory region: open 100x100 terrain, captured broadcasts, no
 * ticker. Only the surface NpcEntity actually touches.
 */
class FakeRegion {
  id = "overworld,field:0:0";
  terrain = {
    width: 100,
    height: 100,
    hitmap: new Hitmap(100, 100),
    portals: new Set(),
  };
  entities = new Set<Entity>();
  entityMap = new Map<string, Entity>();
  broadcasts: Array<Event> = [];
  spawned: Array<{ type: EntityType; x: number; y: number }> = [];

  broadcast(event: Event) {
    this.broadcasts.push(event);
  }
  addEntity(entity: Entity) {
    this.entities.add(entity);
    this.entityMap.set(entity.eid, entity);
  }
  removeEntity(entity: Entity) {
    this.entities.delete(entity);
    this.entityMap.delete(entity.eid);
  }
  getEntity(eid: string) {
    return this.entityMap.get(eid) ?? null;
  }
  spawn(type: EntityType, x: number, y: number) {
    this.spawned.push({ type, x, y });
    return "e0";
  }

  asRegion(): Region {
    return this as unknown as Region;
  }

  eventsOfType(type: EventType) {
    return this.broadcasts.filter((event) => event.type === type);
  }
}

function makeSheep(region: FakeRegion, seed = 42) {
  let now = 0;
  const sheep = new NpcEntity("sheep", region.asRegion(), Sheep, {
    rng: new MT(seed),
    clock: () => now,
  });
  sheep.setPosition(50, 50);
  region.addEntity(sheep);
  // Region tick cadence is 100ms.
  const advance = (toMs: number) => {
    while (now < toMs) {
      now += 100;
      sheep.tick(now);
    }
  };
  return { sheep, advance };
}

describe("behavior linearization", () => {
  it("linearizes Sheep as [Sheep, Peaceful, Sentient, Harmable, Animat]", () => {
    assert.deepStrictEqual(linearize(Sheep), [
      Sheep,
      Peaceful,
      Sentient,
      Harmable,
      Animat,
    ]);
  });
});

describe("entityUpdateBody", () => {
  it("frames the payload with trailing coordinates", () => {
    assert.strictEqual(
      entityUpdateBody({ x: 1, y: 2 }, 1.5, 2.5),
      '{"x":1,"y":2}\n1.5 2.5',
    );
  });
});

describe("sheep", () => {
  it("describes itself for the client", () => {
    const region = new FakeRegion();
    const { sheep } = makeSheep(region);
    const description = sheep.getMetadata();
    assert.strictEqual(description["image"], "sheep");
    assert.strictEqual(description["proto"], "animal");
    assert.strictEqual(description["nametag"], "Innocent Sheep");
    assert.strictEqual(sheep.speed, 0.00075);
  });

  it("starts wandering and broadcasts a sheepBounce location update", () => {
    const region = new FakeRegion();
    const { sheep, advance } = makeSheep(region);

    advance(1000);

    const updates = region.eventsOfType(EventType.ENTITY_UPDATE);
    assert.ok(updates.length >= 1, "expected at least one location update");
    const first = JSON.parse(updates[0]!.body.split("\n")[0]!);
    assert.strictEqual(first.movement, "sheepBounce");
    assert.ok(
      first.velocity[0] !== 0 || first.velocity[1] !== 0,
      "expected nonzero velocity while wandering",
    );
  });

  it("moves over time and stays inside the level", () => {
    const region = new FakeRegion();
    const { sheep, advance } = makeSheep(region);

    const startX = sheep.x;
    const startY = sheep.y;
    advance(30_000);

    assert.ok(
      sheep.x !== startX || sheep.y !== startY,
      "expected the sheep to have moved",
    );
    assert.ok(sheep.x >= 1 && sheep.x <= 98, `x out of bounds: ${sheep.x}`);
    assert.ok(sheep.y >= 2 && sheep.y <= 99, `y out of bounds: ${sheep.y}`);
  });

  it("never walks into hitmap walls", () => {
    const region = new FakeRegion();
    // Wall off a tight 6x6 pen around the spawn point.
    for (let i = 46; i <= 54; i++) {
      region.terrain.hitmap.set(i, 46);
      region.terrain.hitmap.set(i, 54);
      region.terrain.hitmap.set(46, i);
      region.terrain.hitmap.set(54, i);
    }
    const { sheep, advance } = makeSheep(region);

    for (let t = 0; t < 60_000; t += 1000) {
      advance(t);
      assert.ok(
        sheep.x > 46 && sheep.x < 54 && sheep.y > 46 && sheep.y < 55,
        `sheep escaped the pen at (${sheep.x}, ${sheep.y})`,
      );
    }
  });

  it("bleats within the scheduled window", () => {
    const region = new FakeRegion();
    const { advance } = makeSheep(region);

    advance(21_000);

    const sounds = region
      .eventsOfType(EventType.SOUND)
      .filter((event) => event.body.startsWith("bleat:"));
    assert.ok(sounds.length >= 1, "expected at least one bleat within 21s");
  });

  it("flees and grunts when attacked, and dies after enough hits", () => {
    const region = new FakeRegion();
    const attacker = {
      eid: "attacker",
      type: "player",
      x: 50.2,
      y: 50.2,
      width: 1,
      height: 1,
    } as unknown as Entity;
    region.addEntity(attacker);

    const { sheep, advance } = makeSheep(region);
    advance(200);

    const attack = () => {
      sheep.onEvent(
        new Event(
          EventType.DIRECT_ATTACK,
          `${sheep.x} ${sheep.y} wsw.sharp.1`,
          attacker,
        ),
      );
    };

    attack();
    advance(400);

    assert.ok(
      region
        .eventsOfType(EventType.PARTICLE_MACRO)
        .some((event) => event.body.includes("bloodspatter")),
      "expected a bloodspatter particle macro",
    );
    assert.ok(
      region
        .eventsOfType(EventType.SOUND)
        .some((event) => event.body.startsWith("hit_grunt")),
      "expected a hit grunt",
    );

    // 20 health, 10 damage per hit: one more kills it.
    attack();
    advance(600);

    assert.ok(sheep.isDead, "expected the sheep to be dead");
    assert.strictEqual(region.eventsOfType(EventType.DEATH).length, 1);
    assert.ok(
      !region.entities.has(sheep as unknown as Entity),
      "dead sheep should leave the region",
    );
  });
});
