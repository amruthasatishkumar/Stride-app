import { describe, expect, it } from "vitest";
import { classifyWorkIQError } from "../src/shared/workiq-status";

describe("classifyWorkIQError", () => {
  it("recognizes EULA setup failures", () => {
    expect(classifyWorkIQError(new Error("Run workiq accept-eula")).state).toBe(
      "setup_required",
    );
  });

  it("recognizes authentication failures", () => {
    expect(classifyWorkIQError(new Error("Authentication required")).state).toBe(
      "authentication_required",
    );
  });

  it("recognizes tenant availability failures", () => {
    expect(classifyWorkIQError(new Error("403 admin consent required")).state).toBe(
      "unavailable",
    );
  });
});

