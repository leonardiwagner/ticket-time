import * as grpc from "@grpc/grpc-js";
import { createCatalogProjection } from "./catalog-projection.js";
import { createBookingsServer } from "./grpc/bookings-server.js";
import { createEventsGateway } from "./grpc/events-client.js";
import { createHealthServer } from "./health.js";
import { createKafkaCatalogConsumer } from "./kafka-catalog-consumer.js";
import { createLogger } from "./logging/logger.js";
import type { Ticket } from "./models/ticket.js";
import { readAndLogConfirmedEvents } from "./read-events.js";

const logger = createLogger({ service: "app-bookings" });
const eventsAddress = process.env.EVENTS_GRPC_ADDRESS ?? "127.0.0.1:50051";
const bookingsAddress = process.env.BOOKINGS_GRPC_ADDRESS ?? "127.0.0.1:50052";
const healthPort = Number(process.env.HEALTH_PORT ?? 8082);
const kafkaBrokers = process.env.KAFKA_BOOTSTRAP_SERVERS?.split(",");
const events = createEventsGateway(eventsAddress, 2_000, logger);
const tickets = new Map<string, Ticket>();
const ticketStore = {
  createTicket: async (ticket: Ticket & { ticketId: string }) => {
    const existing = tickets.get(ticket.id);
    if (existing) return existing;
    tickets.set(ticket.id, ticket);
    return ticket;
  },
};
const bookingsServer = createBookingsServer(events, ticketStore, logger);
const projection = createCatalogProjection();
const catalogConsumer = kafkaBrokers
  ? createKafkaCatalogConsumer(kafkaBrokers, projection, logger)
  : undefined;
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

const initializeCatalog = async () => {
  if (catalogConsumer) {
    await catalogConsumer.start();
    logger.info({ eventCount: projection.events().length }, "Kafka catalog projection initialized");
    return;
  }
  await waitForEvents();
};

const start = async () => {
  await bind();
  await initializeCatalog();
  ready = true;
  logger.info({ address: bookingsAddress, healthPort, eventsAddress }, "app-bookings started");
};

const shutdown = () => {
  ready = false;
  void catalogConsumer?.stop();
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
