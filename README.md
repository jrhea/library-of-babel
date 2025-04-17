# Library of Babel

This is an attempt at a faithful client-side recreation of [libraryofbabel.info](https://libraryofbabel.info).

You are free to steal this code.


## Features

- Search for a snippet and find a page containing it  
- Browse a specific page by entering a hex + coordinates  
- Copy hex and share a link — includes full reproducibility  
- Fully static — deploy anywhere (GitHub Pages, IPFS, localhost)

## Usage

Explore the Library in two ways:

Search

- Go to search.html

- Enter any text (up to 3200 characters)

-	You’ll get:
    -	A hexagon address
    -	Coordinates (wall, shelf, volume, page)
    -	A full 3200-character page with your text embedded
    -	A link you can share or revisit later

Browse
-	Go to browse.html
-	Enter a hexagon and coordinates
-	The exact same page will be regenerated

## Link Format

All shared links use URL fragments (`#`) to support large hex values:

```
https://jrhea.github.io/library-of-babel/#hex=...&wall=0&shelf=1&volume=2&page=3
```

## How It Works

- Every page is encoded as a number in base-29  
- A **reversible Linear Congruential Generator (LCG)** scrambles that number  
- The result is encoded to base-36 to form the hexagon address  
- Position (wall/shelf/volume/page) is embedded in the number and fully recoverable  
- Searching embeds the text into deterministic pseudo-random filler at a random offset


## Credits

- Original concept: [libraryofbabel.info](https://libraryofbabel.info) by Jonathan Basile  

