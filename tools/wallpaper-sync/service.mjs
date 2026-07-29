// Lofty wallpaper sync service.
//
// Receives idea state from the Lofty app running in Chrome and drives the
// desktop wallpaper. It never serves the wallpaper document — that stays a local
// file in the Lively package, so the desktop always renders even when this
// process is not running. HTTP here is purely a data channel.
//
//   node tools/wallpaper-sync/service.mjs
//
// State + config + log live in %LOCALAPPDATA%\Lofty Sync\.

import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync, appendFileSync, copyFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { placeRows, bucketFor, checkPlacement } from "./shared.mjs";
import { resizeToWidth } from "./png.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
// Deliberately NOT under %LOCALAPPDATA%: Windows redirects AppData for
// packaged (Store) apps, so a tool running inside such a container and this
// service running as the plain user would silently read two different config
// files — and the token would never match. %USERPROFILE% is not redirected.
const HOME = join(process.env.USERPROFILE || process.env.HOMEPATH || HERE, ".lofty-sync");
const CONFIG_PATH = join(HOME, "config.json");
const STATE_PATH = join(HOME, "state.json");
const LOG_PATH = join(HOME, "log.txt");

const PORTS = [47821, 47822, 47823];
const MAX_BODY = 256 * 1024;
const MAX_IDEAS = 200;

mkdirSync(HOME, { recursive: true });

// ---- config ----------------------------------------------------------------
function loadConfig() {
  let cfg = {};
  try { cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8")); } catch { /* first run */ }
  let dirty = false;
  if (!cfg.token) { cfg.token = randomBytes(32).toString("hex"); dirty = true; }
  if (!cfg.livelyDir) {
    cfg.livelyDir = join(
      process.env.LOCALAPPDATA, "Lively Wallpaper", "Library", "wallpapers", "lofty-galaxy",
    );
    dirty = true;
  }
  if (!cfg.origins) {
    cfg.origins = [
      "https://lofty-two.vercel.app",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ];
    dirty = true;
  }
  if (dirty) writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
  return cfg;
}
const cfg = loadConfig();
const TOKEN_BUF = Buffer.from(cfg.token, "utf8");

// ---- logging ---------------------------------------------------------------
function log(line) {
  const msg = `${new Date().toISOString()} ${line}\n`;
  try {
    if (existsSync(LOG_PATH) && statSync(LOG_PATH).size > 1024 * 1024) {
      renameSync(LOG_PATH, LOG_PATH.replace(/\.txt$/, ".old.txt"));
    }
    appendFileSync(LOG_PATH, msg);
  } catch { /* logging must never break the service */ }
  process.stdout.write(msg);
}

// ---- balloon allowlist (also the swatch source) ----------------------------
// This id is concatenated into a filesystem path, so it must be validated
// against the real set, never trusted from the wire.
const BALLOON_IDS = (() => {
  const ts = readFileSync(join(REPO, "src", "lib", "balloons.ts"), "utf8");
  const ids = new Set();
  const re = /id:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(ts))) ids.add(m[1]);
  return ids;
})();
const DEFAULT_BALLOON = "galaxy-purple";
if (BALLOON_IDS.size < 10) throw new Error("could not parse balloon ids from balloons.ts");

// ---- state -----------------------------------------------------------------
let state = { generation: 0, rows: [], archivedIds: [] };
try {
  const saved = JSON.parse(readFileSync(STATE_PATH, "utf8"));
  if (saved && Array.isArray(saved.rows)) state = saved;
} catch { /* no prior state */ }
let lastHash = "";
let lastPushAt = 0;
let lastPushOrigin = "";
let lastError = "";

const clients = new Set();

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h >>> 0).toString(16);
}

// ---- validation ------------------------------------------------------------
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || 0));

function sanitize(payload) {
  const rowsIn = Array.isArray(payload?.ideas) ? payload.ideas.slice(0, MAX_IDEAS) : [];
  const rows = [];
  for (const r of rowsIn) {
    if (!Array.isArray(r)) continue;
    const id = String(r[0] ?? "");
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) continue;
    let balloon = String(r[3] ?? "");
    if (!BALLOON_IDS.has(balloon)) {
      log(`warn: unknown balloon "${balloon.slice(0, 40)}" -> ${DEFAULT_BALLOON}`);
      balloon = DEFAULT_BALLOON;
    }
    rows.push([
      id,
      Math.round(clamp(r[1], 1, 999)),
      Math.round(clamp(r[2], 0, 100)),
      balloon,
      clamp(r[4], 0, 1),
      String(r[5] ?? "").slice(0, 80),
      Math.round(Number(r[6]) || 0),
    ]);
  }
  rows.sort((a, b) => a[1] - b[1]);
  const archivedIds = (Array.isArray(payload?.archivedIds) ? payload.archivedIds : [])
    .slice(0, 100)
    .map((x) => String(x))
    .filter((x) => /^[A-Za-z0-9_-]{1,64}$/.test(x));
  return { rows, archivedIds };
}

// ---- apply pipeline (serialized) -------------------------------------------
let chain = Promise.resolve();
const serialize = (fn) => (chain = chain.then(fn, fn));

function ensureArt(placed) {
  const dir = join(cfg.livelyDir, "balloons");
  mkdirSync(dir, { recursive: true });
  let built = 0;
  for (const it of placed) {
    const bucket = bucketFor(it.w * 1.3);
    const dest = join(dir, `${it.balloon}-${bucket}.png`);
    if (existsSync(dest)) continue;
    const from = join(REPO, "public", "balloons", `${it.balloon}.png`);
    if (!existsSync(from)) { log(`warn: missing source art ${it.balloon}.png`); continue; }
    const tmp = `${dest}.tmp`;
    writeFileSync(tmp, resizeToWidth(from, bucket));
    renameSync(tmp, dest);
    built++;
    log(`art: ${it.balloon}-${bucket}.png`);
  }
  // The page falls back to this if an image ever 404s.
  const fbBuckets = new Set(placed.map((it) => bucketFor(it.w * 1.3)));
  for (const b of fbBuckets) {
    const dest = join(dir, `${DEFAULT_BALLOON}-${b}.png`);
    if (existsSync(dest)) continue;
    const from = join(REPO, "public", "balloons", `${DEFAULT_BALLOON}.png`);
    if (!existsSync(from)) continue;
    const tmp = `${dest}.tmp`;
    writeFileSync(tmp, resizeToWidth(from, b));
    renameSync(tmp, dest);
    built++;
  }
  return built;
}

function writeStateJs() {
  const payload = {
    generation: state.generation,
    rows: state.rows,
    archivedIds: state.archivedIds,
    port: activePort,
    token: cfg.token,
  };
  const js = `window.__LOFTY_APPLY__(${JSON.stringify(payload)});\n`;
  const dest = join(cfg.livelyDir, "state.js");
  const tmp = `${dest}.tmp`;
  writeFileSync(tmp, js, "utf8");
  renameSync(tmp, dest); // atomic on NTFS — the page never sees a half-written file
  return payload;
}

function broadcast(payload) {
  const frame = `event: state\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    try { res.write(frame); } catch { clients.delete(res); }
  }
}

function applyIncoming(payload, origin) {
  const { rows, archivedIds } = sanitize(payload);
  const hash = fnv1a(JSON.stringify([rows, archivedIds]));
  if (hash === lastHash) {
    log(`dedupe (${rows.length} ideas) from ${origin || "?"}`);
    return { ok: true, deduped: true, generation: state.generation, balloonsBuilt: 0 };
  }

  const placed = placeRows(rows);
  const problems = checkPlacement(placed);
  if (problems.length) log(`layout warning: ${problems.join("; ")}`);

  const built = ensureArt(placed); // art on disk BEFORE we announce it

  lastHash = hash;
  state = { generation: state.generation + 1, rows, archivedIds };
  writeFileSync(STATE_PATH, JSON.stringify(state), "utf8");
  const payloadOut = writeStateJs();
  broadcast(payloadOut);

  lastPushAt = Date.now();
  lastPushOrigin = origin || "";
  log(`accept gen=${state.generation} ideas=${rows.length} art=${built} from ${origin || "?"} clients=${clients.size}`);
  return { ok: true, deduped: false, generation: state.generation, balloonsBuilt: built };
}

// ---- http ------------------------------------------------------------------
function tokenOk(t) {
  const b = Buffer.from(String(t || ""), "utf8");
  return b.length === TOKEN_BUF.length && timingSafeEqual(b, TOKEN_BUF);
}

function cors(req, res) {
  const origin = req.headers.origin;
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Vary", "Origin");
  // Chrome's Private Network Access asks for this when a public HTTPS page
  // reaches a loopback address. Harmless when it isn't being enforced.
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  res.setHeader("Cache-Control", "no-store");
}

let activePort = PORTS[0];

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    cors(req, res);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    // Deliberately short: a wrong header cached for hours reads as "it randomly
    // stopped working".
    res.setHeader("Access-Control-Max-Age", "600");
    res.writeHead(204);
    return res.end();
  }

  if (path === "/v1/events") {
    // MUST be 200 + text/event-stream even when the token is wrong. Any error
    // status makes EventSource give up permanently, and the wallpaper would
    // silently stop updating until Lively restarts.
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Access-Control-Allow-Origin", "*"); // a file:// page sends Origin: null
    res.setHeader("Access-Control-Allow-Private-Network", "true");
    res.writeHead(200);

    if (!tokenOk(url.searchParams.get("t"))) {
      res.write("event: unauthorized\ndata: {}\n\n");
      log("reject: bad token on /v1/events");
      return res.end();
    }

    res.socket?.setTimeout(0);
    res.socket?.setNoDelay(true);
    res.write("retry: 2000\n\n");
    res.write(`event: state\ndata: ${JSON.stringify({
      generation: state.generation, rows: state.rows, archivedIds: state.archivedIds,
      port: activePort, token: cfg.token,
    })}\n\n`);
    clients.add(res);
    log(`sse connect (clients=${clients.size})`);
    const beat = setInterval(() => { try { res.write(": ping\n\n"); } catch { /* closing */ } }, 15000);
    req.on("close", () => {
      clearInterval(beat);
      clients.delete(res);
      log(`sse disconnect (clients=${clients.size})`);
    });
    return undefined;
  }

  if (path === "/v1/ping") {
    cors(req, res);
    res.setHeader("Content-Type", "application/json");
    if (!tokenOk(url.searchParams.get("t"))) {
      res.writeHead(403);
      return res.end(JSON.stringify({ ok: false, error: "bad token" }));
    }
    res.writeHead(200);
    return res.end(JSON.stringify({
      ok: true, version: 1, generation: state.generation, ideas: state.rows.length,
      lastPushAt, lastPushOrigin, lastError, wallpaperClients: clients.size,
    }));
  }

  if (path === "/v1/state" && req.method === "POST") {
    const origin = req.headers.origin || "";
    if (cfg.origins.length && origin && !cfg.origins.includes(origin)) {
      log(`reject: origin ${origin}`);
      cors(req, res);
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: false, error: "origin not allowed" }));
    }
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) { req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      cors(req, res);
      res.setHeader("Content-Type", "application/json");
      let payload;
      try { payload = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch {
        res.writeHead(400); return res.end(JSON.stringify({ ok: false, error: "bad json" }));
      }
      if (!tokenOk(payload?.token)) {
        log(`reject: bad token from ${origin || "?"}`);
        res.writeHead(403); return res.end(JSON.stringify({ ok: false, error: "bad token" }));
      }
      serialize(() => {
        let out;
        try { out = applyIncoming(payload, origin); } catch (e) {
          lastError = String(e && e.message || e);
          log(`ERROR apply: ${lastError}`);
          out = { ok: false, error: lastError };
        }
        try { res.writeHead(out.ok ? 200 : 500); res.end(JSON.stringify(out)); } catch { /* gone */ }
      });
    });
    return undefined;
  }

  cors(req, res);
  res.writeHead(404, { "Content-Type": "application/json" });
  return res.end(JSON.stringify({ ok: false, error: "not found" }));
});

// Node 18+ defaults requestTimeout to 300s, which silently kills long-lived SSE
// streams every five minutes.
server.requestTimeout = 0;
server.headersTimeout = 0;
server.timeout = 0;
server.keepAliveTimeout = 0;

function listen(i) {
  if (i >= PORTS.length) {
    log("FATAL: no free port in " + PORTS.join(", "));
    process.exit(1);
  }
  activePort = PORTS[i];
  server.once("error", (e) => {
    if (e.code === "EADDRINUSE") {
      // Doubles as the single-instance guard.
      log(`port ${PORTS[i]} in use, trying next`);
      listen(i + 1);
    } else {
      log(`FATAL: ${e.message}`);
      process.exit(1);
    }
  });
  server.listen(PORTS[i], "127.0.0.1", () => {
    log(`listening on 127.0.0.1:${PORTS[i]}  lively=${cfg.livelyDir}`);
    // Replay last state so the package is repaired and state.js carries the
    // current port/token even after a restart.
    serialize(() => {
      try {
        if (state.rows.length) {
          ensureArt(placeRows(state.rows));
          broadcast(writeStateJs());
          log(`replayed gen=${state.generation} ideas=${state.rows.length}`);
        } else {
          writeStateJs();
        }
      } catch (e) { log(`ERROR replay: ${e.message}`); }
    });
  });
}
listen(0);

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => { log(`shutdown (${sig})`); process.exit(0); });
}
process.on("uncaughtException", (e) => { log(`UNCAUGHT: ${e.stack || e}`); });
