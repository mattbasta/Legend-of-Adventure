import { EventType } from "../../../events.ts";
import { Behavior, type BehaviorClass } from "../behavior.ts";
import type { BehaviorHooks } from "../hooks.ts";
import { Peaceful } from "../behaviors/peaceful.ts";

const MIN_BLEAT = 8;
const MAX_BLEAT = 20;

export class Sheep extends Behavior {
  static override readonly parents: ReadonlyArray<BehaviorClass> = [Peaceful];

  private moving = false;

  private scheduleBleat() {
    this.self.schedule(
      () => {
        this.self.sendEvent(
          EventType.SOUND,
          `bleat:${this.self.x}:${this.self.y}`,
        );
        this.scheduleBleat();
      },
      (this.self.rng.uniform() * (MAX_BLEAT - MIN_BLEAT) + MIN_BLEAT) * 1000,
    );
  }

  override readonly hooks: BehaviorHooks = {
    setup: (next) => {
      next();
      this.scheduleBleat();
      this.self.schedule(() => this.self.trigger("wander"), 100);
    },

    describe: (next) => ({
      ...next(),
      proto: "animal",
      image: "sheep",
      speed: 0.00075,
      nametag: "Innocent Sheep",
      ...(this.moving ? { movement: "sheepBounce" } : {}),
    }),

    getWidth: () => 1,
    getHeight: () => 1,
    getHealth: () => 20,

    // Drops a piece of meat, half the time.
    getDrops: () => (this.self.rng.uniform() < 0.5 ? [] : ["f5"]),

    startMoving: (next, dirX, dirY) => {
      this.moving = true;
      return next();
    },
    stopMoving: (next) => {
      this.moving = false;
      return next();
    },

    getLocationUpdate: (next) => {
      const update = next();
      if (!update) {
        return undefined;
      }
      return { ...update, movement: this.moving ? "sheepBounce" : null };
    },
  };
}
