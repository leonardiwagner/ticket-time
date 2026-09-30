import { createEventGenerator } from "./event-generator.js";
import { createInMemoryEventRepository } from "./repository/index.js";
import { createLogger } from "./logging/logger.js";

const logger = createLogger({ service: "app-events" });
const eventRepository = createInMemoryEventRepository();
const eventGenerator = createEventGenerator(eventRepository);

eventGenerator.start();
logger.info({ intervalMs: 10_000 }, "event generator started");

const shutdown = () => {
  eventGenerator.stop();
  logger.info("app-events stopped");
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
