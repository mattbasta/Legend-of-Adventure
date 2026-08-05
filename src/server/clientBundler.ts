import * as esbuild from "esbuild";

import { clientBuildOptions } from "../../scripts/clientBuild.ts";
import { logger } from "../logger.ts";

/**
 * Dev-only: rebuild www/client.js inside the server process whenever client
 * source changes, so `npm run dev` is the only process needed. Production
 * never imports this module (or esbuild).
 */
export async function watchClientBundle() {
  const ctx = await esbuild.context({
    ...clientBuildOptions,
    plugins: [
      {
        name: "log-rebuild",
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length) {
              logger.error({ errors: result.errors }, "client bundle failed");
            } else {
              logger.info("client bundle rebuilt");
            }
          });
        },
      },
    ],
  });
  await ctx.watch();
  return ctx;
}
