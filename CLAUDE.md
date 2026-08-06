# Legend of Adventure

A procedurally generated MMO. Originally Python, then Go (with NPC AI running
as JavaScript inside an otto VM), now being finished as a Node/TypeScript
port. `legacy/` holds the Go source as porting reference; `resources/entities/`
holds the otto-era behavior scripts, likewise reference-only.

## Commands

```bash
npm run dev          # server + client bundling in one process, watch mode
npm start            # production (NODE_ENV=production, no esbuild)
npm test             # node:test, runs .ts directly
npm run typecheck    # tsc --noEmit for server and client configs
npm run format       # prettier --write
npm run build:client # one-off minified client bundle
```

Requires Node >= 24: the server and tests run TypeScript directly via type
stripping. **There is no build step** — `tsc` only typechecks.

## Layout

| Path                                   | What                                                           |
| -------------------------------------- | -------------------------------------------------------------- |
| `index.ts`                             | entry point; delegates to `src/server/`                        |
| `src/server/`                          | Koa app, HTTP + WebSocket wiring, dev-mode client bundler      |
| `src/player.ts`                        | player entity: connection, protocol, movement, portals         |
| `src/regions.ts`                       | region cache, entity population, 100ms tick, broadcast         |
| `src/terrain.ts`, `src/terrainGen/`    | deterministic world generation                                 |
| `src/entities/npc/`                    | behavior framework, pathing, species                           |
| `src/events.ts`, `src/eventParsing.ts` | wire protocol types and parsers                                |
| `src/client/`                          | browser client (canvas), bundled by esbuild to `www/client.js` |
| `test/golden/`                         | terrain snapshots (see below)                                  |

## Conventions

Beyond what Prettier and the compiler enforce:

- **No `var`.** Use `const` by default and `let` only when reassigning. Much
  of `src/client/` still uses `var` from its AMD-era origins; convert
  opportunistically when touching a function, and don't add new ones.
- **Name tuple members** when a tuple has more than two elements —
  `[x: number, y: number, w: number, h: number]`, not
  `[number, number, number, number]`. Past three or so elements, prefer an
  interface outright. There are legacy offenders (e.g. the 8-element viewport
  state tuple in `src/client/entities.ts`) worth converting when touched.
- **Type the wire, don't hand-parse it.** Event bodies have template literal
  types in `src/events.ts` so malformed sends fail to compile, and Zod
  schemas in `src/eventParsing.ts` / `src/protocol.ts` turn inbound strings
  into structured data. Add a schema rather than another `split`/`parseFloat`
  pair.
- Everything is ESM with explicit `.ts` import extensions, and enums are
  `as const` objects (`erasableSyntaxOnly` forbids real enums, which type
  stripping cannot erase).

Not yet enforced automatically — ESLint (with `no-var` / `prefer-const`) is a
planned addition.

## Terrain golden masters

World generation is deterministic (seeded by region coordinates), so
`test/golden/*.json` snapshots pin the output of six representative regions.
Any change to generation shows up as a failing test.

If a diff is intentional, regenerate and **review the diff before committing**:

```bash
UPDATE_GOLDEN=1 npm test
```

## Porting status

Done: terrain generation, regions, player, inventory, items/chests/pots, the
wire protocol, the client, and the NPC behavior framework with sheep.

Remaining: combat behaviors and the wolf/zombie species; A* pathing, the npc
chatter layer, and the town species (soldier, child, bully, homely, trader,
death waker); the slash-command console (`legacy/cheats.go`). Species without
ported behaviors still spawn, as inert placeholders — see `Region.spawn`.

**[PLAN.md](PLAN.md) is the working plan**: phase-by-phase detail for the
remaining port work, what each behavior and species needs, deferred issues,
and the backlog. Read it before picking up new work, and keep its status
table current as phases land.
