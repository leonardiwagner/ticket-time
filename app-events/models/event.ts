import { z } from "zod";
import { artistSchema } from "./artist.js";
import { venueSchema } from "./venue.js";

export const eventSchema = z
  .object({
    id: z.uuid(),
    name: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    artist: artistSchema,
    venue: venueSchema,
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    status: z.enum(["draft", "confirmed", "cancelled"]),
  })
  .refine((event) => new Date(event.endsAt).getTime() > new Date(event.startsAt).getTime(), {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });

export type Event = z.infer<typeof eventSchema>;
