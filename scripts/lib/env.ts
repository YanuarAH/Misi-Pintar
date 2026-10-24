import fs from "node:fs";
import path from "node:path";

/** Memuat .env.local lalu .env tanpa dependensi tambahan (dipakai script CLI). */
export function loadEnv(cwd = process.cwd()): void {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(cwd, name);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Variabel lingkungan ${key} belum diisi. Salin .env.example menjadi .env.local lalu sesuaikan.`,
    );
  }
  return value;
}
