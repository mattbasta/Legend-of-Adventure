import type { BehaviorHooks } from "./hooks.ts";
import type { NpcEntity } from "./npcEntity.ts";

/**
 * A behavior component: one layer of an NPC's ability stack.
 *
 * Behaviors form a multiple-inheritance graph via `parents` (e.g. Sentient
 * extends [Harmable, Animat]; Soldier extends [Npc, Neutral]). An entity's
 * effective behavior is the C3 linearization of its species class: hook
 * dispatch walks that order, and each implementation's `next` continues to
 * the next class that implements the same hook.
 *
 * Per-entity state lives on the behavior instance (the otto scripts kept it
 * in factory closures; each entity got a copied VM).
 */
export abstract class Behavior {
  static readonly parents: ReadonlyArray<BehaviorClass> = [];

  protected readonly self: NpcEntity;

  constructor(self: NpcEntity) {
    this.self = self;
  }

  abstract readonly hooks: BehaviorHooks;
}

export type BehaviorClass = (new (self: NpcEntity) => Behavior) & {
  readonly parents: ReadonlyArray<BehaviorClass>;
};

const linearizationCache = new Map<
  BehaviorClass,
  ReadonlyArray<BehaviorClass>
>();

/**
 * C3 linearization of the behavior graph rooted at `species`.
 *
 * Unlike the otto framework — whose breadth-first loader double-registered
 * classes reached through multiple paths (Animat appeared twice in every
 * sentient chain, running movement integration twice per tick) — each class
 * appears exactly once, in monotonic MRO order.
 */
export function linearize(
  species: BehaviorClass,
): ReadonlyArray<BehaviorClass> {
  const cached = linearizationCache.get(species);
  if (cached) {
    return cached;
  }

  const parents = species.parents;
  const sequences: Array<Array<BehaviorClass>> = parents
    .map((parent) => [...linearize(parent)])
    .concat([[...parents]]);

  const result: Array<BehaviorClass> = [species];
  while (sequences.some((seq) => seq.length)) {
    let candidate: BehaviorClass | null = null;
    for (const seq of sequences) {
      const head = seq[0];
      if (!head) {
        continue;
      }
      // A valid candidate appears in no sequence's tail.
      if (sequences.every((other) => other.indexOf(head) <= 0)) {
        candidate = head;
        break;
      }
    }
    if (!candidate) {
      throw new Error(
        `Cannot linearize behavior hierarchy for ${species.name}`,
      );
    }
    result.push(candidate);
    for (const seq of sequences) {
      if (seq[0] === candidate) {
        seq.shift();
      }
    }
  }

  linearizationCache.set(species, result);
  return result;
}
