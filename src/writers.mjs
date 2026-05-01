/**
 * Output writers.
 *
 * Project-local only:
 *   out/*.master.csv
 *   out/*.master.json
 *   out/*.import.csv
 *   out/*.plain.txt
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const THIS_FILE = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(THIS_FILE), "..");
const OUT_DIR = path.join(PROJECT_ROOT, "out");

export function safeName(value) {
  return String(value || "playlist")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function csvEscape(value) {
  if (value === undefined || value === null) return "";

  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function toCsv(rows, columns) {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ];

  // BOM helps Excel/WPS recognize UTF-8 Chinese correctly.
  return "\uFEFF" + lines.join("\n") + "\n";
}

export async function writeOutputs({ playlist, rows, apiBaseURL }) {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const base = safeName(`${playlist.name}_${playlist.id}`);

  const masterCsvPath = path.join(OUT_DIR, `${base}.master.csv`);
  const masterJsonPath = path.join(OUT_DIR, `${base}.master.json`);
  const importCsvPath = path.join(OUT_DIR, `${base}.import.csv`);
  const plainTxtPath = path.join(OUT_DIR, `${base}.plain.txt`);

  const masterColumns = [
    "index",
    "playlist_id",
    "playlist_name",
    "netease_song_id",
    "song_name",
    "artist_names",
    "artist_ids",
    "album_name",
    "album_id",
    "duration_ms",
    "aliases",
    "source_url",
    "status"
  ];

  const importColumns = ["index", "title", "artist", "album"];

  await fs.writeFile(masterCsvPath, toCsv(rows, masterColumns), "utf8");

  await fs.writeFile(
    masterJsonPath,
    JSON.stringify(
      {
        source: "YesPlayMusic stripped playlist export logic",
        api: apiBaseURL,
        playlist,
        tracks: rows
      },
      null,
      2
    ),
    "utf8"
  );

  const importRows = rows
    .filter((row) => row.status === "ok")
    .map((row) => ({
      index: row.index,
      title: row.song_name,
      artist: row.artist_names,
      album: row.album_name
    }));

  await fs.writeFile(importCsvPath, toCsv(importRows, importColumns), "utf8");

  await fs.writeFile(
    plainTxtPath,
    rows
      .filter((row) => row.status === "ok")
      .map((row) => `${row.song_name} - ${row.artist_names}`)
      .join("\n") + "\n",
    "utf8"
  );

  return {
    masterCsvPath,
    masterJsonPath,
    importCsvPath,
    plainTxtPath
  };
}
