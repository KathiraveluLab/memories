# memories: Ground-Level Lisboa Exploration

**memories** is a ground-level 2D RPG canvas exploration game set across three historic neighborhoods of Lisboa: **Bairro Alto**, **Chiado**, and **Alfama**. Walk the cobblestone sidewalks on foot, board live-moving **Carris Eletrico 28E** streetcars, **Carris Bus 737 / 758** coaches, and real **Metropolitano de Lisboa** underground stations, step inside every building across the map (all 15 local shops, cafes, bakeries, galleries, restaurants, and **Se de Lisboa**), taste regional food, collect keepsakes, learn European Portuguese phrases, and fill your 23-entry **Lisboa Memory Album**.

## Screenshot

![memories Lisboa Application Screenshot](./assets/screenshot.png)

## Features

- **3D Street View & Overhead Map (`[V]` Toggle)**: Explore Lisbon from an immersive eye-level 3D Street View perspective featuring multi-story extruded azulejo facades, wrought-iron Juliet balconies, pitched terracotta roofs, *Se de Lisboa* twin Romanesque bell towers, 3D Tram 28E and Carris Bus, Tagus River and *Ponte 25 de Abril* horizon, 360-degree mouse-drag look-around, ground-click walking, live radar mini-map, and instant `[V]` switching to the overhead street map.
- **Authentic Lisboa Architecture & Cobblestone Streets**: Explore a continuous street-level map linking Bairro Alto (west), Chiado and Praca Luis de Camoes (center), and Alfama with Se de Lisboa and the Tagus waterfront (east) using `WASD` / Arrow keys or click-to-walk. Includes procedural cobalt *azulejo* tile facades, scalloped terracotta barrel-tile roofs with Pombaline dormers, wrought-iron Juliet balconies, *calcada portuguesa* Mar Largo plazas, bespoke landmarks (such as the octagonal *Quiosque de Sao Pedro*, Art Nouveau *Cafe A Brasileira* with Fernando Pessoa's terrace statue, *Livraria Bertrand 1732*, and *Se de Lisboa*), granite curbs, zebra crosswalks, and hand-laid cobblestone streets.
- **Live Street-Level Public Transit, Inside-Tram & Inside-Bus Cityscapes, Metro & Cais do Sodre Ferries**:
  - **Eletrico 28E (In-Tram Remodelado View)**: Glides along steel rails between Rua do Loreto, Praca Luis de Camoes, Largo do Chiado, Se de Lisboa, and Portas do Sol (`3.10 EUR`, nearly twice walking speed). Boarding shifts into a mahogany-and-brass wooden Remodelado streetcar interior with slatted benches, ceiling bell cord, scrolling hillside azulejo alleys and Se de Lisboa towers, and a 5-stop route strip.
  - **Carris Bus 737 / 758 (Inside-the-Bus Cityscape View)**: Loops past Miradouro de Sao Pedro de Alcantara, Rua Garrett, Miradouro de Santa Luzia, and the Tagus waterfront (`2.10 EUR`, over twice walking speed). Boarding shifts into an immersive inside-the-bus perspective with parallax Lisbon hills, scrolling azulejo avenues or Tagus riverfront vistas, swaying yellow grab straps, an illuminated STOP button, and an amber-LED next-stop display.
  - **Onboard Stop Bell & Portuguese Announcements**: Pressing `[E]` while riding inside a bus or tram rings the transit STOP bell and triggers a visual and spoken Portuguese `"Proxima Paragem: <Next Stop>"` announcement.
  - **Metropolitano de Lisboa (`Linha Azul` & `Linha Verde`)**: Placed accurately where Metro stations exist in Lisbon (**Metro Baixa-Chiado** beside Cafe A Brasileira, **Metro Terreiro do Paco**, and **Metro Santa Apolonia** along the Alfama waterfront; `1.80 EUR`). Entering rides the escalators down to a tiled underground platform, boards the silver-and-crimson Lisbon Metro train for an animated underground tunnel ride, and ascends back to the destination sidewalk.
  - **Cais do Sodre Ferry Terminal (`Transtejo`) & Explorable South-Bank Towns**: Located on the Tagus riverfront embankment, connecting to **Cacilhas (Almada)** (`1.55 EUR`), **Seixal Bay** (`2.65 EUR`), and **Montijo** (`3.00 EUR`) with animated river crossings and walkable south-bank waterfront promenades featuring local seafood restaurants, historic lighthouses, tide mills, windmills, and artisan shops before sailing back to Lisbon.
  - **Sidewalk & Smart Pedestrian Safety**: Pedestrians stroll at a realistic walking pace slower than both trams and buses, villagers stay strictly on sidewalks (never in the middle of streets) and proactively walk around obstacles rather than getting stuck, and trams and buses automatically brake and yield rather than crashing into pedestrians.
- **All 15 Buildings Fully Enterable & Explorable**:
  - **Bairro Alto (6)**: *Quiosque de Sao Pedro*, *Pensao Residencial do Alto*, *Tasca do Fado*, *Casa da Rosa - Padaria*, *Palacete do Loreto*, *Vinil & Gravuras do Alto*.
  - **Chiado (5)**: *Livraria Bertrand (1732)*, *Galeria Pombalina*, *Cafe A Brasileira*, *Arcadas do Chiado*, *Atelier de Cortica & Luvas*.
  - **Alfama (4)**: *Se de Lisboa (1147 Cathedral)*, *Oficina de Azulejos*, *Taberna da Sardinha*, *Mercearia & Conservas de Alfama*.
  - Walk directly into any building doorway or Metro entrance using the Arrow / `WASD` keys facing the door (or press `E` / click) to step inside its custom interior room, chat with the host, order traditional dishes or browse keepsakes, and walk back out onto the sidewalk.
- **LAN Multiplayer & Distinct Cloth Styles**:
  - Run `npm start` on one computer and share the displayed network address (such as `http://192.168.x.x:3000`) with another computer on the same Wi-Fi or LAN.
  - Both players explore Lisboa completely independently across Bairro Alto, Chiado, and Alfama, see each other live on cobblestone sidewalks, inside shared shops, bakeries, restaurants, and underground Metro platforms, appear on the mini-map, and can wave with `[G]`.
  - Every joining player automatically receives a distinct clothing style from 6 unique Lisboa traveler outfits (*Chiado Trench & Scarf*, *Alfama Sundress & Sun Hat*, *Tagus Sailor Knit & Beret*, *Bairro Alto Woven Poncho*, *Azulejo Overalls & Flat Cap*, and *Linen Blazer & Fedora*), customizable anytime.
- **Atmospheric Lisboa Soundscapes & Cultural Music (Web Audio API)**:
  - **Bakeries (`Casa da Rosa - Padaria` & `Arcadas do Chiado`)**: Warm rumble and crackling oak embers of a brick wood-fired bread oven.
  - **Fado Tavern (`Tasca do Fado`) & Vinyl Shop (`Vinil & Gravuras do Alto`)**: Rotates through three authentic Public Domain 1916-1922 Portuguese Fado recordings (*Fado Sentimental*, *Fado*, and *Fado do Hilario*, cited in [assets/SOURCES.md](./assets/SOURCES.md)) with a `Next Track` control and seamless procedural Web Audio fallback, paired with warm analog turntable crackle inside the vinyl shop.
  - **Alfama Sardine Grill (`Taberna da Sardinha`)**: Sizzling charcoal sardine grill pops and sea-salt hiss blended with warm tavern Fado guitar.
  - **Historic Cafes (`Cafe A Brasileira` & `Quiosque de Sao Pedro`)**: Pressurized espresso steam wand bursts, delicate porcelain teacup clinks, and cozy salon murmur.
  - **Underground Metro & Streetcars**: Subterranean station vault hum and 3-note platform chime shifting into deep tunnel train rumble and rhythmic rail-joint clacks while riding *Linha Azul* (plus streetcar rail hum and brass bell aboard Tram 28E).
  - **Cathedral & Cultural Shops**: Resonant pipe-organ chords inside *Se de Lisboa (1147)*, sunlit Portuguese folk guitar across bookshops, galleries, and ateliers (with a warm ceramic kiln hum in *Oficina de Azulejos*), and spatially swelling **Tagus Riverfront** waves along Avenida Ribeira and Cais de Alfama (toggle anytime with `Sound: ON / OFF` or `[M]`).
- **Gentle Memories Collection Loop**:
  - Manage **Wallet (EUR)**, **Energy**, and **Fullness** as Lisbon shifts from Morning through Afternoon, Golden Hour, and Lantern Evening.
  - Rest free at three scenic **Miradouro Benches** or take a gentle overnight stay at a neighborhood pensao without harsh game-over lockouts.
  - Capture **26 Memories** and unlock contextual **European Portuguese phrases** with phonetic pronunciation guides.

## Project Structure

- `server.js`: Zero-dependency Node.js HTTP and Server-Sent Events (SSE) LAN multiplayer server binding to `0.0.0.0`, printing reachable LAN IPv4 addresses, auto-assigning distinct outfits and sidewalk spawns, and broadcasting live player state.
- `index.html`: Main RPG viewport shell, HUD metrics, LAN Multiplayer & Cloth Style panel, and Lisboa Explorer notebook panels.
- `styles.css`: Responsive Lisbon-themed styling.
- `src/data.js`: Overworld street, crosswalk, and neighborhood layout, 15 enterable venues with menus, staff, cashiers, and keepsakes, 6 distinct traveler cloth styles, 3 authentic Metro de Lisboa stations, 3 miradouro rest benches, Carris Tram 28E and Bus 737/758 routes, sidewalk pedestrians, phrases, and Memory Album catalog.
- `src/engine.js`: Pure ES module simulation engine (`MemoriesGameEngine`) managing sidewalk movement, multiplayer peer interpolation and separation, pedestrian and vehicle collision safety, yielding transit vehicles, Metro rides, interior transitions, resource loops, and memory unlocking.
- `src/multiplayer.js`: Browser LAN multiplayer client with automatic solo fallback on static hosts (such as GitHub Pages).
- `src/audio.js`: Zero-dependency Web Audio API procedural sound engine generating bakery wood-fired oven crackle, Portuguese Fado guitar music, spatial Tagus riverfront water sounds, and interactive bells.
- `src/streetview3d.js`: Zero-dependency HTML5 Canvas 3D Street View engine with frustum near-plane clipping, topological painter's occlusion sorting, 3D extruded Portuguese architecture, 3D transit vehicles, 360-degree horizon panorama, and live radar mini-map.
- `src/renderer.js`: HTML5 2D Canvas RPG renderer for cobblestone streets, bespoke Portuguese architecture, azulejo tilework, Metro station entrances, 6 distinct character clothing styles, animated vehicles, mini-map, time-of-day lighting, and detailed interior rooms.
- `src/app.js`: Browser controller handling keyboard and sidewalk-first click-to-walk input, LAN sync, animation frame updates, and interactive DOM panels.
- `tests/engine.test.js` & `tests/multiplayer.test.js`: Automated unit, integration, LAN multi-client SSE, collision-safety, renderer, and compliance test suites using `node --test`.

## Running Locally (LAN Multiplayer)

Requires Node.js 20+. Start the built-in LAN multiplayer server:

```bash
npm start
```

Open `http://localhost:3000` on the host computer, and open the printed **Network** address (for example `http://192.168.1.42:3000`) on another computer in the same Wi-Fi or local network. You can also choose a custom port via `PORT=8080 npm start`.

For static single-player hosting (such as GitHub Pages or `python -m http.server 8000`), the app gracefully runs in Solo Mode while retaining full cloth-style customization.

## Running Tests

Requires Node.js 20+:

```bash
npm test
```

or directly:

```bash
node --test tests/engine.test.js
```
