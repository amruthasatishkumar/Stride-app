import { z } from "zod";

export const priorityInputSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(1200),
  fiscalYear: z.string().trim().min(2).max(12),
  desiredOutcomes: z.array(z.string().trim().min(1).max(240)).max(10),
});

export type PriorityInput = z.infer<typeof priorityInputSchema>;

export interface Priority extends PriorityInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

