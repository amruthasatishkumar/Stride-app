import { describe, expect, it } from "vitest";
import { parseEvidenceResponse } from "../src/main/workiq/workiq-client";

describe("parseEvidenceResponse", () => {
  it("validates structured WorkIQ evidence", () => {
    const evidence = parseEvidenceResponse(`
      \`\`\`json
      {
        "evidence": [{
          "id": "meeting-1",
          "goalTitle": "Drive Frontier Transformation",
          "activityTitle": "Customer workshop",
          "activityDate": "2026-08-12",
          "contribution": "Facilitated discovery.",
          "outcome": "Next steps were agreed.",
          "supportingExcerpt": "The team agreed on next steps.",
          "sourceTitle": "Customer workshop",
          "sourceReference": "/me/events/meeting-1",
          "confidence": "high",
          "uncertainties": ""
        }]
      }
      \`\`\`
    `);

    expect(evidence).toHaveLength(1);
    expect(evidence[0].sourceReference).toBe("/me/events/meeting-1");
  });

  it("rejects unstructured claims", () => {
    expect(() => parseEvidenceResponse("You did excellent work.")).toThrow(
      "structured evidence",
    );
  });
});
