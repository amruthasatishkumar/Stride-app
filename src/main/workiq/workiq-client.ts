import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  classifyWorkIQError,
  initialWorkIQStatus,
  type WorkIQStatus,
} from "../../shared/workiq-status";
import {
  evidenceDiscoveryInputSchema,
  evidenceCandidateSchema,
  type EvidenceCandidate,
  type EvidenceDiscoveryInput,
} from "../../shared/evidence";
import { z } from "zod";

const MOCK_TOOLS = ["ask", "fetch", "retrieve"];
const evidenceResponseSchema = z.object({
  evidence: z.array(evidenceCandidateSchema).max(12),
});

export class WorkIQClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private status: WorkIQStatus = initialWorkIQStatus;

  getStatus(): WorkIQStatus {
    return this.status;
  }

  async connect(): Promise<WorkIQStatus> {
    if (this.status.state === "connected") {
      return this.status;
    }

    this.status = {
      state: "connecting",
      message: "Starting WorkIQ...",
      tools: [],
      checkedAt: new Date().toISOString(),
    };

    if (process.env.STRIDE_WORKIQ_MOCK === "1") {
      this.status = {
        state: "connected",
        message: "WorkIQ mock connected.",
        tools: MOCK_TOOLS,
        checkedAt: new Date().toISOString(),
      };
      return this.status;
    }

    try {
      const command = process.platform === "win32" ? "npx.cmd" : "npx";
      this.transport = new StdioClientTransport({
        command,
        args: ["-y", "@microsoft/workiq", "mcp"],
        stderr: "pipe",
      });

      this.client = new Client({
        name: "stride",
        version: "0.1.0",
      });

      await this.client.connect(this.transport);
      const response = await this.client.listTools();
      const tools = response.tools.map((tool) => tool.name).sort();

      this.status = {
        state: "connected",
        message: `WorkIQ connected with ${tools.length} available tools.`,
        tools,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      await this.disconnect();
      this.status = classifyWorkIQError(error);
    }

    return this.status;
  }

  async discoverEvidence(rawInput: unknown): Promise<EvidenceCandidate[]> {
    const input = evidenceDiscoveryInputSchema.parse(rawInput);
    if (process.env.STRIDE_WORKIQ_MOCK === "1") {
      return createMockEvidence(input.goalTitles[0] ?? "Microsoft role goal");
    }

    if (!this.client || this.status.state !== "connected") {
      const status = await this.connect();
      if (status.state !== "connected" || !this.client) {
        throw new Error(status.message);
      }
    }

    const response = await this.client.callTool({
      name: "ask",
      arguments: {
        question: buildEvidencePrompt(input),
      },
    });
    const content = Array.isArray(response.content) ? response.content : [];
    const text = content
      .filter(isTextContent)
      .map((item) => item.text)
      .join("\n");

    return parseEvidenceResponse(text);
  }

  async disconnect(): Promise<void> {
    const client = this.client;
    this.client = null;
    this.transport = null;

    if (client) {
      await client.close().catch(() => undefined);
    }

    if (this.status.state === "connected") {
      this.status = initialWorkIQStatus;
    }
  }
}

export function parseEvidenceResponse(value: string): EvidenceCandidate[] {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? value.slice(value.indexOf("{"), value.lastIndexOf("}") + 1);

  if (!candidate.trim()) {
    throw new Error("WorkIQ did not return structured evidence candidates.");
  }

  try {
    return evidenceResponseSchema.parse(JSON.parse(candidate)).evidence;
  } catch (error) {
    throw new Error(
      `WorkIQ evidence could not be validated. ${
        error instanceof Error ? error.message : "The response was not valid JSON."
      }`,
    );
  }
}

function buildEvidencePrompt(input: EvidenceDiscoveryInput): string {
  return `Find factual Microsoft 365 work evidence from the last ${input.daysBack} days that relates to these employee-selected goals:
${input.goalTitles.map((goal) => `- ${goal}`).join("\n")}

Use meetings, emails, and documents. Do not judge performance, personality, emotion, accent, or intent. Include only observable contributions and outcomes supported by a source. Return JSON only in this exact shape:
{
  "evidence": [
    {
      "id": "stable source-derived identifier",
      "goalTitle": "one selected goal",
      "activityTitle": "meeting, email, or document title",
      "activityDate": "ISO date or empty string",
      "contribution": "factual employee contribution",
      "outcome": "observable outcome, or empty string if not established",
      "supportingExcerpt": "short supporting excerpt",
      "sourceTitle": "source title",
      "sourceReference": "WorkIQ entity path or Microsoft 365 URL",
      "confidence": "high, medium, or low",
      "uncertainties": "what still needs employee confirmation"
    }
  ]
}
Return at most 8 candidates. Do not invent missing facts.`;
}

function createMockEvidence(goalTitle: string): EvidenceCandidate[] {
  return [
      {
        id: "mock-evidence-1",
        goalTitle,
        activityTitle: "Contoso AI adoption workshop",
        activityDate: "2026-08-12",
        contribution:
          "Facilitated discovery questions and translated the customer scenario into a phased technical validation plan.",
        outcome:
          "The team agreed on owners and next steps for the first validation milestone.",
        supportingExcerpt:
          "We agreed to begin with the governed data foundation and validate the first AI scenario with named owners.",
        sourceTitle: "Contoso AI adoption workshop",
        sourceReference: "/me/events/mock-contoso-workshop",
        confidence: "medium",
        uncertainties: "Confirm whether the validation milestone was completed.",
      },
      {
        id: "mock-evidence-2",
        goalTitle,
        activityTitle: "Reusable Fabric field guidance",
        activityDate: "2026-08-15",
        contribution:
          "Created and shared reusable guidance for a governed Fabric implementation.",
        outcome: "",
        supportingExcerpt:
          "The document includes the architecture decisions, validation checklist, and customer-ready next steps.",
        sourceTitle: "Fabric implementation guidance",
        sourceReference: "/me/drive/items/mock-fabric-guidance",
        confidence: "low",
        uncertainties: "Confirm who reused the guidance and what result it influenced.",
      },
  ];
}

function isTextContent(value: unknown): value is { type: "text"; text: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "text" &&
    "text" in value &&
    typeof value.text === "string"
  );
}
