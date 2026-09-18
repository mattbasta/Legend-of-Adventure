# Modernization & port-completion plan

## Context

A procedurally generated MMO. Python → Go (NPC AI ran as JavaScript inside an
otto VM) → a Node/TypeScript port that stalled partway. Terrain generation,
regions, the player, inventory, and the client were ported; **all NPC
intelligence** — the VM bridge, pathing, and ~1,400 lines of behavior scripts —
was not. The repo also carried 2022-era tooling: TypeScript 4.6, CommonJS,
webpack-over-tsc, a raw `http` server, `console.log`, and a Jest config that
collected zero tests.

Goals: Pino logging; Koa with clean static serving; esbuild replacing webpack
with no separate client build step; Prettier and ESM everywhere; latest
TypeScript, strict as possible; a TS-native rewrite of the entity system;
`node:test` anchored by golden-master snapshots.

`legacy/` (Go) and `resources/entities/` (otto-era behavior scripts) are
reference material for the remaining port work and get deleted in phase 6.

---

## Status

| Phase | Deliverable                                     | State                           |
| ----- | ----------------------------------------------- | ------------------------------- |
| 0     | Baseline, crash fixes, golden masters           | **done** (`98163b1`)            |
| 1     | Prettier, strict TS, ESM, esbuild               | **done** (`eddb32f`, `abe6715`) |
| 2     | Koa + Pino + one-command dev                    | **done** (`28530c1`)            |
| 3     | Bug sweep                                       | **done** (`6790567`)            |
| 4     | NPC framework, pathing, sheep                   | **done** (`c76423f`)            |
| —     | Review follow-ups: Zod, typed bodies, sanitizer | **done** (`badf28d`)            |
| —     | Phase 2 hygiene: shutdown, heartbeat, limits    | **done**                        |
| 5     | Entity rework + combat: wolf, zombie            | next                            |
| 6     | A*, npc layer, town species; retire legacy      |                                 |
| 7     | Cheats, README, dep audit                       |                                 |

Ordering rationale, for the phases that remain: the tooling churn is behind us,
so phases 5–7 are pure porting. Each leaves the game playable because species
without ported behaviors still spawn as inert `VirtualEntity` placeholders
(see `Region.spawn`) — that fallback is what makes 5 and 6 independently
landable, and it disappears at the end of 6.

### What landed, and where it deviated from the original plan

- **Runtime.** Node ≥ 24 runs `.ts` directly (developed on 26). `tsc` is
  typecheck-only; there is no build step. TypeScript resolved to 7.x, not the
  5.9 originally planned.
- **Tests** run from source via `node --test "test/*.test.ts"`; the planned
  interim `dist/` step was dropped once type stripping was in place.
- **Zod** was added during review as the parsing layer for both inbound client
  frames (`src/protocol.ts`) and event bodies (`src/eventParsing.ts`), with
  template literal types on `Event` bodies (`src/events.ts`) so malformed
  sends fail to compile. Prefer adding a schema over another `split`/
  `parseFloat` pair.
- **NPCs** are built through `NpcEntity.create` (private constructor);
  `registry.ts` is just the species map.
- **Chat sanitizing** is allowlist-based via TreeWalker
  (`src/client/sanitize.ts`), not a fixed regex.
- **Phase 4's hook chain is being replaced.** It faithfully ported the otto
  framework, which was itself a hand-rolled reimplementation of Python's MRO
  for an interpreter without multiple inheritance — a workaround TypeScript
  does not need. See [docs/entity-system.md](docs/entity-system.md); roughly
  half the phase-4 code (the vector field, the host API, the Zod layer, the
  test harness) carries over.
- **Golden masters**: `dungeon-interior.json` was regenerated once, in phase 3,
  when three Go-fidelity bugs were fixed (20/784 tiles changed, portals
  unchanged). Everything else has been byte-stable since phase 0.

---

## Phase 5 — Entity system rework, then combat

**Read [docs/entity-system.md](docs/entity-system.md) first.** It supersedes
the phase-4 hook chain: single inheritance in the entity tree with
capabilities as components, real method overrides instead of string-keyed
`trigger()`, pulled perception instead of broadcast position updates, and
batched per-tick event handlers.

### 5a — the skeleton

Build the new shape and migrate the sheep onto it, then delete the hook
framework (`hooks.ts`, `behavior.ts`, `trigger()`, `behaviors/`). The sheep is
the regression test: it must wander, bleat, bounce, flee and die exactly as it
does today, with no string dispatch left behind.

- `Entity → Animat → Sentient` plus the component set (movement, vitals,
  pathing, behavior, attention).
- `RegionView.nearby()` and the pulled sighting path; drop `epu` from the NPC
  event ingress entirely.
- Batched handlers with the deliberate dispatch order, and the collapsing,
  self-capping inbox.
- `Disposition` as a data record rather than hostile/neutral/peaceful classes.

Carry over rather than rewrite: the vector field in `pathing.ts`, the host API
on `NpcEntity`, the Zod layer in `eventParsing.ts`, and the `FakeRegion`
harness.

### 5b — combat

Port source: `resources/entities/all/wolf.js`, `all/zombie.js`.

- `Vitals` applies damage unconditionally. Factions constrain targeting only,
  so same-species brawls are possible — a deliberate divergence from both
  ancestors, reasoned through in the design doc.
- `Wolf` — 10 HP, `proto: "animal"`, speed 0.003, nametag "Big Bad Wolf",
  always drops `f5`. Howls every 15–30s: skips the howl while chasing,
  otherwise stops wandering, emits `wolf_howl:<x>:<y>`, resumes 4s later.
- `Zombie` — 75 HP, `proto: "avatar"`, speed 0.005, no nametag,
  `faction: "undead"`, `zombiesquish` as its hurt particle. Targets anything
  outside its faction; takes damage from everything.

**Client**: implement the `ded` handler (remove the entity, play the death
effect). `dea` (player death) currently manifests only via the respawn
teleport. Check whether `spn` is ever emitted — the server's `addEntity` path
uses `add` for spawned entities, so `spn` may be dead protocol surface worth
documenting in `events.ts` rather than implementing.

**Verify**: a wolf within vision of a player-typed entity converges and emits
`dak` at `HURT_DISTANCE`; two zombies can damage each other but never target
each other; a sheep attacked by two entities flees both (the vector field
already sums repellers); the sheep suite still passes unchanged.

## Phase 6 — A*, town NPCs, retire the legacy tree

Port source: `legacy/entities/astar.go`, the `pathToBestTile` half of
`legacy/entities/pathing.go`, `resources/entities/npc.js`, and
`resources/entities/all/*.js`.

- `AStarPathing` as a sibling of `VectorFieldPathing` — port `PathAStar` over
  the hitmap, plus path memory (`lastPath`) and the path-following half of
  `isDirectionOk` that phase 4 left out. Constants are in
  `legacy/entities/constants.go` (`ASTAR_*`). Multi-threat avoidance degrades
  to the nearest threat; see the design doc.
- `Person` gains `Speech`. Base `Speech` is output-only (what `Undead` gets).
  Chatter stays at otto parity — ten canned phrases, randomly subsetted per
  instance. Conversational speech is a documented parity gap, not phase 6
  scope.
- `GuardBehavior` (soldiers hold a post, respond to witnessed attacks) and
  `SummonerBehavior` (death wakers).

**Species**: `Soldier` (125 HP, wields `wsp.soldier`, never wanders,
retaliates on a witnessed attack within 50 tiles unless the attacker wields a
soldier weapon, shouts threats, drops `wsw.<prefix>.<level>` on a
cubed-random rarity curve); `Child` (random name and sprite, flees `bully`,
attractor toward the region centre when more than 20 tiles out); `Bully`
("Timmy the Bully", 100 HP, `attacksOnSight` but targeting only children,
flees when attacked); `Homely` (random name from 10, sprite from 5, speed
0.00075); `Trader` (200 HP, A* pathing, debug `par` particles — consider
dropping those); `DeathWaker` (140 HP, tracks visible players, broadcasts
`{"movement":"shake"}`, then spawns 1–3 zombies).

Per-instance variants (`soldier1-3`, `child1-2`, `homely1-3`, random names)
resolve **once at spawn** into instance state. `VirtualEntity.getMetadata`
currently re-randomizes on every serialization, which is why sprites flicker.

Then **delete** `VirtualEntity`, the registry fallback in `Region.spawn`,
`resources/entities/`, and `legacy/`. Git history keeps them.

**Verify**: A* unit tests on a hand-built hitmap (corridor, blocked, around a
corner); a scripted "bully chases child, child flees toward centre" scenario.
Manual: the town at (0,0) — soldiers guard, villagers chatter, attacking a
child brings the soldiers down on you; a dungeon — zombies chase and a death
waker shakes and spawns.

## Phase 7 — Cheats and polish

Port `legacy/cheats.go` as a typed command table: `/get #health`, `/hea`,
`/giv`, `/tel`, `/nam`, `/epu`, `/god`, `/efx`, `/efc`. Drop `/pan` (a Go
pprof panic). Add `/spn <type>` — it makes every NPC smoke test one command.
`src/cheats.ts` currently swallows unknown commands and replies "Unknown
command"; keep that as the fallback. Parse with Zod, consistent with the rest
of the protocol layer.

Rewrite `README.md` (it still documents the Go build: `make`, `./server.o`,
GOPATH). Final dependency audit.

---

## Deferred / known issues

Deliberately left alone so far, roughly in priority order:

- **Damage is hardcoded to 10** in both `player.ts` and `NpcEntity`; weapon
  level and prefix affect sprites and drop tables but never damage. Both the
  Go original and the Python one had the same TODO.
- **No reconnect logic** in the client. The server now sends a proper 1001
  close frame on shutdown, so the client has everything it needs to tell a
  deliberate restart from a network drop - it just does not act on it yet,
  and `timing.ts` keeps trying to send on the dead socket.
- **Region-edge sliding is client-authoritative** (`src/client/timing.ts`
  carries the TODO).
- **`ether` world** is half-designed: referenced throughout region validation
  and art exists, but `getTileset` throws for it and no generation path
  exists.
- **`sak` (splash attack) and `giv`** are fully specified in the protocol and
  emitted by nobody, in either implementation.
- **Conversational NPCs** are below Python parity: `MarkovBot` generated
  replies to what players said, and both later ports reduced that to canned
  phrases. See the parity-gaps section of
  [docs/entity-system.md](docs/entity-system.md).
- Shop entity population duplicates the House block verbatim, preserving a
  Go `fallthrough`. Faithful, but worth deciding whether it was intentional.
- `buildings.ts` `RoomType.Storage === RoomType.Bed` (both `"bed"`). Faithful
  to Go (`ROOM_STORAGE = ROOM_BED = "bedroom"`), so probably intentional.
- `dungeons.ts` indexes `terminalRooms` in the stairwell block without the
  length guard the boss/angel blocks have. Unreachable at
  `DUNGEON_MIN_SIZE = 3`, but fragile.
- `entities.ts` will happily delete `"local"` or the followed entity if the
  server says so, after which `getLocal()`/`getFollowing()` throw.

## Backlog beyond the original brief

- **ESLint** (typescript-eslint flat config) to enforce the conventions in
  CLAUDE.md — `no-var`, `prefer-const` — plus the rules that would have caught
  several phase-3 bugs (unused vars, switch fallthrough, precedence).
- **CI**: `typecheck` + `format:check` + `test` on push.
- **Shared protocol module** used by both server and client; the 3-char codes
  are currently duplicated between `src/events.ts` and `src/client/comm.ts`.
- **Replace `buzz`** (unmaintained since ~2015) with a small Web Audio
  wrapper; re-enable the music loop that is commented out in `sound.ts`.
- Client game loop: `setInterval(tick, 30)` → `requestAnimationFrame` with an
  accumulator. (`settings.fps: 30` is actually used as a millisecond
  interval, so the loop runs at ~33fps despite its name.)
- Persistence. Nothing has ever persisted; the Python original used Redis.

## Verification

- **Golden masters** run on every `npm test`. If a diff is intentional,
  regenerate with `UPDATE_GOLDEN=1 npm test` and review the diff before
  committing — never regenerate to make a failure go away.
- **Protocol tests** cover frame builders, the inbound command parser, event
  body parsing, and region-ID round-trips.
- **Behavior tests** use the `FakeRegion` harness with an injected clock and a
  seeded RNG, so NPC decisions are replayable. Assert on observable behavior
  (broadcasts, position convergence), not internals.
- **Manual smoke checklist**: `test/SMOKE.md`, extended per phase. Run it in a
  browser via `npm run dev` before landing each phase.
