import { randomBytes } from "node:crypto";
import { openDb } from "./db";
import { runMigrations } from "./migrate";

export function createSession(dbPath?: string): string {
  const token = randomBytes(32).toString("hex");
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    db.prepare("INSERT INTO sessions (id) VALUES (?)").run(token);
    return token;
  } finally {
    db.close();
  }
}

export function validateSession(
  token: string | undefined,
  dbPath?: string,
): boolean {
  if (!token) return false;
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    return !!db.prepare("SELECT id FROM sessions WHERE id = ?").get(token);
  } finally {
    db.close();
  }
}

export function destroySession(
  token: string | undefined,
  dbPath?: string,
): void {
  if (!token) return;
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    db.prepare("DELETE FROM sessions WHERE id = ?").run(token);
  } finally {
    db.close();
  }
}
