import { z } from "zod";

export const venueSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
  address: z.string().trim().min(1),
  capacity: z.number().int().positive(),
});

export type Venue = z.infer<typeof venueSchema>;
