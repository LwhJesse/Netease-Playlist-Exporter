/**
 * Login-state handling.
 *
 * Project-local only:
 *   .state/cookie.txt
 *   .state/login-qr.png
 *
 * No ~/.config, no /home paths, no OS-specific config directory.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const THIS_FILE = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(THIS_FILE), "..");

const STATE_DIR = path.join(PROJECT_ROOT, ".state");
const COOKIE_FILE = path.join(STATE_DIR, "cookie.txt");
const QR_FILE = path.join(STATE_DIR, "login-qr.png");

export async function saveCookie(cookie) {
  await fs.mkdir(STATE_DIR, { recursive: true });
  await fs.writeFile(COOKIE_FILE, cookie.trim() + "\n", {
    mode: 0o600
  });
}

export async function loadCookie() {
  try {
    return (await fs.readFile(COOKIE_FILE, "utf8")).trim();
  } catch {
    return "";
  }
}

export function extractMusicU(rawCookie) {
  const cleaned = String(rawCookie || "").replaceAll(" HTTPOnly", "");
  const match = cleaned.match(/MUSIC_U=([^;]+)/);

  if (!match) {
    throw new Error("Login response does not contain MUSIC_U.");
  }

  return `MUSIC_U=${match[1]};`;
}

async function saveQrImage(qrimg) {
  if (!qrimg) return "";

  const base64 = qrimg.replace(/^data:image\/\w+;base64,/, "");

  await fs.mkdir(STATE_DIR, { recursive: true });
  await fs.writeFile(QR_FILE, Buffer.from(base64, "base64"));

  return QR_FILE;
}

export async function qrLogin(api) {
  const keyRes = await api.get("/login/qr/key");
  const key = keyRes?.data?.unikey;

  if (!key) {
    throw new Error("Failed to get QR login key.");
  }

  const createRes = await api.get("/login/qr/create", {
    key,
    qrimg: true
  });

  const qrPath = await saveQrImage(createRes?.data?.qrimg);

  console.log("Scan this QR code with NetEase Cloud Music app.");
  if (qrPath) {
    console.log(`QR image saved to: ${qrPath}`);
  }
  console.log(`Login URL: https://music.163.com/login?codekey=${key}`);
  console.log("");

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const check = await api.get("/login/qr/check", {
      key
    });

    if (check.code === 801) {
      process.stdout.write(".");
      continue;
    }

    if (check.code === 802) {
      console.log("\nScanned. Confirm login on your phone.");
      continue;
    }

    if (check.code === 803) {
      const cookie = extractMusicU(check.cookie);
      await saveCookie(cookie);
      console.log("\nLogin successful. MUSIC_U saved to project-local .state/cookie.txt");
      return cookie;
    }

    if (check.code === 800) {
      throw new Error("QR code expired. Run login again.");
    }

    throw new Error(`Unexpected QR login status: ${JSON.stringify(check)}`);
  }
}
