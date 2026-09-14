import { describe, expect, it } from "vitest";
import { PriorityRepository } from "../src/main/database/priority-repository";

describe("PriorityRepository", () => {
  it("saves and updates the active priority", async () => {
    const repository = await PriorityRepository.open(null);

    const first = repository.save({
      title: "Accelerate customer AI adoption",
      description: "Help customers move from interest to measurable adoption.",
      fiscalYear: "FY27",
      desiredOutcomes: ["Publish a reusable field asset"],
    });
    const updated = repository.save({
      title: "Accelerate responsible AI adoption",
      description: "Help customers adopt AI with measurable outcomes.",
      fiscalYear: "FY27",
      desiredOutcomes: ["Deliver two customer workshops"],
    });

    expect(first.id).toBe("active");
    expect(updated.createdAt).toBe(first.createdAt);
    expect(repository.getActive()).toEqual(updated);

    repository.close();
  });

  it("persists role goals and employee-approved evidence", async () => {
    const repository = await PriorityRepository.open(null);
    const goals = repository.saveRoleGoals([
      {
        title: "Drive Frontier Transformation",
        description: "Lead customer engagements.",
        metrics: ["Validated customer outcomes"],
      },
    ]);

    const approved = repository.approveEvidence({
      candidate: {
        id: "evidence-1",
        goalTitle: goals[0].title,
        activityTitle: "Customer workshop",
        activityDate: "2026-08-12",
        contribution: "Facilitated discovery and defined the validation plan.",
        outcome: "Owners and next steps were agreed.",
        supportingExcerpt: "The team agreed on owners and next steps.",
        sourceTitle: "Customer workshop",
        sourceReference: "/me/events/customer-workshop",
        confidence: "high",
        uncertainties: "",
      },
      employeeNotes: "Confirmed after the workshop.",
      approvedForConnect: true,
    });

    expect(repository.getRoleGoals()).toEqual(goals);
    expect(repository.listApprovedEvidence()).toEqual([approved]);

    repository.close();
  });
});
