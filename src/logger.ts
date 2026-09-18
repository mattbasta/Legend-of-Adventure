import pino from "pino";

const dev = process.env["NODE_ENV"] !== "production";

// LOG_LEVEL overrides the default; tests run with "silent".
const level = process.env["LOG_LEVEL"] ?? (dev ? "debug" : "info");

export const logger = pino(
  dev
    ? {
        level,
        transport: { target: "pino-pretty", options: { colorize: true } },
      }
    : { level },
);
