import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import initSqlJs, { type Database } from "sql.js";
import { z } from "zod";
import {
  priorityInputSchema,
  type Priority,
} from "../../shared/priority";
import { evidenceApprovalInputSchema } from "./repository-schemas";
import type { ApprovedEvidence } from "../../shared/evidence";
import {
  importedMscGoalSchema,
  type ImportedMscGoal,
} from "../../shared/msc-goal";

const require = createRequire(import.meta.url);
const sqlWasmPath = require.resolve("sql.js/dist/sql-wasm.wasm");
const ACTIVE_PRIORITY_ID = "active";

export class PriorityRepository {
  private constructor(
    private readonly database: Database,
    private readonly filePath: string | null,
  ) {
    this.database.run(`
      CREATE TABLE IF NOT EXISTS priorities (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        fiscal_year TEXT NOT NULL,
        desired_outcomes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    this.database.run(`
      CREATE TABLE IF NOT EXISTS role_goals (
        title TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        metrics TEXT NOT NULL,
        imported_at TEXT NOT NULL
      )
    `);
    this.database.run(`
      CREATE TABLE IF NOT EXISTS approved_evidence (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        employee_notes TEXT NOT NULL,
        approved_for_connect INTEGER NOT NULL,
        approved_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }

  static async open(filePath: string | null): Promise<PriorityRepository> {
    const SQL = await initSqlJs({
      locateFile: () => sqlWasmPath,
    });
    const data = filePath && existsSync(filePath) ? readFileSync(filePath) : undefined;
    const repository = new PriorityRepository(new SQL.Database(data), filePath);

    if (filePath && !data) {
      repository.persist();
    }

    return repository;
  }

  getActive(): Priority | null {
    const statement = this.database.prepare(`
      SELECT id, title, description, fiscal_year, desired_outcomes, created_at, updated_at
      FROM priorities
      WHERE id = ?
    `);

    try {
      statement.bind([ACTIVE_PRIORITY_ID]);
      if (!statement.step()) {
        return null;
      }

      const row = statement.getAsObject();
      return {
        id: String(row.id),
        title: String(row.title),
        description: String(row.description),
        fiscalYear: String(row.fiscal_year),
        desiredOutcomes: JSON.parse(String(row.desired_outcomes)) as string[],
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      };
    } finally {
      statement.free();
    }
  }

  save(input: unknown): Priority {
    const validated = priorityInputSchema.parse(input);
    const existing = this.getActive();
    const timestamp = new Date().toISOString();
    const priority: Priority = {
      id: ACTIVE_PRIORITY_ID,
      ...validated,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    this.database.run(
      `
        INSERT INTO priorities (
          id, title, description, fiscal_year, desired_outcomes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          fiscal_year = excluded.fiscal_year,
          desired_outcomes = excluded.desired_outcomes,
          updated_at = excluded.updated_at
      `,
      [
        priority.id,
        priority.title,
        priority.description,
        priority.fiscalYear,
        JSON.stringify(priority.desiredOutcomes),
        priority.createdAt,
        priority.updatedAt,
      ],
    );
    this.persist();

    return priority;
  }

  getRoleGoals(): ImportedMscGoal[] {
    const statement = this.database.prepare(`
      SELECT title, description, metrics
      FROM role_goals
      ORDER BY imported_at, title
    `);
    const goals: ImportedMscGoal[] = [];

    try {
      while (statement.step()) {
        const row = statement.getAsObject();
        goals.push({
          title: String(row.title),
          description: String(row.description),
          metrics: JSON.parse(String(row.metrics)) as string[],
        });
      }
      return goals;
    } finally {
      statement.free();
    }
  }

  saveRoleGoals(input: unknown): ImportedMscGoal[] {
    const goals = z.array(importedMscGoalSchema).max(30).parse(input);
    const importedAt = new Date().toISOString();

    this.database.run("DELETE FROM role_goals");
    for (const goal of goals) {
      this.database.run(
        `
          INSERT INTO role_goals (title, description, metrics, imported_at)
          VALUES (?, ?, ?, ?)
        `,
        [goal.title, goal.description, JSON.stringify(goal.metrics), importedAt],
      );
    }
    this.persist();
    return goals;
  }

  listApprovedEvidence(): ApprovedEvidence[] {
    const statement = this.database.prepare(`
      SELECT payload, employee_notes, approved_for_connect, approved_at, updated_at
      FROM approved_evidence
      ORDER BY approved_at DESC
    `);
    const evidence: ApprovedEvidence[] = [];

    try {
      while (statement.step()) {
        const row = statement.getAsObject();
        evidence.push({
          ...(JSON.parse(String(row.payload)) as ApprovedEvidence),
          employeeNotes: String(row.employee_notes),
          approvedForConnect: Number(row.approved_for_connect) === 1,
          approvedAt: String(row.approved_at),
          updatedAt: String(row.updated_at),
        });
      }
      return evidence;
    } finally {
      statement.free();
    }
  }

  approveEvidence(input: unknown): ApprovedEvidence {
    const validated = evidenceApprovalInputSchema.parse(input);
    const timestamp = new Date().toISOString();
    const approved: ApprovedEvidence = {
      ...validated.candidate,
      employeeNotes: validated.employeeNotes,
      approvedForConnect: validated.approvedForConnect,
      approvedAt: timestamp,
      updatedAt: timestamp,
    };

    this.database.run(
      `
        INSERT INTO approved_evidence (
          id, payload, employee_notes, approved_for_connect, approved_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          payload = excluded.payload,
          employee_notes = excluded.employee_notes,
          approved_for_connect = excluded.approved_for_connect,
          approved_at = excluded.approved_at,
          updated_at = excluded.updated_at
      `,
      [
        approved.id,
        JSON.stringify(validated.candidate),
        approved.employeeNotes,
        approved.approvedForConnect ? 1 : 0,
        approved.approvedAt,
        approved.updatedAt,
      ],
    );
    this.persist();
    return approved;
  }

  close(): void {
    this.persist();
    this.database.close();
  }

  private persist(): void {
    if (!this.filePath) {
      return;
    }

    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, Buffer.from(this.database.export()));
  }
}
