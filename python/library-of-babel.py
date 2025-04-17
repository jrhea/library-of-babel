import random

# === Constants ===
ALPHABET = "abcdefghijklmnopqrstuvwxyz ,."
ALPHABET_MAP = {ch: i for i, ch in enumerate(ALPHABET)}
INDEX_MAP = {i: ch for i, ch in enumerate(ALPHABET)}
BASE = 29
PAGE_LENGTH = 3200
POSITION_EXPONENT = 3200
POSITION_MULTIPLIER = BASE ** POSITION_EXPONENT

# === Reversible LCG ===
A = 6364136223846793005
C = 1
M = 2**15565  # ensures enough space to scramble full 3200-char page

def modinv(a, m):
    t, new_t = 0, 1
    r, new_r = m, a
    while new_r:
        q = r // new_r
        t, new_t = new_t, t - q * new_t
        r, new_r = new_r, r - q * new_r
    return t + m if t < 0 else t

def reversible_lcg_scramble(n):
    return (A * n + C) % M

def reversible_lcg_unscramble(scrambled):
    A_inv = modinv(A, M)
    return (A_inv * (scrambled - C)) % M

# === Base-36 Encoding ===
def to_base36(n):
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    out = []
    while n > 0:
        n, r = divmod(n, 36)
        out.append(chars[r])
    return ''.join(reversed(out)) or "0"

def from_base36(s):
    return int(s, 36)

# === Position Encoding ===
def encode_position(wall, shelf, volume, page):
    return page + volume * 420 + shelf * 420 * 32 + wall * 420 * 32 * 5

def decode_position(pos):
    wall = pos // (420 * 32 * 5)
    shelf = (pos // (420 * 32)) % 5
    volume = (pos // 420) % 32
    page = pos % 420
    return {"wall": wall, "shelf": shelf, "volume": volume, "page": page}

# === Page Encoding ===
def page_to_number(page):
    assert len(page) == PAGE_LENGTH
    total = 0
    for i, ch in enumerate(reversed(page)):
        total += ALPHABET_MAP[ch] * (BASE ** i)
    return total

def number_to_page(n):
    chars = []
    for _ in range(PAGE_LENGTH):
        n, r = divmod(n, BASE)
        chars.append(INDEX_MAP[r])
    return ''.join(reversed(chars))

# === Deterministic pseudo-random filler ===
def generate_gibberish(seed, length=PAGE_LENGTH):
    chars = []
    for _ in range(length):
        seed = reversible_lcg_scramble(seed)
        chars.append(INDEX_MAP[seed % BASE])
    return ''.join(chars)

# === Encode: Embed snippet and scramble
def babel_encode(snippet, wall=2, shelf=3, volume=7, page=133, position=1000):
    pos_number = encode_position(wall, shelf, volume, page)
    seed = pos_number  # deterministic seed for filler
    filler = generate_gibberish(seed)
    page_text = filler[:position] + snippet + filler[position + len(snippet):]

    page_number = page_to_number(page_text)
    combined = pos_number * POSITION_MULTIPLIER + page_number
    scrambled = reversible_lcg_scramble(combined)

    return {
        "hex": to_base36(scrambled),
        "coordinates": {"wall": wall, "shelf": shelf, "volume": volume, "page": page},
        "snippet_position": position,
        "page_text": page_text
    }

# === Decode: Hex → original page
def babel_decode(hex_str):
    scrambled = from_base36(hex_str)
    number = reversible_lcg_unscramble(scrambled)

    pos_number = number // POSITION_MULTIPLIER
    page_number = number % POSITION_MULTIPLIER

    coords = decode_position(pos_number)
    page_text = number_to_page(page_number)

    return {
        "coordinates": coords,
        "page_text": page_text
    }

# === Search: auto-generate coordinates + position
def babel_search(snippet, wall=None, shelf=None, volume=None, page=None):
    wall = wall if wall is not None else random.randint(0, 3)
    shelf = shelf if shelf is not None else random.randint(0, 4)
    volume = volume if volume is not None else random.randint(0, 31)
    page = page if page is not None else random.randint(0, 419)
    position = random.randint(0, PAGE_LENGTH - len(snippet))

    return babel_encode(snippet, wall, shelf, volume, page, position)

# === Demo ===
if __name__ == "__main__":
    snippet = "here is some text that we want to find in the library of babel"
    search = babel_search(snippet)
    print("SEARCH:", snippet)
    print("--- Full Page ---")
    print(search["page_text"])
    print("Hexagon:", search["hex"])
    print("Coordinates:", search["coordinates"])
    print("Snippet Position:", search["snippet_position"])

    print("BROWSE:", )
    decoded = babel_decode(search["hex"])
    print("--- Full Page ---")
    print(decoded["page_text"])
    print("Pages Match:", search["page_text"] == decoded["page_text"])