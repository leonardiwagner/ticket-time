import { Kafka, logLevel } from "kafkajs";
import type { Logger } from "pino";
import type { CatalogProjection } from "./catalog-projection.js";

const topics = ["tickettime.events.v1", "tickettime.inventory.v1"];

export interface CatalogConsumer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createKafkaCatalogConsumer(
  brokers: string[],
  projection: CatalogProjection,
  logger: Logger,
): CatalogConsumer {
  const consumer = new Kafka({ clientId: "app-bookings", brokers, logLevel: logLevel.NOTHING }).consumer({
    groupId: "app-bookings-catalog-v1",
  });
  let started = false;

  return {
    start: async () => {
      if (started) return;
      await consumer.connect();
      await consumer.subscribe({ topics, fromBeginning: true });
      await consumer.run({
        eachMessage: async ({ topic, message }) => {
          if (!message.value) return;
          try {
            const applied = projection.apply(JSON.parse(message.value.toString()));
            logger.info({ topic, messageId: JSON.parse(message.value.toString()).messageId, applied }, "catalog message consumed");
          } catch (error) {
            logger.error({ err: error, topic }, "catalog message consumption failed");
            throw error;
          }
        },
      });
      projection.markInitialized();
      started = true;
    },
    stop: async () => {
      if (!started) return;
      await consumer.disconnect();
      started = false;
    },
  };
}
