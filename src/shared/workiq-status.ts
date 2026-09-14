export type WorkIQState =
  | "not_connected"
  | "connecting"
  | "connected"
  | "setup_required"
  | "authentication_required"
  | "unavailable"
  | "error";

export interface WorkIQStatus {
  state: WorkIQState;
  message: string;
  tools: string[];
  checkedAt: string | null;
}

export const initialWorkIQStatus: WorkIQStatus = {
  state: "not_connected",
  message: "WorkIQ has not been checked yet.",
  tools: [],
  checkedAt: null,
};

export function classifyWorkIQError(error: unknown): WorkIQStatus {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("eula") ||
    normalized.includes("accept-eula") ||
    normalized.includes("terms")
  ) {
    return {
      state: "setup_required",
      message: "WorkIQ setup is required. Accept the WorkIQ terms, then try again.",
      tools: [],
      checkedAt: new Date().toISOString(),
    };
  }

  if (
    normalized.includes("authentication") ||
    normalized.includes("unauthorized") ||
    normalized.includes("sign in") ||
    normalized.includes("login")
  ) {
    return {
      state: "authentication_required",
      message: "Microsoft sign-in is required before Stride can use WorkIQ.",
      tools: [],
      checkedAt: new Date().toISOString(),
    };
  }

  if (
    normalized.includes("enoent") ||
    normalized.includes("not recognized") ||
    normalized.includes("not found")
  ) {
    return {
      state: "setup_required",
      message: "Node.js and npx are required to start WorkIQ.",
      tools: [],
      checkedAt: new Date().toISOString(),
    };
  }

  if (
    normalized.includes("403") ||
    normalized.includes("forbidden") ||
    normalized.includes("admin consent") ||
    normalized.includes("license")
  ) {
    return {
      state: "unavailable",
      message: "WorkIQ is not available for this account or tenant.",
      tools: [],
      checkedAt: new Date().toISOString(),
    };
  }

  return {
    state: "error",
    message: `WorkIQ connection failed: ${message}`,
    tools: [],
    checkedAt: new Date().toISOString(),
  };
}

