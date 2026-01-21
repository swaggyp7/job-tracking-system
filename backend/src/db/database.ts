import path from "path";
import { promises as fs } from "fs";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

let dbInstance: Database<sqlite3.Database, sqlite3.Statement> | null = null;

const schemaPath = path.resolve(__dirname, "..", "..", "schema.sql");

export async function initDatabase(): Promise<
  Database<sqlite3.Database, sqlite3.Statement>
> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = process.env.DB_PATH ?? path.join("data", "app.db");
  const dir = path.dirname(dbPath);
  await fs.mkdir(dir, { recursive: true });

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  const schemaSql = await fs.readFile(schemaPath, "utf-8");
  await dbInstance.exec(schemaSql);

  return dbInstance;
}
