import { logger } from "./src/logger.ts";
import { startServer } from "./src/server/index.ts";

const handle = await startServer();

// Shut down cleanly on Ctrl-C and on the SIGTERM that `node --watch` sends
// when it restarts. No explicit process.exit is needed: once the server has
// closed and the regions have been disposed, nothing is left holding the
// event loop open.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void handle.shutdown(signal);
  });
}

process.on("unhandledRejection", (err) => {
  logger.error({ err }, "unhandled rejection");
});
