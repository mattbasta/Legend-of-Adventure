import { once } from "node:events";
import { describe, it } from "node:test";
import * as assert from "assert";

import { WebSocket } from "ws";

import { startServer } from "../src/server/index.ts";

async function withServer(
  maxPlayers: number,
  body: (url: string, shutdown: () => Promise<void>) => Promise<void>,
) {
  const handle = await startServer({
    port: 0,
    maxPlayers,
    bundleClient: false,
  });
  let shutdownCalled = false;
  const shutdown = async () => {
    shutdownCalled = true;
    await handle.shutdown("test");
  };
  try {
    await body(`ws://localhost:${handle.port}/socket`, shutdown);
  } finally {
    if (!shutdownCalled) {
      await handle.shutdown("test cleanup");
    }
  }
}

const connect = async (url: string) => {
  const ws = new WebSocket(url);
  await once(ws, "open");
  return ws;
};

describe("server lifecycle", () => {
  it("serves the client over HTTP", async () => {
    const handle = await startServer({ port: 0, bundleClient: false });
    try {
      const index = await fetch(`http://localhost:${handle.port}/`);
      assert.strictEqual(index.status, 200);
      assert.match(index.headers.get("content-type") ?? "", /text\/html/);
    } finally {
      await handle.shutdown("test");
    }
  });

  it("refuses connections past the player limit", async () => {
    await withServer(2, async (url) => {
      const first = await connect(url);
      const second = await connect(url);

      const overflow = new WebSocket(url);
      const [code] = (await once(overflow, "close")) as [number, Buffer];
      // 1013 "Try Again Later".
      assert.strictEqual(code, 1013);

      // The connections already established are unaffected.
      assert.strictEqual(first.readyState, WebSocket.OPEN);
      assert.strictEqual(second.readyState, WebSocket.OPEN);
    });
  });

  it("closes live connections with 'going away' on shutdown", async () => {
    await withServer(10, async (url, shutdown) => {
      const client = await connect(url);
      const closed = once(client, "close");

      await shutdown();

      const [code] = (await closed) as [number, Buffer];
      // 1001 "Going Away" - a deliberate disconnect, not a network failure.
      assert.strictEqual(code, 1001);
    });
  });

  it("stops listening once shut down", async () => {
    const handle = await startServer({ port: 0, bundleClient: false });
    const { port } = handle;
    await handle.shutdown("test");

    await assert.rejects(() => fetch(`http://localhost:${port}/`));
  });
});
