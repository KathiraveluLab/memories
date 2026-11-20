# Media & Audio Sources Attribution

This document cites the original source locations, historical metadata, and public-domain rights status for all external audio files bundled under `assets/audio/` in this repository.

## Public Domain Portuguese Fado Recordings (`assets/audio/`)

All three historical Portuguese Fado recordings below are digitized 78 rpm discs preserved by the **Library of Congress Packard Campus for Audio Visual Conservation (National Jukebox)** and hosted on the **Internet Archive** under **Public Domain Mark 1.0** (`https://creativecommons.org/publicdomain/mark/1.0/`). Because each sound recording was published between 1916 and 1922 (over 100 years old), it is in the public domain with no copyright restrictions.

| Local File | Title | Performers / Credits | Recording Date | Rights Status | Source Pages |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `assets/audio/fado-sentimental-1922.mp3` | *Fado sentimental* | Eugenio Cibelli, Salgado do Carmo | 1922-04-24 | Public Domain Mark 1.0 (`https://creativecommons.org/publicdomain/mark/1.0/`) | Item: `https://archive.org/details/loc-jukebox-61784-fado-sentimental`<br>Direct file: `https://archive.org/download/loc-jukebox-61784-fado-sentimental/jukebox-61784_fado-sentimental.mp3` |
| `assets/audio/fado-1919.mp3` | *Fado* | Jose Coelho da Cunha | 1919-08-08 | Public Domain Mark 1.0 (`https://creativecommons.org/publicdomain/mark/1.0/`) | Item: `https://archive.org/details/loc-jukebox-33787-fado`<br>Direct file: `https://archive.org/download/loc-jukebox-33787-fado/jukebox-33787_fado.mp3` |
| `assets/audio/fado-hilario-1916.mp3` | *Fado do hylario* | Manuel Carvalho, Edward T. King, King's Orchestra | 1916-10-31 | Public Domain Mark 1.0 (`https://creativecommons.org/publicdomain/mark/1.0/`) | Item: `https://archive.org/details/loc-jukebox-20280-fado-do-hylario`<br>Direct file: `https://archive.org/download/loc-jukebox-20280-fado-do-hylario/jukebox-20280_fado-do-hylario.mp3` |

## Procedural Assets

- All other environmental soundscapes (bakery wood-fired oven crackle, charcoal sardine grill sizzle, espresso steam and porcelain clinks, underground Metro train rumble, Transtejo ferry engine and horn, Se de Lisboa pipe organ, Portuguese folk guitar, and Tagus river waves) are generated procedurally in real time using the browser Web Audio API in `src/audio.js`.
- All visual scenes and `assets/screenshot.png` are procedurally rendered in HTML5 2D Canvas by `src/renderer.js`.
