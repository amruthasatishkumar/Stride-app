import { z } from "zod";

export const evidenceCandidateSchema = z.object({
  id: z.string().trim().min(1),
  goalTitle: z.string().trim().min(1).max(240),
  activityTitle: z.string().trim().min(1).max(300),
  activityDate: z.string().trim().max(40),
  contribution: z.string().trim().min(1).max(1600),
  outcome: z.string().trim().max(1600),
  supportingExcerpt: z.string().trim().min(1).max(2400),
  sourceTitle: z.string().trim().min(1).max(300),
  sourceReference: z.string().trim().min(1).max(1200),
  confidence: z.enum(["high", "medium", "low"]),
  uncertainties: z.string().trim().max(1000),
});

export type EvidenceCandidate = z.infer<typeof evidenceCandidateSchema>;

export interface ApprovedEvidence extends EvidenceCandidate {
  employeeNotes: string;
  approvedForConnect: boolean;
  approvedAt: string;
  updatedAt: string;
}

export const evidenceDiscoveryInputSchema = z.object({
  goalTitles: z.array(z.string().trim().min(1).max(300)).min(1).max(30),
  daysBack: z.number().int().min(1).max(180),
});

export type EvidenceDiscoveryInput = z.infer<typeof evidenceDiscoveryInputSchema>;

export interface EvidenceApprovalInput {
  candidate: EvidenceCandidate;
  employeeNotes: string;
  approvedForConnect: boolean;
}
