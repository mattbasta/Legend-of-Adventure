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
| 5     | Combat: hostile/neutral, wolf, zombie           | next                            |
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
- **Golden masters**: `dungeon-interior.json` was regenerated once, in phase 3,
  when three Go-fidelity bugs were fixed (20/784 tiles changed, portals
  unchanged). Everything else has been byte-stable since phase 0.

---

## Phase 5 — Combat

Port source: `resources/entities/hostile.js`, `neutral.js`, `all/wolf.js`,
`all/zombie.js`. `Harmable` already landed in phase 4.

**Behaviors** (`src/entities/npc/behaviors/`):

- `Hostile` (parents: `[Sentient]`) — `getPreferredBehavior` → `"chase"`,
  `doesAttack` → true, `attacked` → chase the attacker, and `seenEntity` →
  chase if not already chasing. This hook is what makes anything hunt the
  player; nothing implements it yet.
- `Neutral` (parents: `[Sentient]`) — same as Hostile minus `seenEntity`:
  attacks only once provoked. (The original also carried an unused `chasing`
  local; don't port it.)

**Species** (`src/entities/npc/species/`):

- `Wolf` (parents: `[Hostile]`) — 10 HP, `proto: "animal"`, speed 0.003,
  nametag "Big Bad Wolf", always drops `f5`. Howls every 15–30s: skips the
  howl while chasing, otherwise stops wandering, emits
  `wolf_howl:<x>:<y>`, and resumes wandering 4s later. Tracks its chase
  target so the howl scheduler can check it.
- `Zombie` (parents: `[Hostile]`) — 75 HP, `proto: "avatar"`, speed 0.005, no
  nametag. Refuses to chase or retaliate against `zombie` and `death_waker`
  (guard in `chase`/`attacked` by declining to call `next()`, which is
  exactly the pattern the hook chain is built for). `wasHurt` emits
  `zombiesquish` instead of the default bloodspatter — note it does _not_
  call `next()`, so it replaces rather than augments.

Register both in `registry.ts`.

**Client**: implement the `ded` handler (remove the entity, play the death
effect). `dea` (player death) currently manifests only via the respawn
teleport. Check whether `spn` is ever emitted — the server's `addEntity` path
uses `add` for spawned entities, so `spn` may be dead protocol surface worth
documenting in `events.ts` rather than implementing.

**Verify**: behavior tests on the `FakeRegion` harness in `test/npc.test.ts` —
a wolf within vision of a player-typed entity converges on it and emits `dak`
at `HURT_DISTANCE`; a zombie ignores `dak` from another zombie; a sheep flees
when attacked (already covered). Manual: get chased and hit by a wolf, die,
confirm respawn works and the client survives it.

## Phase 6 — A*, town NPCs, retire the legacy tree

Port source: `legacy/entities/astar.go`, the `pathToBestTile` half of
`legacy/entities/pathing.go`, `resources/entities/npc.js`, and
`resources/entities/all/*.js`.

- `src/entities/npc/astar.ts` — port `PathAStar` over the hitmap.
- `PathingHelper.pathToBestTile` + path memory (`lastPath`), and the
  `isDirectionOk` path-following logic that phase 4 deliberately left out
  (its current implementation only checks the hitmap). Constants live in
  `legacy/entities/constants.go` (`ASTAR_*`).
- `Npc` behavior — idle chatter (10 canned phrases, randomly subsetted per
  instance, rescheduled every 4–14s), prefers full A* over the vector field
  when not wandering, clears the staged path on chase/flee/forget.

**Species**: `Soldier` (125 HP, `[Npc, Neutral]`, wields `wsp.soldier`, never
wanders, retaliates on `seenAttack` within 50 tiles unless the attacker used a
soldier weapon, shouts threats, drops `wsw.<prefix>.<level>` on a cubed-random
rarity curve); `Child` (`[Npc, Peaceful]`, random name and sprite, flees
`bully`, adds an attractor toward the region centre when more than 20 tiles
out); `Bully` ("Timmy the Bully", 100 HP, chases entities of type `child`);
`Homely` (`[Npc, Sentient]`, random name from 10, sprite from 5, speed
0.00075); `Trader` (200 HP, A* pathing, debug `par` particles — consider
dropping those); `DeathWaker` (140 HP, `[Peaceful]`, tracks visible players,
broadcasts `{"movement":"shake"}`, then spawns 1–3 zombies via `spawnNearby`).

Move the image-variant logic (`soldier1-3`, `child1-2`, `homely1-3`) out of
`VirtualEntity.getMetadata` into each species' `describe()` — it currently
re-randomizes on every serialization, so sprites flicker.

Then **delete** `VirtualEntity`, the registry fallback in `Region.spawn`,
`resources/entities/`, and `legacy/`. Git history keeps them.

**Verify**: a linearization snapshot for `Soldier`
(`[Soldier, Npc, Neutral, Sentient, Harmable, Animat]`); A* unit tests on a
hand-built hitmap (corridor, blocked, around a corner); a scripted
"bully chases child, child flees toward centre" scenario. Manual: the town at
(0,0) — soldiers guard, villagers chatter, attacking a child brings the
soldiers down on you; a dungeon — zombies chase and a death waker shakes and
spawns.

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
- **No reconnect logic** in the client: when the server restarts, the socket
  closes and `timing.ts` logs `WebSocket is already in CLOSING or CLOSED
state` on every tick forever. Painful in dev under `node --watch`.
- **Region-edge sliding is client-authoritative** (`src/client/timing.ts`
  carries the TODO).
- **`ether` world** is half-designed: referenced throughout region validation
  and art exists, but `getTileset` throws for it and no generation path
  exists.
- **`sak` (splash attack) and `giv`** are fully specified in the protocol and
  emitted by nobody, in either implementation.
- `Region` has no `dispose()`; its `setInterval` is only cleared by the 60s
  idle reaper. Tests work around this with `FakeRegion`.
- Shop entity population duplicates the House block verbatim, preserving a
  Go `fallthrough`. Faithful, but worth deciding whether it was intentional.
- `buildings.ts` `RoomType.Storage === RoomType.Bed` (both `"bed"`). Faithful
  to Go (`ROOM_STORAGE = ROOM_BED = "bedroom"`), so probably intentional.
- `dungeons.ts` indexes `terminalRooms` in the stairwell block without the
  length guard the boss/angel blocks have. Unreachable at
  `DUNGEON_MIN_SIZE = 3`, but fragile.
- `entities.ts` will happily delete `"local"` or the followed entity if the
  server says so, after which `getLocal()`/`getFollowing()` throw.
- No `MAX_CONNECTED_PLAYERS` enforcement (Go had it), no ws heartbeat, no
  graceful shutdown.

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
