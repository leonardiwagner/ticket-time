import { z } from "zod";

export const eventSchema = z
  .object({
    id: z.uuid(),
    name: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    venueId: z.uuid(),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    status: z.enum(["draft", "confirmed", "cancelled"]),
  })
  .refine((event) => new Date(event.endsAt).getTime() > new Date(event.startsAt).getTime(), {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });

export type Event = z.infer<typeof eventSchema>;
