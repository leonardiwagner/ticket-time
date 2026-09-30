import { createEventsGateway } from "./grpc/events-client.js";
import { createLogger } from "./logging/logger.js";
import { readAndLogConfirmedEvents } from "./read-events.js";

const logger = createLogger({ service: "app-bookings" });
const eventsAddress = process.env.EVENTS_GRPC_ADDRESS ?? "127.0.0.1:50051";
const events = createEventsGateway(eventsAddress, 2_000, logger);

void readAndLogConfirmedEvents(events, logger).catch((error) => {
  logger.error({ err: error, address: eventsAddress }, "failed to read events from app-events");
  process.exitCode = 1;
});
