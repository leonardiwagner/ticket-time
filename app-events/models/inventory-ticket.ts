import { z } from "zod";

export const inventoryTicketSchema = z.object({
  id: z.uuid(),
  eventId: z.uuid(),
  status: z.enum(["available", "held", "sold", "released"]),
  holdId: z.string().nullable(),
  bookingRequestId: z.string().nullable(),
  heldUntil: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type InventoryTicket = z.infer<typeof inventoryTicketSchema>;
