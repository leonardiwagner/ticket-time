import { createEventsGateway } from "./grpc/events-client.js";
import { createLogger } from "./logging/logger.js";
import { readAndLogConfirmedEvents } from "./read-events.js";
import { createBookingsServer } from "./grpc/bookings-server.js";
import { createHealthServer } from "./health.js";
import type { Ticket } from "./models/ticket.js";
import * as grpc from "@grpc/grpc-js";

const logger = createLogger({ service: "app-bookings" });
const eventsAddress = process.env.EVENTS_GRPC_ADDRESS ?? "127.0.0.1:50051";
const bookingsAddress = process.env.BOOKINGS_GRPC_ADDRESS ?? "127.0.0.1:50052";
const healthPort = Number(process.env.HEALTH_PORT ?? 8082);
const events = createEventsGateway(eventsAddress, 2_000, logger);
const tickets = new Map<string, Ticket>();
const ticketStore = {
  createTicket: async (ticket: Ticket & { reservationId: string }) => {
    tickets.set(ticket.id, ticket);
    return ticket;
  },
};
const bookingsServer = createBookingsServer(events, ticketStore, logger);
let ready = false;
const healthServer = createHealthServer(healthPort, () => ready);

const bind = () => new Promise<void>((resolve, reject) => {
  bookingsServer.bindAsync(bookingsAddress, grpc.ServerCredentials.createInsecure(), (error) =>
    error ? reject(error) : resolve(),
  );
});

const waitForEvents = async () => {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      await readAndLogConfirmedEvents(events, logger);
      return;
    } catch (error) {
      logger.warn({ err: error, attempt }, "app-events is not ready; retrying");
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new Error("app-events did not become ready");
};

const start = async () => {
  await bind();
  await waitForEvents();
  ready = true;
  logger.info({ address: bookingsAddress, healthPort, eventsAddress }, "app-bookings started");
};

const shutdown = () => {
  ready = false;
  bookingsServer.tryShutdown((error) => {
    if (error) logger.error({ err: error }, "app-bookings shutdown failed");
  });
  healthServer.close();
  logger.info("app-bookings stopped");
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
void start().catch((error) => {
  logger.fatal({ err: error }, "app-bookings failed to start");
  shutdown();
  process.exitCode = 1;
});
