import { test } from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { createLogger, requestIdFromMetadata } from "./logging/logger.js";

function capture() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  return { lines, stream };
}

test("logger emits structured fields and redacts sensitive values", () => {
  const output = capture();
  const logger = createLogger({
    service: "app-events",
    env: { LOG_LEVEL: "info" },
    stream: output.stream,
  });

  logger.info(
    { requestId: "request-123", token: "do-not-log", customerSecret: "do-not-log" },
    "event generated",
  );

  const entry = JSON.parse(output.lines[0]);
  assert.equal(entry.service, "app-events");
  assert.equal(entry.level, 30);
  assert.equal(entry.requestId, "request-123");
  assert.equal(entry.msg, "event generated");
  assert.equal(entry.token, undefined);
  assert.equal(entry.customerSecret, undefined);
});

test("debug logs are disabled at the default production-like level", () => {
  const output = capture();
  const logger = createLogger({ service: "app-events", env: {}, stream: output.stream });

  logger.debug({ requestId: "request-123" }, "debug detail");

  assert.equal(output.lines.length, 0);
});

test("request IDs are preserved or generated for gRPC metadata", () => {
  assert.equal(
    requestIdFromMetadata({ get: () => ["incoming-request"] }),
    "incoming-request",
  );
  assert.match(requestIdFromMetadata({ get: () => [] }), /^[0-9a-f-]{36}$/);
});
