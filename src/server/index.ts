import * as http from "node:http";
import { setTimeout as delay } from "node:timers/promises";

import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";

import { logger } from "../logger.ts";
import { Player } from "../player.ts";
import { disposeAllRegions } from "../regions.ts";
import { createApp } from "./app.ts";

const PORT = Number(process.env["PORT"]) || 8080;
const isProduction = process.env["NODE_ENV"] === "production";

/** Ported from legacy/constants.go; overridable for tests. */
const MAX_CONNECTED_PLAYERS =
  Number(process.env["MAX_CONNECTED_PLAYERS"]) || 256;

/** How often to ping clients to find half-open sockets. */
const HEARTBEAT_INTERVAL = 30_000;

/** How long a shutdown waits for clients to acknowledge before terminating. */
const SHUTDOWN_GRACE_MS = 2_000;

export interface ServerOptions {
  port?: number;
  maxPlayers?: number;
  /** Rebuild the client bundle on change. Defaults to on outside production. */
  bundleClient?: boolean;
}

export interface ServerHandle {
  server: http.Server;
  port: number;
  shutdown(reason: string): Promise<void>;
}

export async function startServer(
  options: ServerOptions = {},
): Promise<ServerHandle> {
  const port = options.port ?? PORT;
  const maxPlayers = options.maxPlayers ?? MAX_CONNECTED_PLAYERS;
  const bundleClient = options.bundleClient ?? !isProduction;

  const bundler = bundleClient
    ? await (await import("./clientBundler.ts")).watchClientBundle()
    : null;

  const app = createApp();
  const server = http.createServer(app.callback());
  const wsServer = new WebSocketServer({ server, path: "/socket" });

  // A client that vanishes without sending a close frame leaves a half-open
  // socket that `ws` never reports. Ping every interval and drop anything
  // that missed the previous round trip.
  const responsive = new WeakSet<WebSocket>();

  wsServer.on("connection", (ws) => {
    if (wsServer.clients.size > maxPlayers) {
      logger.warn(
        { connected: wsServer.clients.size, limit: maxPlayers },
        "refusing connection: server full",
      );
      // 1013 "Try Again Later".
      ws.close(1013, "Server full");
      return;
    }

    responsive.add(ws);
    ws.on("pong", () => responsive.add(ws));
    ws.on("error", (err) => logger.warn({ err }, "websocket error"));

    logger.info({ connected: wsServer.clients.size }, "websocket connected");
    new Player(ws);
  });

  const heartbeat = setInterval(() => {
    for (const ws of wsServer.clients) {
      if (!responsive.has(ws)) {
        logger.info("terminating unresponsive websocket");
        ws.terminate();
        continue;
      }
      responsive.delete(ws);
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL);
  // The heartbeat must never be the reason the process stays alive.
  heartbeat.unref();

  await new Promise<void>((resolve) => {
    server.listen(port, () => resolve());
  });

  const address = server.address();
  const boundPort =
    typeof address === "object" && address ? address.port : port;
  logger.info({ port: boundPort }, "server listening");

  let shuttingDown: Promise<void> | null = null;

  const shutdown = (reason: string) => {
    shuttingDown ??= (async () => {
      logger.info(
        { reason, connected: wsServer.clients.size },
        "shutting down",
      );

      clearInterval(heartbeat);
      server.close();
      server.closeIdleConnections();

      // 1001 "Going Away" tells clients the disconnect was deliberate, so
      // they can distinguish a restart from a network failure.
      for (const ws of wsServer.clients) {
        ws.close(1001, "Server shutting down");
      }

      const deadline = Date.now() + SHUTDOWN_GRACE_MS;
      while (wsServer.clients.size > 0 && Date.now() < deadline) {
        await delay(25);
      }
      for (const ws of wsServer.clients) {
        ws.terminate();
      }

      wsServer.close();
      server.closeAllConnections();
      // Region tick intervals would otherwise keep the event loop alive.
      disposeAllRegions();
      await bundler?.dispose();

      logger.info("shutdown complete");
    })();
    return shuttingDown;
  };

  return { server, port: boundPort, shutdown };
}
