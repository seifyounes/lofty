// Emits the STATIC wallpaper shell (index.html + bg.png + fonts) into the Lively
// package. It contains no ideas — the service writes `state.js` beside it, and
// the page renders whatever it is given, live.
//
// Run this only when the wallpaper's code or assets change, not when ideas do.
//
//   node tools/wallpaper-sync/build-shell.mjs [--out <dir>]

import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { W, H } from "./shared.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

const argOut = process.argv.indexOf("--out");
const OUT = argOut > -1
  ? process.argv[argOut + 1]
  : join(process.env.LOCALAPPDATA, "Lively Wallpaper", "Library", "wallpapers", "lofty-galaxy");

// ---- swatches: parsed from the app so all 50 balloons work ------------------
const SWATCH = (() => {
  const ts = readFileSync(join(REPO, "src", "lib", "balloons.ts"), "utf8");
  const map = {};
  const re = /id:\s*"([^"]+)"[^}]*?swatch:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(ts))) map[m[1]] = m[2];
  return map;
})();
if (Object.keys(SWATCH).length < 10) throw new Error("could not parse swatches from balloons.ts");

// ---- shared maths, inlined so the page stays self-contained -----------------
// Strip the module syntax; every export in shared.mjs is a top-level declaration.
const sharedSrc = readFileSync(join(HERE, "shared.mjs"), "utf8")
  .replace(/^export\s+/gm, "")
  .replace(/^import[^\n]*$/gm, "");

// ---- assets ----------------------------------------------------------------
mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, "fonts"), { recursive: true });
mkdirSync(join(OUT, "balloons"), { recursive: true });

copyFileSync(join(REPO, "public", "wall-bg.png"), join(OUT, "bg.png"));

// Fonts are vendored in this folder, NOT read from .next — those filenames are
// content-hashed and .next gets deleted before builds, which silently dropped
// the wallpaper back to Segoe UI.
const FONTS = readdirSync(join(HERE, "fonts")).filter((f) => f.endsWith(".woff2"))
  // the ".p" subset is the preloaded latin one; it must win
  .sort((a, b) => (b.includes("-s.p.") ? 1 : 0) - (a.includes("-s.p.") ? 1 : 0));
if (!FONTS.length) throw new Error("no fonts vendored in tools/wallpaper-sync/fonts");
for (const f of FONTS) copyFileSync(join(HERE, "fonts", f), join(OUT, "fonts", f));

const fontSrc = FONTS.map((f) => `url("fonts/${f}") format("woff2")`).join(",\n       ");

// ---- deterministic starfield (static, never re-rendered) -------------------
let seed = 20260729;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const stars = Array.from({ length: 110 }, () => {
  const x = (rnd() * 100).toFixed(2);
  const y = (rnd() * 100).toFixed(2);
  const s = (((0.9 + rnd() * 1.8) / W) * 100).toFixed(4);
  const d = (2.5 + rnd() * 4).toFixed(2);
  const dl = (-rnd() * 6).toFixed(2);
  return `<i style="left:${x}%;top:${y}%;width:${s}vw;height:${s}vw;animation-duration:${d}s;animation-delay:${dl}s"></i>`;
}).join("");

// ---- the runtime engine ----------------------------------------------------
// Deliberately written with string concatenation and no template literals, so
// it drops into the outer template literal below untouched.
const engine = `
${sharedSrc}

var SWATCH = ${JSON.stringify(SWATCH)};
var DEFAULT_BALLOON = "galaxy-purple";

var field = document.getElementById("field");
var nodes = new Map();
var generation = -1;
var PORT = 47821;
var TOKEN = "";
var es = null;
var pollTimer = null;
var pollN = 0;

function fit() {
  var s = Math.min(window.innerWidth / W, window.innerHeight / H);
  field.style.transform = "translate(-50%,-50%) scale(" + s + ")";
}
window.addEventListener("resize", fit);
fit();

function create(it) {
  var el = document.createElement("div"); el.className = "slot";
  var centre = document.createElement("div"); centre.className = "centre";
  var bob = document.createElement("div"); bob.className = "bob";
  var art = document.createElement("div"); art.className = "art";
  var img = document.createElement("img"); img.alt = "";
  var tag = document.createElement("div"); tag.className = "tag";
  var num = document.createElement("span"); num.className = "num";
  var nm = document.createElement("span"); nm.className = "nm";

  var rec = { el: el, centre: centre, bob: bob, img: img, num: num, nm: nm,
              bucket: 0, balloon: "", fallback: false };

  img.addEventListener("error", function () {
    if (rec.fallback) return;
    rec.fallback = true;
    img.src = "balloons/" + DEFAULT_BALLOON + "-" + (rec.bucket || 288) + ".png";
  });

  tag.appendChild(num); tag.appendChild(nm);
  art.appendChild(img); art.appendChild(tag);
  bob.appendChild(art); centre.appendChild(bob); el.appendChild(centre);

  // Bob phase from a hash of the idea id, NOT its index — otherwise reordering
  // the wall makes an existing balloon jump to a different animation offset.
  var h = hash32(String(it.id));
  bob.style.animationDuration = (7 + (h % 5) * 1.3).toFixed(1) + "s";
  bob.style.animationDelay = "-" + (((h >>> 3) % 90) / 10).toFixed(1) + "s";
  bob.style.setProperty("--tilt", ((h & 1) ? 1.2 : -1.2) + "deg");
  return rec;
}

function apply(rec, it) {
  rec.el.style.transform = "translate3d(" + it.cx.toFixed(1) + "px," + it.cy.toFixed(1) + "px,0)";
  rec.bob.style.setProperty("--w", it.w.toFixed(1) + "px");

  var bucket = bucketFor(it.w * 1.3);
  if (bucket !== rec.bucket || it.balloon !== rec.balloon) {
    rec.bucket = bucket;
    rec.balloon = it.balloon;
    rec.fallback = false;
    rec.img.src = "balloons/" + it.balloon + "-" + bucket + ".png";
    var sw = SWATCH[it.balloon] || SWATCH[DEFAULT_BALLOON];
    rec.bob.style.setProperty("--g75", alpha(sw, 0.75));
    rec.bob.style.setProperty("--g40", alpha(sw, 0.4));
  }
  if (rec.num.textContent !== String(it.priority)) rec.num.textContent = String(it.priority);
  if (rec.nm.textContent !== String(it.name)) rec.nm.textContent = String(it.name);
}

// Run fn once, on animationend OR after ms — whichever lands first.
// animationend alone is not dependable: a throttled or paused document never
// fires it, and then exit nodes would pile up in the DOM forever.
function once(el, ms, fn) {
  var done = false;
  function go() {
    if (done) return;
    done = true;
    el.removeEventListener("animationend", go);
    fn();
  }
  el.addEventListener("animationend", go);
  setTimeout(go, ms);
}

function render(rows, archivedIds) {
  var placed = placeRows(rows || []);
  var seen = Object.create(null);
  var arch = Object.create(null);
  for (var i = 0; i < (archivedIds || []).length; i++) arch[archivedIds[i]] = 1;

  placed.forEach(function (it, idx) {
    seen[it.id] = 1;
    var rec = nodes.get(it.id);
    var isNew = !rec;
    if (isNew) {
      rec = create(it);
      nodes.set(it.id, rec);
      field.appendChild(rec.el);
    }
    apply(rec, it);
    if (isNew) {
      var delay = Math.min(240, idx * 40);
      rec.centre.style.animation = "arrive 700ms cubic-bezier(.22,1,.36,1) both";
      rec.centre.style.animationDelay = delay + "ms";
      once(rec.centre, 700 + delay + 150, function () {
        rec.centre.style.animation = "";
        rec.centre.style.animationDelay = "";
      });
    }
  });

  nodes.forEach(function (rec, id) {
    if (seen[id]) return;
    nodes.delete(id);
    // Finished ideas pop (they moved to Quiet Sky); deleted ones just leave.
    var ms = arch[id] ? 420 : 480;
    rec.centre.style.animation = arch[id]
      ? "pop 420ms ease-in forwards"
      : "depart 480ms ease-out forwards";
    once(rec.centre, ms + 150, function () {
      if (rec.el.parentNode) rec.el.parentNode.removeChild(rec.el);
    });
  });
}

function applyState(s) {
  if (!s || typeof s.generation !== "number") return;
  if (s.generation <= generation) return;   // lets SSE and the poll fallback coexist
  generation = s.generation;
  if (s.port) PORT = s.port;
  if (s.token) TOKEN = s.token;
  render(s.rows, s.archivedIds);
  connect();
}

function connect() {
  if (es || !TOKEN) return;
  try {
    es = new EventSource("http://127.0.0.1:" + PORT + "/v1/events?t=" + encodeURIComponent(TOKEN));
    es.addEventListener("state", function (e) {
      try { applyState(JSON.parse(e.data)); } catch (_) {}
    });
    es.addEventListener("unauthorized", function () {
      try { es.close(); } catch (_) {}
      es = null;
    });
  } catch (_) { es = null; }
}

function startPoll() {
  if (pollTimer) return;
  pollTimer = setInterval(function () {
    var s = document.createElement("script");
    s.src = "state.js?v=" + (++pollN);
    s.onload = s.onerror = function () { if (s.parentNode) s.parentNode.removeChild(s); };
    document.body.appendChild(s);
  }, 2000);
}
function stopPoll() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

// Watchdog: SSE reconnects itself on network errors, but if it never opens at
// all we fall back to re-reading the local state file, which no network policy
// can block.
setInterval(function () {
  if (es && es.readyState === 1) { stopPoll(); return; }
  connect();
  startPoll();
}, 8000);

window.__LOFTY_APPLY__ = applyState;
`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Lofty — live wallpaper</title>
<style>
  @font-face {
    font-family: "Fredoka";
    font-style: normal;
    font-weight: 400 700;
    font-display: block;
    src: ${fontSrc};
  }

  /* One registered custom property drives width, padding, type scale and glow,
     so a single transition animates a balloon's whole size change. */
  @property --w {
    syntax: "<length>";
    inherits: true;
    initial-value: 0px;
  }

  * { margin: 0; padding: 0; box-sizing: content-box; }
  html, body {
    width: 100%; height: 100%;
    overflow: hidden; background: #07041a;
    cursor: none;
  }
  .stage { position: relative; width: 100vw; height: 100vh; overflow: hidden; }

  /* nebula, slowly breathing */
  .sky {
    position: absolute; inset: -4%;
    background: url("bg.png") center/cover no-repeat;
    animation: ken 120s ease-in-out infinite alternate;
    will-change: transform;
  }
  @keyframes ken {
    from { transform: scale(1.06) translate(0, 0); }
    to   { transform: scale(1.15) translate(-1.6%, -1.1%); }
  }
  .veil { position: absolute; inset: 0; background: rgba(6,4,22,0.18); }

  .stars i {
    position: absolute; display: block; border-radius: 50%;
    background: #fff; opacity: .2;
    animation: tw ease-in-out infinite alternate;
    will-change: opacity;
  }
  @keyframes tw { from { opacity: .12; } to { opacity: .95; } }

  /* The design box, scaled to fit whatever viewport the host reports. Lively's
     WebView2 runs under 125% DPI scaling, so this is NOT 1920 CSS px. */
  .field {
    position: absolute; left: 50%; top: 50%;
    width: ${W}px; height: ${H}px;
    transform-origin: 50% 50%;
    transform: translate(-50%, -50%);
  }

  /* .slot owns POSITION (transitioned, compositor-only).
     .centre owns CENTRING and the enter/exit animation.
     .bob owns the idle float. .art owns the glow.
     Keeping them on separate elements lets all four coexist. */
  .slot {
    position: absolute; left: 0; top: 0;
    transition: transform 620ms cubic-bezier(.22, 1, .36, 1);
    will-change: transform;
  }
  .centre { transform: translate(-50%, -50%); }

  .bob {
    width: var(--w);
    padding: calc(var(--w) * .38);   /* room for the glow, or the layer clips it */
    font-size: var(--w);             /* type scale derives from this */
    transition: --w 620ms cubic-bezier(.22, 1, .36, 1);
    will-change: transform;
    animation-name: bob;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    animation-direction: alternate;
  }
  @keyframes bob {
    from { transform: translateY(-8px) rotate(calc(var(--tilt) * -1)); }
    to   { transform: translateY(8px) rotate(var(--tilt)); }
  }

  .art {
    position: relative; width: 100%;
    filter:
      drop-shadow(0 calc(var(--w) * .03) calc(var(--w) * .05) rgba(0,0,0,.45))
      drop-shadow(0 0 calc(var(--w) * .1) var(--g75))
      drop-shadow(0 0 calc(var(--w) * .22) var(--g40));
  }
  .art img { display: block; width: 100%; height: auto; }

  .tag {
    position: absolute; left: 0; top: 43%; width: 100%;
    transform: translateY(-50%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center; font-family: "Fredoka", "Segoe UI", sans-serif;
  }
  .num {
    font-size: .3em;
    font-weight: 700; color: #fff; line-height: 1; letter-spacing: -1px;
    text-shadow: 0 2px 10px rgba(18,8,38,.7), 0 0 22px rgba(18,8,38,.55), 0 1px 2px rgba(0,0,0,.55);
  }
  .nm {
    font-size: .092em;
    margin-top: calc(var(--w) * .03);
    max-width: 82%;
    font-weight: 600; color: rgba(255,255,255,.96); line-height: 1.12;
    text-shadow: 0 1px 6px rgba(0,0,0,.7);
  }

  @keyframes arrive {
    from { opacity: 0; transform: translate(-50%,-50%) translateY(46px) scale(.62); }
    to   { opacity: 1; transform: translate(-50%,-50%) translateY(0) scale(1); }
  }
  /* Matches the app's "pops the moment it's done". */
  @keyframes pop {
    0%   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
    45%  { opacity: 1; transform: translate(-50%,-50%) scale(1.16); }
    100% { opacity: 0; transform: translate(-50%,-50%) scale(.1); }
  }
  @keyframes depart {
    from { opacity: 1; transform: translate(-50%,-50%) scale(1) translateY(0); }
    to   { opacity: 0; transform: translate(-50%,-50%) scale(.72) translateY(-24px); }
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="sky"></div>
    <div class="veil"></div>
    <div class="stars">${stars}</div>
    <div class="field" id="field"></div>
  </div>

  <script>
${engine}
  </script>

  <!-- Written by the sync service. Present on disk, so the wallpaper always
       paints the last known ideas instantly even if the service is down. -->
  <script src="state.js"></script>
</body>
</html>
`;

writeFileSync(join(OUT, "index.html"), html, "utf8");

// Never clobber a live state.js; only seed an empty one so the page has
// something to load on a first install.
const statePath = join(OUT, "state.js");
if (!existsSync(statePath)) {
  writeFileSync(
    statePath,
    "window.__LOFTY_APPLY__({\"generation\":0,\"rows\":[],\"archivedIds\":[]});\n",
    "utf8",
  );
  console.log("seeded empty state.js");
}

console.log(`swatches   : ${Object.keys(SWATCH).length}`);
console.log(`fonts      : ${FONTS.length} (${FONTS[0]} first)`);
console.log(`shell      : ${join(OUT, "index.html")}`);
