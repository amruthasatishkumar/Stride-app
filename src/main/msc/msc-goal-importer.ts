import { BrowserWindow, dialog } from "electron";
import { chromium, type BrowserContext, type Page } from "playwright";
import type { ImportedMscGoal } from "../../shared/msc-goal";
import { parseMscGoalRows } from "../../shared/msc-goal-parser";

export async function importGoalsFromMsc(
  parent: BrowserWindow,
  sourceUrl: string,
  profileDirectory: string,
): Promise<ImportedMscGoal[]> {
  const url = new URL(sourceUrl);
  if (url.protocol !== "https:" || url.hostname !== "msc.microsoft.com") {
    throw new Error("Stride can import goals only from msc.microsoft.com.");
  }

  let context: BrowserContext;
  try {
    context = await chromium.launchPersistentContext(profileDirectory, {
      channel: "msedge",
      headless: false,
      viewport: null,
      args: ["--start-maximized"],
    });
  } catch (error) {
    throw new Error(
      `Stride could not start managed Microsoft Edge. ${
        error instanceof Error ? error.message : "Microsoft Edge is unavailable."
      }`,
    );
  }

  const collected = new Map<string, ImportedMscGoal>();
  let scanInProgress = false;
  const scan = async (): Promise<void> => {
    if (scanInProgress) {
      return;
    }

    scanInProgress = true;
    try {
      for (const page of context.pages()) {
        await collectGoalsFromPage(page, collected);
      }
    } finally {
      scanInProgress = false;
    }
  };

  const page = context.pages()[0] ?? (await context.newPage());
  const scanTimer = setInterval(() => void scan(), 1_500);

  try {
    await page.goto(sourceUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    while (true) {
      const { response } = await dialog.showMessageBox(parent, {
        type: "info",
        title: "Import Microsoft role goals",
        message: "Microsoft Sales Center is open in managed Edge.",
        detail:
          "Sign in if needed, open the Goals tab, and scroll through the goals you want Stride to collect. Return here and choose Import visible goals. No copying is required.",
        buttons: ["Import visible goals", "Cancel"],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      });

      if (response === 1) {
        throw new Error("Microsoft goal import was cancelled.");
      }

      await scan();
      const goals = [...collected.values()];
      if (goals.length > 0) {
        return goals;
      }

      const retry = await dialog.showMessageBox(parent, {
        type: "warning",
        title: "No goal rows found",
        message: "Stride could not find visible Microsoft goal rows.",
        detail:
          "In Edge, open the Goals tab and wait for the table to finish loading. Scroll through the desired rows, then try again.",
        buttons: ["Try again", "Cancel"],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      });

      if (retry.response === 1) {
        throw new Error("Microsoft goal import was cancelled.");
      }
    }
  } finally {
    clearInterval(scanTimer);
    await context.close();
  }
}

async function collectGoalsFromPage(
  page: Page,
  collected: Map<string, ImportedMscGoal>,
): Promise<void> {
  for (const frame of page.frames()) {
    try {
      const rows = await frame.evaluate(() => {
        const selectors = ["table tr", "[role='row']"];
        const foundRows: string[][] = [];
        const seen = new Set<string>();

        for (const selector of selectors) {
          for (const row of document.querySelectorAll(selector)) {
            const cells = [
              ...row.querySelectorAll(
                "th, td, [role='cell'], [role='gridcell'], [role='columnheader']",
              ),
            ]
              .map((cell) => (cell as HTMLElement).innerText.trim())
              .filter(Boolean);
            const key = cells.join(" | ");
            if (cells.length >= 3 && !seen.has(key)) {
              seen.add(key);
              foundRows.push(cells);
            }
          }
        }

        return foundRows;
      });

      for (const goal of parseMscGoalRows(rows)) {
        collected.set(goal.title.toLowerCase(), goal);
      }
    } catch {
      // Authentication and report frames can navigate while the periodic scan runs.
    }
  }
}
