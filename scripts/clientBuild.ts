import * as esbuild from "esbuild";

export const clientBuildOptions = {
  entryPoints: ["src/client/index.ts"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  outfile: "www/client.js",
  sourcemap: true,
} satisfies esbuild.BuildOptions;

if (import.meta.main) {
  await esbuild.build({ ...clientBuildOptions, minify: true });
  console.log("Built www/client.js");
}
