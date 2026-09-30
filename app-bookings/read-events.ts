import type { Logger } from "pino";
import type { ConfirmedEvent, EventsGateway } from "./grpc/events-client.js";

export async function readAndLogConfirmedEvents(
  events: EventsGateway,
  logger: Logger,
): Promise<readonly ConfirmedEvent[]> {
  const confirmedEvents = await events.listConfirmedEvents();
  for (const event of confirmedEvents) {
    logger.info({ event }, "event received from app-events");
  }
  logger.info({ eventCount: confirmedEvents.length }, "confirmed events read from app-events");
  return confirmedEvents;
}
