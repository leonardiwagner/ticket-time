import * as grpc from "@grpc/grpc-js";
import { createEventGenerator } from "./event-generator.js";
import { createInMemoryEventRepository } from "./repository/index.js";
import { createLogger } from "./logging/logger.js";
import { createEventsServer } from "./grpc/events-server.js";
import { createEventCatalog } from "./grpc/event-catalog.js";

const eventsAddress = process.env.EVENTS_GRPC_ADDRESS ?? "127.0.0.1:50051";

const logger = createLogger({ service: "app-events" });
const eventRepository = createInMemoryEventRepository();
const eventGenerator = createEventGenerator(eventRepository);
const eventsServer = createEventsServer(createEventCatalog(eventRepository), logger);

const start = async () => {
  await new Promise<void>((resolve, reject) => {
    eventsServer.bindAsync(
      eventsAddress,
      grpc.ServerCredentials.createInsecure(),
      (error) => (error ? reject(error) : resolve()),
    );
  });
  eventGenerator.start();
  logger.info({ address: eventsAddress, intervalMs: 10_000 }, "app-events started");
};

const shutdown = () => {
  eventGenerator.stop();
  eventsServer.tryShutdown((error) => {
    if (error) {
      logger.error({ err: error }, "app-events shutdown failed");
    }
  });
  logger.info("app-events stopped");
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

void start().catch((error) => {
  logger.fatal({ err: error, address: eventsAddress }, "app-events failed to start");
  process.exitCode = 1;
});
