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
    worldX: 1960,
    worldY: -1984,
    w: 210,
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
    worldX: 2390,
    worldY: -1984,
    w: 190,
    h: 140,
    accentColor: '#16a34a',
    skylineStyle: 'pombaline-grand',
    note: 'Classic 1950s modernist residential arcades, pastry shops, and cinema marquee between Roma and Areeiro.'
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
  const doorX = Number.isFinite(spot.doorX) ? spot.doorX : wx + w * 0.5;
  const doorY = Number.isFinite(spot.doorY) ? spot.doorY : wy + h;
  const spawnOutside = spot.spawnOutside || { x: doorX, y: doorY + 30 };

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
    doorSide: 'south',
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

