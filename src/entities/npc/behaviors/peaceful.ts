import { Behavior, type BehaviorClass } from "../behavior.ts";
import type { BehaviorHooks } from "../hooks.ts";
import { Sentient } from "./sentient.ts";

/** Disposition: flees whatever attacks it. */
export class Peaceful extends Behavior {
  static override readonly parents: ReadonlyArray<BehaviorClass> = [Sentient];

  override readonly hooks: BehaviorHooks = {
    getPreferredBehavior: () => "flee",

    attacked: (next, from) => {
      next();
      this.self.trigger("flee", from);
    },
  };
}
