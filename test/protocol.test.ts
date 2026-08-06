import { describe, it } from "node:test";
import * as assert from "assert";

import { parseDirectAttack, parseEvent } from "../src/eventParsing.ts";
import { Event, EventType } from "../src/events.ts";
import { parseClientCommand, parseClientMessage } from "../src/protocol.ts";
import { getRegionData } from "../src/regions.ts";
import type { Entity } from "../src/types.ts";

describe("Event framing", () => {
  it("frames events as <type>evt:<origin eid>\\n<body>", () => {
    const origin = { eid: "e5" } as Entity;
    const event = new Event(EventType.SOUND, "pot_smash:1:2", origin);
    assert.strictEqual(event.toString(), "sndevt:e5\npot_smash:1:2");
  });

  it("frames origin-less events with an empty eid", () => {
    const event = new Event(EventType.CHAT, "0 0\nhello", null);
    assert.strictEqual(event.toString(), "chaevt:\n0 0\nhello");
  });
});

describe("parseClientMessage", () => {
  it("splits command from body on the first newline", () => {
    assert.deepStrictEqual(parseClientMessage("cha\nhello there world"), {
      cmd: "cha",
      body: "hello there world",
    });
  });

  it("preserves newlines inside the body", () => {
    assert.deepStrictEqual(parseClientMessage("cha\nline one\nline two"), {
      cmd: "cha",
      body: "line one\nline two",
    });
  });

  it("handles body-less commands", () => {
    assert.deepStrictEqual(parseClientMessage("dro"), { cmd: "dro", body: "" });
  });

  it("parses colon-delimited bodies untouched", () => {
    assert.deepStrictEqual(parseClientMessage("loc\n1.5:2:0:0:1:0"), {
      cmd: "loc",
      body: "1.5:2:0:0:1:0",
    });
  });
});

describe("parseClientCommand", () => {
  const expectOk = (raw: string) => {
    const result = parseClientCommand(raw);
    assert.ok(result?.ok, `expected ${JSON.stringify(raw)} to parse`);
    return result.command;
  };
  const expectRejected = (raw: string) => {
    const result = parseClientCommand(raw);
    assert.ok(result && !result.ok, `expected ${raw} to be rejected`);
  };

  it("parses movement into structured fields", () => {
    assert.deepStrictEqual(expectOk("loc\n1.5:2:0:-1:1:0"), {
      cmd: "loc",
      body: { x: 1.5, y: 2, velX: 0, velY: -1, dirX: 1, dirY: 0 },
    });
  });

  it("rejects out-of-range velocity and direction", () => {
    expectRejected("loc\n1:2:5:0:0:1");
    expectRejected("loc\n1:2:0:-5:0:1");
    expectRejected("loc\n1:2:0:0:0:9");
  });

  it("rejects malformed and short movement bodies", () => {
    expectRejected("loc\n1:2:0:0");
    expectRejected("loc\nfoo:bar:0:0:0:1");
    expectRejected("loc\n");
  });

  it("keeps whole chat messages", () => {
    assert.deepStrictEqual(expectOk("cha\nhello there world"), {
      cmd: "cha",
      body: "hello there world",
    });
  });

  it("accepts only forward and backward inventory cycling", () => {
    assert.strictEqual(expectOk("cyc\nf").body, "f");
    assert.strictEqual(expectOk("cyc\nb").body, "b");
    expectRejected("cyc\nsideways");
  });

  it("parses inventory slots as non-negative integers", () => {
    assert.strictEqual(expectOk("use\n3").body, 3);
    expectRejected("use\n-1");
    expectRejected("use\nabc");
  });

  it("parses level slides", () => {
    assert.deepStrictEqual(expectOk("lev\n3:4").body, { x: 3, y: 4 });
    expectRejected("lev\nnope");
  });

  it("ignores unknown commands without reporting an error", () => {
    assert.strictEqual(parseClientCommand("xyz\nbody"), null);
  });
});

describe("parseEvent", () => {
  it("parses direct attacks", () => {
    const event = new Event(EventType.DIRECT_ATTACK, "1.5 2.5 wsw.sharp.3");
    assert.deepStrictEqual(parseDirectAttack(event), {
      x: 1.5,
      y: 2.5,
      item: "wsw.sharp.3",
    });
  });

  it("defaults a missing weapon to null", () => {
    const event = new Event(EventType.DIRECT_ATTACK, `${1} ${2} `);
    assert.strictEqual(parseDirectAttack(event)?.item, "");
  });

  it("returns null for other event types", () => {
    assert.strictEqual(
      parseDirectAttack(new Event(EventType.SOUND, "bleat:1:2")),
      null,
    );
  });

  it("splits entity updates into description and coordinates", () => {
    const parsed = parseEvent(
      new Event(EventType.ENTITY_UPDATE, `{"x":1}\n${3} ${4}`),
    );
    assert.strictEqual(parsed?.type, EventType.ENTITY_UPDATE);
    assert.deepStrictEqual(parsed.body, {
      description: '{"x":1}',
      x: 3,
      y: 4,
    });
  });

  it("splits chat into coordinates and message", () => {
    const parsed = parseEvent(
      new Event(EventType.CHAT, `${1} ${2}\nhello there`),
    );
    assert.strictEqual(parsed?.type, EventType.CHAT);
    assert.deepStrictEqual(parsed.body, { x: 1, y: 2, message: "hello there" });
  });

  it("rejects malformed bodies", () => {
    assert.strictEqual(
      parseEvent(new Event(EventType.CHAT, "garbage\nmessage" as never)),
      null,
    );
  });
});

describe("region IDs", () => {
  it("parses a top-level region ID", () => {
    assert.deepStrictEqual(getRegionData("overworld,field:3:4"), [
      "overworld",
      "field",
      3,
      4,
    ]);
  });

  it("parses a nested region ID", () => {
    assert.deepStrictEqual(getRegionData("overworld,field:1:0,dungeon:2:3"), [
      "overworld,field:1:0",
      "dungeon",
      2,
      3,
    ]);
  });

  it("falls back to the default region for malformed IDs", () => {
    assert.deepStrictEqual(getRegionData("garbage"), [
      "overworld",
      "field",
      0,
      0,
    ]);
  });
});
