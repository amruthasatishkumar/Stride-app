import { z } from "zod";
import { evidenceCandidateSchema } from "../../shared/evidence";

export const evidenceApprovalInputSchema = z.object({
  candidate: evidenceCandidateSchema,
  employeeNotes: z.string().trim().max(1600),
  approvedForConnect: z.boolean(),
});
