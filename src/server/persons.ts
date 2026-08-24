import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { openDb } from "./db";
import { runMigrations } from "./migrate";

export interface Person {
  id: string;
  name: string;
  note: string;
  createdAt: string;
}

export interface CreatePersonInput {
  name: string;
  note?: string;
}

export function createPerson(input: CreatePersonInput, dbPath?: string): Person {
  const name = input.name.trim();
  if (!name) throw new Error("姓名不能为空");
  const note = (input.note ?? "").trim();

  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const person: Person = {
      id: randomUUID(),
      name,
      note,
      createdAt: new Date().toISOString(),
    };
    db.prepare("INSERT INTO persons (id, name, note, created_at) VALUES (?, ?, ?, ?)").run(
      person.id,
      person.name,
      person.note,
      person.createdAt,
    );
    return person;
  } finally {
    db.close();
  }
}

export function listPersons(dbPath?: string): Person[] {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    return db
      .prepare(
        "SELECT id, name, note, created_at AS createdAt FROM persons ORDER BY rowid",
      )
      .all() as Person[];
  } finally {
    db.close();
  }
}

export interface UpdatePersonInput {
  name: string;
  note?: string;
}

function findPerson(db: Database.Database, id: string): Person {
  const row = db
    .prepare("SELECT id, name, note, created_at AS createdAt FROM persons WHERE id = ?")
    .get(id) as Person | undefined;
  if (!row) throw new Error("参与人不存在");
  return row;
}

/**
 * 引用检查:sqlite_master 中存在对应表时才检查。
 * 未来新增引用表(如 AA 账单、积分账户)时在此登记,检查自动生效。
 */
const REFERENCE_TABLES: { table: string; columns: string[]; label: string }[] = [
  { table: "aa_bills", columns: ["payer_id"], label: "AA 账单" },
];

function checkReferences(db: Database.Database, personId: string): void {
  for (const ref of REFERENCE_TABLES) {
    const exists = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(ref.table);
    if (!exists) continue;
    for (const col of ref.columns) {
      const row = db
        .prepare(`SELECT 1 FROM ${ref.table} WHERE ${col} = ? LIMIT 1`)
        .get(personId);
      if (row) throw new Error(`该参与人已被${ref.label}引用,无法删除`);
    }
  }
}

export function updatePerson(
  id: string,
  input: UpdatePersonInput,
  dbPath?: string,
): Person {
  const name = input.name.trim();
  if (!name) throw new Error("姓名不能为空");
  const note = (input.note ?? "").trim();

  const db = openDb(dbPath);
  try {
    runMigrations(db);
    findPerson(db, id);
    db.prepare("UPDATE persons SET name = ?, note = ? WHERE id = ?").run(
      name,
      note,
      id,
    );
    return findPerson(db, id);
  } finally {
    db.close();
  }
}

export function deletePerson(id: string, dbPath?: string): void {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    findPerson(db, id);
    checkReferences(db, id);
    db.prepare("DELETE FROM persons WHERE id = ?").run(id);
  } finally {
    db.close();
  }
}
