import { runMigrations } from "../scripts/lib/migrate";

const adminUrl = process.env.TEST_ADMIN_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5433/misi_pintar_test";

export default async function setup(): Promise<void> {
  await runMigrations(adminUrl, { reset: true });
}
