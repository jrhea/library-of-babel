/* ───────────────────────── Constants ───────────────────────── */
const ALPHABET = "abcdefghijklmnopqrstuvwxyz ,.";
const BASE          = 29n;         // 26 letters + space/comma/period
const PAGE_LENGTH   = 3200n;
const A = 6364136223846793005n;    // Knuth MMIX LCG
const C = 1n;
const M = 2n ** 15565n;            // big modulus
const LCG_SKIP = 20;              // Number of initial LCG steps to discard for variation

/* ─────────────────────── LCG helpers ─────────────────────── */
function modinv(a, m) {
  let [t, newT] = [0n, 1n];
  let [r, newR] = [m, a];
  while (newR !== 0n) {
    const q = r / newR;
    [t, newT] = [newT, t - q * newT];
    [r, newR] = [newR, r - q * newR];
  }
  return t < 0n ? t + m : t;
}
const A_INV = modinv(A, M);

const scramble   = n => (A * n + C) % M;
const unscramble = s => (A_INV * (s - C)) % M;

/* ───────────────────── base‑36 helpers ───────────────────── */
const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";
const toBase36   = n => n.toString(36);
const fromBase36 = s =>
  [...s].reduce((acc, ch) => acc * 36n + BigInt(DIGITS.indexOf(ch)), 0n);

/* ───────────────────── text ⇄ number ───────────────────── */
function pageToNumber(pageArr) {
  return pageArr
    .slice().reverse()
    .reduce((acc, ch, i) => acc + BigInt(ALPHABET.indexOf(ch)) * (BASE ** BigInt(i)), 0n);
}
function numberToPage(n) {
  const out = [];
  for (let i = 0; i < 3200; i++) {
    const r = n % BASE; n = n / BASE;
    out.push(ALPHABET[Number(r)]);
  }
  return out.reverse();
}

/* encode coords  -> unique integer 0 … 4*5*32*420‑1 */
function coordsToNumber(w, s, v, p) {
  return BigInt(
    p + v * 420 +
    s * 420 * 32 +
    w * 420 * 32 * 5
  );
}

function generateGibberish(seed, len = 3200) {

  /* remove: seed = scramble(seed + BigInt(offset)); */
  // start directly from the seed
  for (let i = 0; i < LCG_SKIP; i++) seed = scramble(seed);

  const arr = [];
  for (let i = 0; i < len; i++) {
    seed = scramble(seed);
    arr.push(ALPHABET[Number(seed % BASE)]);
  }
  return arr;
}

/* ─────────────────── UI‑helper: render page ─────────────────── */
function renderPage(hexOnly, wall, shelf, volume, page, pageArr) {
  // show pure hex in the Hex field
  document.getElementById("hex").textContent =
    hexOnly;                                  // ← no #coords appended

  // coordinate read‑out
  document.getElementById("coords").textContent =
    `Wall: ${wall}, Shelf: ${shelf}, Volume: ${volume}, Page: ${page}`;

  // hide snippet‑pos line on Browse
  const posEl = document.getElementById("pos");
  if (posEl) posEl.style.display = "none";

  // full 3200‑char page
  document.getElementById("page").textContent = pageArr.join("");
}

/* ─────────────────────── Search (encode) ───────────────────── */
function searchBabel() {
  const snippet = document.getElementById("snippet").value;
  if (!snippet || snippet.length > 3200) {
    alert("Please enter up to 3200 characters."); return;
  }

  /* random hexagon (128‑bit seed) */
  const hexagonSeed =
      (BigInt(crypto.getRandomValues(new Uint32Array(4))[0]) << 96n) ^
      (BigInt(crypto.getRandomValues(new Uint32Array(4))[1]) << 64n) ^
      (BigInt(crypto.getRandomValues(new Uint32Array(4))[2]) << 32n) ^
       BigInt(crypto.getRandomValues(new Uint32Array(4))[3]);

  const hex = toBase36(scramble(hexagonSeed));   // hexagon name

  /* random coordinates inside that hexagon */
  const wall   = Math.floor(Math.random() * 4);
  const shelf  = Math.floor(Math.random() * 5);
  const volume = Math.floor(Math.random() * 32);
  const page   = Math.floor(Math.random() * 420);

  const insertAt = Math.floor(Math.random() * (3200 - snippet.length));

  /* page‑seed = hexagonSeed + coordNumber */
  const pageSeed = hexagonSeed + coordsToNumber(wall, shelf, volume, page);
  const filler   = generateGibberish(pageSeed, 3200);

  for (let i = 0; i < snippet.length; i++) {
    filler[insertAt + i] = snippet[i];
  }

  /* update UI */
  document.getElementById("hex").textContent    = hex;   // pure hexagon
  document.getElementById("coords").textContent =
    `Wall: ${wall}, Shelf: ${shelf}, Volume: ${volume}, Page: ${page}`;
  document.getElementById("pos").textContent    = insertAt;

  const before = filler.slice(0, insertAt).join("");
  const after  = filler.slice(insertAt + snippet.length).join("");
  document.getElementById("page").innerHTML =
    `${before}<span style="background:yellow;">${snippet}</span>${after}`;
}

/* ───────────────── Browse: hexagon stays fixed; coords pick the page ───────────────── */
function browseBabel() {
  try {
    const hexField = document.getElementById("browseHex");
    const hexPure  = hexField.value.trim();          // pure hexagon name
    if (!hexPure) { alert("Enter a hexagon name."); return; }

    /* 1 — recover hexagon seed */
    const hexagonSeed = unscramble(fromBase36(hexPure));

    /* 2 — read coordinate inputs (defaults 0) */
    const w = +document.getElementById("browseWall").value   || 0;
    const s = +document.getElementById("browseShelf").value  || 0;
    const v = +document.getElementById("browseVolume").value || 0;
    const p = +document.getElementById("browsePage").value   || 0;

    /* 3 — page seed = hexagon seed + coord number */
    const coordNumber = coordsToNumber(w, s, v, p);
    const pageSeed    = hexagonSeed + coordNumber;

    /* 4 - if a snippet was provided in the URL, splice it back in */
    let pageArr = generateGibberish(pageSeed);
    if (window.__injectedSnippet) {
      const { text, pos } = window.__injectedSnippet;
      for (let i = 0; i < text.length && pos + i < 3200; i++) {
        pageArr[pos + i] = text[i];
      }
      delete window.__injectedSnippet;   // use once
    }

    /* 5 — render (hexagon never changes) */
    renderPage(hexPure, w, s, v, p, pageArr);

  } catch (err) {
    console.error("Browse failed:", err);
  }
}

/* ───────────────────── Copy helpers ───────────────────── */
function copyHex(id, statusId) {
  const txt = document.getElementById("hex").textContent;
  if (!txt) return;
  navigator.clipboard.writeText(txt).then(()=>{
    const s = document.getElementById("copyStatus");
    s.style.display="inline"; setTimeout(()=>s.style.display="none",1500);
  });
}

function copyLink() {
  const hexOnly = document.getElementById("hex").textContent.trim();
  if (!hexOnly) return;

  /* coordinates */
  let w, s, v, p;
  if (document.getElementById("browseWall")) {
    w = document.getElementById("browseWall").value || 0;
    s = document.getElementById("browseShelf").value || 0;
    v = document.getElementById("browseVolume").value || 0;
    p = document.getElementById("browsePage").value  || 0;
  } else {
    const m = document.getElementById("coords")
              .textContent.match(/Wall:\s*(\d+),\s*Shelf:\s*(\d+),\s*Volume:\s*(\d+),\s*Page:\s*(\d+)/);
    if (!m) return;
    [, w, s, v, p] = m;
  }

  /* snippet + position only exist on search.html */
  let snippetBlock = "";
  if (document.getElementById("pos")) {
    const pos = document.getElementById("pos").textContent.trim();
    const snippet = document.getElementById("snippet").value;
    snippetBlock = `#${pos}$${encodeURIComponent(snippet)}`;
  }

  const share = `${hexOnly}#${w}-${s}-${v}-${p}${snippetBlock}`;
  const url = `${location.origin}/browse.html#${share}`;

  navigator.clipboard.writeText(url).then(() => {
    const badge = document.getElementById("linkStatus");
    badge.style.display = "inline";
    setTimeout(() => (badge.style.display = "none"), 1500);
  });
}

/* ─── Auto‑load from URL (hex#coords or just hex) ─── */
function tryAutoloadFromHash() {
  if (!location.hash) return;

  const raw = decodeURIComponent(location.hash.slice(1)); // hex#coords#pos$snippet
  const [hexPart, coordPart = "", snippetPart = ""] = raw.split("#");

  /* place hexagon */
  const hexField = document.getElementById("browseHex");
  if (!hexField) return;
  hexField.value = hexPart;

  /* coords */
  if (coordPart) {
    const [w, s, v, p] = coordPart.split("-").map(Number);
    document.getElementById("browseWall").value   = w;
    document.getElementById("browseShelf").value  = s;
    document.getElementById("browseVolume").value = v;
    document.getElementById("browsePage").value   = p;
  }

  /* snippet & position */
  if (snippetPart.includes("$")) {
    const [pos, encoded] = snippetPart.split("$");
    window.__injectedSnippet = {
      text: decodeURIComponent(encoded),
      pos:  +pos
    };
  }

  browseBabel();
}

/* ─────────── UI wiring ─────────── */
document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  $("searchBtn")?.addEventListener("click", searchBabel);
  $("browseBtn")?.addEventListener("click", browseBabel);
  $("copyHexBtn")?.addEventListener("click", copyHex);
  $("linkBtn")?.addEventListener("click", copyLink);

  tryAutoloadFromHash();
  window.addEventListener("hashchange", tryAutoloadFromHash);
});