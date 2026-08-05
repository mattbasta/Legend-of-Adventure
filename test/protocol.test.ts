import { describe, it } from "node:test";
import * as assert from "assert";

import { Event, EventType } from "../src/events";
import { parseClientMessage } from "../src/protocol";
import { getRegionData } from "../src/regions";
import { Entity } from "../src/types";

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
