import { z } from "zod";

/**
 * Parsing for inbound client messages.
 *
 * The client always sends `<command>\n<body>` (src/client/comm.ts). The body
 * may contain any characters, including spaces and newlines (chat messages),
 * so only the first newline delimits the command.
 */
export function parseClientMessage(raw: string): {
  cmd: string;
  body: string;
} {
  const newlineIndex = raw.indexOf("\n");
  if (newlineIndex === -1) {
    return { cmd: raw.trim(), body: "" };
  }
  return {
    cmd: raw.slice(0, newlineIndex).trim(),
    body: raw.slice(newlineIndex + 1),
  };
}

/** parseFloat semantics (not Number's), so "" and "abc" are rejected. */
const asFloat = (raw: string | undefined) => parseFloat(raw ?? "");
const inputRange = (value: number) => value >= -1 && value <= 1;

/**
 * `x:y:velX:velY:dirX:dirY`. Velocity and direction components are
 * constrained here; position is only checked for well-formedness because
 * the level bounds depend on the player's current region.
 */
const locBody = z
  .string()
  .transform((body) => {
    const [x, y, velX, velY, dirX, dirY] = body.split(":");
    return {
      x: asFloat(x),
      y: asFloat(y),
      velX: asFloat(velX),
      velY: asFloat(velY),
      dirX: asFloat(dirX),
      dirY: asFloat(dirY),
    };
  })
  .refine(
    (loc) => Object.values(loc).every((value) => Number.isFinite(value)),
    "expected `x:y:velX:velY:dirX:dirY`",
  )
  .refine(
    ({ velX, velY }) => inputRange(velX) && inputRange(velY),
    "velocity components must be within [-1, 1]",
  )
  .refine(
    ({ dirX, dirY }) => inputRange(dirX) && inputRange(dirY),
    "direction components must be within [-1, 1]",
  );

/** `x:y` — the region the client is sliding into. */
const levBody = z
  .string()
  .transform((body) => {
    const [x, y] = body.split(":");
    return { x: asFloat(x), y: asFloat(y) };
  })
  .refine(
    ({ x, y }) => Number.isFinite(x) && Number.isFinite(y),
    "expected `x:y`",
  );

/** An inventory slot index. */
const slotBody = z
  .string()
  .transform((body) => parseInt(body, 10))
  .refine(
    (slot) => Number.isInteger(slot) && slot >= 0,
    "expected a slot index",
  );

const clientCommandSchema = z.discriminatedUnion("cmd", [
  z.object({ cmd: z.literal("cyc"), body: z.enum(["f", "b"]) }),
  z.object({ cmd: z.literal("cha"), body: z.string() }),
  z.object({ cmd: z.literal("loc"), body: locBody }),
  z.object({ cmd: z.literal("use"), body: slotBody }),
  z.object({ cmd: z.literal("dro"), body: z.string() }),
  z.object({ cmd: z.literal("lev"), body: levBody }),
]);

export type ClientCommand = z.infer<typeof clientCommandSchema>;

export type ClientCommandResult =
  | { ok: true; command: ClientCommand }
  | { ok: false; cmd: string; error: z.ZodError };

/**
 * Parses and validates a raw client frame. Unknown commands and malformed
 * bodies are reported rather than thrown, so a misbehaving client can never
 * take down the connection's message handler.
 */
export function parseClientCommand(raw: string): ClientCommandResult | null {
  const { cmd, body } = parseClientMessage(raw);
  const result = clientCommandSchema.safeParse({ cmd, body });
  if (result.success) {
    return { ok: true, command: result.data };
  }
  // An unrecognized command is not an error worth reporting; the protocol
  // has always ignored frames it does not know.
  if (!KNOWN_COMMANDS.has(cmd)) {
    return null;
  }
  return { ok: false, cmd, error: result.error };
}

const KNOWN_COMMANDS = new Set(["cyc", "cha", "loc", "use", "dro", "lev"]);
