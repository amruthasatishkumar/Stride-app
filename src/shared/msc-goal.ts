import { z } from "zod";

export const importedMscGoalSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(2400),
  metrics: z.array(z.string().trim().min(1).max(500)).max(20),
});

export interface ImportedMscGoal {
  title: string;
  description: string;
  metrics: string[];
}
