import { loadEnv, requireEnv } from "./lib/env";
import { runMigrations } from "./lib/migrate";

async function main() {
  loadEnv();
  const reset = process.argv.includes("--reset");
  const url = requireEnv("ADMIN_DATABASE_URL");
  console.log(`Menjalankan migrasi${reset ? " (reset total)" : ""} ...`);
  const applied = await runMigrations(url, { reset });
  if (applied.length === 0) {
    console.log("Tidak ada migrasi baru. Skema sudah terbaru.");
  } else {
    for (const file of applied) console.log(`  ok  ${file}`);
  }
  console.log("Selesai.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
