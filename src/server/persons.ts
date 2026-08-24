import { randomUUID } from "node:crypto";
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
