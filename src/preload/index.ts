import { contextBridge, ipcRenderer } from "electron";
import type { ImportedMscGoal } from "../shared/msc-goal";
import type { Priority, PriorityInput } from "../shared/priority";
import type { WorkIQStatus } from "../shared/workiq-status";
import type {
  ApprovedEvidence,
  EvidenceApprovalInput,
  EvidenceCandidate,
  EvidenceDiscoveryInput,
} from "../shared/evidence";

const strideApi = {
  getWorkIQStatus: (): Promise<WorkIQStatus> =>
    ipcRenderer.invoke("workiq:get-status"),
  connectWorkIQ: (): Promise<WorkIQStatus> =>
    ipcRenderer.invoke("workiq:connect"),
  getPriority: (): Promise<Priority | null> => ipcRenderer.invoke("priority:get"),
  getRoleGoals: (): Promise<ImportedMscGoal[]> => ipcRenderer.invoke("goals:get"),
  savePriority: (input: PriorityInput): Promise<Priority> =>
    ipcRenderer.invoke("priority:save", input),
  importGoalsFromMsc: (sourceUrl: string): Promise<ImportedMscGoal[]> =>
    ipcRenderer.invoke("msc:import-goals", sourceUrl),
  discoverEvidence: (input: EvidenceDiscoveryInput): Promise<EvidenceCandidate[]> =>
    ipcRenderer.invoke("evidence:discover", input),
  getApprovedEvidence: (): Promise<ApprovedEvidence[]> =>
    ipcRenderer.invoke("evidence:list-approved"),
  approveEvidence: (input: EvidenceApprovalInput): Promise<ApprovedEvidence> =>
    ipcRenderer.invoke("evidence:approve", input),
};

contextBridge.exposeInMainWorld("stride", strideApi);

export type StrideApi = typeof strideApi;
