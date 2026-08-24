import { openDb } from "@/server/db";
import { runMigrations } from "@/server/migrate";

export interface HealthStatus {
  dbConnected: boolean;
  schemaVersion: string;
}

export function getHealth(dbPath?: string): HealthStatus {
  try {
    const db = openDb(dbPath);
    try {
      runMigrations(db);
      const row = db
        .prepare("SELECT value FROM meta WHERE key = 'schema_version'")
        .get() as { value: string } | undefined;
      return { dbConnected: true, schemaVersion: row?.value ?? "" };
    } finally {
      db.close();
    }
  } catch {
    return { dbConnected: false, schemaVersion: "" };
  }
}
