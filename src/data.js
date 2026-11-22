export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1200;

export const INTERIOR_WIDTH = 760;
export const INTERIOR_HEIGHT = 460;

export const NEIGHBORHOODS = [
  {
    id: 'bairro-alto',
    name: 'Bairro Alto',
    minX: 0,
    maxX: 840,
    accent: '#b84a32',
    groundTint: '#e9dfd1',
    subtitle: 'Bohemian hillside lanes, fado taverns, and terraced viewpoints (served by Tram 28E, buses, and footwalks).'
  },
  {
    id: 'chiado',
    name: 'Chiado',
    minX: 840,
    maxX: 1660,
    accent: '#1b4d89',
    groundTint: '#ece6db',
    subtitle: 'Pombaline plazas, Cafe A Brasileira, Livraria Bertrand, and Baixa-Chiado Metro.'
  },
  {
    id: 'alfama',
    name: 'Alfama',
    minX: 1660,
    maxX: 2400,
    accent: '#0f766e',
    groundTint: '#e6e0d4',
    subtitle: 'Azulejo alleys, Se de Lisboa, Portas do Sol, and waterfront Metro access at Santa Apolonia.'
  }
];

export const WATERFRONT_Y = 1030;

/**
 * Authentic Lisbon Seven-Hills topographic elevation (world Z units; 1 unit ~ 0.65m elevation):
 * - Tagus Waterfront Promenade (y >= 972): sea level (0)
 * - Chiado / Baixa basin (x: 920..1620): gentle terrace rising northward (0..22)
 * - Bairro Alto ("Upper Quarter", x <= 840): steep high hilltop plateau climbing up to ~86 units (~56m)
 * - Alfama eastern hillside (x >= 1660): rises eastward toward Portas do Sol & Castelo ridge (~52 units)
 */
export function getTerrainElevation(wx, wy) {
  if (wy >= WATERFRONT_Y - 36) return 0;
  const clampedY = Math.max(36, Math.min(WATERFRONT_Y - 36, wy));
  const northT = (WATERFRONT_Y - 36 - clampedY) / (WATERFRONT_Y - 36 - 36); // Continuous 0 at waterfront -> 1 at top ridge
  const wfRamp = Math.max(0, Math.min(1, (WATERFRONT_Y - 42 - clampedY) / 220));
  const wfSmooth = wfRamp * wfRamp * (3 - 2 * wfRamp);

  // Bairro Alto continuous hillside rise westward from Chiado all the way to the western ridge
  const baT = Math.max(0, Math.min(1, (980 - wx) / 760));
  const baSmooth = baT * (1.55 - 0.55 * baT);

  // Alfama continuous hillside rise eastward toward Portas do Sol & Castelo ridge
  const alfT = Math.max(0, Math.min(1, (wx - 1580) / 680));
  const alfSmooth = alfT * (1.45 - 0.45 * alfT);

  const chiadoBaseRise = northT * 22;
  const bairroAltoLift = baSmooth * wfSmooth * (18 + northT * 68);
  const alfamaLift = alfSmooth * wfSmooth * (12 + northT * 36);
  return chiadoBaseRise + bairroAltoLift + alfamaLift;
}

export function getTerrainSlope(wx, wy) {
  const eps = 6;
  const dzdx = (getTerrainElevation(wx + eps, wy) - getTerrainElevation(wx - eps, wy)) / (2 * eps);
  const dzdy = (getTerrainElevation(wx, wy + eps) - getTerrainElevation(wx, wy - eps)) / (2 * eps);
  return { dzdx, dzdy };
}

export const STREETS = [
  // Horizontal avenues
  { id: 'ave-north', x: 110, y: 230, w: 2180, h: 110, style: 'bus-road', name: 'Rua de Sao Pedro / Rua Garrett / Santa Luzia' },
  { id: 'ave-tram', x: 110, y: 555, w: 2180, h: 110, style: 'tram-avenue', name: 'Rua do Loreto / Largo do Chiado / Calcada da Se' },
  { id: 'ave-south', x: 110, y: 875, w: 2180, h: 115, style: 'bus-road', name: 'Avenida Ribeira / Cais de Alfama' },
  // Vertical connecting streets
  { id: 'st-west-edge', x: 110, y: 230, w: 105, h: 760, style: 'bus-road', name: 'Rua da Misericordia Oeste' },
  { id: 'st-bairro-mid', x: 465, y: 120, w: 95, h: 870, style: 'cobble', name: 'Rua da Rosa' },
  { id: 'st-camoes', x: 865, y: 230, w: 170, h: 760, style: 'plaza', name: 'Praca Luis de Camoes' },
  { id: 'st-carmo', x: 1334, y: 230, w: 98, h: 760, style: 'cobble', name: 'Rua do Carmo' },
  { id: 'st-se', x: 1675, y: 230, w: 110, h: 760, style: 'cobble', name: 'Escadinhas da Se' },
  { id: 'st-east-edge', x: 2145, y: 230, w: 145, h: 760, style: 'bus-road', name: 'Largo das Portas do Sol' }
];

export const CROSSWALKS = [
  // Crosswalks across North Bus Road (y: 252..318)
  { x: 488, y: 250, w: 48, h: 70, orientation: 'vertical' },
  { x: 882, y: 250, w: 54, h: 70, orientation: 'vertical' },
  { x: 1358, y: 250, w: 50, h: 70, orientation: 'vertical' },
  { x: 1702, y: 250, w: 50, h: 70, orientation: 'vertical' },
  // Crosswalks across Tram 28E Corridor (y: 576..644)
  { x: 488, y: 575, w: 48, h: 70, orientation: 'vertical' },
  { x: 882, y: 575, w: 54, h: 70, orientation: 'vertical' },
  { x: 1358, y: 575, w: 50, h: 70, orientation: 'vertical' },
  { x: 1702, y: 575, w: 50, h: 70, orientation: 'vertical' },
  // Crosswalks across South Bus Road (y: 896..966)
  { x: 488, y: 896, w: 48, h: 70, orientation: 'vertical' },
  { x: 882, y: 896, w: 54, h: 70, orientation: 'vertical' },
  { x: 1358, y: 896, w: 50, h: 70, orientation: 'vertical' },
  { x: 1702, y: 896, w: 50, h: 70, orientation: 'vertical' }
];

export const DECORATIVE_STRUCTURES = [
  {
    id: 'monument-camoes',
    neighborhood: 'chiado',
    label: 'Estatua de Luis de Camoes',
    shortLabel: 'LUIS DE CAMOES (1867)',
    x: 924,
    y: 410,
    w: 52,
    h: 52,
    wallColor: '#c5bca9',
    roofColor: '#68736b',
    trimColor: '#4c544e',
    style: 'monument',
    monumentType: 'statue',
    statueStyle: 'camoes',
    sculptor: 'Victor Bastos (1867)',
    note: 'Monumental 4-meter bronze statue of Portugal epic poet Luis Vaz de Camoes holding Os Lusiadas atop an octagonal Lioz limestone pedestal surrounded by eight historical scholars in Praca Luis de Camoes.'
  },
  {
    id: 'statue-poeta-chiado',
    neighborhood: 'chiado',
    label: 'Estatua do Poeta Chiado (Antonio Ribeiro)',
    shortLabel: 'O POETA CHIADO (1925)',
    x: 1361,
    y: 742,
    w: 44,
    h: 44,
    wallColor: '#cfc6b4',
    roofColor: '#4d6b5d',
    trimColor: '#374f45',
    style: 'monument',
    monumentType: 'statue',
    statueStyle: 'poeta-chiado',
    sculptor: 'Costa Mota (1925)',
    note: 'Expressive 1925 bronze statue of the 16th-century satirical poet Antonio Ribeiro ("O Chiado"), poised atop a carved Lioz limestone column with his theatrical cape and verse scroll at Largo do Chiado.'
  },
  {
    id: 'fountain-chafariz-carmo',
    neighborhood: 'chiado',
    label: 'Chafariz do Carmo (1771 Water Fountain)',
    shortLabel: 'CHAFARIZ DO CARMO (1771)',
    x: 1360,
    y: 382,
    w: 46,
    h: 46,
    wallColor: '#e5ddd0',
    roofColor: '#0284c7',
    trimColor: '#64748b',
    style: 'monument',
    monumentType: 'fountain',
    fountainStyle: 'carmo-baroque',
    sculptor: 'Aguas Livres Aqueduct (1771)',
    note: 'Historic 1771 Baroque Lioz limestone water fountain in Largo do Carmo fed by the underground Galeria do Loreto aqueduct, featuring an octagonal basin and four sculpted dolphin spouts.'
  },
  {
    id: 'fountain-chafariz-el-rei',
    neighborhood: 'alfama',
    label: 'Chafariz d\'El-Rei (1282 Alfama Water Fountain)',
    shortLabel: 'CHAFARIZ D\'EL-REI (1282)',
    x: 1706,
    y: 742,
    w: 48,
    h: 48,
    wallColor: '#e7dfd1',
    roofColor: '#0369a1',
    trimColor: '#1d4ed8',
    style: 'monument',
    monumentType: 'fountain',
    fountainStyle: 'alfama-medieval',
    sculptor: 'Dom Dinis Era (1282)',
    note: 'Lisbon oldest public water fountain at the base of Alfama along Cais de Santarem, channeling natural hillside spring water through bronze mascaron spouts beneath a crenellated marble parapet.'
  }
];

export const FADO_TRACKS = [
  {
    id: 'fado-sentimental-1922',
    title: 'Fado Sentimental (1922)',
    performer: 'Eugenio Cibelli & Salgado do Carmo',
    year: 1922,
    source: 'Public Domain (Library of Congress National Jukebox)',
    src: './assets/audio/fado-sentimental-1922.mp3'
  },
  {
    id: 'fado-1919',
    title: 'Fado (1919)',
    performer: 'Jose Coelho da Cunha',
    year: 1919,
    source: 'Public Domain (Library of Congress National Jukebox)',
    src: './assets/audio/fado-1919.mp3'
  },
  {
    id: 'fado-hilario-1916',
    title: 'Fado do Hilario (1916)',
    performer: 'Manuel Carvalho',
    year: 1916,
    source: 'Public Domain (Library of Congress National Jukebox)',
    src: './assets/audio/fado-hilario-1916.mp3'
  }
];

export const FERRY_TERMINAL = {
  id: 'cais-do-sodre',
  name: 'Cais do Sodre Ferry Terminal',
  shortName: 'Cais do Sodre',
  operator: 'Transtejo',
  badge: '[FERRY PORT]',
  neighborhood: 'bairro-alto',
  x: 620,
  y: 1008,
  w: 190,
  h: 66,
  doorSide: 'north',
  doorX: 715,
  doorY: 1008,
  spawnOutside: { x: 715, y: 988 },
  note: 'Lisbon historic Transtejo riverfront terminal on the Tagus embankment, connecting Cais do Sodre across the river to Cacilhas, Seixal, and Montijo.',
  phrase: {
    pt: 'Qual e o proximo barco da Transtejo a partir do Cais do Sodre?',
    pronunciation: 'Kwahl eh oo proh-see-moo bahr-koo dah Trahnsh-teh-zhoo ah pahr-teer doo Kah-eesh doo Soh-dreh?',
    en: 'Which is the next Transtejo ferry departing from Cais do Sodre?'
  }
};

export const FERRY_DESTINATIONS = [
  {
    id: 'cacilhas',
    name: 'Cacilhas (Almada)',
    shortName: 'Cacilhas',
    fareEur: 1.55,
    travelMinutes: 10,
    sailDurationSec: 4.2,
    skylineStyle: 'cacilhas',
    accentColor: '#c84b31',
    description: 'Cross the Tagus straight to Almada waterfront, Farol de Cacilhas lighthouse, and panoramic views beneath Cristo Rei and Ponte 25 de Abril.',
    pierNote: 'Explore Rua Candido dos Reis along the Cacilhas quay: dine on fresh Tagus seafood, stroll to the 1886 red lighthouse beneath Cristo Rei, or browse riverfront postcards.',
    phrase: {
      pt: 'Um bilhete de barco para Cacilhas, ida e volta, por favor.',
      pronunciation: 'Oom bee-lyeh-teh deh bahr-koo pah-rah Kah-see-lyash, ee-dah ee vohl-tah, poor fah-vohr.',
      en: 'One round-trip ferry ticket to Cacilhas, please.'
    },
    memory: {
      id: 'mem-ferry-cacilhas',
      title: 'Tagus Crossing to Cacilhas',
      category: 'transit',
      neighborhood: 'Cais do Sodre & Cacilhas',
      caption: 'Salt spray from the Transtejo catamaran as Lisbon terracotta hills and Ponte 25 de Abril framed the south bank.'
    },
    townSpots: [
      {
        id: 'cacilhas-marisqueira',
        kind: 'eatery',
        name: 'Marisqueira Cais do Tejo',
        badge: '[SEAFOOD]',
        host: 'Dona Amelia',
        x: 155,
        y: 192,
        note: 'Red-tablecloth riverside marisqueira looking back across the Tagus toward Praca do Comercio.',
        items: [
          {
            id: 'item-arroz-marisco',
            name: 'Arroz de Marisco',
            kind: 'food',
            costEur: 14.5,
            fullnessDelta: 62,
            energyDelta: 35,
            description: 'Fragrant saffron seafood rice brimming with clams, prawns, and coriander.'
          },
          {
            id: 'item-ameijoas',
            name: 'Ameijoas a Bulhao Pato',
            kind: 'food',
            costEur: 11.0,
            fullnessDelta: 46,
            energyDelta: 28,
            description: 'Tagus clams steamed in garlic, olive oil, white wine, and fresh cilantro.'
          }
        ]
      },
      {
        id: 'cacilhas-farol',
        kind: 'landmark',
        name: 'Farol de Cacilhas & Cristo Rei View',
        badge: '[LANDMARK]',
        host: 'Harbor Keeper',
        x: 380,
        y: 192,
        note: 'The iconic 1886 red cast-iron lighthouse beside Fragata D. Fernando II, framing Ponte 25 de Abril and Lisbon seven hills. Free sea-breeze rest (+25 Energy).'
      },
      {
        id: 'cacilhas-quiosque',
        kind: 'shop',
        name: 'Quiosque Miradouro de Almada',
        badge: '[KIOSK]',
        host: 'Vasco',
        x: 605,
        y: 192,
        note: 'Sunlit riverfront pavilion selling south-bank art prints and almond treats.',
        items: [
          {
            id: 'item-cristo-rei-print',
            name: 'Ponte 25 de Abril Watercolor',
            kind: 'souvenir',
            costEur: 9.0,
            fullnessDelta: 0,
            energyDelta: 5,
            description: 'Hand-printed sunset panorama of the suspension bridge from Cacilhas.'
          },
          {
            id: 'item-cacilhas-amendoa',
            name: 'Amendoas Torradas & Sumo',
            kind: 'food',
            costEur: 4.0,
            fullnessDelta: 24,
            energyDelta: 22,
            description: 'Warm cinnamon-roasted almonds with fresh Portuguese orange juice.'
          }
        ]
      }
    ]
  },
  {
    id: 'seixal',
    name: 'Seixal Bay',
    shortName: 'Seixal',
    fareEur: 2.65,
    travelMinutes: 20,
    sailDurationSec: 4.8,
    skylineStyle: 'seixal',
    accentColor: '#0f766e',
    description: 'Sail across the wide Tagus into tranquil Baia do Seixal past historic tide mills, traditional painted river fragatas, and waterfront promenade.',
    pierNote: 'Stroll the Frente Ribeirinha of Baia do Seixal: taste crispy Setubal-style choco frito, visit the centuries-old tide mill, and explore the traditional wooden boatyard.',
    phrase: {
      pt: 'A travessia de barco para o Seixal tem uma vista linda!',
      pronunciation: 'Ah trah-veh-see-ah deh bahr-koo pah-rah oo Say-shahl teym oo-mah veesh-tah leen-dah!',
      en: 'The ferry crossing to Seixal has a beautiful view!'
    },
    memory: {
      id: 'mem-ferry-seixal',
      title: 'Calm Waters of Baia do Seixal',
      category: 'transit',
      neighborhood: 'Cais do Sodre & Seixal',
      caption: 'Gliding into Seixal bay past wooden fragata sails and shimmering tide-mill waters across the Tagus.'
    },
    townSpots: [
      {
        id: 'seixal-taberna',
        kind: 'eatery',
        name: 'Taberna da Baia do Seixal',
        badge: '[TAVERN]',
        host: 'Senhor Joaquim',
        x: 155,
        y: 192,
        note: 'Whitewashed bayfront tavern known across the south bank for golden fried cuttlefish and fisherman stew.',
        items: [
          {
            id: 'item-choco-frito',
            name: 'Choco Frito a Setubalense',
            kind: 'food',
            costEur: 11.5,
            fullnessDelta: 54,
            energyDelta: 30,
            description: 'Crisp golden fried strips of tender cuttlefish served with fresh lemon and hand-cut fries.'
          },
          {
            id: 'item-caldeirada',
            name: 'Caldeirada de Peixe da Baia',
            kind: 'food',
            costEur: 13.0,
            fullnessDelta: 60,
            energyDelta: 34,
            description: 'Slow-simmered coastal fisherman stew with potatoes, peppers, and bay herbs.'
          }
        ]
      },
      {
        id: 'seixal-moinho',
        kind: 'landmark',
        name: 'Moinho de Mare & Fragata Dock',
        badge: '[TIDE MILL]',
        host: 'Mill Docent',
        x: 380,
        y: 192,
        note: 'Restored 15th-century tidal flour mill powered by Tagus tides beside brightly painted wooden fragata sailboats. Free lakeside rest (+25 Energy).'
      },
      {
        id: 'seixal-estaleiro',
        kind: 'shop',
        name: 'Oficina Naval do Seixal',
        badge: '[BOATYARD]',
        host: 'Mestre Carlos',
        x: 605,
        y: 192,
        note: 'Historic wooden shipwright workshop crafting miniature Tagus sailing boats and coastal salt jars.',
        items: [
          {
            id: 'item-fragata-model',
            name: 'Carved Tagus Fragata Model',
            kind: 'souvenir',
            costEur: 14.0,
            fullnessDelta: 0,
            energyDelta: 6,
            description: 'Hand-painted pinewood replica of a classic Seixal cargo sailboat.'
          },
          {
            id: 'item-flor-de-sal',
            name: 'Estuary Flor de Sal Jar',
            kind: 'souvenir',
            costEur: 6.5,
            fullnessDelta: 0,
            energyDelta: 4,
            description: 'Delicate hand-harvested Portuguese sea salt crystals in a cork-stoppered jar.'
          }
        ]
      }
    ]
  },
  {
    id: 'montijo',
    name: 'Montijo Riverfront',
    shortName: 'Montijo',
    fareEur: 3.0,
    travelMinutes: 25,
    sailDurationSec: 5.2,
    skylineStyle: 'montijo',
    accentColor: '#1d4ed8',
    description: 'Journey across the broad Tagus estuary toward Montijo sunlit marshlands, salt pans, soaring estuary birds, and open Ribatejo skies.',
    pierNote: 'Wander the tranquil Montijo waterfront promenade: enjoy hearty Ribatejo dishes, watch pink flamingos from the windmill boardwalk, and sample Azeitao pastries.',
    phrase: {
      pt: 'A que horas sai o barco de regresso do Montijo para Lisboa?',
      pronunciation: 'Ah keh oh-rash sah-ee oo bahr-koo deh heh-greh-soo doo Mohn-tee-zhoo pah-rah Leesh-boh-ah?',
      en: 'What time does the return ferry from Montijo to Lisbon depart?'
    },
    memory: {
      id: 'mem-ferry-montijo',
      title: 'Estuary Horizon at Montijo',
      category: 'transit',
      neighborhood: 'Cais do Sodre & Montijo',
      caption: 'Open Tagus estuary winds and bright golden light stretching all the way back toward Alfama and Chiado.'
    },
    townSpots: [
      {
        id: 'montijo-tasca',
        kind: 'eatery',
        name: 'Tasca do Ribatejo',
        badge: '[KITCHEN]',
        host: 'Dona Lurdes',
        x: 155,
        y: 192,
        note: 'Cozy Ribatejo waterfront kitchen serving rustic soups, creamy sheep cheese, and honey cakes.',
        items: [
          {
            id: 'item-sopa-pedra',
            name: 'Sopa da Pedra Ribatejana',
            kind: 'food',
            costEur: 8.5,
            fullnessDelta: 52,
            energyDelta: 28,
            description: 'Hearty traditional Ribatejo bean, chourico, and coriander stew with crusty bread.'
          },
          {
            id: 'item-queijo-azeitao',
            name: 'Queijo de Azeitao & Bolo de Mel',
            kind: 'food',
            costEur: 6.0,
            fullnessDelta: 34,
            energyDelta: 24,
            description: 'Soft buttery south-bank sheep cheese paired with warm spiced honey cake.'
          }
        ]
      },
      {
        id: 'montijo-moinho',
        kind: 'landmark',
        name: 'Moinho de Vento & Flamingo Marsh',
        badge: '[ESTUARY]',
        host: 'Estuary Guide',
        x: 380,
        y: 192,
        note: 'Timber observation deck beside a historic Montijo windmill overlooking shimmering salt pans and flocks of pink Tagus flamingos. Free rest (+25 Energy).'
      },
      {
        id: 'montijo-mercearia',
        kind: 'shop',
        name: 'Casa das Tortas & Linho',
        badge: '[SHOP]',
        host: 'Isabel',
        x: 605,
        y: 192,
        note: 'Regional south-bank pastry and textile boutique stocked with lemon-scented Azeitao rolls and woven linen.',
        items: [
          {
            id: 'item-torta-azeitao',
            name: 'Torta de Azeitao Box',
            kind: 'food',
            costEur: 7.5,
            fullnessDelta: 36,
            energyDelta: 26,
            description: 'Rolled egg-yolk sponge pastry infused with fresh lemon zest and cinnamon.'
          },
          {
            id: 'item-ribatejo-scarf',
            name: 'Ribatejo Woven Linen Scarf',
            kind: 'souvenir',
            costEur: 12.0,
            fullnessDelta: 0,
            energyDelta: 5,
            description: 'Lightweight sun-bleached linen scarf woven along the eastern Tagus plains.'
          }
        ]
      }
    ]
  }
];

export const METRO_LINE = {
  id: 'metro-linha-azul',
  name: 'Metropolitano de Lisboa (Linha Azul)',
  badge: '[METRO]',
  fareEur: 1.8,
  travelMinutes: 6,
  phrase: {
    pt: 'Um bilhete de metro para a Linha Azul, por favor.',
    pronunciation: 'Oom bee-lyeh-teh deh meh-troo pah-rah ah Lee-nyah Ah-zool, poor fah-vohr.',
    en: 'One metro ticket for the Blue Line, please.'
  },
  memory: {
    id: 'mem-ride-metro-lisboa',
    title: 'Underground Tiles of Metro de Lisboa',
    category: 'transit',
    neighborhood: 'Chiado & Alfama Waterfront',
    caption: 'Descending the long escalators at Baixa-Chiado beneath Lisbon hills toward the Tagus waterfront.'
  }
};

export const METRO_STATIONS = [
  {
    id: 'metro-baixa-chiado',
    name: 'Metro Baixa-Chiado',
    neighborhood: 'chiado',
    order: 0,
    lines: ['Linha Azul', 'Linha Verde'],
    lineColors: ['#2563eb', '#16a34a'],
    x: 1266,
    y: 446,
    w: 58,
    h: 79,
    doorX: 1295,
    doorY: 525,
    spawnOutside: { x: 1295, y: 546 },
    undergroundTheme: {
      wallPrimary: '#ded8ce',
      tileAccent: '#1b4d89',
      platformFloor: '#d4cec2',
      trim: '#1e3a5f',
      artLabel: 'ALVARO SIZA LIMESTONE VAULT - DEEP ESCALATORS',
      architect: 'Alvaro Siza Vieira (1998)',
      artist: 'Angelo de Sousa',
      muralStyle: 'siza-limestone-gold',
      nextTrainDest: 'Santa Apolonia',
      oppositeDest: 'Reboleira',
      transferLine: 'Linha Verde (Cais do Sodre - Telheiras)'
    },
    note: 'Deep transfer station right beside Cafe A Brasileira on Largo do Chiado, serving both Chiado and nearby hilltop Bairro Alto.'
  },
  {
    id: 'metro-terreiro-paco',
    name: 'Metro Terreiro do Paco',
    neighborhood: 'chiado',
    order: 1,
    lines: ['Linha Azul'],
    lineColors: ['#2563eb'],
    x: 1516,
    y: 842,
    w: 68,
    h: 22,
    doorX: 1550,
    doorY: 864,
    spawnOutside: { x: 1550, y: 880 },
    undergroundTheme: {
      wallPrimary: '#d4e8f5',
      tileAccent: '#14669c',
      platformFloor: '#cfd8df',
      trim: '#0f4c75',
      artLabel: 'TRANSPARENCIA II - TAGUS BLUE GLAZED TILE GALLERY',
      architect: 'Artur Rosa (2007)',
      artist: 'Joao Rodrigues Vieira (Transparencia II)',
      muralStyle: 'transparencia-blue-glass',
      nextTrainDest: 'Santa Apolonia',
      oppositeDest: 'Reboleira'
    },
    note: 'Tagus riverside Blue Line station at the edge of Baixa and lower Alfama.'
  },
  {
    id: 'metro-santa-apolonia',
    name: 'Metro Santa Apolonia',
    neighborhood: 'alfama',
    order: 2,
    lines: ['Linha Azul'],
    lineColors: ['#2563eb'],
    x: 1990,
    y: 842,
    w: 68,
    h: 22,
    doorX: 2024,
    doorY: 864,
    spawnOutside: { x: 2024, y: 880 },
    undergroundTheme: {
      wallPrimary: '#efe4d2',
      tileAccent: '#1d568a',
      platformFloor: '#d8d0c3',
      trim: '#16406b',
      artLabel: 'HOMENAGEM AOS FERROVIARIOS - VIUVA LAMEGO AZULEJOS',
      architect: 'Leopoldo de Almeida Rosa (2007)',
      artist: 'Jose Santa Barbara (Homenagem aos Ferroviarios)',
      muralStyle: 'ferroviarios-railway-tiles',
      nextTrainDest: 'Reboleira (via Baixa-Chiado)',
      oppositeDest: 'Terminus'
    },
    note: 'Eastern Blue Line terminus along the Alfama riverfront, framing the steep hillside below Portas do Sol.'
  }
];

export const VENUES = [
  // BAIRRO ALTO
  {
    id: 'bar-bairro-alto',
    name: 'Bar da Noite - Bairro Alto',
    neighborhood: 'bairro-alto',
    type: 'bar',
    badge: '[BAR & NIGHTLIFE]',
    archStyle: 'bairro-bar',
    x: 34,
    y: 55,
    w: 184,
    h: 140,
    doorSide: 'south',
    doorX: 126,
    doorY: 195,
    spawnOutside: { x: 126, y: 220 },
    wallColor: '#3a2244',
    roofColor: '#7a2538',
    awningColor: '#881337',
    accentColor: '#d946ef',
    proprietor: 'Diogo',
    proprietorRole: 'Head Bartender',
    cashierName: 'Rita',
    cashierRole: 'Night Host & DJ',
    description: 'A glowing bohemian Bairro Alto hilltop bar draped in festoon party lights, pouring chilled imperiais, ginjinha in chocolate cups, and caipirinhas while revelers gather outside every evening.',
    greeting: 'Boa noite! Welcome to the top of Bairro Alto! Grab an imperial or a ginjinha, clink glasses under the string lights, and soak in the evening party.',
    phrase: {
      pt: 'Boa noite! Duas imperiais e uma ginjinha para festejar no Bairro Alto!',
      pronunciation: 'Boh-ah noy-teh! Doo-ash eem-peh-ree-aish ee oo-mah zheen-zhee-nyah pah-rah fesh-teh-zhahr noo Bye-roo Ahl-too!',
      en: 'Good evening! Two draft beers and a ginjinha to celebrate in Bairro Alto!'
    },
    memory: {
      id: 'mem-bar-bairro-alto',
      title: 'Evening Lights at Bar da Noite',
      category: 'venue',
      neighborhood: 'Bairro Alto',
      caption: 'Glowing festoon bulbs, neon bar signs, clinking glasses, and lively laughter spilling across the Bairro Alto hilltop.'
    },
    interiorTheme: {
      floorPrimary: '#3a2544',
      floorSecondary: '#2d1c36',
      wall: '#2a1836',
      trim: '#c026d3',
      counter: '#54243e',
      layout: 'bar'
    },
    displayNote: 'Every evening after sunset, Bairro Alto transforms into Lisbon liveliest open-air street gathering, with music, string lights, and glasses raised outside historic tiny bars.',
    items: [
      {
        id: 'item-ginjinha',
        name: 'Ginjinha em Copo de Chocolate',
        kind: 'food',
        servingType: 'glass',
        glassStyle: 'ginjinha',
        costEur: 2.5,
        fullnessDelta: 12,
        energyDelta: 22,
        description: 'Classic Lisbon sour-cherry liqueur served in an edible dark-chocolate shot cup.'
      },
      {
        id: 'item-imperial',
        name: 'Imperial Fresquinha & Tremocos',
        kind: 'food',
        servingType: 'glass',
        glassStyle: 'imperial',
        costEur: 3.0,
        fullnessDelta: 16,
        energyDelta: 20,
        description: 'Crisp ice-cold Lisbon draft beer poured in a tall pilsner glass.'
      },
      {
        id: 'item-caipirinha',
        name: 'Caipirinha do Bairro Alto',
        kind: 'food',
        servingType: 'glass',
        glassStyle: 'caipirinha',
        costEur: 6.0,
        fullnessDelta: 14,
        energyDelta: 28,
        description: 'Fresh muddled lime, cane sugar, and crushed ice mixed in a chilled cocktail glass.'
      },
      {
        id: 'item-sangria-petiscos',
        name: 'Sangria de Frutos Tintos',
        kind: 'food',
        servingType: 'glass',
        glassStyle: 'sangria',
        costEur: 8.5,
        fullnessDelta: 34,
        energyDelta: 32,
        description: 'Chilled spiced berry and citrus red sangria served in a crystal goblet.'
      }
    ]
  },
  {
    id: 'quiosque-sao-pedro',
    name: 'Quiosque de Sao Pedro',
    neighborhood: 'bairro-alto',
    type: 'cafe',
    badge: '[CAFE]',
    archStyle: 'kiosk',
    x: 245,
    y: 60,
    w: 190,
    h: 135,
    doorSide: 'south',
    doorX: 340,
    doorY: 195,
    spawnOutside: { x: 340, y: 220 },
    wallColor: '#d8e6dc',
    roofColor: '#245e4f',
    awningColor: '#1a493d',
    accentColor: '#1f6e58',
    proprietor: 'Ines',
    proprietorRole: 'Kiosk Host & Cashier',
    description: 'An octagonal wrought-iron garden pavilion overlooking the Bairro Alto ridge, serving cold lemonade, espresso, and toasted sandwiches.',
    greeting: 'Bom dia! Pull up a chair under the jacaranda trees and take in the breeze over the rooftops.',
    phrase: {
      pt: 'Queria uma limonada fresca e uma bica, por favor.',
      pronunciation: 'Keh-ree-ah oo-mah lee-moh-nah-dah fresh-kah ee oo-mah bee-kah, poor fah-vohr.',
      en: 'I would like a fresh lemonade and an espresso, please.'
    },
    memory: {
      id: 'mem-quiosque-sao-pedro',
      title: 'Shade at Quiosque de Sao Pedro',
      category: 'venue',
      neighborhood: 'Bairro Alto',
      caption: 'Green wrought iron, clinking glass cups, and a cool breeze curling up the Bairro Alto hillside.'
    },
    interiorTheme: {
      floorPrimary: '#e8e2d5',
      floorSecondary: '#d4ddd4',
      wall: '#f2efe8',
      trim: '#2f6f5e',
      counter: '#8b5e3c',
      layout: 'cafe'
    },
    displayNote: 'Historic 19th-century Lisbon quiosques combine octagonal iron frames with ornate domed roofs across hillside gardens.',
    items: [
      {
        id: 'item-limonada',
        name: 'Limonada da Casa',
        kind: 'food',
        servingType: 'glass',
        glassStyle: 'limonada',
        costEur: 3.0,
        fullnessDelta: 15,
        energyDelta: 18,
        description: 'Freshly squeezed lemon and mint served over ice in a tall glass.'
      },
      {
        id: 'item-tosta-mista',
        name: 'Tosta Mista',
        kind: 'food',
        servingType: 'plate',
        costEur: 4.5,
        fullnessDelta: 30,
        energyDelta: 14,
        description: 'Crisp grilled cheese and ham sandwich served on a porcelain plate.'
      }
    ]
  },
  {
    id: 'residencial-alto',
    name: 'Pensao Residencial do Alto',
    neighborhood: 'bairro-alto',
    type: 'cafe',
    badge: '[PENSAO]',
    archStyle: 'pensao',
    x: 590,
    y: 55,
    w: 220,
    h: 140,
    doorSide: 'south',
    doorX: 700,
    doorY: 195,
    spawnOutside: { x: 700, y: 220 },
    wallColor: '#e8b86d',
    roofColor: '#b5543c',
    awningColor: '#7a3324',
    accentColor: '#b5543c',
    proprietor: 'Dona Teresa',
    proprietorRole: 'Receptionist & Host',
    description: 'A welcoming ochre-plaster Bairro Alto guesthouse parlor with wrought-iron balconies, herbal tea, and neighborhood walking tips.',
    greeting: 'Entre, por favor! Rest your legs in our courtyard parlor and enjoy a warm cup of lemon-verbena tea.',
    phrase: {
      pt: 'Posso deixar a minha mochila na rececao?',
      pronunciation: 'Poh-soo day-shahr ah mee-nyah moh-shee-lah nah heh-seh-sow?',
      en: 'May I leave my backpack at reception?'
    },
    memory: {
      id: 'mem-residencial-alto',
      title: 'Parlor Tea at Residencial do Alto',
      category: 'venue',
      neighborhood: 'Bairro Alto',
      caption: 'Lace curtains swaying in the hillside breeze inside an old family-run Bairro Alto pensao.'
    },
    interiorTheme: {
      floorPrimary: '#e6d8c3',
      floorSecondary: '#d8c7ad',
      wall: '#f7efe3',
      trim: '#7a3324',
      counter: '#6b452c',
      layout: 'pensao'
    },
    displayNote: 'Framed keys and sepia postcards from 1950s Lisbon guests hang beside the reception desk.',
    items: [
      {
        id: 'item-cha-cidreira',
        name: 'Cha de Cidreira & Bolo',
        kind: 'food',
        costEur: 3.5,
        fullnessDelta: 18,
        energyDelta: 26,
        description: 'Fragrant Portuguese lemon-verbena herbal tea with a slice of homemade sponge cake.'
      },
      {
        id: 'item-ba-map',
        name: 'Bairro Alto Illustrated Map',
        kind: 'souvenir',
        costEur: 6.0,
        fullnessDelta: 0,
        energyDelta: 4,
        description: 'Folded watercolor map marking hidden viewpoints and fado doorways.'
      }
    ]
  },
  {
    id: 'tasca-do-fado',
    name: 'Tasca do Fado',
    neighborhood: 'bairro-alto',
    type: 'restaurant',
    badge: '[RESTAURANT]',
    archStyle: 'tasca',
    x: 245,
    y: 380,
    w: 195,
    h: 145,
    doorSide: 'south',
    doorX: 342,
    doorY: 525,
    spawnOutside: { x: 342, y: 546 },
    wallColor: '#d97c54',
    roofColor: '#a63e2e',
    awningColor: '#7a251a',
    accentColor: '#a63e2e',
    proprietor: 'Senhor Manuel',
    proprietorRole: 'Chef & Owner',
    cashierName: 'Catarina',
    cashierRole: 'Cashier',
    description: 'A traditional Bairro Alto fado tavern with an arched green stone doorway, wrought-iron lantern, and simmering caldo verde.',
    greeting: 'Bem-vindo a nossa tasca! Sit down, rest your feet, and smell the caldo verde simmering in the kitchen.',
    phrase: {
      pt: 'A conta, por favor. Estava tudo delicioso!',
      pronunciation: 'Ah kohn-tah, poor fah-vohr. Esh-tah-vah too-doo deh-lee-see-oh-zoo!',
      en: 'The bill, please. Everything was delicious!'
    },
    memory: {
      id: 'mem-tasca-do-fado',
      title: 'Guitar Echoes at Tasca do Fado',
      category: 'venue',
      neighborhood: 'Bairro Alto',
      caption: 'Steaming bowls of caldo verde beneath framed portraits of Lisbon fadistas.'
    },
    interiorTheme: {
      floorPrimary: '#d8b496',
      floorSecondary: '#c79e7c',
      wall: '#f5eadf',
      trim: '#8d2f22',
      counter: '#6d4129',
      layout: 'restaurant'
    },
    displayNote: 'A hand-crafted Portuguese guitar rests beside old playbills, wine carafes, and stoneware soup bowls from Bairro Alto fado nights.',
    items: [
      {
        id: 'item-caldo-verde',
        name: 'Caldo Verde & Broa',
        kind: 'food',
        costEur: 7.5,
        fullnessDelta: 42,
        energyDelta: 24,
        description: 'Velvety kale and potato soup topped with chourico, served with warm corn bread.'
      },
      {
        id: 'item-pasteis-bacalhau',
        name: 'Pasteis de Bacalhau',
        kind: 'food',
        costEur: 9.0,
        fullnessDelta: 48,
        energyDelta: 28,
        description: 'Golden salt-cod fritters paired with fragrant tomato rice.'
      },
      {
        id: 'item-bifana-lisboa',
        name: 'Bifana a Moda de Lisboa',
        kind: 'food',
        costEur: 6.5,
        fullnessDelta: 40,
        energyDelta: 22,
        description: 'Garlic-and-white-wine marinated pork cutlet tucked inside a warm crusty papo-seco roll.'
      },
      {
        id: 'item-arroz-doce',
        name: 'Arroz Doce com Canela',
        kind: 'food',
        servingType: 'plate',
        costEur: 4.0,
        fullnessDelta: 22,
        energyDelta: 18,
        description: 'Creamy lemon-scented Portuguese rice pudding dusted with lattice cinnamon.'
      },
      {
        id: 'item-vinho-tinto-dao',
        name: 'Copo de Vinho Tinto do Dao',
        kind: 'food',
        servingType: 'glass',
        glassStyle: 'wine-red',
        costEur: 3.5,
        fullnessDelta: 10,
        energyDelta: 20,
        description: 'Ruby glass of full-bodied Dao red wine poured at the Fado tavern table.'
      }
    ]
  },
  {
    id: 'casa-da-rosa',
    name: 'Casa da Rosa - Padaria',
    neighborhood: 'bairro-alto',
    type: 'cafe',
    badge: '[BAKERY]',
    archStyle: 'casas-rosa',
    x: 590,
    y: 380,
    w: 220,
    h: 145,
    doorSide: 'south',
    doorX: 700,
    doorY: 525,
    spawnOutside: { x: 700, y: 546 },
    wallColor: '#e5a3b0',
    roofColor: '#a84732',
    awningColor: '#6f3224',
    accentColor: '#a84732',
    proprietor: 'Antonio',
    proprietorRole: 'Master Baker',
    cashierName: 'Leonor',
    cashierRole: 'Cashier',
    description: 'A rose-plastered Rua da Rosa neighborhood bakery beneath fluttering balcony laundry, fragrant with wood-oven bread and pastries.',
    greeting: 'Bom dia! The wood oven just turned out crusty Pao de Mafra, warm pao com chourico, and flaky pasteis de nata.',
    phrase: {
      pt: 'Queria um pao quentinho acabado de sair do forno.',
      pronunciation: 'Keh-ree-ah oom pow ken-tee-nyoo ah-kah-bah-doo deh sah-eer doo fohr-noo.',
      en: 'I would like a warm loaf fresh out of the oven.'
    },
    memory: {
      id: 'mem-casa-da-rosa',
      title: 'Warm Ovens of Casa da Rosa',
      category: 'venue',
      neighborhood: 'Bairro Alto',
      caption: 'Flour-dusted timber counters and fresh-baked crust scent drifting onto Rua da Rosa.'
    },
    interiorTheme: {
      floorPrimary: '#ead8c5',
      floorSecondary: '#dbc4ab',
      wall: '#f8eff0',
      trim: '#6f3224',
      counter: '#7a4d2d',
      layout: 'bakery'
    },
    displayNote: 'Wicker bread baskets overflow with wood-fired Pao de Mafra loaves, corn broa, cinnamon queijadas, and warm custard pastries.',
    items: [
      {
        id: 'item-pao-mafra',
        name: 'Pao de Mafra (Country Loaf)',
        kind: 'food',
        costEur: 3.0,
        fullnessDelta: 30,
        energyDelta: 16,
        description: 'Crusty flour-dusted wood-oven Portuguese bread with a soft, airy crumb.'
      },
      {
        id: 'item-pao-chourico',
        name: 'Pao com Chourico',
        kind: 'food',
        costEur: 4.0,
        fullnessDelta: 34,
        energyDelta: 18,
        description: 'Warm crusty roll baked around savory smoked Portuguese sausage.'
      },
      {
        id: 'item-padaria-nata',
        name: 'Pastel de Nata Quentinho',
        kind: 'food',
        costEur: 2.2,
        fullnessDelta: 20,
        energyDelta: 18,
        description: 'Flaky blistered custard tart straight from the bakery tray.'
      },
      {
        id: 'item-queijada',
        name: 'Queijada de Canela',
        kind: 'food',
        costEur: 2.5,
        fullnessDelta: 20,
        energyDelta: 16,
        description: 'Sweet cinnamon-spiced Portuguese cheese tart dusted in sugar.'
      }
    ]
  },
  {
    id: 'palacete-loreto',
    name: 'Palacete do Loreto',
    neighborhood: 'bairro-alto',
    type: 'shop',
    badge: '[GALLERY]',
    archStyle: 'palacete-gallery',
    x: 245,
    y: 695,
    w: 195,
    h: 145,
    doorSide: 'north',
    doorX: 342,
    doorY: 695,
    spawnOutside: { x: 342, y: 676 },
    wallColor: '#dfb463',
    roofColor: '#b95c3c',
    awningColor: '#864228',
    accentColor: '#b95c3c',
    proprietor: 'Sofia',
    proprietorRole: 'Curator & Cashier',
    description: 'An 18th-century ochre townhouse converted into an intimate Bairro Alto gallery of antique Lisbon engravings and porcelain.',
    greeting: 'Bem-vindo ao Palacete! Admire our 18th-century etchings of the Tagus riverfront before and after 1755.',
    phrase: {
      pt: 'Que gravuras historicas interessantes!',
      pronunciation: 'Keh grah-voo-rash eesh-toh-ree-kash een-teh-reh-sahn-tesh!',
      en: 'What interesting historical engravings!'
    },
    memory: {
      id: 'mem-palacete-loreto',
      title: 'Engravings Inside Palacete do Loreto',
      category: 'venue',
      neighborhood: 'Bairro Alto',
      caption: 'High stucco ceilings and copperplate views of old Lisbon caravels along Rua do Loreto.'
    },
    interiorTheme: {
      floorPrimary: '#d7c5aa',
      floorSecondary: '#cab494',
      wall: '#f7f0e4',
      trim: '#864228',
      counter: '#6d442b',
      layout: 'gallery'
    },
    displayNote: 'Restored copperplate maps trace how Lisbon rebuilt its grand avenues above the river.',
    items: [
      {
        id: 'item-lisbon-etching',
        name: '1755 Lisbon Etching Print',
        kind: 'souvenir',
        costEur: 13.0,
        fullnessDelta: 0,
        energyDelta: 5,
        description: 'Archival cream-paper reproduction of an antique Tagus panorama.'
      },
      {
        id: 'item-porcelain-swallow',
        name: 'Ceramic Andorinha Swallow',
        kind: 'souvenir',
        costEur: 9.5,
        fullnessDelta: 0,
        energyDelta: 5,
        description: 'Traditional Portuguese glazed ceramic swallow symbolizing home and safe return.'
      }
    ]
  },
  {
    id: 'vinil-do-alto',
    name: 'Vinil & Gravuras do Alto',
    neighborhood: 'bairro-alto',
    type: 'shop',
    badge: '[SHOP]',
    archStyle: 'bohemian-shop',
    x: 590,
    y: 695,
    w: 210,
    h: 145,
    doorSide: 'north',
    doorX: 695,
    doorY: 695,
    spawnOutside: { x: 695, y: 676 },
    wallColor: '#c9b2d6',
    roofColor: '#6d476c',
    awningColor: '#523254',
    accentColor: '#6d476c',
    proprietor: 'Beatriz',
    proprietorRole: 'Curator & Cashier',
    description: 'An independent Bairro Alto print and vinyl gallery with recessed showcase windows and hand-pulled Lisbon streetcar linocuts.',
    greeting: 'Ola! Browse the crates as long as you like. Every record sleeve here holds a piece of Lisbon night air.',
    phrase: {
      pt: 'Quanto custa este disco de fado?',
      pronunciation: 'Kwahn-too koosh-tah ehsh-teh deesh-koo deh fah-doo?',
      en: 'How much does this fado record cost?'
    },
    memory: {
      id: 'mem-vinil-do-alto',
      title: 'Crates at Vinil & Gravuras',
      category: 'venue',
      neighborhood: 'Bairro Alto',
      caption: 'Flipping through dusty fado sleeves and ink-scented linocut tram prints in Bairro Alto.'
    },
    interiorTheme: {
      floorPrimary: '#c6a585',
      floorSecondary: '#ba9775',
      wall: '#f1eaf4',
      trim: '#583758',
      counter: '#5d4234',
      layout: 'vinyl'
    },
    displayNote: 'Hand-numbered linocut posters depict Tram 28E climbing the steep bends past iron balconies.',
    items: [
      {
        id: 'item-linocut-print',
        name: 'Tram 28E Linocut Print',
        kind: 'souvenir',
        costEur: 12.0,
        fullnessDelta: 0,
        energyDelta: 4,
        description: 'A small hand-pressed ink print of a yellow Lisbon streetcar.'
      },
      {
        id: 'item-fado-vinyl',
        name: 'Fado em Lisboa 7-inch Vinyl',
        kind: 'souvenir',
        costEur: 15.0,
        fullnessDelta: 0,
        energyDelta: 6,
        description: 'Classic acoustic recording captured in a historic Bairro Alto tavern.'
      }
    ]
  },

  // CHIADO
  {
    id: 'livraria-chiado',
    name: 'Livraria Bertrand (1732)',
    neighborhood: 'chiado',
    type: 'shop',
    badge: '[BOOKSHOP]',
    archStyle: 'bertrand',
    x: 1060,
    y: 55,
    w: 215,
    h: 140,
    doorSide: 'south',
    doorX: 1167,
    doorY: 195,
    spawnOutside: { x: 1167, y: 220 },
    wallColor: '#f2f6fb',
    roofColor: '#1f4975',
    awningColor: '#16385b',
    accentColor: '#1b4d89',
    proprietor: 'Duarte',
    proprietorRole: 'Bookseller & Cashier',
    description: 'Recognized as the oldest operating bookshop in the world (founded 1732), framed in Pombaline blue-and-white azulejos on Rua Garrett.',
    greeting: 'Boa tarde! Step softly through our vaulted bookrooms. Readers have traded stories on Rua Garrett since 1732.',
    phrase: {
      pt: 'Procura algum livro sobre a historia de Lisboa?',
      pronunciation: 'Proh-koo-rah ahl-goom lee-vroo soh-breh ah eesh-toh-ree-ah deh Leesh-boh-ah?',
      en: 'Are you looking for a book about the history of Lisbon?'
    },
    memory: {
      id: 'mem-livraria-chiado',
      title: 'Vaulted Rooms of Livraria Bertrand',
      category: 'venue',
      neighborhood: 'Chiado',
      caption: 'Hand-painted azulejos at the doorway and cedar-scented oak shelves founded in 1732.'
    },
    interiorTheme: {
      floorPrimary: '#b98f66',
      floorSecondary: '#ae845b',
      wall: '#efe8dc',
      trim: '#16385b',
      counter: '#6c492e',
      layout: 'bookshop'
    },
    displayNote: 'Founded in 1732 and relocated to Rua Garrett after the 1755 earthquake, Bertrand stamps every book with its historic seal.',
    items: [
      {
        id: 'item-pessoa-book',
        name: 'Pocket Book of Lisbon Verse',
        kind: 'souvenir',
        costEur: 11.0,
        fullnessDelta: 0,
        energyDelta: 5,
        description: 'Bilingual Portuguese-English poetry collection stamped with the 1732 bookshop seal.'
      },
      {
        id: 'item-lisbon-sketchbook',
        name: 'Chiado Linen Sketchbook',
        kind: 'souvenir',
        costEur: 9.5,
        fullnessDelta: 0,
        energyDelta: 4,
        description: 'Thick cotton pages bound for street sketches and tram tickets.'
      }
    ]
  },
  {
    id: 'galeria-pombalina',
    name: 'Galeria Pombalina',
    neighborhood: 'chiado',
    type: 'shop',
    badge: '[GALLERY]',
    archStyle: 'azulejo-gallery',
    x: 1445,
    y: 55,
    w: 200,
    h: 140,
    doorSide: 'south',
    doorX: 1545,
    doorY: 195,
    spawnOutside: { x: 1545, y: 220 },
    wallColor: '#f4d57a',
    roofColor: '#9e4736',
    awningColor: '#244b7a',
    accentColor: '#1b4d89',
    proprietor: 'Miguel',
    proprietorRole: 'Curator & Cashier',
    description: 'A blue-and-white tiled Chiado exhibition hall celebrating Lisbon Pombaline earthquake-resistant wooden cage architecture.',
    greeting: 'Boa tarde! Here we preserve scale models of the wooden gaiola pombalina frames that rebuilt Chiado after 1755.',
    phrase: {
      pt: 'A arquitetura pombalina de Lisboa e fascinante.',
      pronunciation: 'Ah ahr-kee-teh-too-rah pohm-bah-lee-nah deh Leesh-boh-ah eh fahsh-see-nahn-teh.',
      en: 'Lisbon Pombaline architecture is fascinating.'
    },
    memory: {
      id: 'mem-galeria-pombalina',
      title: 'Blueprints at Galeria Pombalina',
      category: 'venue',
      neighborhood: 'Chiado',
      caption: 'Hand-drawn 18th-century facade elevations beneath cobalt glazed tilework on Rua Garrett.'
    },
    interiorTheme: {
      floorPrimary: '#e2e8f0',
      floorSecondary: '#cbd5e1',
      wall: '#f5f8fc',
      trim: '#244b7a',
      counter: '#365578',
      layout: 'gallery'
    },
    displayNote: 'Cross-braced timber gaiola structures allowed post-1755 Chiado buildings to flex safely during tremors.',
    items: [
      {
        id: 'item-pombaline-folio',
        name: 'Pombaline Architecture Folio',
        kind: 'souvenir',
        costEur: 12.5,
        fullnessDelta: 0,
        energyDelta: 5,
        description: 'Set of three architectural elevation prints of Chiado plazas.'
      },
      {
        id: 'item-calcada-coaster',
        name: 'Calcada Wave Stone Coaster',
        kind: 'souvenir',
        costEur: 7.5,
        fullnessDelta: 0,
        energyDelta: 4,
        description: 'Miniature black basalt and white limestone Mar Largo mosaic tile.'
      }
    ]
  },
  {
    id: 'cafe-do-poeta',
    name: 'Cafe A Brasileira',
    neighborhood: 'chiado',
    type: 'cafe',
    badge: '[CAFE 1905]',
    archStyle: 'brasileira',
    x: 1050,
    y: 380,
    w: 202,
    h: 145,
    doorSide: 'south',
    doorX: 1151,
    doorY: 525,
    spawnOutside: { x: 1151, y: 546 },
    wallColor: '#efe6d5',
    roofColor: '#8d5324',
    awningColor: '#1f4d3a',
    accentColor: '#a6701e',
    proprietor: 'Clara',
    proprietorRole: 'Head Barista & Cashier',
    description: 'Chiado landmark opened in 1905 with dark mahogany Art Nouveau paneling, gilded brass lettering, and Fernando Pessoa bronze statue outside.',
    greeting: 'Bom dia! Fresh pasteis de nata just came out of the oven, and Fernando Pessoa has saved a seat on the terrace.',
    phrase: {
      pt: 'Uma bica e um pastel de nata quentinho, se faz favor.',
      pronunciation: 'Oo-mah bee-kah ee oom pahsh-tehl deh nah-tah ken-tee-nyoo, seh fahsh fah-vohr.',
      en: 'An espresso and a warm custard tart, please.'
    },
    memory: {
      id: 'mem-cafe-do-poeta',
      title: 'Bica at Cafe A Brasileira',
      category: 'venue',
      neighborhood: 'Chiado',
      caption: 'Dark wood Art Nouveau mirrors, warm custard pastry, and Tram 28E ringing right past Largo do Chiado.'
    },
    interiorTheme: {
      floorPrimary: '#ede8de',
      floorSecondary: '#2d3540',
      wall: '#f7f1e3',
      trim: '#1f4d3a',
      counter: '#54351e',
      layout: 'cafe'
    },
    displayNote: 'Designed by Manuel Joaquim Norte Junior in 1905, A Brasileira popularized the Lisbon bica espresso among writers and artists.',
    items: [
      {
        id: 'item-bica-nata',
        name: 'Bica & Pastel de Nata',
        kind: 'food',
        servingType: 'plate',
        costEur: 3.5,
        fullnessDelta: 22,
        energyDelta: 30,
        description: 'Blistered warm custard tart served on a porcelain plate.'
      },
      {
        id: 'item-galao-bolo',
        name: 'Galao Quente em Copo Alto',
        kind: 'food',
        servingType: 'glass',
        glassStyle: 'galao',
        costEur: 5.0,
        fullnessDelta: 32,
        energyDelta: 25,
        description: 'Classic tall glass of silky Portuguese espresso and steamed milk.'
      },
      {
        id: 'item-brasileira-tosta',
        name: 'Tosta Mista na Chapa',
        kind: 'food',
        servingType: 'plate',
        costEur: 5.5,
        fullnessDelta: 36,
        energyDelta: 20,
        description: 'Pressed country-bread sandwich toasted golden with melted cheese and ham.'
      }
    ]
  },
  {
    id: 'arcadas-chiado',
    name: 'Arcadas do Chiado',
    neighborhood: 'chiado',
    type: 'cafe',
    badge: '[CONFEITARIA]',
    archStyle: 'arcaded-azulejo',
    x: 1070,
    y: 695,
    w: 210,
    h: 145,
    doorSide: 'north',
    doorX: 1175,
    doorY: 695,
    spawnOutside: { x: 1175, y: 676 },
    wallColor: '#dce8df',
    roofColor: '#ad4f3a',
    awningColor: '#1b4d89',
    accentColor: '#1b4d89',
    proprietor: 'Mariana',
    proprietorRole: 'Pastry Chef',
    cashierName: 'Rui',
    cashierRole: 'Cashier',
    description: 'An arched-stone Chiado tea salon and traditional confectioner beneath cobalt diamond azulejos, serving convent sweets and Azores tea.',
    greeting: 'Boa tarde! Step beneath our stone arcades for fragrant Azores Gorreana tea, almond travesseiros, and handmade convent sweets.',
    phrase: {
      pt: 'Queria um cha dos Acores e dois doces conventuais.',
      pronunciation: 'Keh-ree-ah oom shah doosh Ah-soh-resh ee doysh doh-sesh kohn-vehn-twah-eesh.',
      en: 'I would like an Azores tea and two convent pastries.'
    },
    memory: {
      id: 'mem-arcadas-chiado',
      title: 'Tea Beneath Arcadas do Chiado',
      category: 'venue',
      neighborhood: 'Chiado',
      caption: 'Porcelain teacups and golden almond sweets tucked behind Chiado stone arches and blue tiles.'
    },
    interiorTheme: {
      floorPrimary: '#ebf1f7',
      floorSecondary: '#d4e2f0',
      wall: '#f6f9fc',
      trim: '#1b4d89',
      counter: '#5e432c',
      layout: 'bakery'
    },
    displayNote: 'Portuguese docaria conventual recipes trace back to historic monasteries using egg yolk, sugar, and toasted almonds.',
    items: [
      {
        id: 'item-cha-acores',
        name: 'Cha Gorreana & Pastel de Feijao',
        kind: 'food',
        costEur: 4.5,
        fullnessDelta: 24,
        energyDelta: 26,
        description: 'Aromatic black tea from the Azores paired with a caramelized bean-almond tart.'
      },
      {
        id: 'item-travesseiro',
        name: 'Travesseiro de Amendoa',
        kind: 'food',
        costEur: 3.2,
        fullnessDelta: 26,
        energyDelta: 20,
        description: 'Crisp puff-pastry pillow filled with sweet almond-and-egg-yolk cream.'
      },
      {
        id: 'item-convent-box',
        name: 'Tin of Convent Almond Sweets',
        kind: 'souvenir',
        costEur: 10.5,
        fullnessDelta: 12,
        energyDelta: 10,
        description: 'Ribbon-tied blue-and-white tin of traditional Portuguese marzipan and almond bites.'
      }
    ]
  },
  {
    id: 'atelier-cortica',
    name: 'Atelier de Cortica & Luvas',
    neighborhood: 'chiado',
    type: 'shop',
    badge: '[SHOP]',
    archStyle: 'chiado-arcade',
    x: 1450,
    y: 695,
    w: 200,
    h: 145,
    doorSide: 'north',
    doorX: 1550,
    doorY: 695,
    spawnOutside: { x: 1550, y: 676 },
    wallColor: '#e7f2ee',
    roofColor: '#995c38',
    awningColor: '#7a4526',
    accentColor: '#1f7062',
    proprietor: 'Helena',
    proprietorRole: 'Artisan & Cashier',
    description: 'A Pombaline arcaded Chiado craft boutique inspired by historic glove and cork ateliers, with stone arches and emerald tiles.',
    greeting: 'Entre, por favor! Feel how light Portuguese cork is. Every oak bark harvest heals naturally without felling a tree.',
    phrase: {
      pt: 'Isto e feito a mao em Portugal?',
      pronunciation: 'Eesh-too eh fay-too ah mow eym Poor-too-gahl?',
      en: 'Is this handmade in Portugal?'
    },
    memory: {
      id: 'mem-atelier-cortica',
      title: 'Craftsmanship at Atelier de Cortica',
      category: 'venue',
      neighborhood: 'Chiado',
      caption: 'Limestone Chiado arches, supple honey-toned cork leather, and patient Portuguese craftsmanship.'
    },
    interiorTheme: {
      floorPrimary: '#d5b997',
      floorSecondary: '#caa983',
      wall: '#f6eee4',
      trim: '#7a4526',
      counter: '#7e5536',
      layout: 'atelier'
    },
    displayNote: 'Cork oak bark samples trace how traditional workshops turn raw bark into soft, rain-resistant travel goods.',
    items: [
      {
        id: 'item-cork-journal',
        name: 'Cork Travel Journal',
        kind: 'souvenir',
        costEur: 14.0,
        fullnessDelta: 0,
        energyDelta: 5,
        description: 'Soft Alentejo cork cover embossed with a compass rose.'
      },
      {
        id: 'item-cork-cardholder',
        name: 'Navegante Cork Sleeve',
        kind: 'souvenir',
        costEur: 8.5,
        fullnessDelta: 0,
        energyDelta: 4,
        description: 'Slim stitched holder sized for a Lisbon transit card.'
      }
    ]
  },

  // ALFAMA
  {
    id: 'se-de-lisboa',
    name: 'Se de Lisboa',
    neighborhood: 'alfama',
    type: 'landmark',
    badge: '[CATHEDRAL 1147]',
    archStyle: 'cathedral',
    x: 1445,
    y: 375,
    w: 205,
    h: 150,
    doorSide: 'south',
    doorX: 1547,
    doorY: 525,
    spawnOutside: { x: 1547, y: 546 },
    wallColor: '#ddd5c5',
    roofColor: '#9d4c36',
    awningColor: '#5c4f41',
    accentColor: '#7a6852',
    proprietor: 'Henrique',
    proprietorRole: 'Cathedral Docent',
    description: 'Lisbon oldest cathedral (founded 1147), featuring Romanesque crenellated bell towers, a glowing stained-glass rose window, and medieval Gothic cloisters.',
    greeting: 'Bem-vindo a Se de Lisboa! Step quietly beneath these 12th-century limestone arches and admire the rose window light across the nave.',
    phrase: {
      pt: 'Posso visitar o claustro e o tesouro da Se?',
      pronunciation: 'Poh-soo vee-zee-tahr oo klowsh-troo ee oo teh-zoh-roo dah Seh?',
      en: 'May I visit the cloister and treasury of the Cathedral?'
    },
    memory: {
      id: 'mem-se-de-lisboa',
      title: 'Stained Glass Inside Se de Lisboa',
      category: 'venue',
      neighborhood: 'Alfama',
      caption: 'Cool 12th-century limestone vaults, quiet candle flicker, and Tram 28E bells echoing faintly beyond the Romanesque portal.'
    },
    interiorTheme: {
      floorPrimary: '#d8d1c2',
      floorSecondary: '#c7bfb0',
      wall: '#e6dfd2',
      trim: '#5c4f41',
      counter: '#6c5a46',
      layout: 'cathedral'
    },
    displayNote: 'Built in 1147 on the site of a former mosque, Se de Lisboa withstood the 1755 earthquake and preserves Roman and medieval cloister excavations.',
    items: [
      {
        id: 'item-se-cloister-pass',
        name: 'Cloister & Treasury Visit Pass',
        kind: 'souvenir',
        costEur: 5.0,
        fullnessDelta: 0,
        energyDelta: 12,
        description: 'Admission pass to the peaceful Gothic cloisters and cathedral treasury.'
      },
      {
        id: 'item-se-guidebook',
        name: 'Illustrated Se de Lisboa Guide',
        kind: 'souvenir',
        costEur: 7.0,
        fullnessDelta: 0,
        energyDelta: 6,
        description: 'Architectural monograph detailing the 1147 Romanesque nave and rose window.'
      }
    ]
  },
  {
    id: 'oficina-azulejos',
    name: 'Oficina de Azulejos',
    neighborhood: 'alfama',
    type: 'shop',
    badge: '[ATELIER]',
    archStyle: 'azulejo-atelier',
    x: 1840,
    y: 55,
    w: 220,
    h: 140,
    doorSide: 'south',
    doorX: 1950,
    doorY: 195,
    spawnOutside: { x: 1950, y: 220 },
    wallColor: '#f2f6fb',
    roofColor: '#1d568a',
    awningColor: '#15406a',
    accentColor: '#1d568a',
    proprietor: 'Tiago',
    proprietorRole: 'Tile Painter & Cashier',
    description: 'An 18th-century style Alfama ceramic workshop clad in cobalt-and-white diamond rosette tiles with a carved stone pediment.',
    greeting: 'Ola! Mind the fresh cobalt glaze on the kiln table. Look closely and you will spot the Santa Luzia pattern.',
    phrase: {
      pt: 'Estes azulejos pintados a mao sao lindos!',
      pronunciation: 'Ehsh-teesh ah-zoo-lay-zhoosh peen-tah-doosh ah mow sow leen-doosh!',
      en: 'These hand-painted tiles are beautiful!'
    },
    memory: {
      id: 'mem-oficina-azulejos',
      title: 'Cobalt Brushstrokes in Alfama',
      category: 'venue',
      neighborhood: 'Alfama',
      caption: 'Rows of glazed blue-and-white tiles cooling beside sunlit studio windows in Alfama.'
    },
    interiorTheme: {
      floorPrimary: '#e3ecf5',
      floorSecondary: '#c7dbf0',
      wall: '#f4f8fc',
      trim: '#15406a',
      counter: '#345a82',
      layout: 'azulejo'
    },
    displayNote: 'Hand-stenciled azulejo patterns combine Moorish star geometry with 18th-century Tagus caravels.',
    items: [
      {
        id: 'item-azulejo-coaster',
        name: 'Cobalt Azulejo Tile',
        kind: 'souvenir',
        costEur: 10.0,
        fullnessDelta: 0,
        energyDelta: 5,
        description: 'Kiln-fired ceramic tile painted with a classic Alfama floral star.'
      },
      {
        id: 'item-azulejo-panel',
        name: 'Tagus Caravel Mini-Panel',
        kind: 'souvenir',
        costEur: 18.0,
        fullnessDelta: 0,
        energyDelta: 6,
        description: 'Two-tile maritime miniature wrapped in brown kraft paper.'
      }
    ]
  },
  {
    id: 'taberna-sardinha',
    name: 'Taberna da Sardinha',
    neighborhood: 'alfama',
    type: 'restaurant',
    badge: '[RESTAURANT]',
    archStyle: 'alfama-taberna',
    x: 1845,
    y: 380,
    w: 220,
    h: 145,
    doorSide: 'south',
    doorX: 1955,
    doorY: 525,
    spawnOutside: { x: 1955, y: 546 },
    wallColor: '#f7f3eb',
    roofColor: '#bf5530',
    awningColor: '#1b558a',
    accentColor: '#bf5530',
    proprietor: 'Dona Rosa',
    proprietorRole: 'Head Chef',
    cashierName: 'Pedro',
    cashierRole: 'Cashier & Host',
    description: 'A whitewashed Alfama hillside taberna adorned with festive Santos Populares garlands, cobalt doorway trim, and glowing charcoal grill.',
    greeting: 'Boa tarde, querido! The charcoal grill is hot, the sardines arrived this morning, and Pedro will take care of your table.',
    phrase: {
      pt: 'Queria sardinhas assadas com pimentos, por favor.',
      pronunciation: 'Keh-ree-ah sahr-dee-nyash ah-sah-dash koom pee-men-toosh, poor fah-vohr.',
      en: 'I would like grilled sardines with roasted peppers, please.'
    },
    memory: {
      id: 'mem-taberna-sardinha',
      title: 'Charcoal & Sea Salt at Taberna da Sardinha',
      category: 'venue',
      neighborhood: 'Alfama',
      caption: 'Crisp grilled sardines on thick bread, festive flags overhead, and Tagus sunshine.'
    },
    interiorTheme: {
      floorPrimary: '#e5c9a8',
      floorSecondary: '#d8b68f',
      wall: '#faf1e4',
      trim: '#9c3f21',
      counter: '#7a492c',
      layout: 'restaurant'
    },
    displayNote: 'Ceramic platters of grilled sardines, bacalhau a Bras, roasted peppers, and crusty bread line the warm kitchen pass.',
    items: [
      {
        id: 'item-sardinhas',
        name: 'Sardinhas Assadas',
        kind: 'food',
        costEur: 11.5,
        fullnessDelta: 55,
        energyDelta: 32,
        description: 'Charcoal-grilled sardines with roasted peppers and boiled potatoes.'
      },
      {
        id: 'item-bacalhau-bras',
        name: 'Bacalhau a Bras',
        kind: 'food',
        costEur: 13.0,
        fullnessDelta: 60,
        energyDelta: 35,
        description: 'Shredded cod folded with golden straw potatoes, egg, and black olives.'
      },
      {
        id: 'item-polvo-lagareiro',
        name: 'Polvo a Lagareiro',
        kind: 'food',
        costEur: 15.5,
        fullnessDelta: 64,
        energyDelta: 36,
        description: 'Tender olive-oil roasted octopus with garlic and oven-punched potatoes.'
      },
      {
        id: 'item-salada-broa',
        name: 'Salada de Tomate & Broa',
        kind: 'food',
        servingType: 'plate',
        costEur: 5.5,
        fullnessDelta: 28,
        energyDelta: 20,
        description: 'Sun-ripened tomato and oregano salad dressed in Alentejo olive oil with corn bread.'
      },
      {
        id: 'item-vinho-verde-copo',
        name: 'Copo de Vinho Verde Fresco',
        kind: 'food',
        servingType: 'glass',
        glassStyle: 'vinho-verde',
        costEur: 3.5,
        fullnessDelta: 10,
        energyDelta: 22,
        description: 'Chilled glass of crisp, lightly effervescent Minho Vinho Verde white wine.'
      }
    ]
  },
  {
    id: 'conservas-alfama',
    name: 'Mercearia & Conservas de Alfama',
    neighborhood: 'alfama',
    type: 'shop',
    badge: '[SHOP]',
    archStyle: 'mercearia',
    x: 1845,
    y: 695,
    w: 220,
    h: 145,
    doorSide: 'north',
    doorX: 1955,
    doorY: 695,
    spawnOutside: { x: 1955, y: 676 },
    wallColor: '#edc5b4',
    roofColor: '#1f7063',
    awningColor: '#15544a',
    accentColor: '#1f7063',
    proprietor: 'Joao',
    proprietorRole: 'Grocer & Cashier',
    description: 'An old-world tiled Alfama corner grocer with arched display bays packed with colorful lithograph fish tins and fig sweets.',
    greeting: 'Ora boas! Every shelf here is wrapped by hand in illustrated paper. Taste a fig sweet or pick a tin for home.',
    phrase: {
      pt: 'Pode embrulhar para presente, por favor?',
      pronunciation: 'Poh-deh eym-broo-lyahr pah-rah preh-zen-teh, poor fah-vohr?',
      en: 'Could you gift-wrap this, please?'
    },
    memory: {
      id: 'mem-conservas-alfama',
      title: 'Bright Tins of Mercearia de Alfama',
      category: 'venue',
      neighborhood: 'Alfama',
      caption: 'Pyramids of illustrated sardine tins and twine-tied parcels in a wooden Alfama grocer.'
    },
    interiorTheme: {
      floorPrimary: '#d7c3a3',
      floorSecondary: '#c8b28e',
      wall: '#f5f0e2',
      trim: '#15544a',
      counter: '#694a31',
      layout: 'mercearia'
    },
    displayNote: 'Colorful retro lithograph labels celebrate century-old Portuguese coastal canneries.',
    items: [
      {
        id: 'item-conserva-tin',
        name: 'Illustrated Sardine Conserva',
        kind: 'souvenir',
        costEur: 7.0,
        fullnessDelta: 0,
        energyDelta: 4,
        description: 'Olive-oil spiced sardines wrapped in vintage Lisbon lithograph paper.'
      },
      {
        id: 'item-figo-doce',
        name: 'Fig & Almond Sweet Pack',
        kind: 'food',
        costEur: 4.5,
        fullnessDelta: 26,
        energyDelta: 20,
        description: 'Traditional sun-dried fig and toasted almond treat for hillside walks.'
      }
    ]
  }
];

export const REST_SPOTS = [
  {
    id: 'bench-bairro-alto',
    name: 'Miradouro de Sao Pedro Bench',
    neighborhood: 'bairro-alto',
    x: 510,
    y: 162,
    musicianName: 'Mateus',
    instrument: 'Guitarra Portuguesa',
    musicianOutfitId: 'fado-blazer',
    songs: ['Valsa de Sao Pedro', 'Serenata do Alto', 'Chula da Colina'],
    description: 'A stone garden bench framing terracotta rooftops stretching east toward Castelo de Sao Jorge.',
    phrase: {
      pt: 'Que vista maravilhosa sobre Lisboa!',
      pronunciation: 'Keh veesh-tah mah-rah-vee-lyoh-zah soh-breh Leesh-boh-ah!',
      en: 'What a wonderful view over Lisbon!'
    },
    memory: {
      id: 'mem-view-sao-pedro',
      title: 'Overlook at Sao Pedro de Alcantara',
      category: 'viewpoint',
      neighborhood: 'Bairro Alto',
      caption: 'Pausing on a cool limestone bench as red rooftops tumble down toward the valley.'
    }
  },
  {
    id: 'bench-chiado',
    name: 'Praca Luis de Camoes Bench',
    neighborhood: 'chiado',
    x: 950,
    y: 500,
    musicianName: 'Beatriz',
    instrument: 'Bandolim do Chiado',
    musicianOutfitId: 'alfama-dress',
    songs: ['Melodia de Camoes', 'Rapsodia da Rua Garrett', 'Valseto dos Poetas'],
    description: 'A shaded limestone bench beside the patterned calcada square linking Bairro Alto and Chiado.',
    phrase: {
      pt: 'Vamos descansar um pouco na praca.',
      pronunciation: 'Vah-moosh desh-kahn-sahr oom poh-koo nah prah-sah.',
      en: 'Let us rest a little in the square.'
    },
    memory: {
      id: 'mem-view-camoes',
      title: 'Afternoon Pause at Praca Camoes',
      category: 'viewpoint',
      neighborhood: 'Chiado',
      caption: 'Watching trams glide past black-and-white wave cobblestones while street music drifts nearby.'
    }
  },
  {
    id: 'bench-alfama',
    name: 'Miradouro das Portas do Sol',
    neighborhood: 'alfama',
    x: 2110,
    y: 492,
    musicianName: 'Sebastiao',
    instrument: 'Acordeao de Alfama',
    musicianOutfitId: 'bohemian-poncho',
    songs: ['Brisa das Portas do Sol', 'Marcha do Tejo', 'Saudade de Santa Luzia'],
    description: 'A sunlit stone parapet looking out across Alfama domes and the shimmering blue Tagus estuary.',
    phrase: {
      pt: 'O rio Tejo brilha ao fim da tarde.',
      pronunciation: 'Oo ree-oo Teh-zhoo bree-lyah ow feem dah tahr-deh.',
      en: 'The Tagus River shines in the late afternoon.'
    },
    memory: {
      id: 'mem-view-portas-sol',
      title: 'Sunlight at Portas do Sol',
      category: 'viewpoint',
      neighborhood: 'Alfama',
      caption: 'Warm river light bouncing off whitewashed Alfama walls and red clay roofs below.'
    }
  }
];

export const TRANSIT_LINES = [
  {
    id: 'tram-28e',
    mode: 'tram',
    name: 'Eletrico 28E',
    operator: 'Carris',
    badge: '[TRAM 28E]',
    fareEur: 3.1,
    speedPxPerSec: 118,
    dwellSeconds: 3.2,
    color: '#e6a817',
    trimColor: '#ffffff',
    loopType: 'pingpong',
    phrase: {
      pt: 'Um bilhete para o eletrico vinte e oito, por favor.',
      pronunciation: 'Oom bee-lyeh-teh pah-rah oo eh-leh-tree-koo veen-teh ee oy-too, poor fah-vohr.',
      en: 'One ticket for tram twenty-eight, please.'
    },
    memory: {
      id: 'mem-ride-tram-28e',
      title: 'Ringing Bells on Eletrico 28E',
      category: 'transit',
      neighborhood: 'Chiado & Alfama',
      caption: 'Wood-paneled benches swaying along steel rails as the yellow streetcar climbs from Camoes to Alfama.'
    },
    waypoints: [
      { x: 240, y: 610, stopId: 'stop-tram-loreto', stopName: 'Rua do Loreto (Bairro Alto)', platformY: 562 },
      { x: 960, y: 610, stopId: 'stop-tram-camoes', stopName: 'Praca Luis de Camoes (Chiado)', platformY: 562 },
      { x: 1384, y: 610, stopId: 'stop-tram-chiado', stopName: 'Largo do Chiado (Chiado)', platformY: 562 },
      { x: 1730, y: 610, stopId: 'stop-tram-se', stopName: 'Se de Lisboa (Alfama Edge)', platformY: 562 },
      { x: 2150, y: 610, stopId: 'stop-tram-alfama', stopName: 'Portas do Sol (Alfama)', platformY: 562 }
    ]
  },
  {
    id: 'bus-737-758',
    mode: 'bus',
    name: 'Carris Bus 737 / 758',
    operator: 'Carris',
    badge: '[BUS 737]',
    fareEur: 2.1,
    speedPxPerSec: 148,
    dwellSeconds: 3.2,
    color: '#1b7a5c',
    trimColor: '#f3c623',
    loopType: 'cycle',
    phrase: {
      pt: 'Este autocarro passa por Alfama e pelo Chiado?',
      pronunciation: 'Ehsh-teh ow-too-kah-roo pah-sah poor Ahl-fah-mah ee peh-loo Shee-ah-doo?',
      en: 'Does this bus pass through Alfama and Chiado?'
    },
    memory: {
      id: 'mem-ride-carris-bus',
      title: 'Hillside Loop on Carris Bus',
      category: 'transit',
      neighborhood: 'Bairro Alto, Chiado & Alfama',
      caption: 'Gliding effortlessly from Sao Pedro de Alcantara to Santa Luzia and along the Tagus waterfront.'
    },
    waypoints: [
      { x: 162, y: 285 },
      { x: 340, y: 285, stopId: 'stop-bus-sao-pedro', stopName: 'Sao Pedro de Alcantara (Bairro Alto)', platformY: 236 },
      { x: 1170, y: 285, stopId: 'stop-bus-garrett', stopName: 'Rua Garrett (Chiado)', platformY: 236 },
      { x: 1950, y: 285, stopId: 'stop-bus-santa-luzia', stopName: 'Miradouro Santa Luzia (Alfama)', platformY: 236 },
      { x: 2215, y: 285 },
      { x: 2215, y: 932 },
      { x: 1900, y: 932, stopId: 'stop-bus-cais-alfama', stopName: 'Cais de Alfama (Waterfront)', platformY: 880 },
      { x: 950, y: 932, stopId: 'stop-bus-camoes-sul', stopName: 'Camoes Sul (Waterfront)', platformY: 880 },
      { x: 162, y: 932 }
    ]
  }
];

// Historic Lisbon Carris cable funiculars engineered by Raoul Mesnier du Ponsard (tilted stepped-chassis hillside cars!)
export const FUNICULAR_LINES = [
  {
    id: 'funicular-bica',
    name: 'Elevador da Bica (1892)',
    shortName: 'Elevador da Bica',
    badge: '[FUNICULAR]',
    operator: 'Carris',
    fareEur: 2.1,
    rideDurationSec: 5.5,
    travelMinutes: 5,
    trackX: 512,
    bottomY: 882,
    topY: 334,
    passingLoopY: 562,
    passingHalfOffset: 10,
    bodyColor: '#eab308',
    upperColor: '#fffbeb',
    accentColor: '#92400e',
    lowerStation: {
      id: 'bica-lower',
      name: 'Bica Lower Station (Avenida Ribeira)',
      x: 512,
      y: 910,
      platformX: 472,
      platformY: 882
    },
    upperStation: {
      id: 'bica-upper',
      name: 'Bica Upper Station (Bairro Alto Ridge)',
      x: 512,
      y: 235,
      platformX: 472,
      platformY: 222
    },
    phrase: {
      pt: 'Um bilhete para o Elevador da Bica, por favor!',
      pronunciation: 'Oom bee-lyeh-teh pah-rah oo Eh-leh-vah-dohr dah Bee-kah, poor fah-vohr!',
      en: 'One ticket for the Bica Funicular, please!'
    },
    description: 'Iconic 1892 yellow stepped-chassis funicular climbing steep Rua da Bica from the Tagus waterfront up to high Bairro Alto.'
  },
  {
    id: 'funicular-gloria',
    name: 'Elevador da Gloria (1885)',
    shortName: 'Elevador da Gloria',
    badge: '[FUNICULAR]',
    operator: 'Carris',
    fareEur: 2.1,
    rideDurationSec: 5.5,
    travelMinutes: 5,
    trackX: 864,
    bottomY: 882,
    topY: 334,
    passingLoopY: 565,
    passingHalfOffset: 10,
    bodyColor: '#eab308',
    upperColor: '#fef9c3',
    accentColor: '#b91c1c',
    lowerStation: {
      id: 'gloria-lower',
      name: 'Gloria Lower Station (Calcada da Gloria)',
      x: 864,
      y: 882,
      platformX: 832,
      platformY: 882
    },
    upperStation: {
      id: 'gloria-upper',
      name: 'Gloria Upper Station (Sao Pedro de Alcantara)',
      x: 864,
      y: 248,
      platformX: 832,
      platformY: 238
    },
    phrase: {
      pt: 'Vamos subir no Elevador da Gloria ate ao Bairro Alto!',
      pronunciation: 'Vah-moosh soo-beer noo Eh-leh-vah-dohr dah Gloh-ree-ah ah-teh ow Bye-roo Ahl-too!',
      en: 'Let us ride the Gloria Funicular up to Bairro Alto!'
    },
    description: 'Historic 1885 Carris cable funicular scaling steep Calcada da Gloria up to the Sao Pedro de Alcantara ridge in Bairro Alto.'
  }
];

export const MILESTONE_MEMORIES = {
  taste: {
    id: 'mem-milestone-taste',
    title: 'First Taste of Lisboa',
    category: 'milestone',
    neighborhood: 'Lisboa',
    caption: 'Warm pastries, salt cod, or grilled sardines shared across neighborhood counters.'
  },
  keepsake: {
    id: 'mem-milestone-keepsake',
    title: 'A Keepsake for the Road',
    category: 'milestone',
    neighborhood: 'Lisboa',
    caption: 'A small Lisbon treasure tucked safely in your satchel to remember these hills.'
  }
};

// Distinct Lisboa traveler clothing styles so every multiplayer participant looks clearly different
export const PLAYER_OUTFITS = [
  {
    id: 'lisbon-trench',
    name: 'Chiado Trench & Scarf',
    styleType: 'trench',
    primaryColor: '#1b4d89',
    secondaryColor: '#d4583b',
    accentColor: '#eab308',
    pantsColor: '#1e293b',
    hairColor: '#2d211b',
    skinColor: '#f2cfb2',
    ringColor: '#d4583b',
    hatType: 'none',
    description: 'Cobalt double-breasted trench coat with a warm terracotta scarf and satchel strap.'
  },
  {
    id: 'alfama-dress',
    name: 'Alfama Sundress & Sun Hat',
    styleType: 'sundress',
    primaryColor: '#c9433b',
    secondaryColor: '#fff7ed',
    accentColor: '#1b4d89',
    pantsColor: '#f5ebe0',
    hairColor: '#5a3622',
    skinColor: '#e8bc98',
    ringColor: '#c9433b',
    hatType: 'sunhat',
    description: 'Flared coral-crimson Mediterranean sundress with white sash and straw sun hat.'
  },
  {
    id: 'maritime-striped',
    name: 'Tagus Sailor Knit & Beret',
    styleType: 'sailor',
    primaryColor: '#f8fafc',
    secondaryColor: '#1e3a5f',
    accentColor: '#d97706',
    pantsColor: '#a89070',
    hairColor: '#3b2b20',
    skinColor: '#f0cbb0',
    ringColor: '#0284c7',
    hatType: 'beret',
    description: 'Navy-and-cream Breton striped sweater, ochre neckerchief, and dark wool beret.'
  },
  {
    id: 'bohemian-poncho',
    name: 'Bairro Alto Woven Poncho',
    styleType: 'poncho',
    primaryColor: '#157a64',
    secondaryColor: '#f59e0b',
    accentColor: '#fef3c7',
    pantsColor: '#475569',
    hairColor: '#6e3422',
    skinColor: '#dfa980',
    ringColor: '#157a64',
    hatType: 'headband',
    description: 'Emerald fringed woven poncho with golden diamond trim and braided headband.'
  },
  {
    id: 'tile-artisan',
    name: 'Azulejo Overalls & Flat Cap',
    styleType: 'overalls',
    primaryColor: '#315b8c',
    secondaryColor: '#eab308',
    accentColor: '#f8fafc',
    pantsColor: '#26466d',
    hairColor: '#231c18',
    skinColor: '#c98e68',
    ringColor: '#ca8a04',
    hatType: 'flatcap',
    description: 'Indigo denim dungaree overalls over an ochre collared shirt with a tweed flat cap.'
  },
  {
    id: 'fado-blazer',
    name: 'Linen Blazer & Fedora',
    styleType: 'blazer',
    primaryColor: '#ede4d3',
    secondaryColor: '#6d3257',
    accentColor: '#d97706',
    pantsColor: '#334155',
    hairColor: '#453429',
    skinColor: '#ebd0b6',
    ringColor: '#7e3a64',
    hatType: 'fedora',
    description: 'Tailored cream summer linen blazer over a plum waistcoat with a classic fedora.'
  }
];

export const MULTIPLAYER_SPAWN_POINTS = [
  { x: 946, y: 544 },
  { x: 1008, y: 544 },
  { x: 884, y: 544 },
  { x: 1070, y: 544 },
  { x: 822, y: 544 },
  { x: 1132, y: 544 }
];

export function getOutfitById(id) {
  return PLAYER_OUTFITS.find((o) => o.id === id) || PLAYER_OUTFITS[0];
}

// All ambient Lisbon locals patrol strictly on limestone sidewalks (never in the middle of streets or vehicle lanes)
export const AMBIENT_NPCS = [
  { id: 'npc-1', name: 'Local Artist', x: 640, y: 544, patrolAxis: 'x', min: 590, max: 805, speed: 18, shirt: '#3b6ea5', hair: '#3b2b20', outfitId: 'tile-artisan' },
  { id: 'npc-2', name: 'Chiado Musician', x: 1140, y: 676, patrolAxis: 'x', min: 1055, max: 1305, speed: 16, shirt: '#9f4438', hair: '#2a221e', outfitId: 'fado-blazer' },
  { id: 'npc-3', name: 'Rua Garrett Reader', x: 1130, y: 214, patrolAxis: 'x', min: 1055, max: 1305, speed: 17, shirt: '#2b6e59', hair: '#5a3d28', outfitId: 'alfama-dress' },
  { id: 'npc-4', name: 'Alfama Neighbor', x: 1910, y: 544, patrolAxis: 'x', min: 1825, max: 2075, speed: 18, shirt: '#c68a1e', hair: '#2c2521', outfitId: 'bohemian-poncho' },
  { id: 'npc-5', name: 'Tagus Stroller', x: 1420, y: 996, patrolAxis: 'x', min: 1050, max: 1860, speed: 20, shirt: '#6a4c7a', hair: '#40312a', outfitId: 'maritime-striped' },
  { id: 'npc-6', name: 'Bairro Alto Stroller', x: 340, y: 676, patrolAxis: 'x', min: 245, max: 448, speed: 17, shirt: '#2c5f8a', hair: '#3b2e26', outfitId: 'lisbon-trench' }
];

// Additional seasonal Lisbon crowds & festival strollers patrolling strictly on safe limestone sidewalks
export const SEASONAL_CROWD_NPCS = [
  { id: 'crowd-1', name: 'Camoes Visitor', x: 960, y: 676, patrolAxis: 'x', min: 865, max: 1030, speed: 17, shirt: '#e07a5f', hair: '#3b2b20', outfitId: 'alfama-dress', seasonal: true },
  { id: 'crowd-2', name: 'Alfama Reveler', x: 1915, y: 676, patrolAxis: 'x', min: 1815, max: 2070, speed: 18, shirt: '#d97706', hair: '#2c2521', outfitId: 'bohemian-poncho', seasonal: true },
  { id: 'crowd-3', name: 'Ribeira Stroller', x: 430, y: 996, patrolAxis: 'x', min: 255, max: 585, speed: 19, shirt: '#0284c7', hair: '#4a3222', outfitId: 'maritime-striped', seasonal: true },
  { id: 'crowd-4', name: 'Chiado Flaneur', x: 935, y: 352, patrolAxis: 'x', min: 870, max: 1020, speed: 16, shirt: '#157a64', hair: '#2a221e', outfitId: 'fado-blazer', seasonal: true },
  { id: 'crowd-5', name: 'Santa Apolonia Guest', x: 1960, y: 996, patrolAxis: 'x', min: 1880, max: 2135, speed: 18, shirt: '#b84a32', hair: '#3d2b1f', outfitId: 'tile-artisan', seasonal: true },
  { id: 'crowd-6', name: 'Loreto Traveler', x: 660, y: 676, patrolAxis: 'x', min: 585, max: 795, speed: 17, shirt: '#6d3257', hair: '#453429', outfitId: 'lisbon-trench', seasonal: true }
];

export const DEFAULT_MONTH = 5; // May (Peak Jacaranda bloom & warm luminous Lisbon spring)

// Warm-month athletic joggers running strictly along the sunlit Tagus waterfront promenade (May - Oct only!)
export const RIVERSIDE_JOGGERS = [
  { id: 'jogger-1', name: 'Ribeira Jogger', x: 340, y: 992, patrolAxis: 'x', min: 235, max: 585, speed: 78, shirt: '#0ea5e9', shorts: '#0f172a', hair: '#3b2b20', isJogger: true },
  { id: 'jogger-2', name: 'Tejo Runner', x: 1020, y: 992, patrolAxis: 'x', min: 855, max: 1380, speed: 82, shirt: '#ef4444', shorts: '#1e293b', hair: '#2a221e', isJogger: true },
  { id: 'jogger-3', name: 'Alfama Sprinter', x: 1620, y: 992, patrolAxis: 'x', min: 1465, max: 2115, speed: 80, shirt: '#10b981', shorts: '#1e293b', hair: '#5a3d28', isJogger: true }
];

// Evening Bairro Alto hilltop street-party revelers enjoying drinks outside Bar da Noite & Sao Pedro (Golden Hour & Evening)
export const BAIRRO_ALTO_PARTY_REVELERS = [
  { id: 'party-1', name: 'Ines & Friends', x: 82, y: 214, outfitId: 'alfama-dress', drinkColor: '#f59e0b', drinkType: 'imperial', toastPhrase: 'Saude!', phaseOffset: 0.2 },
  { id: 'party-2', name: 'Tomas', x: 168, y: 216, outfitId: 'fado-blazer', drinkColor: '#dc2626', drinkType: 'ginjinha', toastPhrase: 'Ginjinha!', phaseOffset: 1.4 },
  { id: 'party-3', name: 'Sofia B.', x: 194, y: 238, outfitId: 'bohemian-poncho', drinkColor: '#10b981', drinkType: 'caipirinha', toastPhrase: 'Viva o Bairro Alto!', phaseOffset: 2.5 },
  { id: 'party-4', name: 'Miguel R.', x: 266, y: 228, outfitId: 'maritime-striped', drinkColor: '#f59e0b', drinkType: 'imperial', toastPhrase: 'Mais uma imperial!', phaseOffset: 3.6 },
  { id: 'party-5', name: 'Clara M.', x: 406, y: 222, outfitId: 'lisbon-trench', drinkColor: '#e11d48', drinkType: 'sangria', toastPhrase: 'Boa noite!', phaseOffset: 4.8 },
  { id: 'party-6', name: 'Andre', x: 564, y: 218, outfitId: 'tile-artisan', drinkColor: '#f59e0b', drinkType: 'imperial', toastPhrase: 'Que festa!', phaseOffset: 5.7 },
  { id: 'party-7', name: 'Joana', x: 642, y: 224, outfitId: 'alfama-dress', drinkColor: '#10b981', drinkType: 'caipirinha', toastPhrase: 'A nossa!', phaseOffset: 6.4 }
];

export function isBairroAltoPartyTime(minutesOfDay) {
  const m = ((Math.floor(Number(minutesOfDay) || 0) % 1440) + 1440) % 1440;
  return m >= 17 * 60 || m < 4 * 60;
}

// Wooden & Lioz limestone benches lining the Ribeira das Naus / Tagus waterfront seawall
export const RIVERSIDE_BENCHES = [
  { id: 'rv-bench-1', x: 295, y: 1016, name: 'Bairro Alto Waterfront Bench', viewNote: 'Overlooking Ponte 25 de Abril and the western Tagus estuary' },
  { id: 'rv-bench-2', x: 475, y: 1016, name: 'Cais do Sodre West Bench', viewNote: 'Framing Ponte 25 de Abril, Cristo Rei, and passing lateen sailboats' },
  { id: 'rv-bench-3', x: 950, y: 1016, name: 'Ribeira das Naus Bench', viewNote: 'Clear riverside view of Cristo Rei, Almada Velha, and Cais do Ginjal' },
  { id: 'rv-bench-4', x: 1240, y: 1016, name: 'Terreiro do Paco Seawall Bench', viewNote: 'Watching Boca do Vento elevator, river gulls, and Tagus swells' },
  { id: 'rv-bench-5', x: 1520, y: 1016, name: 'Cais das Colunas Bench', viewNote: 'Looking across the shimmering river toward Farol de Cacilhas' },
  { id: 'rv-bench-6', x: 1795, y: 1016, name: 'Alfama Waterfront Bench', viewNote: 'Relaxing beside stone pines and harbor seagulls on the seawall' },
  { id: 'rv-bench-7', x: 2010, y: 1016, name: 'Santa Apolonia Promenade Bench', viewNote: 'Peaceful eastern Tagus view watching Fragata sails drift past' }
];

// Authentic Lisbon street roasted chestnut cone sold from October through February
export const CASTANHA_CONE_ITEM = {
  id: 'item-castanhas-cone',
  name: 'Hot Paper Cone of Castanhas Assadas',
  shortName: 'Cartucho de Castanhas',
  kind: 'food',
  costEur: 3.0,
  fullnessDelta: 24,
  energyDelta: 18,
  description: 'A piping-hot folded paper cone of 12 smoky charcoal-roasted chestnuts dusted with coarse sea salt.'
};

// Seasonal autumn/winter roasted chestnut street carts (Assadores de Castanhas: Oct - Feb)
export const CASTANHA_VENDORS = [
  {
    id: 'castanha-chiado',
    x: 988,
    y: 538,
    vendorName: 'Sr. Joaquim',
    locationName: 'Largo do Chiado',
    cry: 'Quentes e boas!',
    phrase: {
      pt: 'Uma duzia de castanhas assadas, quentes e boas, por favor!',
      pronunciation: 'Oo-mah doo-zee-ah deh kahsh-tah-nyash ah-sah-dash, ken-tesh ee boh-ash, poor fah-vohr!',
      en: 'A dozen hot, tasty roasted chestnuts, please!'
    }
  },
  {
    id: 'castanha-alfama',
    x: 1852,
    y: 538,
    vendorName: 'Dona Rosa',
    locationName: 'Calcada da Se (Alfama)',
    cry: 'Castanhas assadas!',
    phrase: {
      pt: 'Um cartucho de castanhas com sal grosso, por favor!',
      pronunciation: 'Oom kahr-too-shoo deh kahsh-tah-nyash kohn sahl groh-soo, poor fah-vohr!',
      en: 'A paper cone of roasted chestnuts with sea salt, please!'
    }
  },
  {
    id: 'castanha-ribeira',
    x: 895,
    y: 1012,
    vendorName: 'Sr. Antonio',
    locationName: 'Ribeira das Naus Waterfront',
    cry: 'Quentes e boas!',
    phrase: {
      pt: 'Castanhas quentinhas junto ao Tejo, por favor!',
      pronunciation: 'Kahsh-tah-nyash ken-tee-nyash zhoon-too ow Teh-zhoo, poor fah-vohr!',
      en: 'Piping-hot chestnuts by the Tagus River, please!'
    }
  },
  {
    id: 'castanha-cais',
    x: 1585,
    y: 1012,
    vendorName: 'Dona Maria',
    locationName: 'Cais do Sodre Promenade',
    cry: 'Castanhas quentinhas!',
    phrase: {
      pt: 'Quero um cartucho quentinho para o passeio na ribeira!',
      pronunciation: 'Keh-roo oom kahr-too-shoo ken-tee-nyoo pah-rah oo pah-say-oo nah ree-bay-rah!',
      en: 'I would like a warm paper cone for my riverside stroll!'
    }
  }
];

// Grounded in IPMA 1991-2020 Lisboa/Instituto Geofisico climate normals & authentic Lisboa cultural calendar
export const LISBOA_MONTHS = [
  {
    month: 1,
    id: 'jan',
    name: 'January',
    shortName: 'Jan',
    ptName: 'Janeiro',
    season: 'Winter',
    avgHighC: 15,
    avgLowC: 9,
    rainfallMm: 97,
    weatherId: 'winter-showers',
    weatherLabel: 'Cool Atlantic Showers',
    rainIntensity: 0.45,
    cloudiness: 0.62,
    sunBrightness: 0.82,
    wetGround: 0.45,
    jacarandaBloom: 0,
    foliageMode: 'winter',
    crowdExtra: 0,
    warmJoggersCount: 0,
    hasCastanhaVendors: true,
    decorStyle: 'janeiras-stars',
    eventTitle: 'Dia de Reis & Janeiras',
    eventTag: 'DIA DE REIS',
    eventNote: 'Cool 15C winter air with passing Atlantic showers, Epiphany gold stars over Chiado, and warm castanhas assadas.'
  },
  {
    month: 2,
    id: 'feb',
    name: 'February',
    shortName: 'Feb',
    ptName: 'Fevereiro',
    season: 'Winter',
    avgHighC: 16,
    avgLowC: 9,
    rainfallMm: 90,
    weatherId: 'carnaval-breeze',
    weatherLabel: 'Breezy & Mild Showers',
    rainIntensity: 0.3,
    cloudiness: 0.52,
    sunBrightness: 0.88,
    wetGround: 0.28,
    jacarandaBloom: 0,
    foliageMode: 'winter',
    crowdExtra: 2,
    warmJoggersCount: 0,
    hasCastanhaVendors: true,
    decorStyle: 'carnaval',
    eventTitle: 'Carnaval de Lisboa',
    eventTag: 'CARNAVAL',
    eventNote: 'Vibrant Carnival bunting garlands, fluttering confetti, costumed street revelers, and crisp 16C Atlantic breezes.'
  },
  {
    month: 3,
    id: 'mar',
    name: 'March',
    shortName: 'Mar',
    ptName: 'Marco',
    season: 'Spring',
    avgHighC: 19,
    avgLowC: 11,
    rainfallMm: 51,
    weatherId: 'early-spring',
    weatherLabel: 'Fresh Spring Sun',
    rainIntensity: 0.14,
    cloudiness: 0.36,
    sunBrightness: 0.96,
    wetGround: 0.1,
    jacarandaBloom: 0.15,
    foliageMode: 'spring',
    crowdExtra: 1,
    warmJoggersCount: 0,
    hasCastanhaVendors: false,
    decorStyle: 'marathon-banners',
    eventTitle: 'Meia Maratona de Lisboa',
    eventTag: 'MEIA MARATONA',
    eventNote: 'Fresh 19C spring sunshine and blue-and-gold Lisbon Half Marathon banners celebrating the Ponte 25 de Abril crossing.'
  },
  {
    month: 4,
    id: 'apr',
    name: 'April',
    shortName: 'Apr',
    ptName: 'Abril',
    season: 'Spring',
    avgHighC: 20,
    avgLowC: 12,
    rainfallMm: 65,
    weatherId: 'april-spring',
    weatherLabel: 'Spring Sun & Light Showers',
    rainIntensity: 0.18,
    cloudiness: 0.4,
    sunBrightness: 0.98,
    wetGround: 0.15,
    jacarandaBloom: 0.35,
    foliageMode: 'spring',
    crowdExtra: 3,
    warmJoggersCount: 0,
    hasCastanhaVendors: false,
    decorStyle: 'cravos-25-abril',
    eventTitle: '25 de Abril - Dia da Liberdade',
    eventTag: '25 DE ABRIL',
    eventNote: 'Carnation Revolution celebrations: red carnations (cravos vermelhos), Portuguese green-red banners, and drifting red petals across Chiado and Alfama.'
  },
  {
    month: 5,
    id: 'may',
    name: 'May',
    shortName: 'May',
    ptName: 'Maio',
    season: 'Spring',
    avgHighC: 23,
    avgLowC: 14,
    rainfallMm: 56,
    weatherId: 'sunny-spring',
    weatherLabel: 'Luminous Spring Sun',
    rainIntensity: 0,
    cloudiness: 0.22,
    sunBrightness: 1.05,
    wetGround: 0,
    jacarandaBloom: 1.0,
    foliageMode: 'bloom',
    crowdExtra: 0,
    warmJoggersCount: 2,
    hasCastanhaVendors: false,
    decorStyle: 'jacaranda-bloom',
    eventTitle: 'Floracao dos Jacarandas & Feira do Livro',
    eventTag: 'JACARANDAS',
    eventNote: 'Iconic 23C Lisbon spring when violet Jacaranda canopies carpet Bairro Alto, Chiado, and the Tagus promenade in purple blossoms.'
  },
  {
    month: 6,
    id: 'jun',
    name: 'June',
    shortName: 'Jun',
    ptName: 'Junho',
    season: 'Summer',
    avgHighC: 26,
    avgLowC: 17,
    rainfallMm: 17,
    weatherId: 'warm-festive',
    weatherLabel: 'Warm Sunny & Festive',
    rainIntensity: 0,
    cloudiness: 0.14,
    sunBrightness: 1.12,
    wetGround: 0,
    jacarandaBloom: 0.85,
    foliageMode: 'bloom',
    crowdExtra: 5,
    warmJoggersCount: 3,
    hasCastanhaVendors: false,
    decorStyle: 'santos-populares',
    eventTitle: 'Festas de Lisboa & Santo Antonio',
    eventTag: 'SANTOS POPULARES',
    eventNote: 'Peak Lisbon festival month: colorful overhead arraiais garlands, glowing lanterns, sweet basil manjericos, grilled sardines, and festive Alfama crowds.'
  },
  {
    month: 7,
    id: 'jul',
    name: 'July',
    shortName: 'Jul',
    ptName: 'Julho',
    season: 'Summer',
    avgHighC: 28,
    avgLowC: 18,
    rainfallMm: 6,
    weatherId: 'bright-summer',
    weatherLabel: 'Dazzling Summer Sun',
    rainIntensity: 0,
    cloudiness: 0.08,
    sunBrightness: 1.22,
    wetGround: 0,
    jacarandaBloom: 0.15,
    foliageMode: 'lush',
    crowdExtra: 6,
    warmJoggersCount: 3,
    hasCastanhaVendors: false,
    decorStyle: 'summer-sun',
    eventTitle: 'Verao de Lisboa & Atlantic Sun',
    eventTag: 'VERAO BRIGHT',
    eventNote: 'Dry 28C summer brilliance with 350 hours of clear cobalt sky, radiant Tagus sunlight, riverside joggers, terrace parasols, and bustling summer crowds.'
  },
  {
    month: 8,
    id: 'aug',
    name: 'August',
    shortName: 'Aug',
    ptName: 'Agosto',
    season: 'Summer',
    avgHighC: 29,
    avgLowC: 19,
    rainfallMm: 7,
    weatherId: 'hot-summer',
    weatherLabel: 'Hot Golden Summer',
    rainIntensity: 0,
    cloudiness: 0.1,
    sunBrightness: 1.2,
    wetGround: 0,
    jacarandaBloom: 0,
    foliageMode: 'lush',
    crowdExtra: 5,
    warmJoggersCount: 3,
    hasCastanhaVendors: false,
    decorStyle: 'summer-festival',
    eventTitle: 'Calor de Agosto & Jazz em Agosto',
    eventTag: 'JAZZ EM AGOSTO',
    eventNote: 'Lisbon warmest 29C dry summer glow with golden Mediterranean haze, riverside runners, lively waterfront terraces, and evening open-air jazz lanterns.'
  },
  {
    month: 9,
    id: 'sep',
    name: 'September',
    shortName: 'Sep',
    ptName: 'Setembro',
    season: 'Autumn',
    avgHighC: 27,
    avgLowC: 18,
    rainfallMm: 29,
    weatherId: 'late-summer',
    weatherLabel: 'Warm Golden Late Summer',
    rainIntensity: 0.08,
    cloudiness: 0.24,
    sunBrightness: 1.06,
    wetGround: 0.05,
    jacarandaBloom: 0,
    foliageMode: 'lush',
    crowdExtra: 3,
    warmJoggersCount: 3,
    hasCastanhaVendors: false,
    decorStyle: 'alfama-fado',
    eventTitle: 'Caixa Alfama Fado & Vindimas',
    eventTag: 'CAIXA ALFAMA',
    eventNote: 'Golden 27C late-summer warmth with deep burgundy-and-gold Fado festival pennants draped across Alfama and Chiado.'
  },
  {
    month: 10,
    id: 'oct',
    name: 'October',
    shortName: 'Oct',
    ptName: 'Outubro',
    season: 'Autumn',
    avgHighC: 23,
    avgLowC: 15,
    rainfallMm: 80,
    weatherId: 'autumn-showers',
    weatherLabel: 'Golden Autumn & Showers',
    rainIntensity: 0.42,
    cloudiness: 0.54,
    sunBrightness: 0.88,
    wetGround: 0.4,
    jacarandaBloom: 0,
    foliageMode: 'autumn',
    crowdExtra: 1,
    warmJoggersCount: 2,
    hasCastanhaVendors: true,
    decorStyle: 'autumn-leaves',
    eventTitle: 'Outono & Primeiras Castanhas',
    eventTag: 'OUTONO DOURADO',
    eventNote: 'Mild 23C amber autumn light with swirling golden leaves, occasional Atlantic rain showers, and the season first roasted chestnut carts.'
  },
  {
    month: 11,
    id: 'nov',
    name: 'November',
    shortName: 'Nov',
    ptName: 'Novembro',
    season: 'Autumn',
    avgHighC: 18,
    avgLowC: 12,
    rainfallMm: 107,
    weatherId: 'atlantic-rain',
    weatherLabel: 'Rainy Atlantic & Castanhas',
    rainIntensity: 0.92,
    cloudiness: 0.86,
    sunBrightness: 0.68,
    wetGround: 0.9,
    jacarandaBloom: 0,
    foliageMode: 'autumn',
    crowdExtra: 0,
    warmJoggersCount: 0,
    hasCastanhaVendors: true,
    decorStyle: 'november-rain',
    eventTitle: 'Sao Martinho & Atlantic Rain',
    eventTag: 'SAO MARTINHO',
    eventNote: 'Rainy 18C November skies (107mm rainfall) with glistening wet calcada, umbrellas, and smoking Castanhas Assadas chestnut roasters.'
  },
  {
    month: 12,
    id: 'dec',
    name: 'December',
    shortName: 'Dec',
    ptName: 'Dezembro',
    season: 'Winter',
    avgHighC: 15,
    avgLowC: 9,
    rainfallMm: 122,
    weatherId: 'festive-winter',
    weatherLabel: 'Crisp Winter & Light Rain',
    rainIntensity: 0.48,
    cloudiness: 0.72,
    sunBrightness: 0.74,
    wetGround: 0.55,
    jacarandaBloom: 0,
    foliageMode: 'winter',
    crowdExtra: 3,
    warmJoggersCount: 0,
    hasCastanhaVendors: true,
    decorStyle: 'christmas-lights',
    eventTitle: 'Luzes de Natal & Passagem de Ano',
    eventTag: 'NATAL EM LISBOA',
    eventNote: 'Iconic 15C December holiday atmosphere: golden Christmas light arches across streets, glowing stars, a Camoes Christmas tree, chestnut vendors, and winter rain.'
  }
];

export function getMonthInfo(monthNumber = DEFAULT_MONTH) {
  const n = Math.floor(Number(monthNumber));
  return LISBOA_MONTHS.find((m) => m.month === n) || LISBOA_MONTHS[DEFAULT_MONTH - 1];
}

export function getAllTransitStops() {
  const stops = [];
  for (const line of TRANSIT_LINES) {
    line.waypoints.forEach((wp, index) => {
      if (wp.stopId) {
        stops.push({
          stopId: wp.stopId,
          stopName: wp.stopName,
          lineId: line.id,
          lineName: line.name,
          mode: line.mode,
          badge: line.badge,
          fareEur: line.fareEur,
          waypointIndex: index,
          x: wp.x,
          y: wp.y,
          platformX: wp.x,
          platformY: wp.platformY
        });
      }
    });
  }
  return stops;
}

export function getAllMemoryCatalog() {
  const catalog = [];
  for (const venue of VENUES) {
    catalog.push(venue.memory);
  }
  for (const line of TRANSIT_LINES) {
    catalog.push(line.memory);
  }
  catalog.push(METRO_LINE.memory);
  for (const ferryDest of FERRY_DESTINATIONS) {
    catalog.push(ferryDest.memory);
  }
  for (const spot of REST_SPOTS) {
    catalog.push(spot.memory);
  }
  catalog.push(MILESTONE_MEMORIES.taste);
  catalog.push(MILESTONE_MEMORIES.keepsake);
  return catalog;
}

export function getNeighborhoodForX(x) {
  for (const hood of NEIGHBORHOODS) {
    if (x >= hood.minX && x < hood.maxX) {
      return hood;
    }
  }
  return NEIGHBORHOODS[NEIGHBORHOODS.length - 1];
}
