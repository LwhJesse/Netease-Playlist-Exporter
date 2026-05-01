/**
 * Minimal API client.
 *
 * This mirrors the important YesPlayMusic behavior:
 * when logged in, requests carry `cookie=MUSIC_U=...;`
 * as a query parameter to the NetEase API service.
 */

export class ApiClient {
  constructor({ baseURL = "http://localhost:3000", cookie = "" } = {}) {
    this.baseURL = baseURL.replace(/\/+$/, "");
    this.cookie = cookie;
  }

  async get(endpoint, params = {}) {
    const url = new URL(endpoint, this.baseURL);

    const finalParams = {
      ...params,
      timestamp: Date.now()
    };

    if (this.cookie) {
      finalParams.cookie = this.cookie;
    }

    for (const [key, value] of Object.entries(finalParams)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${url.href}`);
    }

    const data = await res.json();

    if (data?.code === 301) {
      throw new Error("API says login is required. Run: node ./bin/netease-playlist-export.mjs login");
    }

    return data;
  }
}
