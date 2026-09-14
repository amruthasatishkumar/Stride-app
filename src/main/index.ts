import { app, BrowserWindow, ipcMain, shell } from "electron";
import { join } from "node:path";
import { PriorityRepository } from "./database/priority-repository";
import { importGoalsFromMsc } from "./msc/msc-goal-importer";
import { WorkIQClient } from "./workiq/workiq-client";

const workiq = new WorkIQClient();
let priorities: PriorityRepository | null = null;

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 860,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.on("ready-to-show", () => window.show());

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  const dataDirectory = process.env.STRIDE_DATA_DIR ?? app.getPath("userData");
  priorities = await PriorityRepository.open(join(dataDirectory, "stride.sqlite"));

  ipcMain.handle("workiq:get-status", () => workiq.getStatus());
  ipcMain.handle("workiq:connect", () => workiq.connect());
  ipcMain.handle("priority:get", () => priorities?.getActive() ?? null);
  ipcMain.handle("goals:get", () => priorities?.getRoleGoals() ?? []);
  ipcMain.handle("priority:save", (_event, input: unknown) => {
    if (!priorities) {
      throw new Error("Local priority storage is not ready.");
    }
    return priorities.save(input);
  });
  ipcMain.handle("evidence:discover", (_event, input: unknown) =>
    workiq.discoverEvidence(input),
  );
  ipcMain.handle("evidence:list-approved", () =>
    priorities?.listApprovedEvidence() ?? [],
  );
  ipcMain.handle("evidence:approve", (_event, input: unknown) => {
    if (!priorities) {
      throw new Error("Local evidence storage is not ready.");
    }
    return priorities.approveEvidence(input);
  });
  ipcMain.handle("msc:import-goals", async (event, sourceUrl: string) => {
    if (!priorities) {
      throw new Error("Local goal storage is not ready.");
    }

    let goals;
    if (process.env.STRIDE_MSC_MOCK === "1") {
      goals = [
        {
          title: "Drive Frontier Transformation & Revenue Growth",
          description: "Lead customer engagements and shape data platform strategies.",
          metrics: ["Frontier Transformation KPIs and metrics"],
        },
      ];
    } else {
      const parent = BrowserWindow.fromWebContents(event.sender);
      if (!parent) {
        throw new Error("The Stride window is not available.");
      }
      goals = await importGoalsFromMsc(
        parent,
        sourceUrl,
        join(dataDirectory, "msc-edge-profile"),
      );
    }

    return priorities.saveRoleGoals(goals);
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  void workiq.disconnect();
  priorities?.close();
  priorities = null;
});
