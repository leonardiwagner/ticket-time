import { z } from "zod";

export const customerSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
  email: z.email().optional(),
});

export type Customer = z.infer<typeof customerSchema>;
