import { Behavior, type BehaviorClass } from "../behavior.ts";
import type { BehaviorHooks } from "../hooks.ts";

/**
 * The movement substrate (ports resources/entities/animat.js). Integrates
 * position from velocity, clamps to the level bounds, and broadcasts
 * location updates when movement starts or stops. Scheduling, which the
 * original also owned, lives on NpcEntity.
 */
export class Animat extends Behavior {
  static override readonly parents: ReadonlyArray<BehaviorClass> = [];

  private lastCalculation = 0;

  private integrate() {
    const now = this.self.clock();
    const delta = now - this.lastCalculation;
    this.lastCalculation = now;

    const { velX, velY } = this.self;
    if (!velX && !velY) {
      return;
    }

    let vX = velX;
    let vY = velY;
    if (vX && vY) {
      vX *= Math.SQRT1_2;
      vY *= Math.SQRT1_2;
    }

    const x = this.self.x + vX * this.self.speed * delta;
    const y = this.self.y + vY * this.self.speed * delta;
    this.self.x = Math.min(this.self.levelWidth - 2, Math.max(x, 1));
    this.self.y = Math.min(this.self.levelHeight - 1, Math.max(y, 2));
  }

  override readonly hooks: BehaviorHooks = {
    setup: (next) => {
      next();
      this.lastCalculation = this.self.clock();
      const description = this.self.trigger("describe");
      if (description?.speed) {
        this.self.speed = description.speed;
      }
      this.self.width = this.self.trigger("getWidth") ?? 1;
      this.self.height = this.self.trigger("getHeight") ?? 1;
    },

    setPosition: (next) => {
      next();
      this.lastCalculation = this.self.clock();
    },

    tick: (next) => {
      next();
      this.integrate();
    },

    getLocationUpdate: () => ({
      x: this.self.x,
      y: this.self.y,
      velocity: [this.self.velX, this.self.velY],
      direction: [this.self.dirX, this.self.dirY],
    }),

    startMoving: (next, dirX, dirY) => {
      this.integrate();
      if (dirX === this.self.velX && dirY === this.self.velY) {
        return;
      }
      this.self.velX = dirX;
      this.self.dirX = dirX;
      this.self.velY = dirY;
      this.self.dirY = dirY;
      this.self.sendLocationUpdate();
    },

    stopMoving: () => {
      this.integrate();
      if (!this.self.velX && !this.self.velY) {
        return;
      }
      this.self.velX = 0;
      this.self.velY = 0;
      this.self.sendLocationUpdate();
    },
  };
}
