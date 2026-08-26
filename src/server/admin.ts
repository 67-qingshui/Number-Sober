import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { openDb } from "./db";
import { runMigrations } from "./migrate";

const MIN_PASSWORD_LENGTH = 4;

export function hasAdmin(dbPath?: string): boolean {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    return !!db.prepare("SELECT id FROM admin LIMIT 1").get();
  } finally {
    db.close();
  }
}

export function setupAdmin(password: string, dbPath?: string): void {
  const pwd = password.trim();
  if (pwd.length < MIN_PASSWORD_LENGTH)
    throw new Error(`密码至少 ${MIN_PASSWORD_LENGTH} 位`);

  const db = openDb(dbPath);
  try {
    runMigrations(db);
    if (db.prepare("SELECT id FROM admin LIMIT 1").get())
      throw new Error("管理员已存在");
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(pwd, salt, 64).toString("hex");
    db.prepare("INSERT INTO admin (password_hash) VALUES (?)").run(
      `${salt}:${hash}`,
    );
  } finally {
    db.close();
  }
}

/** 验证旧密码后更新为新密码。 */
export function changePassword(
  oldPassword: string,
  newPassword: string,
  dbPath?: string,
): void {
  const pwd = newPassword.trim();
  if (pwd.length < MIN_PASSWORD_LENGTH)
    throw new Error(`密码至少 ${MIN_PASSWORD_LENGTH} 位`);
  if (!verifyPassword(oldPassword, dbPath))
    throw new Error("旧密码不正确");

  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(pwd, salt, 64).toString("hex");
    db.prepare("UPDATE admin SET password_hash = ?").run(`${salt}:${hash}`);
  } finally {
    db.close();
  }
}

export function verifyPassword(password: string, dbPath?: string): boolean {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const row = db
      .prepare("SELECT password_hash AS h FROM admin LIMIT 1")
      .get() as { h: string } | undefined;
    if (!row) return false;
    const [salt, hash] = row.h.split(":");
    if (!salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return (
      candidate.length === expected.length &&
      timingSafeEqual(candidate, expected)
    );
  } finally {
    db.close();
  }
}
