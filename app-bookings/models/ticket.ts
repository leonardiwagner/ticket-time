import { z } from "zod";

export const ticketSchema = z.object({
  id: z.uuid(),
  eventId: z.uuid(),
  customerId: z.uuid(),
  status: z.enum(["reserved", "confirmed", "cancelled"]),
});

export type Ticket = z.infer<typeof ticketSchema>;
