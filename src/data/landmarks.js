import { CITY_DISTRICT_SPOTS } from './districts.js';

// so every single Metro station stands inside its true historic or modern Lisbon neighborhood (zero bland station clusters!).
export const LISBOA_CORRIDOR_LANDMARKS = [
  // Row 6 (Northern Ring: Amadora / Benfica / Odivelas / Lumiar / Quinta das Conchas)
  {
    id: 'site-reboleira-parque-central',
    kind: 'landmark',
    name: 'Estacao CP Reboleira & Parque Central',
    badge: '[RAIL & PARK]',
    worldX: -2050,
    worldY: -2664,
    w: 170,
    h: 140,
    accentColor: '#2563eb',
    skylineStyle: 'pombaline-grand',
    note: 'Intermodal CP Linha de Sintra railway pavilion and green civic plaza linking Reboleira to Amadora Este.'
  },
  {
    id: 'site-palacio-baldaya-benfica',
    kind: 'landmark',
    name: 'Palacio Baldaya & Mata de Benfica',
    badge: '[18TH-C PALACE]',
    worldX: -1140,
    worldY: -2664,
    w: 190,
    h: 140,
    accentColor: '#2563eb',
    skylineStyle: 'historic-manor',
    note: '18th-century tiled aristocratic estate and cultural gardens serving Benfica and Pontinha.'
  },
  {
    id: 'site-mosteiro-odivelas',
    kind: 'landmark',
    name: 'Mosteiro de Sao Dinis (1295)',
    badge: '[ROYAL MONASTERY]',
    worldX: -260,
    worldY: -2664,
    w: 200,
    h: 140,
    accentColor: '#ca8a04',
    skylineStyle: 'monastery-gothic',
    note: 'Gothic Cistercian monastery founded by King Dinis I in 1295, housing the royal tomb beside Metro Odivelas.'
  },
  {
    id: 'site-igreja-ameixoeira',
    kind: 'landmark',
    name: 'Largo & Igreja da Ameixoeira',
    badge: '[HISTORIC PARISH]',
    worldX: 340,
    worldY: -2664,
    w: 190,
    h: 140,
    accentColor: '#ca8a04',
    skylineStyle: 'historic-manor',
    note: '17th-century hilltop parish church and calcada square along the Linha Amarela northern corridor.'
  },
  {
    id: 'site-museu-traje-lumiar',
    kind: 'landmark',
    name: 'Museu Nacional do Traje (Lumiar)',
    badge: '[PALACE & BOTANICAL]',
    worldX: 995,
    worldY: -2664,
    w: 170,
    h: 140,
    accentColor: '#ca8a04',
    skylineStyle: 'historic-manor',
    note: 'Palacio Angeja-Palmela and Monteiro-Mor Botanical Park preserving centuries of Portuguese costume.'
  },
  {
    id: 'site-quinta-conchas-pavilion',
    kind: 'landmark',
    name: 'Parque da Quinta das Conchas',
    badge: '[WOODLAND PARK]',
    worldX: 1320,
    worldY: -2664,
    w: 180,
    h: 140,
    accentColor: '#15803d',
    skylineStyle: 'park-pavilion',
    note: 'Lisbon third-largest green park featuring shaded cedar groves, lake terraces, and open-air lawns.'
  },
  // Row 5 (Carnide / Estadio da Luz / Telheiras / Estadio Jose Alvalade / Alvalade / Roma)
  {
    id: 'site-carnide-largo-luz',
    kind: 'landmark',
    name: 'Santuario & Largo da Luz (Carnide)',
    badge: '[HISTORIC VILLAGE]',
    worldX: -2190,
    worldY: -1984,
    w: 200,
    h: 140,
    accentColor: '#2563eb',
    skylineStyle: 'historic-manor',
    note: 'Cobblestone village core of Carnide lined with traditional tascas and 16th-century Manoeline stonework.'
  },
  {
    id: 'site-estadio-da-luz',
    kind: 'landmark',
    name: 'Estadio da Luz (SL Benfica)',
    badge: '[65,000 STADIUM]',
    worldX: -1310,
    worldY: -1984,
    w: 230,
    h: 140,
    accentColor: '#dc2626',
    skylineStyle: 'estadio-luz',
    note: 'Iconic red-arched Cathedral of Portuguese football beside Metro Colegio Militar/Luz.'
  },
  {
    id: 'site-hospital-santa-maria',
    kind: 'landmark',
    name: 'Hospital de Santa Maria & Medicina',
    badge: '[UNIVERSITY CAMPUS]',
    worldX: -250,
    worldY: -1984,
    w: 220,
    h: 140,
    accentColor: '#ca8a04',
    skylineStyle: 'pombaline-grand',
    note: 'Monumental 1953 modernist university medical complex anchoring Cidade Universitaria.'
  },
  {
    id: 'site-estadio-jose-alvalade',
    kind: 'landmark',
    name: 'Estadio Jose Alvalade (Sporting CP)',
    badge: '[50,000 STADIUM]',
    worldX: 340,
    worldY: -1984,
    w: 220,
    h: 140,
    accentColor: '#16a34a',
    skylineStyle: 'estadio-alvalade',
    note: 'Emerald-and-gold tiled stadium designed by Tomas Taveira right beside Metro Campo Grande.'
  },
  {
    id: 'site-mercado-alvalade',
    kind: 'landmark',
    name: 'Mercado de Alvalade & Av. da Igreja',
    badge: '[NEIGHBORHOOD MARKET]',
    worldX: 1940,
    worldY: -1984,
    w: 190,
    h: 140,
    accentColor: '#16a34a',
    skylineStyle: 'pombaline-grand',
    note: 'Bustling mid-century Lisbon neighborhood market hall, bookshops, and pastelarias along Avenida da Igreja.'
  },
  {
    id: 'site-avenida-roma-cinema',
    kind: 'landmark',
    name: 'Avenida de Roma & Cinema City',
    badge: '[1950S BOULEVARD]',
    worldX: 2245,
    worldY: -1984,
    w: 205,
    h: 140,
    accentColor: '#16a34a',
    skylineStyle: 'pombaline-grand',
    note: 'Classic 1950s modernist residential arcades, pastry shops, and cinema marquee between Roma and Areeiro.'
  },
  {
    id: 'site-pastelaria-mexicana',
    kind: 'eatery',
    name: 'Pastelaria Mexicana (1946) - Praca de Londres',
    badge: '[MODERNIST CAFE]',
    host: 'Dona Beatriz',
    worldX: 2475,
    worldY: -1984,
    w: 215,
    h: 140,
    accentColor: '#16a34a',
    skylineStyle: 'pombaline-grand',
    note: 'Iconic 1946 modernist Lisbon pastelaria between Metro Roma and Metro Areeiro famous for its stained-glass winter garden, espresso, and fresh bolos.',
    items: [
      { id: 'item-mexicana-bica-glass', name: 'Galao & Sumo de Laranja Natural', kind: 'food', servingType: 'glass', glassStyle: 'limonada', costEur: 3.2, fullnessDelta: 14, energyDelta: 26, description: 'Tall glass of fresh Algarve orange juice or milky Lisbon galao at Pastelaria Mexicana.' },
      { id: 'item-mexicana-tarte-plate', name: 'Tarte de Amendoa & Bola de Berlim', kind: 'food', servingType: 'plate', costEur: 4.5, fullnessDelta: 34, energyDelta: 24, description: 'Warm almond tart and custard-filled Bola de Berlim served on porcelain at Praca de Londres.' }
    ]
  },
  // Row 4 (Alto dos Moinhos / Laranjeiras / Parque / Picoas / Bela Vista / Encarnacao)
  {
    id: 'site-museu-musica-moinhos',
    kind: 'landmark',
    name: 'Museu Nacional da Musica',
    badge: '[ROYAL INSTRUMENTS]',
    worldX: -1720,
    worldY: -1304,
    w: 170,
    h: 140,
    accentColor: '#2563eb',
    skylineStyle: 'historic-manor',
    note: 'National collection of historic harpsichords, Stradivarius cello, and Portuguese guitars near Alto dos Moinhos.'
  },
  {
    id: 'site-pavilhao-carlos-lopes',
    kind: 'landmark',
    name: 'Pavilhao Carlos Lopes (1922)',
    badge: '[AZULEJO PAVILION]',
    worldX: -60,
    worldY: -1304,
    w: 200,
    h: 140,
    accentColor: '#2563eb',
    skylineStyle: 'viuva-lamego',
    note: 'Ornamental blue-and-white tiled exhibition palace in Parque Eduardo VII beside Metro Parque.'
  },
  {
    id: 'site-guimard-picoas',
    kind: 'landmark',
    name: 'Pavilhao Guimard & Fontes Pereira',
    badge: '[ART NOUVEAU]',
    worldX: 425,
    worldY: -1304,
    w: 175,
    h: 140,
    accentColor: '#ca8a04',
    skylineStyle: 'guimard-pavilion',
    note: 'Authentic Paris Metro Art Nouveau wrought-iron arch and modernist avenue towers at Picoas.'
  },
  {
    id: 'site-parque-bela-vista',
    kind: 'landmark',
    name: 'Parque da Bela Vista',
    badge: '[85-HECTARE PARK]',
    worldX: 3165,
    worldY: -1304,
    w: 135,
    h: 140,
    accentColor: '#dc2626',
    skylineStyle: 'park-pavilion',
    note: 'Rolling amphitheatre hills of Parque da Bela Vista overlooking eastern Lisbon and the Tagus Estuary.'
  },
  {
    id: 'site-praca-encarnacao',
    kind: 'landmark',
    name: 'Praca & Mercado da Encarnacao',
    badge: '[1940S GARDEN QUARTER]',
    worldX: 3935,
    worldY: -1304,
    w: 150,
    h: 140,
    accentColor: '#dc2626',
    skylineStyle: 'pombaline-grand',
    note: 'Charming 1940s garden neighborhood and market square one stop south of Lisbon Airport.'
  },
  // Row 3 (Restauradores / Avenida / Parque das Nacoes Torre Vasco da Gama)
  {
    id: 'site-palacio-foz-restauradores',
    kind: 'landmark',
    name: 'Palacio Foz & Obelisco (1886)',
    badge: '[RESTAURADORES]',
    worldX: -70,
    worldY: -624,
    w: 190,
    h: 140,
    accentColor: '#2563eb',
    skylineStyle: 'obelisco-restauradores',
    note: 'Rose-limestone 18th-century Palacio Foz and the 30-meter Independence Obelisk at Praca dos Restauradores.'
  },
  {
    id: 'site-teatro-tivoli-avenida',
    kind: 'landmark',
    name: 'Teatro Tivoli BBVA (1924)',
    badge: '[AV. LIBERDADE]',
    worldX: 410,
    worldY: -624,
    w: 190,
    h: 140,
    accentColor: '#2563eb',
    skylineStyle: 'teatro-tivoli',
    note: 'Neoclassical 1924 theatre and grand stone mansions lining plane-tree shaded Avenida da Liberdade.'
  },
  {
    id: 'site-torre-vasco-da-gama',
    kind: 'landmark',
    name: 'Torre Vasco da Gama (145m Sail)',
    badge: '[PARQUE DAS NACOES]',
    worldX: 3855,
    worldY: -624,
    w: 220,
    h: 140,
    accentColor: '#0284c7',
    skylineStyle: 'torre-vasco-da-gama',
    note: 'Lisbon tallest skyscraper: 145-meter steel lattice caravel sail tower gazing directly at Ponte Vasco da Gama across the Tagus.'
  },
  // Row 2 East (Martim Moniz / Intendente / Anjos / Arroios / Parque das Nacoes)
  {
    id: 'site-fabrica-viuva-lamego',
    kind: 'landmark',
    name: 'Fabrica Viuva Lamego (1849)',
    badge: '[AZULEJO FACADE]',
    worldX: 2295,
    worldY: 54,
    w: 170,
    h: 140,
    accentColor: '#16a34a',
    skylineStyle: 'viuva-lamego',
    note: 'World-famous 1849 cobalt-and-gold hand-painted tile facade at Largo do Intendente.'
  },
  {
    id: 'site-mercado-arroios-chile',
    kind: 'landmark',
    name: 'Mercado de Arroios & Praca do Chile',
    badge: '[ALMIRANTE REIS]',
    worldX: 3440,
    worldY: 54,
    w: 210,
    h: 140,
    accentColor: '#16a34a',
    skylineStyle: 'pombaline-grand',
    note: 'Lively cosmopolitan market and art-deco avenue facades along Avenida Almirante Reis.'
  },
  {
    id: 'site-pavilhao-conhecimento',
    kind: 'landmark',
    name: 'Pavilhao do Conhecimento & Marina',
    badge: '[EXPO 98 WATERFRONT]',
    worldX: 3720,
    worldY: 54,
    w: 220,
    h: 140,
    accentColor: '#0284c7',
    skylineStyle: 'oriente-calatrava',
    note: 'Expo 98 modernist science pavilion and marina promenade opening onto the eastern Tagus Estuary.'
  },
  // =========================================================================
  // PARQUE DAS NACOES / ORIENTE FULL EXPO 98 WATERFRONT SIGHTS
  // =========================================================================
  {
    id: 'site-torres-sao-gabriel-rafael',
    kind: 'landmark',
    name: 'Torres Sao Gabriel & Sao Rafael (1998)',
    badge: '[EXPO 98 CARAVEL TOWERS]',
    worldX: 2940,
    worldY: -290,
    w: 220,
    h: 140,
    doorSide: 'north',
    accentColor: '#0284c7',
    skylineStyle: 'twin-towers-expo',
    note: 'Twin 110-meter nautical caravel-prow glass towers framing the entrance to Parque das Nacoes beside Metro Oriente.'
  },
  {
    id: 'site-cc-vasco-da-gama',
    kind: 'shop',
    name: 'Centro Comercial Vasco da Gama',
    badge: '[GLASS GALLERIA]',
    host: 'Mariana',
    worldX: 3460,
    worldY: -290,
    w: 230,
    h: 140,
    doorSide: 'north',
    accentColor: '#0284c7',
    skylineStyle: 'vasco-da-gama-mall',
    note: 'Sunlit glass-roofed maritime galleria directly across from Gare do Oriente with terrace views over Parque das Nacoes.'
  },
  {
    id: 'site-meo-arena-parque-nacoes',
    kind: 'landmark',
    name: 'MEO Arena / Pavilhao da Utopia (1998)',
    badge: '[EXPO 98 ARENA]',
    worldX: 3730,
    worldY: -290,
    w: 260,
    h: 140,
    doorSide: 'north',
    accentColor: '#0284c7',
    skylineStyle: 'meo-arena',
    note: 'Iconic Expo 98 caravel-hull timber-ribbed arena hosting international concerts and sports beside the Tagus.'
  },
  {
    id: 'site-casino-teatro-camoes',
    kind: 'landmark',
    name: 'Casino Lisboa & Teatro Camoes',
    badge: '[EXPO 98 CULTURE]',
    worldX: 2940,
    worldY: 370,
    w: 220,
    h: 140,
    doorSide: 'north',
    accentColor: '#0284c7',
    skylineStyle: 'teatro-tivoli',
    note: 'Home of the National Ballet of Portugal and the luminous Expo 98 performance pavilion along Alameda dos Oceanos.'
  },
  {
    id: 'site-pavilhao-de-portugal',
    kind: 'landmark',
    name: 'Pavilhao de Portugal (Alvaro Siza 1998)',
    badge: '[CATENARY CANOPY]',
    worldX: 3460,
    worldY: 370,
    w: 240,
    h: 140,
    doorSide: 'north',
    accentColor: '#0284c7',
    skylineStyle: 'pavilhao-portugal',
    note: 'Pritzker-winning architect Alvaro Siza Vieira iconic sweeping white concrete catenary canopy suspended over the ceremonial Expo 98 plaza.'
  },
  {
    id: 'site-oceanario-de-lisboa',
    kind: 'landmark',
    name: 'Oceanario de Lisboa (1998)',
    badge: '[EUROPE LARGEST AQUARIUM]',
    worldX: 3740,
    worldY: 370,
    w: 250,
    h: 140,
    doorSide: 'north',
    accentColor: '#0284c7',
    skylineStyle: 'oceanario-lisboa',
    note: 'Floating glass-and-limestone marine pavilion built over Doca dos Olivais housing a five-million-liter global ocean tank, sea otters, and sunfish.'
  },
  {
    id: 'site-jardim-garcia-de-orta',
    kind: 'landmark',
    name: 'Jardim Garcia de Orta & Passeio das Tagides',
    badge: '[RIVERFRONT GARDENS]',
    worldX: 2560,
    worldY: 700,
    w: 220,
    h: 140,
    accentColor: '#15803d',
    skylineStyle: 'park-pavilion',
    note: 'Botanical Expo 98 gardens showcasing flora from Portugal maritime voyages along the eastern Tagus riverfront.'
  },
  {
    id: 'site-telecabine-jardim-ondas',
    kind: 'landmark',
    name: 'Telecabine Lisboa & Jardim das Ondas',
    badge: '[TAGUS CABLE CAR]',
    worldX: 3740,
    worldY: 700,
    w: 230,
    h: 140,
    accentColor: '#0284c7',
    skylineStyle: 'torre-vasco-da-gama',
    note: 'Riverfront gondola station gliding 30 meters above the Tagus Estuary between Oceanario and Torre Vasco da Gama.'
  },
  // =========================================================================
  // ROMA, AREEIRO, ALVALADE & SUBURBAN BOULEVARD SIGHTS (SOUTH SIDES OF ROADS)
  // =========================================================================
  {
    id: 'site-livraria-barata-roma',
    kind: 'shop',
    name: 'Livraria Barata (1957) - Av. de Roma',
    badge: '[HISTORIC BOOKSHOP]',
    host: 'Senhor Artur',
    worldX: 2130,
    worldY: -1650,
    w: 205,
    h: 140,
    doorSide: 'north',
    accentColor: '#16a34a',
    skylineStyle: 'pombaline-grand',
    note: 'Beloved 1957 modernist bookshop and literary landmark on Avenida de Roma, just steps from Metro Roma.'
  },
  {
    id: 'site-igreja-sao-joao-de-deus',
    kind: 'landmark',
    name: 'Igreja de Sao Joao de Deus (Praca de Londres)',
    badge: '[1953 CHURCH]',
    worldX: 2380,
    worldY: -1650,
    w: 215,
    h: 140,
    doorSide: 'north',
    accentColor: '#16a34a',
    skylineStyle: 'monastery-gothic',
    note: 'Monumental 1953 limestone parish church with stained-glass lancets anchoring Praca de Londres between Roma and Areeiro.'
  },
  {
    id: 'site-fonte-monumental-areeiro',
    kind: 'landmark',
    name: 'Praca Francisco Sa Carneiro & Miradouro Areeiro',
    badge: '[ART DECO PLAZA]',
    worldX: 2640,
    worldY: -1650,
    w: 215,
    h: 140,
    doorSide: 'north',
    accentColor: '#16a34a',
    skylineStyle: 'historic-manor',
    note: 'Grand 1940s Art Deco limestone towers and terraced roundabout crowning Metro Areeiro.'
  },
  {
    id: 'site-jardim-fernando-pessa',
    kind: 'landmark',
    name: 'Jardim Fernando Pessa & Av. de Roma Sul',
    badge: '[GARDEN & KIOSK]',
    worldX: 1840,
    worldY: -1650,
    w: 210,
    h: 140,
    doorSide: 'north',
    accentColor: '#15803d',
    skylineStyle: 'park-pavilion',
    note: 'Shaded Alvalade neighborhood garden with open-air coffee kiosk and chestnut trees linking Alvalade and Roma.'
  },
  {
    id: 'site-jardim-campo-grande-lago',
    kind: 'landmark',
    name: 'Jardim do Campo Grande & Casa do Lago',
    badge: '[ROWBOAT LAKE]',
    worldX: 1090,
    worldY: -1650,
    w: 230,
    h: 140,
    doorSide: 'north',
    accentColor: '#15803d',
    skylineStyle: 'park-pavilion',
    note: 'Historic 19th-century landscaped park with shaded plane-tree promenades and lakeside paddleboat pavilion.'
  },
  {
    id: 'site-teatro-armando-cortez',
    kind: 'landmark',
    name: 'Teatro Armando Cortez & Tascas de Carnide',
    badge: '[CARNIDE CULTURE]',
    worldX: -2060,
    worldY: -1650,
    w: 210,
    h: 140,
    doorSide: 'north',
    accentColor: '#2563eb',
    skylineStyle: 'teatro-tivoli',
    note: 'Lively Carnide theatre and cobblestone courtyard surrounded by traditional Lisbon tascas.'
  },
  {
    id: 'site-centro-colombo-benfica',
    kind: 'shop',
    name: 'Centro Comercial Colombo & Av. Lusiada',
    badge: '[BENFICA GALLERIA]',
    host: 'Ines',
    worldX: -1780,
    worldY: -1650,
    w: 230,
    h: 140,
    doorSide: 'north',
    accentColor: '#2563eb',
    skylineStyle: 'colombo-complex',
    note: 'Major Benfica shopping and dining complex themed after the Portuguese Age of Discoveries opposite Estadio da Luz.'
  },
  {
    id: 'site-pastelaria-califa-benfica',
    kind: 'eatery',
    name: 'Pastelaria Califa (1969) & Igreja de Benfica',
    badge: '[BENFICA CLASSIC]',
    host: 'Senhor Manuel',
    worldX: -1310,
    worldY: -1650,
    w: 220,
    h: 140,
    doorSide: 'north',
    accentColor: '#dc2626',
    skylineStyle: 'historic-manor',
    note: 'Legendary 1969 Benfica pastelaria and restaurant famous for freshly baked croissants and pre-match coffee.'
  },
  {
    id: 'site-palacio-fronteira',
    kind: 'landmark',
    name: 'Palacio dos Marqueses de Fronteira (1671)',
    badge: '[AZULEJO PALACE]',
    worldX: -1940,
    worldY: -970,
    w: 230,
    h: 140,
    doorSide: 'north',
    accentColor: '#2563eb',
    skylineStyle: 'viuva-lamego',
    note: '17th-century royal hunting palace celebrated for its cobalt azulejo Gallery of Kings and formal boxwood gardens near Alto dos Moinhos.'
  },
  {
    id: 'site-jardim-zoologico-portico',
    kind: 'landmark',
    name: 'Jardim Zoologico de Lisboa (1884 Main Gate)',
    badge: '[1884 ZOO ARCH]',
    worldX: -1360,
    worldY: -970,
    w: 220,
    h: 140,
    doorSide: 'north',
    accentColor: '#15803d',
    skylineStyle: 'park-pavilion',
    note: 'Historic 1884 botanical and zoological park entrance at Sete Rios with rose gardens and overhead cable car.'
  },
  {
    id: 'site-culturgest-campo-pequeno',
    kind: 'landmark',
    name: 'Culturgest & Biblioteca Palacio Galveias',
    badge: '[ART & LIBRARY]',
    worldX: 2360,
    worldY: -970,
    w: 220,
    h: 140,
    doorSide: 'north',
    accentColor: '#ca8a04',
    skylineStyle: 'historic-manor',
    note: 'Contemporary art auditorium and 17th-century tiled palace library beside Campo Pequeno and Entre Campos.'
  },
  {
    id: 'site-convento-chelas-isel',
    kind: 'landmark',
    name: 'Convento de Chelas (1192) & ISEL Campus',
    badge: '[HISTORIC CONVENT]',
    worldX: 3440,
    worldY: -970,
    w: 220,
    h: 140,
    doorSide: 'north',
    accentColor: '#dc2626',
    skylineStyle: 'monastery-gothic',
    note: 'Medieval 12th-century convent cloister and Lisbon engineering institute overlooking eastern Chelas.'
  },
  {
    id: 'site-quinta-pedagogica-olivais',
    kind: 'landmark',
    name: 'Quinta Pedagogica & Spacio Olivais',
    badge: '[OLIVAIS GARDEN]',
    worldX: 3720,
    worldY: -970,
    w: 220,
    h: 140,
    doorSide: 'north',
    accentColor: '#15803d',
    skylineStyle: 'park-pavilion',
    note: 'Beloved Olivais urban orchard, windmill, and community square along the Linha Vermelha corridor.'
  },
  {
    id: 'site-mercado-amadora',
    kind: 'eatery',
    name: 'Mercado & Esplanada da Amadora',
    badge: '[AMADORA PLAZA]',
    host: 'Dona Carla',
    worldX: -2020,
    worldY: -2330,
    w: 200,
    h: 140,
    doorSide: 'north',
    accentColor: '#2563eb',
    skylineStyle: 'pombaline-grand',
    note: 'Sunlit neighborhood market and coffee terrace linking Reboleira and Amadora Este.'
  },
  {
    id: 'site-memorial-odivelas',
    kind: 'landmark',
    name: 'Memorial de Odivelas (14th-c Monument)',
    badge: '[GOTHIC ARCH]',
    worldX: -320,
    worldY: -2330,
    w: 210,
    h: 140,
    doorSide: 'north',
    accentColor: '#ca8a04',
    skylineStyle: 'monastery-gothic',
    note: '14th-century medieval stone monument and historic square beside Metro Odivelas.'
  },
  {
    id: 'site-museu-teatro-lumiar',
    kind: 'landmark',
    name: 'Museu Nacional do Teatro e da Danca (Lumiar)',
    badge: '[MONTEIRO-MOR]',
    worldX: 1120,
    worldY: -2330,
    w: 220,
    h: 140,
    doorSide: 'north',
    accentColor: '#ca8a04',
    skylineStyle: 'historic-manor',
    note: '18th-century Palacio do Monteiro-Mor preserving Portuguese theatre, opera, and botanical gardens in Lumiar.'
  },
  // =========================================================================
  // ICONIC REQUESTED LANDMARKS & COMPLETE 50-STATION CORRIDOR COVERAGE
  // =========================================================================
  {
    id: 'site-ist-alameda',
    kind: 'landmark',
    name: 'Instituto Superior Tecnico (Alameda Campus)',
    badge: '[IST 1911 CAMPUS]',
    worldX: 1840,
    worldY: -290,
    w: 230,
    h: 140,
    doorSide: 'north',
    accentColor: '#2563eb',
    skylineStyle: 'ist-alameda-campus',
    note: 'Portugal premier engineering and science university designed by Porfirio Pardal Monteiro (1936), overlooking Alameda Dom Afonso Henriques directly across from Metro Alameda.'
  },
  {
    id: 'site-hard-rock-restauradores',
    kind: 'eatery',
    name: 'Hard Rock Cafe Lisboa (Restauradores)',
    badge: '[CINEMA CONDES 1951]',
    host: 'Diogo',
    worldX: 100,
    worldY: -290,
    w: 215,
    h: 140,
    doorSide: 'north',
    accentColor: '#dc2626',
    skylineStyle: 'teatro-tivoli',
    note: 'Iconic Hard Rock Cafe housed inside the 1951 Art Deco Cinema Condes landmark directly opposite Metro Restauradores and Avenida da Liberdade.',
    items: [
      { id: 'item-hrc-burger-plate', name: 'Legendary Lisboa Burger & Fries', kind: 'food', servingType: 'plate', costEur: 13.5, fullnessDelta: 55, energyDelta: 30, description: 'Chargrilled signature burger served on a platter beneath vintage rock guitars at Restauradores.' },
      { id: 'item-hrc-hurricane-glass', name: 'Avenida Citrus Cooler', kind: 'food', servingType: 'glass', glassStyle: 'limonada', costEur: 5.5, fullnessDelta: 12, energyDelta: 24, description: 'Tall chilled citrus mocktail served at the Hard Rock Cafe Restauradores bar.' }
    ]
  },
  {
    id: 'site-timeout-mercado-ribeira',
    kind: 'eatery',
    name: 'Mercado da Ribeira / Time Out Market (1882)',
    badge: '[1882 MARKET HALL]',
    host: 'Chef Rui',
    worldX: -500,
    worldY: 700,
    w: 130,
    h: 140,
    accentColor: '#16a34a',
    skylineStyle: 'historic-manor',
    note: 'Historic 1882 iron-and-dome market hall right beside Metro Cais do Sodre housing Lisbon top culinary stalls and fresh Atlantic fishmongers.',
    items: [
      { id: 'item-ribeira-croquete-plate', name: 'Croquetes de Vitela & Arroz de Pato', kind: 'food', servingType: 'plate', costEur: 9.5, fullnessDelta: 46, energyDelta: 26, description: 'Classic Lisbon duck rice and crisp veal croquettes from Mercado da Ribeira.' },
      { id: 'item-ribeira-sangria-glass', name: 'Sangria de Frutos Vermelhos', kind: 'food', servingType: 'glass', glassStyle: 'wine-red', costEur: 4.5, fullnessDelta: 10, energyDelta: 20, description: 'Chilled berry sangria served at the Cais do Sodre market hall.' }
    ]
  },
  {
    id: 'site-arco-rua-augusta',
    kind: 'landmark',
    name: 'Arco da Rua Augusta & Praca do Comercio (1775)',
    badge: '[POMBALINE ARCH]',
    worldX: 1200,
    worldY: 700,
    w: 125,
    h: 140,
    accentColor: '#ca8a04',
    skylineStyle: 'obelisco-restauradores',
    note: 'Triumphal 18th-century Pombaline limestone arch and royal riverfront arcade linking Metro Terreiro do Paco and Baixa.'
  },
  {
    id: 'site-estacao-santa-apolonia-fado',
    kind: 'landmark',
    name: 'Estacao de Santa Apolonia (1865) & Museu do Fado',
    badge: '[1865 RAIL & FADO]',
    worldX: 2300,
    worldY: 700,
    w: 230,
    h: 140,
    accentColor: '#2563eb',
    skylineStyle: 'pombaline-grand',
    note: 'Lisbon oldest neoclassical railway terminus (1865) and the nearby Museu do Fado celebrating Alfama musical heritage beside Metro Santa Apolonia.'
  },
  {
    id: 'site-parque-brandoa-alfornelos',
    kind: 'landmark',
    name: 'Parque Urbano & Praca de Alfornelos',
    badge: '[ALFORNELOS PLAZA]',
    worldX: -1720,
    worldY: -2330,
    w: 195,
    h: 140,
    doorSide: 'north',
    accentColor: '#2563eb',
    skylineStyle: 'park-pavilion',
    note: 'Tree-shaded civic plaza and pedestrian gardens linking Metro Amadora Este and Metro Alfornelos.'
  },
  {
    id: 'site-centro-cultural-alfornelos',
    kind: 'landmark',
    name: 'Centro Cultural & Biblioteca de Alfornelos',
    badge: '[AMADORA CULTURE]',
    worldX: -1775,
    worldY: -2664,
    w: 140,
    h: 140,
    accentColor: '#2563eb',
    skylineStyle: 'pombaline-grand',
    note: 'Neighborhood cultural center, library, and pastelarias connecting Metro Amadora Este and Metro Alfornelos.'
  },
  {
    id: 'site-mercado-pontinha',
    kind: 'eatery',
    name: 'Mercado & Jardim da Pontinha',
    badge: '[PONTINHA MARKET]',
    host: 'Senhora Rosa',
    worldX: -1360,
    worldY: -2330,
    w: 215,
    h: 140,
    doorSide: 'north',
    accentColor: '#2563eb',
    skylineStyle: 'pombaline-grand',
    note: 'Lively neighborhood market square and cafe terrace directly across from Metro Pontinha.'
  },
  {
    id: 'site-fonte-senhor-roubado',
    kind: 'landmark',
    name: 'Padrao & Azulejos do Senhor Roubado (1744)',
    badge: '[1744 MONUMENT]',
    worldX: 120,
    worldY: -2330,
    w: 210,
    h: 140,
    doorSide: 'north',
    accentColor: '#ca8a04',
    skylineStyle: 'viuva-lamego',
    note: '18th-century tiled roadside sanctuary and historic landmark giving Metro Senhor Roubado its name.'
  },
  {
    id: 'site-forte-ameixoeira',
    kind: 'landmark',
    name: 'Forte da Ameixoeira & Parque Oeste',
    badge: '[1885 FORTRESS]',
    worldX: 560,
    worldY: -2330,
    w: 220,
    h: 140,
    doorSide: 'north',
    accentColor: '#ca8a04',
    skylineStyle: 'historic-manor',
    note: '19th-century hilltop fortification and green Alta de Lisboa parklands right beside Metro Ameixoeira.'
  },
  {
    id: 'site-biblioteca-quinta-conchas',
    kind: 'landmark',
    name: 'Jardim & Biblioteca Quinta das Conchas Sul',
    badge: '[LUMIAR GARDENS]',
    worldX: 1420,
    worldY: -2330,
    w: 220,
    h: 140,
    doorSide: 'north',
    accentColor: '#15803d',
    skylineStyle: 'park-pavilion',
    note: 'Quiet reading pavilion and shaded eucalyptus groves right outside Metro Quinta das Conchas.'
  },
  {
    id: 'site-convento-telheiras',
    kind: 'landmark',
    name: 'Convento da Porta do Ceu & Largo de Telheiras',
    badge: '[17TH-C CONVENT]',
    worldX: -440,
    worldY: -1650,
    w: 220,
    h: 140,
    doorSide: 'north',
    accentColor: '#16a34a',
    skylineStyle: 'monastery-gothic',
    note: '17th-century Franciscan convent and lively cafe-lined pedestrian square beside Metro Telheiras.'
  },
  {
    id: 'site-biblioteca-nacional-torre-tombo',
    kind: 'landmark',
    name: 'Biblioteca Nacional & Arquivo da Torre do Tombo',
    badge: '[NATIONAL ARCHIVE]',
    worldX: 140,
    worldY: -1650,
    w: 230,
    h: 140,
    doorSide: 'north',
    accentColor: '#ca8a04',
    skylineStyle: 'pombaline-grand',
    note: 'Portugal National Library and the monumental Torre do Tombo royal archive beside Metro Cidade Universitaria.'
  },
  {
    id: 'site-pavilhao-fidelidade-luz',
    kind: 'landmark',
    name: 'Museu Benfica Cosme Damiao & Pavilhao da Luz',
    badge: '[SPORTS MUSEUM]',
    worldX: -1640,
    worldY: -1984,
    w: 120,
    h: 140,
    accentColor: '#dc2626',
    skylineStyle: 'estadio-luz',
    note: 'Award-winning Benfica football heritage museum and arena immediately beside Metro Colegio Militar/Luz.'
  },
  {
    id: 'site-parque-silva-porto-benfica',
    kind: 'landmark',
    name: 'Parque Silva Porto (Mata de Benfica)',
    badge: '[WOODLAND PARK]',
    worldX: -2190,
    worldY: -970,
    w: 215,
    h: 140,
    doorSide: 'north',
    accentColor: '#15803d',
    skylineStyle: 'park-pavilion',
    note: 'Historic pine forest park with wooden chalets and shaded paths across from Metro Alto dos Moinhos.'
  },
  {
    id: 'site-igreja-fatima-berna',
    kind: 'landmark',
    name: 'Igreja de Nossa Senhora de Fatima (1938)',
    badge: '[MODERNIST CHURCH]',
    worldX: 2630,
    worldY: -970,
    w: 220,
    h: 140,
    doorSide: 'north',
    accentColor: '#ca8a04',
    skylineStyle: 'monastery-gothic',
    note: 'Pioneering 1938 modernist church by Pardal Monteiro with Almada Negreiros stained glass beside Metro Campo Pequeno and Entre Campos.'
  },
  {
    id: 'site-miradouro-bela-vista',
    kind: 'landmark',
    name: 'Palco Mundo & Miradouro da Bela Vista',
    badge: '[FESTIVAL LAWN]',
    worldX: 3020,
    worldY: -970,
    w: 220,
    h: 140,
    doorSide: 'north',
    accentColor: '#dc2626',
    skylineStyle: 'park-pavilion',
    note: 'Sweeping amphitheatre ridge in Parque da Bela Vista overlooking eastern Lisbon directly across from Metro Bela Vista.'
  },
  {
    id: 'site-pavilhao-olaias-cabo-ruivo',
    kind: 'landmark',
    name: 'Clube das Olaias & Jardim do Cabo Ruivo',
    badge: '[EASTERN TERRACE]',
    worldX: 2680,
    worldY: -290,
    w: 220,
    h: 140,
    doorSide: 'north',
    accentColor: '#dc2626',
    skylineStyle: 'pombaline-grand',
    note: 'Modernist terraced overlook and palm avenue connecting Metro Olaias and Metro Cabo Ruivo.'
  },
  {
    id: 'site-jardim-agua-cabo-ruivo',
    kind: 'landmark',
    name: 'Jardim da Agua & Passeio de Cabo Ruivo',
    badge: '[EXPO 98 WATER]',
    worldX: 3175,
    worldY: -290,
    w: 125,
    h: 140,
    doorSide: 'north',
    accentColor: '#0284c7',
    skylineStyle: 'park-pavilion',
    note: 'Interactive water-sculpture promenade linking Metro Cabo Ruivo to Gare do Oriente.'
  },
  {
    id: 'site-praca-martim-moniz',
    kind: 'eatery',
    name: 'Praca Martim Moniz & Mouraria Kiosks',
    badge: '[TRAM 28E TERMINUS]',
    host: 'Tiago',
    worldX: 2350,
    worldY: 370,
    w: 215,
    h: 140,
    doorSide: 'north',
    accentColor: '#16a34a',
    skylineStyle: 'pombaline-grand',
    note: 'Bustling cosmopolitan plaza at the foot of Castelo de Sao Jorge and Mouraria right across from Metro Martim Moniz.'
  },
  {
    id: 'site-casa-independente-intendente',
    kind: 'eatery',
    name: 'Largo do Intendente & Casa Independente',
    badge: '[HISTORIC MANSION]',
    host: 'Sofia',
    worldX: 2600,
    worldY: 370,
    w: 220,
    h: 140,
    doorSide: 'north',
    accentColor: '#16a34a',
    skylineStyle: 'historic-manor',
    note: 'Restored 19th-century tiled cultural house and open-air esplanada facing Metro Intendente.'
  },
  {
    id: 'site-cervejaria-ramiro-anjos',
    kind: 'eatery',
    name: 'Cervejaria Ramiro (1956) & Igreja dos Anjos',
    badge: '[ICONIC MARISQUEIRA]',
    host: 'Mestre Ramiro',
    worldX: 2745,
    worldY: 54,
    w: 165,
    h: 140,
    accentColor: '#16a34a',
    skylineStyle: 'pombaline-grand',
    note: 'Lisbon legendary 1956 seafood temple on Avenida Almirante Reis between Metro Intendente and Metro Anjos.',
    items: [
      { id: 'item-ramiro-gambas-plate', name: 'Gambas ao Alho & Prego no Pao', kind: 'food', servingType: 'plate', costEur: 14.0, fullnessDelta: 52, energyDelta: 30, description: 'Sizzling garlic prawns followed by the classic Ramiro steak prego.' },
      { id: 'item-ramiro-imperial-glass', name: 'Imperial Bem Tirada (Chilled Draft)', kind: 'food', servingType: 'glass', glassStyle: 'imperial', costEur: 2.8, fullnessDelta: 8, energyDelta: 20, description: 'Frosty Lisbon draft served at the marble counter on Avenida Almirante Reis.' }
    ]
  },
  {
    id: 'site-praca-chile-arroios',
    kind: 'landmark',
    name: 'Praca do Chile & Monumento a Fernao de Magalhaes',
    badge: '[ARROIOS PLAZA]',
    worldX: 3180,
    worldY: 370,
    w: 120,
    h: 140,
    doorSide: 'north',
    accentColor: '#16a34a',
    skylineStyle: 'obelisco-restauradores',
    note: 'Monumental Avenida Almirante Reis roundabout and bronze navigator statue directly across from Metro Arroios.'
  }
];

function buildEnterableLandmarkVenue(spot) {
  const style = spot.skylineStyle || 'pombaline-grand';
  const isAirport = style === 'aeroporto-terminal' || String(spot.id).startsWith('aeroporto-');
  const isStadium = style === 'estadio-luz' || style === 'estadio-alvalade';
  const isTower = style === 'torre-vasco-da-gama' || style === 'belem-tower' || style === 'obelisco-restauradores';
  const isGothic = style === 'monastery-gothic';
  const layout =
    spot.kind === 'eatery'
      ? 'cafe'
      : spot.kind === 'shop'
        ? 'shop'
        : isAirport
          ? 'airport'
          : isStadium
            ? 'stadium'
            : isTower
              ? 'tower'
              : isGothic
                ? 'cathedral'
                : 'museum';

  const interiorTheme = isAirport
    ? { floorPrimary: '#dce4ee', floorSecondary: '#cfd9e6', wall: '#eef3f8', trim: '#b91c1c', counter: '#1e293b', layout: 'airport' }
    : isStadium
      ? {
          floorPrimary: '#e2e8f0',
          floorSecondary: '#cbd5e1',
          wall: style === 'estadio-luz' ? '#fef2f2' : '#f0fdf4',
          trim: style === 'estadio-luz' ? '#dc2626' : '#15803d',
          counter: '#1e293b',
          layout: 'stadium',
          clubColor: style === 'estadio-luz' ? '#dc2626' : '#16a34a'
        }
      : isTower
        ? { floorPrimary: '#e6dfd2', floorSecondary: '#d8cfc0', wall: '#f4efe4', trim: spot.accentColor || '#0284c7', counter: '#334155', layout: 'tower' }
        : isGothic
          ? { floorPrimary: '#d5cdc0', floorSecondary: '#c7beae', wall: '#e8e2d5', trim: '#78716c', counter: '#57534e', layout: 'cathedral' }
          : { floorPrimary: '#e8e0d2', floorSecondary: '#dcd2c0', wall: '#f6f1e7', trim: spot.accentColor || '#1b4d89', counter: '#5c3a21', layout };

  const defaultItems =
    spot.items && spot.items.length > 0
      ? spot.items
      : isAirport
        ? [
            {
              id: `item-${spot.id}-boarding-espresso`,
              name: 'Terminal 1 Gate Espresso & Pastel',
              kind: 'food',
              servingType: 'plate',
              costEur: 3.5,
              fullnessDelta: 22,
              energyDelta: 28,
              description: 'Freshly brewed Portuguese bica and warm custard tart while watching flights depart Runway 03/21.'
            },
            {
              id: `item-${spot.id}-lis-luggage-tag`,
              name: 'Aeroporto LIS Aviation Tag',
              kind: 'souvenir',
              costEur: 7.0,
              fullnessDelta: 0,
              energyDelta: 8,
              description: 'Embroidered red-and-white LIS Humberto Delgado boarding tag keepsake.'
            }
          ]
        : [
            {
              id: `item-${spot.id}-guidebook`,
              name: `${spot.name.split('(')[0].trim()} Visitor Guide`,
              kind: 'souvenir',
              costEur: 4.0,
              fullnessDelta: 0,
              energyDelta: 12,
              description: `Illustrated Lisbon architectural booklet for ${spot.name}.`
            },
            {
              id: `item-${spot.id}-refreshment`,
              name: 'Lisboa Citrus & Mint Refreshment',
              kind: 'food',
              servingType: 'glass',
              glassStyle: 'limonada',
              costEur: 2.5,
              fullnessDelta: 15,
              energyDelta: 25,
              description: 'Chilled Portuguese lemon-mint refreshment served inside the visitor gallery.'
            }
          ];

  const wx = Number.isFinite(spot.worldX) ? spot.worldX : 0;
  const wy = Number.isFinite(spot.worldY) ? spot.worldY : 0;
  const w = spot.w || 180;
  const h = spot.h || 140;
  const doorSide = spot.doorSide === 'north' ? 'north' : 'south';
  const doorX = Number.isFinite(spot.doorX) ? spot.doorX : wx + w * 0.5;
  const doorY = Number.isFinite(spot.doorY) ? spot.doorY : (doorSide === 'north' ? wy : wy + h);
  const spawnOutside = spot.spawnOutside || { x: doorX, y: doorSide === 'north' ? wy - 26 : wy + h + 30 };

  return {
    id: spot.id,
    name: spot.name,
    shortName: spot.name.split('(')[0].trim(),
    category: spot.kind === 'eatery' ? 'cafe' : spot.kind === 'shop' ? 'shop' : 'landmark',
    neighborhood: spot.districtName || 'Lisboa',
    isLandmarkInterior: true,
    isPrivateResidence: false,
    skylineStyle: style,
    badge: spot.badge || '[LANDMARK]',
    x: wx,
    y: wy,
    w,
    h,
    doorSide,
    doorX,
    doorY,
    spawnOutside,
    proprietor: spot.host || (isAirport ? 'Terminal Coordinator Sofia' : 'Curator Henrique'),
    proprietorRole: isAirport ? 'Airport Host' : isStadium ? 'Stadium Guide' : spot.kind === 'eatery' ? 'Host' : spot.kind === 'shop' ? 'Shopkeeper' : 'Landmark Curator',
    greeting: spot.note || `Welcome inside ${spot.name}.`,
    description: spot.note || `Historic and civic Lisbon landmark: ${spot.name}.`,
    interiorTheme,
    items: defaultItems,
    phrase: {
      pt: `Bem-vindo a ${spot.name.split('(')[0].trim()} em Lisboa!`,
      pronunciation: 'Beym-veen-doo ah Lees-boh-ah!',
      en: `Welcome inside ${spot.name.split('(')[0].trim()} in Lisbon!`
    },
    memory: {
      id: `mem-landmark-${spot.id}`,
      title: `Inside ${spot.name.split('(')[0].trim()}`,
      category: 'landmark',
      neighborhood: spot.districtName || 'Lisboa',
      caption: spot.note || `Explored the interior of ${spot.name}.`
    }
  };
}

export const ENTERABLE_LANDMARK_VENUES = [
  ...CITY_DISTRICT_SPOTS.filter((s) => s.id !== 'rossio-santa-justa-lift'),
  ...LISBOA_CORRIDOR_LANDMARKS
].map(buildEnterableLandmarkVenue);

