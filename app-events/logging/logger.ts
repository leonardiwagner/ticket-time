import pino, { type Logger, type DestinationStream } from "pino";
import { randomUUID } from "node:crypto";

export interface LoggerOptions {
  service: string;
  env?: NodeJS.ProcessEnv;
  stream?: DestinationStream;
}

const redactedFields = [
  "authorization",
  "cookie",
  "password",
  "token",
  "secret",
  "credentials",
  "paymentData",
  "cardNumber",
  "cvv",
  "customerSecret",
  "req.headers.authorization",
  "req.headers.cookie",
];

export function createLogger(options: LoggerOptions): Logger {
  const env = options.env ?? process.env;
  const level = env.LOG_LEVEL ?? "info";
  const pretty = env.LOG_PRETTY === "true";

  return pino(
    {
      level,
      base: { service: options.service },
      redact: { paths: redactedFields, remove: true },
      ...(pretty
        ? {
            transport: {
              target: "pino-pretty",
              options: { colorize: env.LOG_COLORIZE !== "false" },
            },
          }
        : {}),
    },
    options.stream,
  );
}

export function requestIdFromMetadata(metadata: { get(name: string): unknown[] }): string {
  const value = metadata.get("x-request-id")[0];
  return typeof value === "string" && value.trim() ? value : randomUUID();
}
