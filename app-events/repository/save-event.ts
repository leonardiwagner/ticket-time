import { eventSchema, type Event } from "../models/event.js";

export function saveEvent(events: Map<string, Event>, event: Event): Event {
  const validEvent = eventSchema.parse(event);
  events.set(validEvent.id, validEvent);
  return validEvent;
}
