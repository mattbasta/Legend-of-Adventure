import * as fs from "node:fs/promises";
import * as path from "node:path";

import Koa from "koa";
import mount from "koa-mount";
import serve from "koa-static";

import { logger } from "../logger.ts";

const WWW = path.join(import.meta.dirname, "../../www");

export function createApp() {
  const app = new Koa();

  app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    logger.debug(
      {
        method: ctx.method,
        path: ctx.path,
        status: ctx.status,
        ms: Date.now() - start,
      },
      "request",
    );
  });

  app.use(async (ctx, next) => {
    if (ctx.path === "/") {
      ctx.type = "html";
      ctx.body = await fs.readFile(path.join(WWW, "index.html"), "utf-8");
      return;
    }
    await next();
  });

  app.use(mount("/static", serve(WWW)));

  return app;
}
