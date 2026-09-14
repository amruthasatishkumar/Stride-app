import { describe, expect, it } from "vitest";
import {
  parseMscClipboardHtml,
  parseMscClipboardText,
  parseMscGoalRows,
} from "../src/shared/msc-goal-parser";

describe("parseMscGoalRows", () => {
  it("extracts goal titles, descriptions, and metrics from MSC rows", () => {
    const goals = parseMscGoalRows([
      ["#", "Goal Title", "Goal Description"],
      [
        "1",
        "Drive Frontier Transformation & Revenue Growth",
        "This goal is from your RSG (aka.ms/RAIN/).",
        "Lead Databases & Analytics customer engagements as Data SE.",
        "Metrics: Frontier Transformation KPIs and metrics",
      ],
      [
        "2",
        "Deliver Technical Validation & Competitive Wins",
        "Own Databases & Analytics for all conversations.",
        "Metrics: Fabric Adoption in Tier 1 workloads wins.",
      ],
    ]);

    expect(goals).toEqual([
      {
        title: "Drive Frontier Transformation & Revenue Growth",
        description: "Lead Databases & Analytics customer engagements as Data SE.",
        metrics: ["Frontier Transformation KPIs and metrics"],
      },
      {
        title: "Deliver Technical Validation & Competitive Wins",
        description: "Own Databases & Analytics for all conversations.",
        metrics: ["Fabric Adoption in Tier 1 workloads wins."],
      },
    ]);
  });

  it("extracts goals copied from an MSC table", () => {
    const goals = parseMscClipboardText(
      [
        "#\tGoal Title\tGoal Description",
        "1\tDrive Frontier Transformation & Revenue Growth\tLead customer engagements.\nMetrics: Frontier Transformation KPIs",
      ].join("\n"),
    );

    expect(goals).toEqual([
      {
        title: "Drive Frontier Transformation & Revenue Growth",
        description: "Lead customer engagements.",
        metrics: ["Frontier Transformation KPIs"],
      },
    ]);
  });

  it("extracts line-by-line clipboard content", () => {
    const goals = parseMscClipboardText(
      [
        "1",
        "Drive Frontier Transformation & Revenue Growth",
        "Lead customer engagements.",
        "Metrics: Frontier Transformation KPIs",
        "2",
        "Deliver Technical Validation",
        "Own technical validation.",
        "Metrics: Fabric adoption",
      ].join("\n"),
    );

    expect(goals).toHaveLength(2);
    expect(goals[0].title).toBe("Drive Frontier Transformation & Revenue Growth");
    expect(goals[1].metrics).toEqual(["Fabric adoption"]);
  });

  it("extracts copied HTML table rows", () => {
    const goals = parseMscClipboardHtml(`
      <table>
        <tr><th>#</th><th>Goal Title</th><th>Goal Description</th></tr>
        <tr>
          <td>1</td>
          <td>Drive Frontier Transformation &amp; Revenue Growth</td>
          <td>Lead customer engagements.<br>Metrics: Frontier Transformation KPIs</td>
        </tr>
      </table>
    `);

    expect(goals).toEqual([
      {
        title: "Drive Frontier Transformation & Revenue Growth",
        description: "Lead customer engagements.",
        metrics: ["Frontier Transformation KPIs"],
      },
    ]);
  });
});
