#!/usr/bin/env node

/**
 * CLI entry.
 *
 * Commands:
 *   login
 *     QR login, saves MUSIC_U to project-local .state/cookie.txt
 *
 *   export <playlist-id-or-url>
 *     exports playlist using saved MUSIC_U by default
 *
 * Anonymous mode:
 *   export <id> --anonymous
 */

import { ApiClient } from "../src/api-client.mjs";
import { qrLogin, loadCookie } from "../src/auth.mjs";
import { exportPlaylist } from "../src/exporter.mjs";
import { writeOutputs } from "../src/writers.mjs";

function usage() {
  console.log(`
Usage:
  node ./bin/netease-playlist-export.mjs login [--api http://localhost:3000]

  node ./bin/netease-playlist-export.mjs export <playlist-id-or-url> [options]

Options:
  --api <url>              API server URL. Default: http://localhost:3000
  --cookie <cookie>        Manual cookie, e.g. 'MUSIC_U=xxx;'
  --anonymous              Do not use saved cookie
  --expected-count <n>     Warn if exported count differs from expected count
  --batch-size <n>         song/detail batch size. Default: 400

Examples:
  npm run start-api

  node ./bin/netease-playlist-export.mjs login

  node ./bin/netease-playlist-export.mjs export 7595702179 --expected-count 801

  node ./bin/netease-playlist-export.mjs export \\
    'https://music.163.com/#/playlist?id=7595702179&userid=3982615859' \\
    --expected-count 801
`.trim());
}

function parseCommonArgs(args) {
  const opts = {
    api: "http://localhost:3000"
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--api") {
      opts.api = args[++i];
    } else {
      throw new Error(`Unknown option for this command: ${arg}`);
    }
  }

  return opts;
}

function parseExportArgs(args) {
  const opts = {
    api: "http://localhost:3000",
    cookie: "",
    anonymous: false,
    expectedCount: null,
    batchSize: 400,
    input: ""
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--api") {
      opts.api = args[++i];
    } else if (arg === "--cookie") {
      opts.cookie = args[++i];
    } else if (arg === "--anonymous") {
      opts.anonymous = true;
    } else if (arg === "--expected-count") {
      opts.expectedCount = Number(args[++i]);
    } else if (arg === "--batch-size") {
      opts.batchSize = Number(args[++i]);
    } else if (!opts.input) {
      opts.input = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!opts.input) {
    throw new Error("Missing playlist id or URL.");
  }

  if (!Number.isFinite(opts.batchSize) || opts.batchSize <= 0) {
    opts.batchSize = 400;
  }

  return opts;
}

async function runLogin(args) {
  const opts = parseCommonArgs(args);
  const api = new ApiClient({ baseURL: opts.api });

  await qrLogin(api);
}

async function runExport(args) {
  const opts = parseExportArgs(args);

  let cookie = opts.cookie;

  if (!cookie && !opts.anonymous) {
    cookie = await loadCookie();
  }

  if (!cookie) {
    console.warn("WARNING: exporting anonymously.");
    console.warn("Anonymous exports may miss login-visible tracks.");
    console.warn("Run `node ./bin/netease-playlist-export.mjs login` for a logged-in export.");
    console.warn("");
  }

  const api = new ApiClient({
    baseURL: opts.api,
    cookie
  });

  const result = await exportPlaylist(api, opts.input, {
    batchSize: opts.batchSize,
    expectedCount: opts.expectedCount
  });

  const files = await writeOutputs({
    playlist: result.playlist,
    rows: result.rows,
    apiBaseURL: opts.api
  });

  console.log("[5/5] Export finished");
  console.log(`  master CSV: ${files.masterCsvPath}`);
  console.log(`  master JSON: ${files.masterJsonPath}`);
  console.log(`  import CSV: ${files.importCsvPath}`);
  console.log(`  plain TXT:  ${files.plainTxtPath}`);
  console.log(`  missing detail: ${result.playlist.missingDetailCount}`);

  if (result.warnings.length) {
    console.warn("");
    console.warn("Warnings:");
    for (const warning of result.warnings) {
      console.warn(`  - ${warning}`);
    }
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "-h" || command === "--help") {
    usage();
    return;
  }

  if (command === "login") {
    await runLogin(args);
    return;
  }

  if (command === "export") {
    await runExport(args);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((err) => {
  console.error("");
  console.error("Failed:");
  console.error(err?.message || err);
  process.exit(1);
});
