const ALPHABET = "abcdefghijklmnopqrstuvwxyz ,.";
const BASE = 29n; // Base-29: 26 letters + comma, space, and period — matches the original Library of Babel charset
const PAGE_LENGTH = 3200n;

// Multiplier used in the LCG (Linear Congruential Generator). Classic constant.
const A = 6364136223846793005n; // Classic multiplier from Donald Knuth's MMIX LCG (The Art of Computer Programming, Volume 2)
const C = 1n; // Common increment for full-period LCG when used with power-of-2 modulus
const M = 2n ** 15565n; // Large modulus to ensure high entropy and non-repeating sequences

const POSITION_MULTIPLIER = BASE ** PAGE_LENGTH; // Used to separate position from page content numerically

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

function reversibleLcgScramble(n) {
  return (A * n + C) % M;
}

function reversibleLcgUnscramble(scrambled) {
  const A_INV = modinv(A, M);
  return (A_INV * (scrambled - C)) % M;
}

function toBase36(n) {
  return n.toString(36);
}

function fromBase36(s) {
  if (!s || !/^[0-9a-z]+$/.test(s)) {
    alert("Invalid hex address. Only lowercase letters and digits are allowed.");
    throw new Error("Invalid base36 characters.");
  }
  try {
    return [...s].reduce((acc, char) => {
      const val = BigInt("0123456789abcdefghijklmnopqrstuvwxyz".indexOf(char));
      return acc * 36n + val;
    }, 0n);
  } catch (e) {
    alert("Could not decode hex address. Check that it's valid.");
    throw e;
  }
}

// Encode hierarchical position: wall > shelf > volume > page (420 pages per volume)
function encodePosition(w, s, v, p) {
  return BigInt(p + v * 420 + s * 420 * 32 + w * 420 * 32 * 5);
}

function decodePosition(pos) {
  const wall = Math.floor(pos / (420 * 32 * 5));
  const shelf = Math.floor(pos / (420 * 32)) % 5;
  const volume = Math.floor(pos / 420) % 32;
  const page = pos % 420;
  return { wall, shelf, volume, page };
}

function generateGibberish(seed, length = 3200) {
  const chars = [];
  for (let i = 0; i < length; i++) {
    seed = reversibleLcgScramble(seed);
    chars.push(ALPHABET[Number(seed % BASE)]);
  }
  return chars;
}

function pageToNumber(page) {
  return page.reverse().reduce((acc, ch, i) => {
    return acc + BigInt(ALPHABET.indexOf(ch)) * (BASE ** BigInt(i));
  }, 0n);
}

function numberToPage(n) {
  const chars = [];
  for (let i = 0; i < 3200; i++) {
    const r = n % BASE;
    n = n / BASE;
    chars.push(ALPHABET[Number(r)]);
  }
  return chars.reverse();
}

// Insert snippet into a randomly chosen page at a random position and encode into hex
function searchBabel() {
  const snippet = document.getElementById("snippet").value;
  if (!snippet || snippet.length > 3200) {
    alert("Please enter a snippet (max 3200 characters).");
    return;
  }

  const w = Math.floor(Math.random() * 4);
  const s = Math.floor(Math.random() * 5);
  const v = Math.floor(Math.random() * 32);
  const p = Math.floor(Math.random() * 420);
  const insertAt = Math.floor(Math.random() * (Number(PAGE_LENGTH) - snippet.length));

  const posNumber = encodePosition(w, s, v, p);
  let filler = generateGibberish(posNumber);
  for (let i = 0; i < snippet.length; i++) {
    filler[insertAt + i] = snippet[i];
  }

  const pageNum = pageToNumber([...filler]);
  const combined = posNumber * POSITION_MULTIPLIER + pageNum;
  const scrambled = reversibleLcgScramble(combined);
  const hex = toBase36(scrambled);

  document.getElementById("hex").textContent = hex;
  document.getElementById("coords").textContent = `Wall: ${w}, Shelf: ${s}, Volume: ${v}, Page: ${p}`;
  document.getElementById("pos").textContent = insertAt;

  const before = filler.slice(0, insertAt).join("");
  const highlight = `<span style=\"background: yellow;\">${snippet}</span>`;
  const after = filler.slice(insertAt + snippet.length).join("");
  document.getElementById("page").innerHTML = before + highlight + after;
}

// Reverse the hex address to recover coordinates and page content
function browseBabel() {
  try {
    const hex = document.getElementById("browseHex").value.trim();
    const wall = parseInt(document.getElementById("browseWall").value);
    const shelf = parseInt(document.getElementById("browseShelf").value);
    const volume = parseInt(document.getElementById("browseVolume").value);
    const page = parseInt(document.getElementById("browsePage").value);

    if (hex.length === 0) {
      alert("Please enter a hex address.");
      return;
    }

    const expectedPos = encodePosition(wall, shelf, volume, page);
    const scrambled = fromBase36(hex);
    const combined = reversibleLcgUnscramble(scrambled);

    const actualPos = combined / POSITION_MULTIPLIER;
    const pageNumber = combined % POSITION_MULTIPLIER;

    if (actualPos !== expectedPos) {
      alert("Position mismatch! The hex doesn't match the given coordinates.");
      return;
    }

    const text = numberToPage(pageNumber);

    document.getElementById("hex").textContent = hex;
    document.getElementById("coords").textContent = `Wall: ${wall}, Shelf: ${shelf}, Volume: ${volume}, Page: ${page}`;
    const posEl = document.getElementById("pos");
    if (posEl) posEl.style.display = "none";
        document.getElementById("page").textContent = text.join("");
    } catch (e) {
        console.error("Browse failed:", e);
    }
}

function copyHex() {
  const hex = document.getElementById("hex").textContent;
  if (!hex) return;

  navigator.clipboard.writeText(hex).then(() => {
    const status = document.getElementById("copyStatus");
    status.style.display = "inline";
    setTimeout(() => (status.style.display = "none"), 1500);
  });
}

function copyLink() {
  const hex = document.getElementById("hex").textContent;
  const coordsText = document.getElementById("coords").textContent;
  if (!hex || !coordsText.includes("Wall")) return;

  const matches = coordsText.match(/Wall: (\d+), Shelf: (\d+), Volume: (\d+), Page: (\d+)/);
  if (!matches) return;

  const [, wall, shelf, volume, page] = matches;
  const hash = `hex=${encodeURIComponent(hex)}&wall=${wall}&shelf=${shelf}&volume=${volume}&page=${page}`;
  const url = `${location.origin}${location.pathname.replace("search.html", "browse.html")}#${hash}`;

  navigator.clipboard.writeText(url).then(() => {
    const status = document.getElementById("linkStatus");
    status.style.display = "inline";
    setTimeout(() => (status.style.display = "none"), 1500);
  });
}

// Load and decode from URL hash if it contains position + hex
function tryAutoloadFromHash() {
  if (!location.hash.startsWith("#hex=")) return;

  const hash = decodeURIComponent(location.hash.slice(1));
  const params = new URLSearchParams(hash);

  const hex = params.get("hex");
  const wall = parseInt(params.get("wall"));
  const shelf = parseInt(params.get("shelf"));
  const volume = parseInt(params.get("volume"));
  const page = parseInt(params.get("page"));

  if (hex && !isNaN(wall) && !isNaN(shelf) && !isNaN(volume) && !isNaN(page)) {
    const hexInput = document.getElementById("browseHex");
    const wallInput = document.getElementById("browseWall");
    const shelfInput = document.getElementById("browseShelf");
    const volumeInput = document.getElementById("browseVolume");
    const pageInput = document.getElementById("browsePage");
    
    if (hexInput && wallInput && shelfInput && volumeInput && pageInput) {
      hexInput.value = hex;
      wallInput.value = wall;
      shelfInput.value = shelf;
      volumeInput.value = volume;
      pageInput.value = page;
      browseBabel();
    }
  }
}

// Hook up UI event listeners on DOM load
document.addEventListener("DOMContentLoaded", () => {
    const searchBtn = document.getElementById("searchBtn");
    const browseBtn = document.getElementById("browseBtn");
    const copyHexBtn = document.getElementById("copyHexBtn");
    const linkBtn = document.getElementById("linkBtn");
  
    if (searchBtn) searchBtn.addEventListener("click", searchBabel);
    if (browseBtn) browseBtn.addEventListener("click", browseBabel);
    if (copyHexBtn) copyHexBtn.addEventListener("click", copyHex);
    if (linkBtn) linkBtn.addEventListener("click", copyLink);
  
    tryAutoloadFromHash();
    window.addEventListener("hashchange", tryAutoloadFromHash);
  });
