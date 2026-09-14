import type { ImportedMscGoal } from "./msc-goal";

export function parseMscClipboardText(value: string): ImportedMscGoal[] {
  const rows: string[][] = [];
  const looseLines: string[] = [];

  for (const rawLine of value.replace(/\r\n?/g, "\n").split("\n")) {
    const cells = rawLine.split("\t").map((cell) => cell.trim());
    if (cells.length > 1) {
      rows.push(cells);
      continue;
    }

    const continuation = cells[0];
    if (continuation) {
      looseLines.push(continuation);
    }
    const previousRow = rows.at(-1);
    if (continuation && previousRow) {
      const lastCellIndex = previousRow.length - 1;
      previousRow[lastCellIndex] = `${previousRow[lastCellIndex]}\n${continuation}`;
    }
  }

  const tabularGoals = parseMscGoalRows(rows);
  if (tabularGoals.length > 0) {
    return tabularGoals;
  }

  return parseMscGoalRows(groupLooseClipboardLines(looseLines));
}

export function parseMscClipboardHtml(value: string): ImportedMscGoal[] {
  const rows = [...value.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((rowMatch) =>
      [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map((cellMatch) => htmlToText(cellMatch[1]))
        .filter(Boolean),
    )
    .filter((row) => row.length > 0);

  return parseMscGoalRows(rows);
}

export function parseMscGoalRows(rows: string[][]): ImportedMscGoal[] {
  const goals = new Map<string, ImportedMscGoal>();

  for (const row of rows) {
    const cells = row.map((cell) => cell.trim()).filter(Boolean);
    const numberIndex = cells.findIndex((cell) =>
      /^\d{1,2}$/.test(normalizeText(cell)),
    );

    if (numberIndex < 0 || cells.length < numberIndex + 3) {
      continue;
    }

    const title = normalizeText(cells[numberIndex + 1]);
    const rawDescription = cells.slice(numberIndex + 2).join("\n");

    if (
      title.length < 4 ||
      /goal title/i.test(title) ||
      /goal description/i.test(rawDescription)
    ) {
      continue;
    }

    const cleanedLines = rawDescription
      .split(/\n+/)
      .map(normalizeText)
      .filter(Boolean)
      .filter((line) => !/this goal is from your rsg/i.test(line));
    const metrics = cleanedLines
      .filter((line) => /^metrics?:/i.test(line))
      .map((line) => line.replace(/^metrics?:\s*/i, "").trim())
      .filter(Boolean);
    const description = cleanedLines
      .filter((line) => !/^metrics?:/i.test(line))
      .join("\n");

    goals.set(title.toLowerCase(), {
      title,
      description,
      metrics,
    });
  }

  return [...goals.values()];
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function groupLooseClipboardLines(lines: string[]): string[][] {
  const rows: string[][] = [];
  let current: string[] | null = null;

  for (const line of lines) {
    const numberedLine = line.match(/^(\d{1,2})(?:[.)]|\s)\s*(.*)$/);
    if (numberedLine) {
      current = [numberedLine[1]];
      if (numberedLine[2]) {
        current.push(numberedLine[2]);
      }
      rows.push(current);
      continue;
    }

    if (/^\d{1,2}$/.test(line)) {
      current = [line];
      rows.push(current);
      continue;
    }

    current?.push(line);
  }

  return rows;
}

function htmlToText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .trim();
}
