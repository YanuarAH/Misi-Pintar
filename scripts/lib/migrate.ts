import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

export async function runMigrations(
  connectionString: string,
  options: { reset?: boolean } = {},
): Promise<string[]> {
  const client = new Client({ connectionString });
  await client.connect();
  const applied: string[] = [];

  try {
    if (options.reset) {
      await client.query("drop schema if exists public cascade");
      await client.query("create schema public");
      await client.query("grant usage on schema public to public");
    } else {
      await client.query(`
        create table if not exists public.schema_migrations (
          filename text primary key,
          applied_at timestamptz not null default now()
        )
      `);
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (!options.reset) {
        const { rowCount } = await client.query(
          "select 1 from public.schema_migrations where filename = $1",
          [file],
        );
        if (rowCount) continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          "insert into public.schema_migrations (filename) values ($1) on conflict do nothing",
          [file],
        );
        await client.query("commit");
        applied.push(file);
      } catch (error) {
        await client.query("rollback");
        throw new Error(`Migrasi ${file} gagal: ${(error as Error).message}`);
      }
    }
  } finally {
    await client.end();
  }

  return applied;
}
