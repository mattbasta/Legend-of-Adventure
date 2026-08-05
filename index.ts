import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";

import { WebSocketServer } from "ws";

import { Player } from "./src/player.ts";

const PORT = Number(process.env["PORT"]) || 8080;
const WWW = path.join(import.meta.dirname, "www");

const server = http.createServer((request, response) => {
  if (request.url === "/") {
    response.write(
      fs
        .readFileSync(path.join(WWW, "index.html"), "utf-8")
        .replace("%(port)s", String(PORT)),
    );
    response.end();
    return;
  }

  const url = new URL("http://foo" + request.url!).pathname;

  if (url.startsWith("/static/")) {
    const wwwPath = path.normalize(path.join(WWW, url.slice(8)));
    if (!wwwPath.startsWith(WWW) || !fs.existsSync(wwwPath)) {
      console.log(`Could not find ${wwwPath}`);
      response.writeHead(404);
    } else {
      response.write(fs.readFileSync(wwwPath));
    }
    response.end();
    return;
  }

  response.writeHead(404);
  response.end();
});

const wsServer = new WebSocketServer({
  server,
});

wsServer.on("connection", (ws) => {
  console.log("Got socket request");
  new Player(ws);
});

server.listen(PORT, () => {
  console.log(`${new Date()} Server is listening on port ${PORT}`);
});
