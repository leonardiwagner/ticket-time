import { test } from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { createLogger } from "./logging/logger.js";

test("logger emits service, request, and error fields without secrets", () => {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  const logger = createLogger({
    service: "app-bookings",
    env: { LOG_LEVEL: "info" },
    stream,
  });

  logger.error(
    {
      requestId: "booking-request-1",
      err: new Error("reservation failed"),
      paymentData: { cardNumber: "4111111111111111" },
    },
    "booking failed",
  );

  const entry = JSON.parse(lines[0]);
  assert.equal(entry.service, "app-bookings");
  assert.equal(entry.requestId, "booking-request-1");
  assert.equal(entry.msg, "booking failed");
  assert.equal(entry.err.message, "reservation failed");
  assert.equal(entry.paymentData, undefined);
  assert.equal(JSON.stringify(entry).includes("4111111111111111"), false);
});
