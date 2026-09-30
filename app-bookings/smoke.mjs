import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const events = spawn("node", ["dist/main.js"], {
  cwd: resolve(root, "app-events"),
  env: { ...process.env, EVENTS_GRPC_ADDRESS: "127.0.0.1:15051", HEALTH_PORT: "18081", HEALTH_HOST: "127.0.0.1" },
  stdio: "inherit",
});
const bookings = spawn("node", ["dist/main.js"], {
  cwd: resolve(root, "app-bookings"),
  env: {
    ...process.env,
    EVENTS_GRPC_ADDRESS: "127.0.0.1:15051",
    BOOKINGS_GRPC_ADDRESS: "127.0.0.1:15052",
    HEALTH_PORT: "18082",
    HEALTH_HOST: "127.0.0.1",
  },
  stdio: "inherit",
});

const stop = () => { events.kill("SIGTERM"); bookings.kill("SIGTERM"); };
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

const waitForHealth = async (port) => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health/ready`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`health check failed on port ${port}`);
};

try {
  await waitForHealth(18081);
  await waitForHealth(18082);
  const definition = protoLoader.loadSync(resolve(root, "contracts/ticket-time/v1/bookings.proto"));
  const loaded = grpc.loadPackageDefinition(definition);
  const Client = loaded.tickettime.bookings.v1.BookingsService;
  const client = new Client("127.0.0.1:15052", grpc.credentials.createInsecure());
  const eventsDefinition = protoLoader.loadSync(resolve(root, "contracts/ticket-time/v1/events.proto"));
  const eventsLoaded = grpc.loadPackageDefinition(eventsDefinition);
  const eventsClient = new eventsLoaded.tickettime.events.v1.EventsService("127.0.0.1:15051", grpc.credentials.createInsecure());
  const confirmed = await new Promise((resolve, reject) => eventsClient.listConfirmedEvents({}, (error, response) => error ? reject(error) : resolve(response.events)));
  if (confirmed.length === 0) throw new Error("no confirmed events discovered");
  const result = await new Promise((resolve, reject) => client.bookEvent({ customerId: "850e8400-e29b-41d4-a716-446655440000", eventId: confirmed[0].id, requestId: "local-smoke" }, (error, response) => error ? reject(error) : resolve(response)));
  if (result.ticket?.status !== "confirmed") throw new Error("booking did not return a confirmed ticket");
  client.close();
  eventsClient.close();
  console.log(`local smoke passed: discovered ${confirmed.length} event(s) and booked ${result.ticket.id}`);
} finally {
  stop();
}
