/**
 * Mengelola klaster PostgreSQL lokal milik proyek (folder .pgdata).
 * Dipakai bila mesin pengembang tidak punya PostgreSQL dengan kredensial yang diketahui.
 *
 *   npm run db:start
 *   npm run db:stop
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const dataDir = path.join(projectRoot, ".pgdata");
const logDir = path.join(projectRoot, ".pglog");
const port = process.env.MISI_PG_PORT ?? "5433";
const pgBin = process.env.PG_BIN ?? "C:/Program Files/PostgreSQL/18/bin";

const exe = (name: string) => path.join(pgBin, `${name}.exe`);

function main() {
  const action = process.argv[2] ?? "start";
  if (!fs.existsSync(pgBin)) {
    console.error(`Folder bin PostgreSQL tidak ditemukan: ${pgBin}`);
    console.error("Set variabel PG_BIN ke folder bin instalasi PostgreSQL Anda.");
    process.exit(1);
  }

  if (action === "start") {
    fs.mkdirSync(logDir, { recursive: true });
    if (!fs.existsSync(dataDir)) {
      console.log("Membuat klaster PostgreSQL baru di .pgdata ...");
      const init = spawnSync(
        exe("initdb"),
        ["-D", dataDir, "-U", "postgres", "--auth=trust", "--encoding=UTF8", "--locale=C"],
        { stdio: "inherit" },
      );
      if (init.status !== 0) process.exit(init.status ?? 1);
    }
    const start = spawnSync(
      exe("pg_ctl"),
      ["-D", dataDir, "-o", `-p ${port} -c listen_addresses=127.0.0.1`, "-l", path.join(logDir, "pg.log"), "start"],
      { stdio: "inherit" },
    );
    process.exit(start.status ?? 0);
  }

  if (action === "stop") {
    const stop = spawnSync(exe("pg_ctl"), ["-D", dataDir, "stop", "-m", "fast"], { stdio: "inherit" });
    process.exit(stop.status ?? 0);
  }

  console.error(`Aksi tidak dikenal: ${action}. Gunakan "start" atau "stop".`);
  process.exit(1);
}

main();
