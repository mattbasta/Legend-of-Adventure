# Entity system design

**Status: directional.** This records the shape phases 5 and 6 should be built
to, and the reasoning behind it. It supersedes the hook-chain framework that
landed in phase 4 (`c76423f`). It is not a finished spec — open questions are
listed at the end, and details are expected to move during implementation.

## Why this is being redesigned

The lineage matters, because the current code is a port of a workaround.

The **Python** original used plain classes with real multiple inheritance:
`class SentientAnimat(Harmable, Animat)`, `class Zombie(EvilDoer,
HostileAnimat)`, `class NPC(AnimatSprite, SentientAnimat, MarkovBot)`. Real
methods, real `super()`, Python's MRO resolving the diamonds.

The **Go + otto** port could not do multiple inheritance in the embedded JS
interpreter, so `resources/entities/framework.js` reimplemented Python's MRO
by hand: a global registry of method chains keyed by string, with `sup()`
standing in for `super()`.

**Phase 4** ported that faithfully — including its accidents. The result is
30 string-keyed hooks in `src/entities/npc/hooks.ts` dispatched through
`trigger(name, ...)`, of which a census found 7 declared-and-called with zero
implementations, 1 implemented but never called (`getPreferredBehavior`, dead
in the otto original too), and roughly 12 that are static species data rather
than behavior. `bloodspatter` is a hook whose entire job is choosing a
particle name. `say()` reads a `nametag` hook that nothing implements while
species keep their nametag somewhere else — a latent bug that would surface
the moment town NPCs start talking.

TypeScript does not have otto's constraint. The workaround can go.

## What the architecture is actually for

Two previous implementations died of performance, in different ways:

- **Python** was simply too slow (Python 2, ~20 years ago, and the code
  quality of a student project).
- **Go** was meant to fix that with concurrency, but every entity ran on its
  own goroutine and clock. The complexity produced an explosion of events —
  entities spamming each other faster than they could be drained — and the
  server bogged down the same way.

The Node design has three goals in response, stated when the port began:

1. Events can be handled **in batches**, so redundant ones collapse. (Never
   implemented.)
2. **Explicit game ticks**, so no entity runs at its own speed and one fast
   entity cannot flood the rest.
3. Avoid the overhead of crossing into and out of a scripting environment.

(3) is done — behaviors are TypeScript. (2) is done — `Region` ticks every
100ms. (1) is the outstanding one and drives much of what follows.

## Principles

- **Single inheritance in the entity tree.** Capabilities live in components,
  so no diamond forms, so `super.onAttacked(events)` is ordinary typed method
  interception. That is the Koa-middleware property, for free, with
  go-to-definition.
- **No string-keyed dispatch.** Handlers are real methods. Event payloads are
  discriminated unions.
- **Dispatch is total.** No `ReturnType | undefined`, no `?? 20` fallbacks
  papering over an unimplemented hook.
- **Data over classes** wherever a distinction is really a constant.
- **Push only what is discrete.** Continuous state is pulled.

## Entity tree

```
Entity                     eid, position, size, region membership
├─ Item                    picked up on proximity; does not move
├─ Prop                    Chest, Pot — static, destructible
├─ Player                  socket-driven; movement is client-authoritative
└─ Animat                  moves under its own power
    └─ Sentient            perceives, attends, decides
        ├─ Animal          Sheep, Wolf
        ├─ Undead          Zombie, DeathWaker          faction: "undead"
        └─ Person          Child, Bully, Homely, Trader, Soldier
```

`Animat` has no current inhabitants of its own — every creature in the game
today is `Sentient`. It exists as the seam where movement stops and cognition
starts (a drifting projectile or a driverless cart would sit there), and it
mirrors the Python lineage, where `Animat` and `SentientAnimat` were distinct.

## Components

| Component   | Base                   | Specializations                     | Attached at        |
| ----------- | ---------------------- | ----------------------------------- | ------------------ |
| `Movement`  | `WalkingMovement`      | (`FlyingMovement`, if ether lands)  | `Animat`           |
| `Vitals`    | `Vitals`               | —                                   | `Animat`, `Prop`   |
| `Pathing`   | `VectorFieldPathing`   | `AStarPathing`                      | `Sentient`         |
| `Behavior`  | `SentientBehavior`     | `GuardBehavior`, `SummonerBehavior` | `Sentient`         |
| `Attention` | `Attention`            | —                                   | `Sentient`         |
| `Speech`    | `Speech` (output only) | `ConversationalSpeech` (in + out)   | `Undead`, `Person` |
| `Inventory` | existing `Inventory`   | —                                   | `Player`, `Chest`  |

Three Python diamonds dissolve into this table, which is the main evidence
that the split is cut in the right place:

| Python                                         | Becomes                          |
| ---------------------------------------------- | -------------------------------- |
| `SentientAnimat(Harmable, Animat)`             | `Vitals` + `Movement` components |
| `NPC(AnimatSprite, SentientAnimat, MarkovBot)` | `Speech` component               |
| `Zombie(EvilDoer, HostileAnimat)`              | a `faction` field                |

**Speech is split by direction.** Zombies emit text on a timer but neither
hear nor understand it, so the base `Speech` is output only. People converse,
so `ConversationalSpeech` adds input — which is where Python's `MarkovBot`
would be restored if we want conversational NPCs back (the otto port replaced
it with ten canned phrases).

**Pathing is a real split.** `npc.js` overrode direction-finding to prefer
full A\* while animals used the vector field; that override becomes a
different component rather than a method interception.

## Disposition is data, not a class

The otto `hostile` / `neutral` / `peaceful` mixins contain almost nothing:
`hostile` is `doesAttack: true`, `attacked → chase`, `seenEntity → chase`;
`neutral` is the same minus `seenEntity`; `peaceful` is `attacked → flee`.
Three flags:

```ts
interface Disposition {
  readonly attacksOnSight: boolean;
  readonly onThreat: "flee" | "retaliate" | "ignore";
  readonly targets: (ref: Sighting) => boolean;
}
```

The bully proves this has to be data. It is declared `['npc', 'peaceful']`
yet implements `seenEntity → chase` filtered to children: a peaceful thing
that hunts one specific type. No single-inheritance disposition class can
express that; a record can:

| Species     | attacksOnSight | onThreat  | targets                          |
| ----------- | -------------- | --------- | -------------------------------- |
| Sheep       | no             | flee      | nothing                          |
| Wolf        | yes            | retaliate | anything outside its faction     |
| Zombie      | yes            | retaliate | `faction !== "undead"`           |
| Death waker | no             | flee      | nothing (see `SummonerBehavior`) |
| Soldier     | no             | retaliate | provoker; see below              |
| Child       | no             | flee      | nothing                          |
| Bully       | yes            | flee      | `type === "child"`               |
| Homely      | no             | flee      | nothing                          |
| Trader      | no             | flee      | nothing                          |

Soldiers additionally retaliate on a _witnessed_ attack within 50 tiles,
unless the attacker wields a soldier weapon — friendly-fire suppression,
which is disposition logic, not a separate class.

## Perception is pulled, not pushed

Position updates are **state, not events**. The region already holds
authoritative positions, so a behavior asks at tick time rather than being
told continuously:

```ts
interface RegionView {
  nearby(x: number, y: number, radius: number): readonly Sighting[];
}
```

This deletes the largest event category outright instead of deduplicating it,
and it removes the O(n²) fan-out where every entity broadcasts movement to
every other entity every tick.

This only works _because_ of explicit ticks. Under Go's model — every entity
on its own clock — pulling would have produced torn snapshots of a world
mutating underneath the reader. Ticks are what make a consistent read
possible.

## Batched event handlers

Discrete events (attacks, speech, departures, spawns) still arrive as events,
because each one matters individually. They are queued, grouped by type, and
delivered **as a batch, once per tick**, with the entity deciding what to do
with the whole set:

```ts
abstract class Sentient extends Animat {
  protected onDeparted(events: readonly DepartedEvent[]): void {}
  protected onAttacked(events: readonly AttackedEvent[]): void {}
  protected onWitnessedAttack(events: readonly WitnessedAttackEvent[]): void {}
  protected onHeard(events: readonly HeardEvent[]): void {}
  protected onDecide(now: number, view: RegionView): void {}

  override tick(now: number, view: RegionView) {
    const batch = this.inbox.drain();
    if (batch.departed.length) this.onDeparted(batch.departed);
    if (batch.attacked.length) this.onAttacked(batch.attacked);
    if (batch.witnessed.length) this.onWitnessedAttack(batch.witnessed);
    if (batch.heard.length) this.onHeard(batch.heard);
    this.onDecide(now, view);
  }
}
```

Dispatch is a hand-written switch, not a lookup table, so there are no
strings anywhere and the ordering is explicit and reviewable.

**Order is deliberate.** Departures first, so nothing downstream acts on an
entity that has already left. Attacks next, because being hit is the most
urgent stimulus and should clobber whatever the entity was attending to.
Witnessed attacks, then speech, in descending urgency. The decision runs last,
with all state settled.

**Why batching is the point, not a nicety.** It is the only shape that lets a
handler be exhaustive about consequences and selective about attention in the
same breath:

```ts
protected override onAttacked(events: readonly AttackedEvent[]) {
  for (const e of events) this.vitals.apply(e.blow);      // all of them hurt
  this.attention.focus(nearestOf(events).attacker);        // one gets noticed
}
```

One-at-a-time dispatch structurally cannot express that difference. Attention
filtering delegates to the behavior, so policy stays in one place while the
handler stays overridable:

```ts
protected override onHeard(events: readonly HeardEvent[]) {
  for (const e of this.behavior.filterAttention(events)) {
    this.speech.hear(e);
  }
}

// on Behavior:
filterAttention<E extends { source: EntityId }>(events: readonly E[]): readonly E[];
```

**Collapse policy is per type**, and lives in the inbox:

| Type      | Policy                                       |
| --------- | -------------------------------------------- |
| sightings | not events at all — pulled from `RegionView` |
| attacked  | keep every one; each does damage             |
| witnessed | keep, capped                                 |
| heard     | keep nearest speaker(s), capped              |
| departed  | dedupe by eid                                |

The inbox caps itself per type and drops oldest beyond the cap, so a
pathological broadcaster cannot grow memory without bound. That is the
runaway-event guard the Go version lacked, made explicit rather than hoped
for.

## Damage is unconditional; targeting is a policy

A deliberate divergence from **both** ancestors, in favour of emergent
behaviour.

In Python, `SentientAnimat._attacked` and `HostileAnimat._attacked` call
`harmed_by(...)` with no species check — which is why wolves hunting sheep
sometimes clipped each other and started a fight. But `EvilDoer` (the `^`
GUID-prefix faction shared by zombies and death wakers) overrode `_attacked`
to _decline damage_ from its own faction, and otto inherited that as an
inline `getType(from) === 'zombie'` check.

Going forward: **damage always lands.** A zombie caught by another zombie's
swing takes it, and may well swing back. Factions constrain only _targeting_ —
a zombie never chooses another zombie as a target. Fights between allies
become possible again, which is the behaviour worth having.

There is also a warning in the Python source worth heeding, on
`SentientAnimat._attacked`: _"This should not be overridden if the inheriting
class's `_attacked` implementation harms the entity."_ An informal contract
enforced by nothing. Under this design damage application lives in `Vitals`
and is not an override point at all.

## What survives from phase 4

Roughly half the existing code carries over:

- **Survives**: `pathing.ts` (the vector field, the 8-direction table) becomes
  `VectorFieldPathing`; the host API on `NpcEntity` (`say`, `die`, `schedule`,
  `spawnNearby`, `sendEvent`, `distanceTo`) redistributes onto the entity tree
  and components; the event inbox concept; the Zod parsing layer in
  `eventParsing.ts`; the `FakeRegion` harness in `test/npc.test.ts`.
- **Deleted**: `hooks.ts`, `behavior.ts` (C3 `linearize`), `trigger()`,
  `BehaviorHooks`, and `behaviors/` in its current form.

## Deliberately punted

**Multi-attacker avoidance.** When two entities attack a third, the ideal is
to flee along a path maximising distance from both. That is a large increase
in complexity, particularly for A\*.

The scope is narrower than it first appears: `PathingHelper.stageRepeller`
already accumulates N repellers and sums their vectors, so **vector-field
pathing handles multiple threats today**. Only A\* multi-avoidance is hard.
So the model should keep `fleeing` as a `Set` from the start; animals honour
all of it, and `AStarPathing` degrades to avoiding the nearest threat with a
TODO. No ping-ponging for animals, and no restructuring needed later.

## Open questions

- Does `Vitals` belong to `Animat`, or is it fully orthogonal? Props are
  destructible without being animats, which argues for orthogonal.
- Does `Player` join the `Sentient` tree or stay a separate branch? It moves,
  but client-authoritatively, and it has no behavior component.
- Where does the scheduler (`schedule(cb, ms)`) live — `Entity`, or a
  component?
- Is restoring markov speech in scope for phase 6, or later?
