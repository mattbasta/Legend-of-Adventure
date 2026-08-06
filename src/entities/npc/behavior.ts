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
 * Flattens a behavior's inheritance graph into the single ordered list that
 * hook dispatch walks — its "method resolution order".
 *
 * Behaviors form a graph, not a tree: Sentient builds on both Harmable and
 * Animat, Soldier on both Npc and Neutral, and several paths lead back to
 * Animat. To dispatch a hook we need one flat order, and it has to satisfy
 * three rules:
 *
 *   1. A behavior comes before all of its parents (a species overrides what
 *      it builds on).
 *   2. Parents keep the order they were declared in.
 *   3. Every behavior appears exactly once, however many paths reach it.
 *
 * Rule 3 is where the otto framework went wrong: its loader appended a
 * behavior each time it was reached, so Animat sat in every sentient chain
 * twice and integrated movement twice per tick.
 *
 * This is the C3 algorithm Python uses for the same problem. It merges the
 * parents' already-linearized orders by repeatedly taking a "safe" head —
 * one that no other list is still waiting to place later. If no head is
 * safe, the parent orders contradict each other and no valid order exists.
 *
 * Sheep -> [Peaceful] -> [Sentient] -> [Harmable, Animat] linearizes to
 * [Sheep, Peaceful, Sentient, Harmable, Animat].
 */
export function linearize(
  species: BehaviorClass,
): ReadonlyArray<BehaviorClass> {
  const cached = linearizationCache.get(species);
  if (cached) {
    return cached;
  }

  // Merge each parent's own order, plus the parent list itself — that last
  // one is what preserves the declared order of the parents (rule 2).
  const parents = species.parents;
  const pending: Array<Array<BehaviorClass>> = parents
    .map((parent) => [...linearize(parent)])
    .concat([[...parents]]);

  // The species always leads (rule 1).
  const order: Array<BehaviorClass> = [species];

  while (pending.some((list) => list.length)) {
    // A head is safe to take when it appears nowhere else except at the
    // front: if some other list has it further down, that list still needs
    // to place something before it, so taking it now would break rule 1.
    let safeHead: BehaviorClass | null = null;
    for (const list of pending) {
      const head = list[0];
      if (!head) {
        continue;
      }
      const blockedElsewhere = pending.some((other) => other.indexOf(head) > 0);
      if (!blockedElsewhere) {
        safeHead = head;
        break;
      }
    }

    if (!safeHead) {
      // Every remaining head is blocked by another list, which means two
      // parents disagree about ordering (e.g. one wants A before B and the
      // other B before A). There is no order satisfying both.
      throw new Error(
        `Cannot linearize behavior hierarchy for ${species.name}: ` +
          `its parents disagree about behavior ordering`,
      );
    }

    order.push(safeHead);
    // Consume it wherever it was waiting at the front.
    for (const list of pending) {
      if (list[0] === safeHead) {
        list.shift();
      }
    }
  }

  linearizationCache.set(species, order);
  return order;
}
