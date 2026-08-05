import * as http from "node:http";

import { WebSocketServer } from "ws";

import { logger } from "../logger.ts";
import { Player } from "../player.ts";
import { createApp } from "./app.ts";

const PORT = Number(process.env["PORT"]) || 8080;
const isProduction = process.env["NODE_ENV"] === "production";

export async function startServer() {
  if (!isProduction) {
    const { watchClientBundle } = await import("./clientBundler.ts");
    await watchClientBundle();
  }

  const app = createApp();
  const server = http.createServer(app.callback());

  const wsServer = new WebSocketServer({ server, path: "/socket" });
  wsServer.on("connection", (ws) => {
    logger.info("websocket connected");
    new Player(ws);
  });

  server.listen(PORT, () => {
    logger.info({ port: PORT }, "server listening");
  });

  return server;
}
