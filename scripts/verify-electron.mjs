import { _electron as electron } from "playwright";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dataDirectory = await mkdtemp(join(tmpdir(), "stride-smoke-"));

try {
  const app = await launchApp();
  const window = await app.firstWindow();
  await window.waitForLoadState("domcontentloaded");

  const title = await window.locator("h1").textContent();
  if (title?.trim() !== "Connect Stride to Microsoft.") {
    throw new Error(`Unexpected application title: ${title}`);
  }

  await window.getByRole("button", { name: "Connect Microsoft services" }).click();
  await window.getByText("WorkIQ mock connected.").waitFor();
  await window.getByText("1 role goal available.").waitFor();

  const tools = await window.locator(".tool-list span").allTextContents();
  if (!tools.includes("ask") || !tools.includes("fetch")) {
    throw new Error(`Expected WorkIQ tools were not rendered: ${tools.join(", ")}`);
  }

  await window.getByRole("button", { name: "Find recent evidence" }).click();
  await window.getByText("2 evidence candidates ready for your review.").waitFor();
  await window
    .locator(".evidence-card")
    .first()
    .getByRole("button", { name: "Approve" })
    .click();
  await window
    .getByText("Evidence approved and saved to your local impact journal.")
    .waitFor();

  await app.close();

  const restartedApp = await launchApp();
  try {
    const restartedWindow = await restartedApp.firstWindow();
    await restartedWindow.waitForLoadState("domcontentloaded");
    await restartedWindow.getByText("1 approved evidence item").waitFor();
    await restartedWindow.getByText("1 saved role goal available.").waitFor();
  } finally {
    await restartedApp.close();
  }

  console.log(
    `Electron smoke test passed. Rendered tools: ${tools.join(", ")}. All role goals and approved evidence persisted after restart.`,
  );
} finally {
  await rm(dataDirectory, { recursive: true, force: true });
}

function launchApp() {
  return electron.launch({
    args: ["."],
    env: {
      ...process.env,
      STRIDE_WORKIQ_MOCK: "1",
      STRIDE_MSC_MOCK: "1",
      STRIDE_DATA_DIR: dataDirectory,
    },
  });
}
