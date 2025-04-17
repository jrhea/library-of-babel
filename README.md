# Library of Babel

This is an attempt at a faithful client-side recreation of [libraryofbabel.info](https://libraryofbabel.info).

You are free to steal this code.

---

## Features

- Search for a snippet and find a page containing it  
- Browse a specific page by entering a hex + coordinates  
- Copy hex and share a link — includes full reproducibility  
- Fully static — deploy anywhere (GitHub Pages, IPFS, localhost)

---

## Usage

1. Navigate to the [site](https://jrhea.github.io/library-of-babel) or clone the repo.
3. Use the **Search** box to find a snippet in the library.  
4. Copy the **Hexagon** or use **Copy Link** to share the exact location.  
5. Paste a hex into **Browse** to reconstruct a page from coordinates.

---

## Link Format

All shared links use URL fragments (`#`) to support large hex values:

```
https://jrhea.github.io/library-of-babel/#hex=...&wall=0&shelf=1&volume=2&page=3
```
---

## How It Works

- Every page is encoded as a number in base-29  
- A **reversible Linear Congruential Generator (LCG)** scrambles that number  
- The result is encoded to base-36 to form the “hexagon” address  
- Position (wall/shelf/volume/page) is embedded in the number and fully recoverable  
- Searching embeds the snippet into deterministic pseudo-random filler at a random offset

---

## Credits

- Original concept: [libraryofbabel.info](https://libraryofbabel.info) by Jonathan Basile  

