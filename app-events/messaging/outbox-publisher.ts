import { Kafka, logLevel } from "kafkajs";
import type { Logger } from "pino";
import type { EventRepository } from "../repository/index.js";
import type { OutboxRecord } from "./events.js";

export interface OutboxPublisher { publishPending(): Promise<void>; disconnect(): Promise<void>; }

export function createKafkaOutboxPublisher(brokers: string[], repository: EventRepository, logger: Logger): OutboxPublisher {
  const producer = new Kafka({ clientId: "app-events", brokers, logLevel: logLevel.NOTHING }).producer();
  let connected = false;
  return {
    publishPending: async () => {
      if (!connected) { await producer.connect(); connected = true; }
      for (const record of repository.pendingOutbox()) {
        await producer.send({ topic: record.topic, messages: [{ key: record.key, value: JSON.stringify(record.envelope) }], acks: -1 });
        repository.markOutboxPublished(record.id);
        logger.info({ messageId: record.id, topic: record.topic, eventId: record.key }, "outbox record published");
      }
    },
    disconnect: async () => { if (connected) await producer.disconnect(); connected = false; },
  };
}
