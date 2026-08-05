import pino from "pino";

const dev = process.env["NODE_ENV"] !== "production";

export const logger = pino(
  dev
    ? {
        level: "debug",
        transport: { target: "pino-pretty", options: { colorize: true } },
      }
    : {},
);
