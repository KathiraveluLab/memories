# memories: Ground-Level Lisboa Exploration

**memories** is a ground-level 2D RPG canvas exploration game set across three historic neighborhoods of Lisboa: **Bairro Alto**, **Chiado**, and **Alfama**. Walk the cobblestone sidewalks on foot, board live-moving **Carris Eletrico 28E** streetcars, **Carris Bus 737 / 758** coaches, and real **Metropolitano de Lisboa** underground stations, step inside every building across the map (all 15 local shops, cafes, bakeries, galleries, restaurants, and **Se de Lisboa**), taste regional food, collect keepsakes, learn European Portuguese phrases, and fill your 23-entry **Lisboa Memory Album**.

## Screenshot

![memories Lisboa Application Screenshot](./assets/screenshot.png)

## Features

- **Authentic Lisboa Architecture & Cobblestone Streets**: Explore a continuous street-level map linking Bairro Alto (west), Chiado and Praca Luis de Camoes (center), and Alfama with Se de Lisboa and the Tagus waterfront (east) using `WASD` / Arrow keys or click-to-walk. Includes procedural cobalt *azulejo* tile facades, scalloped terracotta barrel-tile roofs with Pombaline dormers, wrought-iron Juliet balconies, *calcada portuguesa* Mar Largo plazas, bespoke landmarks (such as the octagonal *Quiosque de Sao Pedro*, Art Nouveau *Cafe A Brasileira* with Fernando Pessoa's terrace statue, *Livraria Bertrand 1732*, and *Se de Lisboa*), granite curbs, zebra crosswalks, and hand-laid cobblestone streets.
- **Live Street-Level Public Transit & Metro de Lisboa**:
  - **Eletrico 28E (Carris Tram)**: Glides along steel rails between Rua do Loreto, Praca Luis de Camoes, Largo do Chiado, Se de Lisboa, and Portas do Sol (`3.10 EUR`).
  - **Carris Bus 737 / 758**: Loops past Miradouro de Sao Pedro de Alcantara, Rua Garrett, Miradouro de Santa Luzia, and the Tagus waterfront (`2.10 EUR`).
  - **Metropolitano de Lisboa (`Linha Azul` & `Linha Verde`)**: Placed accurately where Metro stations exist in Lisbon (**Metro Baixa-Chiado** beside Cafe A Brasileira, **Metro Terreiro do Paco**, and **Metro Santa Apolonia** along the Alfama waterfront; `1.80 EUR`), reflecting that hilltop Bairro Alto and upper Alfama rely on trams, buses, and footwalks. Entering a station rides the escalators down to a tiled underground platform, boards the silver-and-crimson Lisbon Metro train for an animated underground tunnel ride with live station progress, and ascends the escalators back to the destination sidewalk.
  - **Sidewalk & Pedestrian Safety**: Pedestrians walk on sidewalks and cross at crosswalks, cannot walk into passing vehicles or clip through other people, and trams and buses automatically brake and yield rather than crashing into pedestrians.
- **All 15 Buildings Fully Enterable & Explorable**:
  - **Bairro Alto (6)**: *Quiosque de Sao Pedro*, *Pensao Residencial do Alto*, *Tasca do Fado*, *Casa da Rosa - Padaria*, *Palacete do Loreto*, *Vinil & Gravuras do Alto*.
  - **Chiado (5)**: *Livraria Bertrand (1732)*, *Galeria Pombalina*, *Cafe A Brasileira*, *Arcadas do Chiado*, *Atelier de Cortica & Luvas*.
  - **Alfama (4)**: *Se de Lisboa (1147 Cathedral)*, *Oficina de Azulejos*, *Taberna da Sardinha*, *Mercearia & Conservas de Alfama*.
  - Walk directly into any building doorway or Metro entrance using the Arrow / `WASD` keys facing the door (or press `E` / click) to step inside its custom interior room, chat with the host, order traditional dishes or browse keepsakes, and walk back out onto the sidewalk.
- **Gentle Memories Collection Loop**:
  - Manage **Wallet (EUR)**, **Energy**, and **Fullness** as Lisbon shifts from Morning through Afternoon, Golden Hour, and Lantern Evening.
  - Rest free at three scenic **Miradouro Benches** or take a gentle overnight stay at a neighborhood pensao without harsh game-over lockouts.
  - Capture **23 Memories** and unlock contextual **European Portuguese phrases** with phonetic pronunciation guides.

## Project Structure

- `index.html`: Main RPG viewport shell, HUD metrics, and Lisboa Explorer notebook panels.
- `styles.css`: Responsive Lisbon-themed styling.
- `src/data.js`: Overworld street, crosswalk, and neighborhood layout, 9 enterable venues with menus and keepsakes, 3 authentic Metro de Lisboa stations, 3 miradouro rest benches, Carris Tram 28E and Bus 737/758 routes, sidewalk pedestrians, phrases, and Memory Album catalog.
- `src/engine.js`: Pure ES module simulation engine (`MemoriesGameEngine`) managing sidewalk movement, pedestrian and vehicle collision safety, yielding transit vehicles, Metro rides, interior transitions, resource loops, and memory unlocking.
- `src/renderer.js`: HTML5 2D Canvas RPG renderer for cobblestone streets, bespoke Portuguese architecture, azulejo tilework, Metro station entrances, animated character and vehicles, mini-map, time-of-day lighting, and interior rooms.
- `src/app.js`: Browser controller handling keyboard and sidewalk-first click-to-walk input, animation frame updates, and interactive DOM panels.
- `tests/engine.test.js`: Automated unit, integration, collision-safety, renderer, and compliance test suite using `node --test`.

## Running Locally

Because the application uses native ES modules (`<script type="module">`), serve the workspace over HTTP:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Running Tests

Requires Node.js 20+:

```bash
npm test
```

or directly:

```bash
node --test tests/engine.test.js
```
