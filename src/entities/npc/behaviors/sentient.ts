import { EventType } from "../../../events.ts";
import { Behavior, type BehaviorClass } from "../behavior.ts";
import type { BehaviorHooks } from "../hooks.ts";
import { DIRECTIONS } from "../pathing.ts";
import { Animat } from "./animat.ts";
import { Harmable } from "./harmable.ts";

const FLEE_DISTANCE = 15;
const HURT_DISTANCE = 1;

/**
 * The AI state machine (ports resources/entities/sentient.js): wandering,
 * chasing, fleeing, and melee attacks, driven by the vector-field pathing
 * staged fresh each decision.
 */
export class Sentient extends Behavior {
  static override readonly parents: ReadonlyArray<BehaviorClass> = [
    Harmable,
    Animat,
  ];

  private fleeingFrom: Array<string> = [];
  private chasing: string | null = null;
  private wandering = false;
  private wanderDir: readonly [number, number] | null = null;

  private getBestDirection(
    wandering = false,
  ): readonly [number, number] | null {
    const { x, y } = this.self;
    this.self.pathing.stageAvailableTiles(
      x,
      y,
      this.self.trigger("getWidth") ?? 1,
      this.self.trigger("getHeight") ?? 1,
    );
    this.self.trigger("stagePathElements", x, y);
    const best = this.self.trigger("getDirectionToBestTile", wandering);
    if (best === null || best === undefined) {
      return null;
    }
    return DIRECTIONS[best] ?? null;
  }

  private reevaluateBehavior() {
    let stillMustFlee = false;
    for (const id of this.fleeingFrom) {
      const dist = this.self.distanceTo(id);
      if (dist === null) {
        continue;
      }
      if (dist < FLEE_DISTANCE) {
        stillMustFlee = true;
        break;
      }
    }

    if (!this.chasing && !stillMustFlee) {
      if (this.fleeingFrom.length) {
        this.fleeingFrom = [];
      }
      this.self.trigger("wander");
      return;
    }

    if (this.chasing) {
      const dist = this.self.distanceTo(this.chasing);
      if (dist === null || dist > FLEE_DISTANCE) {
        this.self.trigger("stopChasing");
        this.reevaluateBehavior();
        return;
      }
      // Try tossing out an attack.
      if (this.self.trigger("doesAttack") && dist <= HURT_DISTANCE) {
        this.self.sendEvent(
          EventType.DIRECT_ATTACK,
          `${this.self.x} ${this.self.y} ${
            this.self.trigger("holdingWeapon") ?? "null"
          }`,
        );
      }
      // If what we're chasing is in range, stop to try to attack it.
      if (dist < HURT_DISTANCE) {
        this.self.trigger("stopMoving");
        return;
      }
    }

    const best = this.getBestDirection();
    if (!best) {
      // The best direction is to not move.
      this.self.trigger("stopMoving");
    } else {
      this.self.trigger("startMoving", best[0], best[1]);
    }
  }

  override readonly hooks: BehaviorHooks = {
    forget: (next, id) => {
      next();
      if (this.chasing === id) {
        this.self.trigger("stopChasing");
      }
      // (The original's `if (idx)` skipped index 0 and spliced -1 on missing
      // ids - a straightforward bug, fixed here.)
      const idx = this.fleeingFrom.indexOf(id);
      if (idx !== -1) {
        this.fleeingFrom.splice(idx, 1);
      }
    },

    flee: (_next, id) => {
      const dist = this.self.distanceTo(id);
      if (dist === null || dist > FLEE_DISTANCE) {
        return;
      }
      if (!this.fleeingFrom.includes(id)) {
        this.fleeingFrom.push(id);
      }
    },

    chase: (_next, id) => {
      if (this.chasing === id) {
        return;
      }
      this.chasing = id;
    },

    stopChasing: () => {
      this.chasing = null;
    },

    wander: () => {
      // If we're chasing or fleeing, don't start wandering.
      if (this.chasing || this.fleeingFrom.length || this.wandering) {
        return;
      }

      const best = this.getBestDirection(true);
      if (!best) {
        return;
      }
      this.wanderDir = best;
      this.wandering = true;
      this.self.trigger("startMoving", best[0], best[1]);
      this.self.schedule(
        () => this.self.trigger("stopWandering"),
        this.self.rng.uniform() * 3000 + 1000,
      );
    },

    stopWandering: () => {
      this.wandering = false;

      this.self.schedule(
        () => this.self.trigger("wander"),
        this.self.rng.uniform() * 2000 + 1000,
      );

      if (this.chasing || this.fleeingFrom.length) {
        this.reevaluateBehavior();
        return;
      }
      this.self.trigger("stopMoving");
    },

    tick: (next) => {
      next();
      if (this.chasing || this.fleeingFrom.length) {
        this.reevaluateBehavior();
      } else if (this.wandering && this.wanderDir) {
        const dirOk = this.self.pathing.isDirectionOk(
          this.self.x,
          this.self.y,
          this.self.trigger("getWidth") ?? 1,
          this.self.trigger("getHeight") ?? 1,
          this.wanderDir[0],
          this.wanderDir[1],
        );
        if (!dirOk) {
          const best = this.getBestDirection();
          if (!best) {
            this.self.trigger("stopMoving");
            return;
          }
          this.wanderDir = best;
          this.self.trigger("startMoving", best[0], best[1]);
        }
      }
    },

    stagePathElements: () => {
      if (this.chasing) {
        this.self.pathing.stageAttractor(this.chasing);
      }
      for (const id of this.fleeingFrom) {
        this.self.pathing.stageRepeller(id);
      }
    },

    getDirectionToBestTile: () => this.self.pathing.getDirectionToBestTile(),

    wasHurt: (next) => {
      next();
      this.self.sendEvent(
        EventType.SOUND,
        `hit_grunt${(this.self.rng.uniform() * 4) | 0}:${this.self.x}:${
          this.self.y
        }`,
      );
    },
  };
}
