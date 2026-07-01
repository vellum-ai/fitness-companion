import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

// The plugin root is the parent of this file's directory (<pluginDir>/src/storage.ts).
// Deriving it here lets the storage layer work both in-process (where the init
// hook sets the data dir explicitly) and inside the skill sandbox subprocess
// (where the init hook does not run) without any per-tool wiring.
const PLUGIN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DATA_DIR = path.join(PLUGIN_DIR, "data");
const CONFIG_PATH = path.join(PLUGIN_DIR, "config.json");

let dataDir = "";
let pluginConfig: unknown = null;
let configLoaded = false;

export function setDataDir(dir: string): void {
  dataDir = dir;
}

export function getDataDir(): string {
  // The init hook sets the host-resolved storage dir (<pluginDir>/data). When it
  // has not run (skill tools execute in a sandbox subprocess), fall back to the
  // same <pluginDir>/data path so both paths read and write the same files.
  return dataDir || DEFAULT_DATA_DIR;
}

export function setConfig(config: unknown): void {
  pluginConfig = config;
  configLoaded = true;
}

export function getConfig<T = any>(): T {
  // Lazily read <pluginDir>/config.json when the init hook has not populated the
  // config (skill sandbox), mirroring how the host resolves user-plugin config.
  if (!configLoaded) {
    try {
      pluginConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    } catch {
      pluginConfig = null;
    }
    configLoaded = true;
  }
  return pluginConfig as T;
}

export function ensureCsv(filename: string, headers: string[]): void {
  const dir = getDataDir();
  const filepath = path.join(dir, filename);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, headers.join(",") + "\n");
  }
}

export function appendCsv(filename: string, values: (string | number | null)[]): void {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filepath = path.join(dir, filename);
  const escaped = values.map((v) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  });
  fs.appendFileSync(filepath, escaped.join(",") + "\n");
}

export function readCsv(filename: string): Record<string, string>[] {
  const dir = getDataDir();
  const filepath = path.join(dir, filename);
  if (!fs.existsSync(filepath)) return [];
  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines
    .slice(1)
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const values = parseCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ?? "";
      });
      return row;
    });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

export function readCsvSince(filename: string, days: number): Record<string, string>[] {
  const rows = readCsv(filename);
  if (rows.length === 0) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return rows.filter((row) => {
    const dateStr = row.date || row.timestamp || "";
    const d = new Date(dateStr);
    return d >= cutoff;
  });
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function round(n: number, decimals = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
