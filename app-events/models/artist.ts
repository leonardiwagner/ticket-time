import { z } from "zod";

export const artistSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
});

export type Artist = z.infer<typeof artistSchema>;
