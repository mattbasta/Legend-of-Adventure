import { EventType } from "../../../events.ts";
import { Behavior, type BehaviorClass } from "../behavior.ts";
import type { BehaviorHooks } from "../hooks.ts";

/**
 * Health and damage (ports resources/entities/harmable.js). Note that
 * `attacked` deliberately does not call next(): behaviors that want to
 * filter attacks (e.g. zombies ignoring zombies) sit closer to the head of
 * the chain and decide whether to delegate here.
 */
export class Harmable extends Behavior {
  static override readonly parents: ReadonlyArray<BehaviorClass> = [];

  private health = 0;
  private accumulatedDamage = 0;

  override readonly hooks: BehaviorHooks = {
    setup: (next) => {
      next();
      this.health = this.self.trigger("getHealth") ?? 20;
    },

    // Default health provider; species override this.
    getHealth: () => 20,

    attacked: (_next, _from, damage) => {
      this.self.trigger("wasHurt");
      this.accumulatedDamage += damage;
      // (The original also say()'d its remaining health aloud on every hit -
      // debug output that shipped; dropped.)
      if (this.accumulatedDamage >= this.health) {
        this.self.trigger("beforeDie");
        this.self.die();
      }
    },

    wasHurt: (next) => {
      this.self.trigger("bloodspatter");
      next();
    },

    bloodspatter: () => {
      this.self.sendEvent(
        EventType.PARTICLE_MACRO,
        `0.5 0 bloodspatter 5 ${this.self.eid}`,
      );
    },
  };
}
