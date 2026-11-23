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
  name: 'Metropolitano de Lisboa (4-Line Network)',
  badge: '[METRO]',
  fareEur: 1.8,
  travelMinutes: 6,
  phrase: {
    pt: 'Um bilhete de metro para a rede do Metropolitano de Lisboa, por favor.',
    pronunciation: 'Oom bee-lyeh-teh deh meh-troo pah-rah ah heh-deh doo Meh-troo-poh-lee-tah-noo deh Leesh-boh-ah, poor fah-vohr.',
    en: 'One metro ticket for the Lisbon Metro network, please.'
  },
  memory: {
    id: 'mem-ride-metro-lisboa',
    title: 'Underground Tiles of Metro de Lisboa',
    category: 'transit',
    neighborhood: 'Chiado & Alfama Waterfront',
    caption: 'Descending the long escalators at Baixa-Chiado beneath Lisbon hills toward the Tagus waterfront.'
  }
};

// Factual 4-Line Metropolitano de Lisboa Official Network (https://www.metrolisboa.pt/) - all 56 station stops across 4 lines
export const METRO_NETWORK_LINES = [
  {
    id: 'linha-azul',
    name: 'Linha Azul',
    ptSymbolName: 'Linha da Gaivota (Seagull Line)',
    badge: '[LINHA AZUL]',
    color: '#2563eb',
    darkColor: '#1d4ed8',
    lightColor: '#dbeafe',
    termini: ['Reboleira', 'Santa Apolonia'],
    stations: [
      'Reboleira',
      'Amadora Este',
      'Alfornelos',
      'Pontinha',
      'Carnide',
      'Colegio Militar/Luz',
      'Alto dos Moinhos',
      'Laranjeiras',
      'Jardim Zoologico',
      'Praca de Espanha',
      'Sao Sebastiao',
      'Parque',
      'Marques de Pombal',
      'Avenida',
      'Restauradores',
      'Baixa-Chiado',
      'Terreiro do Paco',
      'Santa Apolonia'
    ]
  },
  {
    id: 'linha-amarela',
    name: 'Linha Amarela',
    ptSymbolName: 'Linha do Girassol (Sunflower Line)',
    badge: '[LINHA AMARELA]',
    color: '#eab308',
    darkColor: '#ca8a04',
    lightColor: '#fef9c3',
    termini: ['Odivelas', 'Rato'],
    stations: [
      'Odivelas',
      'Senhor Roubado',
      'Ameixoeira',
      'Lumiar',
      'Quinta das Conchas',
      'Campo Grande',
      'Cidade Universitaria',
      'Entre Campos',
      'Campo Pequeno',
      'Saldanha',
      'Picoas',
      'Marques de Pombal',
      'Rato'
    ]
  },
  {
    id: 'linha-verde',
    name: 'Linha Verde',
    ptSymbolName: 'Linha da Caravela (Caravel Line)',
    badge: '[LINHA VERDE]',
    color: '#16a34a',
    darkColor: '#15803d',
    lightColor: '#dcfce7',
    termini: ['Telheiras', 'Cais do Sodre'],
    stations: [
      'Telheiras',
      'Campo Grande',
      'Alvalade',
      'Roma',
      'Areeiro',
      'Alameda',
      'Arroios',
      'Anjos',
      'Intendente',
      'Martim Moniz',
      'Rossio',
      'Baixa-Chiado',
      'Cais do Sodre'
    ]
  },
  {
    id: 'linha-vermelha',
    name: 'Linha Vermelha',
    ptSymbolName: 'Linha do Oriente (Compass Rose Line)',
    badge: '[LINHA VERMELHA]',
    color: '#dc2626',
    darkColor: '#b91c1c',
    lightColor: '#fee2e2',
    termini: ['Sao Sebastiao', 'Aeroporto'],
    stations: [
      'Sao Sebastiao',
      'Saldanha',
      'Alameda',
      'Olaias',
      'Bela Vista',
      'Chelas',
      'Olivais',
      'Cabo Ruivo',
      'Oriente',
      'Moscavide',
      'Encarnacao',
      'Aeroporto'
    ]
  }
];

export const METRO_STATIONS = [
  {
    id: 'metro-baixa-chiado',
    name: 'Metro Baixa-Chiado',
    canonicalStopName: 'Baixa-Chiado',
    corridorStops: ['Baixa-Chiado'],
    neighborhood: 'chiado',
    zoneLabel: 'Historic Core (Chiado & Baixa)',
    order: 0,
    lines: ['Linha Azul', 'Linha Verde'],
    lineColors: ['#2563eb', '#16a34a'],
    transitConnections: ['Eletrico 28E (Largo do Chiado)', 'Elevador de Santa Justa (Baixa Walkway)', 'Carris Bus 758'],
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
      nextTrainDest: 'Santa Apolonia / Cais do Sodre',
      oppositeDest: 'Reboleira / Telheiras',
      transferLine: 'Linha Azul & Linha Verde Hub'
    },
    note: 'Deep transfer station right beside Cafe A Brasileira on Largo do Chiado, connecting Linha Azul and Linha Verde beneath historic Chiado.'
  },
  {
    id: 'metro-terreiro-paco',
    name: 'Metro Terreiro do Paco',
    canonicalStopName: 'Terreiro do Paco',
    corridorStops: ['Terreiro do Paco'],
    neighborhood: 'chiado',
    zoneLabel: 'Historic Core (Praca do Comercio Waterfront)',
    order: 1,
    lines: ['Linha Azul'],
    lineColors: ['#2563eb'],
    transitConnections: ['Transtejo Soflusa River Terminal (Barreiro)', 'Eletrico 15E & 25E', 'Carris Waterfront Buses 728 / 735'],
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
    note: 'Tagus riverside Blue Line station at Praca do Comercio on the edge of Baixa and lower Alfama.'
  },
  {
    id: 'metro-santa-apolonia',
    name: 'Metro Santa Apolonia',
    canonicalStopName: 'Santa Apolonia',
    corridorStops: ['Santa Apolonia'],
    neighborhood: 'alfama',
    zoneLabel: 'Historic Core (Alfama & National Rail Terminus)',
    order: 2,
    lines: ['Linha Azul'],
    lineColors: ['#2563eb'],
    transitConnections: ['CP Alfa Pendular & Intercidades (Porto / Coimbra)', 'Carris Buses 728 / 735 / 759', 'Lisbon Cruise Terminal'],
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
    note: 'Eastern Blue Line terminus beneath Estacao de Santa Apolonia along the Alfama riverfront below Portas do Sol.'
  }
];

// City-wide Metropolitano de Lisboa stations spanning all 4 official lines, all 6 transfer hubs, and walkable Lisbon districts
export const CITY_METRO_STATIONS = [
  {
    id: 'metro-cais-sodre',
    name: 'Metro Cais do Sodre (Belem Corridor)',
    canonicalStopName: 'Cais do Sodre',
    corridorStops: ['Cais do Sodre'],
    neighborhood: 'cais-sodre-belem',
    zoneLabel: 'Riverfront & Western Belem Corridor',
    districtId: 'district-cais-sodre-belem',
    order: 3,
    lines: ['Linha Verde'],
    lineColors: ['#16a34a'],
    transitConnections: ['Eletrico 15E (Alges / Mosteiro dos Jeronimos / Torre de Belem)', 'CP Linha de Cascais', 'Transtejo Ferry (Cacilhas / Seixal / Montijo)'],
    undergroundTheme: {
      wallPrimary: '#d8ece2',
      tileAccent: '#15803d',
      platformFloor: '#ced8d2',
      trim: '#14532d',
      artLabel: 'ANTONIO DACOSTA - BLUE RABBITS IN WONDERLAND AZULEJOS',
      architect: 'Nuno Teotonio Pereira & Pedro Botelho (1998)',
      artist: 'Antonio Dacosta & Pedro Morais',
      muralStyle: 'dacosta-wonderland-tiles',
      nextTrainDest: 'Telheiras (via Baixa-Chiado & Rossio)',
      oppositeDest: 'Terminus (Riverfront Hub)',
      transferLine: 'CP Cascais Rail, Eletrico 15E to Belem & Transtejo Ferries'
    },
    note: 'Award-winning southern Linha Verde terminus adorned with giant cobalt Alice-in-Wonderland rabbit panels, linking directly to Eletrico 15E for Belem.'
  },
  {
    id: 'metro-rossio',
    name: 'Metro Rossio (Baixa & Santa Justa)',
    canonicalStopName: 'Rossio',
    corridorStops: ['Rossio', 'Martim Moniz', 'Intendente', 'Anjos', 'Arroios', 'Restauradores'],
    neighborhood: 'baixa-rossio',
    zoneLabel: 'Pombaline Baixa, Rossio & Almirante Reis',
    districtId: 'district-rossio-restauradores',
    order: 4,
    lines: ['Linha Verde'],
    lineColors: ['#16a34a'],
    transitConnections: ['Elevador de Santa Justa (1902 Neo-Gothic Lift)', 'CP Linha de Sintra (Estacao do Rossio)', 'Eletrico 12E & 15E', 'Restauradores (Linha Azul Walkway)'],
    undergroundTheme: {
      wallPrimary: '#e2ede4',
      tileAccent: '#166534',
      platformFloor: '#d6dbd4',
      trim: '#14532d',
      artLabel: 'MARIA KEIL & ARTUR ROSA - GEOMETRIC EMERALD AZULEJOS',
      architect: 'Falcao e Cunha (1963) / Leopoldo de Almeida Rosa (1998)',
      artist: 'Maria Keil & Artur Rosa',
      muralStyle: 'keil-geometric-patterns',
      nextTrainDest: 'Telheiras (via Martim Moniz & Alameda)',
      oppositeDest: 'Cais do Sodre (via Baixa-Chiado)',
      transferLine: 'CP Sintra Line & Elevador de Santa Justa'
    },
    note: 'Historic downtown Linha Verde station opening directly onto Praca Dom Pedro IV (Rossio), the baroque fountains, Teatro Nacional D. Maria II, and Elevador de Santa Justa.'
  },
  {
    id: 'metro-marques-pombal',
    name: 'Metro Marques de Pombal (Avenida & Parque)',
    canonicalStopName: 'Marques de Pombal',
    corridorStops: ['Marques de Pombal', 'Parque', 'Avenida', 'Picoas'],
    neighborhood: 'avenida-liberdade',
    zoneLabel: 'Avenida da Liberdade & Parque Eduardo VII',
    districtId: 'district-marques-pombal-avenida',
    order: 5,
    lines: ['Linha Azul', 'Linha Amarela'],
    lineColors: ['#2563eb', '#eab308'],
    transitConnections: ['Linha Azul & Linha Amarela Transfer Hub', 'Elevador do Lavra (1884 Funicular)', 'Carris Aerobus & 736 / 744 Boulevard Lines'],
    undergroundTheme: {
      wallPrimary: '#f2ead2',
      tileAccent: '#ca8a04',
      platformFloor: '#dcd6c6',
      trim: '#1d4ed8',
      artLabel: 'MARIA KEIL & JOAO CUTILEIRO - POMBAL HERALDIC MOSAICS',
      architect: 'Falcao e Cunha (1959) / Duarte Nuno Simoes (1995)',
      artist: 'Maria Keil, Joao Cutileiro & Menez',
      muralStyle: 'keil-geometric-patterns',
      nextTrainDest: 'Odivelas / Reboleira',
      oppositeDest: 'Rato / Santa Apolonia',
      transferLine: 'Linha Azul & Linha Amarela Interchange'
    },
    note: 'Central Lisbon interchange where the original 1959 Y-network split into Linha Azul and Linha Amarela beneath the Monumento ao Marques de Pombal and Parque Eduardo VII.'
  },
  {
    id: 'metro-rato',
    name: 'Metro Rato (Principe Real & Amoreiras)',
    canonicalStopName: 'Rato',
    corridorStops: ['Rato'],
    neighborhood: 'principe-real',
    zoneLabel: 'Largo do Rato, Principe Real & Aguas Livres Aqueduct',
    districtId: 'district-rato-principe-real',
    order: 6,
    lines: ['Linha Amarela'],
    lineColors: ['#eab308'],
    transitConnections: ['Eletrico 24E (Campolide - Principe Real - Camoes)', 'Carris Buses 758 / 773 / 713', 'Mae d Agua das Amoreiras Aqueduct Reservoir'],
    undergroundTheme: {
      wallPrimary: '#f6edd5',
      tileAccent: '#b45309',
      platformFloor: '#dfd7c5',
      trim: '#92400e',
      artLabel: 'MANUEL CARGALEIRO & VIEIRA DA SILVA - POLYCHROME AZULEJOS',
      architect: 'Sanchez Jorge (1997)',
      artist: 'Manuel Cargaleiro, Arpad Szenes & Maria Helena Vieira da Silva',
      muralStyle: 'cargaleiro-polychrome',
      nextTrainDest: 'Odivelas (via Marques de Pombal & Saldanha)',
      oppositeDest: 'Terminus (Largo do Rato)',
      transferLine: 'Eletrico 24E to Principe Real & Camoes'
    },
    note: 'Southern terminus of Linha Amarela featuring vibrant polychrome geometric tile panels by Manuel Cargaleiro and poetic portraits of Arpad Szenes and Vieira da Silva.'
  },
  {
    id: 'metro-saldanha-campo-pequeno',
    name: 'Metro Saldanha & Campo Pequeno',
    canonicalStopName: 'Saldanha',
    corridorStops: ['Saldanha', 'Campo Pequeno', 'Entre Campos'],
    neighborhood: 'avenidas-novas',
    zoneLabel: 'Avenidas Novas, Saldanha & Campo Pequeno',
    districtId: 'district-saldanha-campo-pequeno',
    order: 7,
    lines: ['Linha Amarela', 'Linha Vermelha'],
    lineColors: ['#eab308', '#dc2626'],
    transitConnections: ['Linha Amarela & Linha Vermelha Transfer Hub', 'CP Entre Campos Urban Rail', 'Carris Express Corridor 727 / 736 / 744'],
    undergroundTheme: {
      wallPrimary: '#f3e5d8',
      tileAccent: '#b91c1c',
      platformFloor: '#ded4c8',
      trim: '#a16207',
      artLabel: 'ALMADA NEGREIROS & JORGE VIEIRA - MARBLE RELIEFS & BRONZE',
      architect: 'Falcao e Cunha (1959) / Paulo Brito da Silva (2009)',
      artist: 'Jorge Vieira, Luis Filipe de Abreu & Almada Negreiros Tribute',
      muralStyle: 'almada-marble-reliefs',
      nextTrainDest: 'Aeroporto / Odivelas',
      oppositeDest: 'Sao Sebastiao / Rato',
      transferLine: 'Linha Amarela & Linha Vermelha Interchange'
    },
    note: 'Major Avenidas Novas interchange uniting Linha Amarela and Linha Vermelha beneath Praca Duque de Saldanha and the 1892 Neo-Moorish brick dome of Campo Pequeno.'
  },
  {
    id: 'metro-sao-sebastiao-zoologico',
    name: 'Metro Sao Sebastiao (Gulbenkian, Zoo & Reboleira)',
    canonicalStopName: 'Sao Sebastiao',
    corridorStops: [
      'Sao Sebastiao',
      'Praca de Espanha',
      'Jardim Zoologico',
      'Laranjeiras',
      'Alto dos Moinhos',
      'Colegio Militar/Luz',
      'Carnide',
      'Pontinha',
      'Alfornelos',
      'Amadora Este',
      'Reboleira'
    ],
    neighborhood: 'sete-rios-gulbenkian',
    zoneLabel: 'Gulbenkian Gardens, Sete Rios Zoo & Northwestern Blue Line',
    districtId: 'district-sao-sebastiao-sete-rios',
    order: 8,
    lines: ['Linha Azul', 'Linha Vermelha'],
    lineColors: ['#2563eb', '#dc2626'],
    transitConnections: ['Linha Azul & Linha Vermelha Transfer Hub', 'Teleferico do Jardim Zoologico', 'CP Sete Rios & Rede Expressos Coach Terminal'],
    undergroundTheme: {
      wallPrimary: '#e5ecf6',
      tileAccent: '#1d4ed8',
      platformFloor: '#d5dce4',
      trim: '#b91c1c',
      artLabel: 'MARIA KEIL & JULIO POMAR - ZOO FAUNA & MODERNIST TILES',
      architect: 'Falcao e Cunha (1959) / Tiago Henriques (2009)',
      artist: 'Maria Keil & Julio Pomar',
      muralStyle: 'pomar-zoo-fauna',
      nextTrainDest: 'Aeroporto / Reboleira',
      oppositeDest: 'Santa Apolonia (via Marques de Pombal & Baixa-Chiado)',
      transferLine: 'Linha Azul & Linha Vermelha Terminus Hub'
    },
    note: 'Western transfer hub linking Linha Azul (toward Jardim Zoologico, Colegio Militar/Luz, and Reboleira) with the western terminus of Linha Vermelha next to Fundacao Calouste Gulbenkian.'
  },
  {
    id: 'metro-campo-grande-alvalade',
    name: 'Metro Campo Grande (Universidade, Alvalade & Odivelas)',
    canonicalStopName: 'Campo Grande',
    corridorStops: [
      'Campo Grande',
      'Cidade Universitaria',
      'Quinta das Conchas',
      'Lumiar',
      'Ameixoeira',
      'Senhor Roubado',
      'Odivelas',
      'Telheiras',
      'Alvalade',
      'Roma',
      'Areeiro'
    ],
    neighborhood: 'campo-grande-alvalade',
    zoneLabel: 'Cidade Universitaria, Campo Grande, Alvalade & Northern Termini',
    districtId: 'district-campo-grande-alvalade',
    order: 9,
    lines: ['Linha Amarela', 'Linha Verde'],
    lineColors: ['#eab308', '#16a34a'],
    transitConnections: ['Linha Amarela & Linha Verde Viaduct Hub', 'Carris Metropolitana Northern Terminal', 'Cidade Universitaria Campus Loop'],
    undergroundTheme: {
      wallPrimary: '#e4efe8',
      tileAccent: '#15803d',
      platformFloor: '#d4ddd6',
      trim: '#ca8a04',
      artLabel: 'EDUARDO NERY - 18TH-CENTURY BAROQUE CONVITE TILE FIGURES',
      architect: 'Ezequiel Nicolau (1993)',
      artist: 'Eduardo Nery (Fabrica Viúva Lamego Cutouts)',
      muralStyle: 'nery-convite-sentinels',
      nextTrainDest: 'Odivelas / Telheiras',
      oppositeDest: 'Rato / Cais do Sodre',
      transferLine: 'Linha Amarela & Linha Verde Interchange'
    },
    note: 'Northern interchange uniting Linha Amarela (to Lumiar and Odivelas) and Linha Verde (to Telheiras and Alvalade), guarded by Eduardo Nery blue-and-white baroque tile sentinels.'
  },
  {
    id: 'metro-alameda',
    name: 'Metro Alameda (Fonte Luminosa & Olaias)',
    canonicalStopName: 'Alameda',
    corridorStops: ['Alameda', 'Olaias', 'Bela Vista', 'Chelas'],
    neighborhood: 'alameda-arroios',
    zoneLabel: 'Alameda Dom Afonso Henriques, Fonte Luminosa & Olaias',
    districtId: 'district-alameda-arroios',
    order: 10,
    lines: ['Linha Verde', 'Linha Vermelha'],
    lineColors: ['#16a34a', '#dc2626'],
    transitConnections: ['Linha Verde & Linha Vermelha Transfer Hub', 'Carris Buses 708 / 717 / 720 / 735', 'Instituto Superior Tecnico Esplanade'],
    undergroundTheme: {
      wallPrimary: '#f5e4dc',
      tileAccent: '#dc2626',
      platformFloor: '#dfd4ce',
      trim: '#15803d',
      artLabel: 'COSTA PINHEIRO & TAVEIRA - NAVIGATORS & POLYCHROME ARCHES',
      architect: 'Falcao e Cunha / Manuel Tainha & Tomas Taveira (1998)',
      artist: 'Maria Keil, Costa Pinheiro & Alberto Carneiro',
      muralStyle: 'taveira-polychrome-arches',
      nextTrainDest: 'Aeroporto (via Oriente) / Telheiras',
      oppositeDest: 'Cais do Sodre / Sao Sebastiao',
      transferLine: 'Linha Verde & Linha Vermelha Interchange'
    },
    note: 'Eastern junction where Linha Verde meets Linha Vermelha beneath the monumental 1948 Fonte Luminosa and beside the polychrome cathedral columns of Olaias.'
  },
  {
    id: 'metro-oriente-aeroporto',
    name: 'Metro Oriente & Aeroporto (Parque das Nacoes)',
    canonicalStopName: 'Oriente',
    corridorStops: ['Oriente', 'Cabo Ruivo', 'Olivais', 'Moscavide', 'Encarnacao', 'Aeroporto'],
    neighborhood: 'parque-das-nacoes',
    zoneLabel: 'Parque das Nacoes, Gare do Oriente & Aeroporto Humberto Delgado',
    districtId: 'district-oriente-parque-nacoes',
    order: 11,
    lines: ['Linha Vermelha'],
    lineColors: ['#dc2626'],
    transitConnections: ['Gare do Oriente High-Speed Rail & Bus Hub', 'Telecabine Lisboa (Parque das Nacoes Gondola)', 'Aeroporto Humberto Delgado (Linha Vermelha Terminus)'],
    undergroundTheme: {
      wallPrimary: '#e8eef5',
      tileAccent: '#dc2626',
      platformFloor: '#d4dce6',
      trim: '#1e3a8a',
      artLabel: 'SANTIAGO CALATRAVA VAULT - 11 GLOBAL ARTISTS OCEAN MURALS',
      architect: 'Santiago Calatrava & Sanchez Jorge (1998)',
      artist: 'Hundertwasser, Yayoi Kusama, Erro, Raza, Zao Wou-Ki & Abakanowicz',
      muralStyle: 'calatrava-oceans-mural',
      nextTrainDest: 'Aeroporto (via Moscavide & Encarnacao)',
      oppositeDest: 'Sao Sebastiao (via Alameda & Saldanha)',
      transferLine: 'Gare do Oriente Rail, Telecabine Lisboa & Aeroporto'
    },
    note: 'Monumental Expo 98 intermodal station designed by Santiago Calatrava featuring ceramic ocean murals by 11 artists from all five continents, extending north to Aeroporto.'
  }
];

export const ALL_METRO_STATIONS = [...METRO_STATIONS, ...CITY_METRO_STATIONS];

// Walkable 3D & 2D Lisbon City Districts connected to the 9 city-wide Metropolitano de Lisboa stations
export const LISBOA_CITY_DISTRICTS = [
  {
    id: 'district-cais-sodre-belem',
    stationId: 'metro-cais-sodre',
    name: 'Cais do Sodre & Belem Waterfront Corridor',
    shortName: 'Cais do Sodre / Belem',
    zoneBadge: '[LINHA VERDE + ELETRICO 15E]',
    accentColor: '#16a34a',
    skylineStyle: 'belem-tower',
    transitSummary: 'Linha Verde Terminus | Eletrico 15E to Belem | CP Cascais Line | Transtejo Ferries',
    description: 'Walk from the Linha Verde riverfront terminus along the Tagus avenue served by Eletrico 15E toward Mosteiro dos Jeronimos, Torre de Belem, and Padrao dos Descobrimentos.',
    plazaNote: 'Stroll the riverfront calçada plaza: savor warm custard tarts or ginjinha at the Belem pastry terrace, ride Eletrico 15E past Torre de Belem, or pick up maritime keepsakes.',
    phrase: {
      pt: 'O eletrico quinze vai do Cais do Sodre direto para Belem.',
      pronunciation: 'Oo eh-leh-tree-koo keen-zeh vah-ee doo Kah-eesh doo Soh-dreh dee-reh-too pah-rah Beh-leym.',
      en: 'Tram 15 goes from Cais do Sodre straight to Belem.'
    },
    townSpots: [
      {
        id: 'belem-confeitaria',
        kind: 'eatery',
        name: 'Antiga Confeitaria da Ribeira & Belem',
        badge: '[PASTELARIA]',
        host: 'Mestre Goncalo',
        x: 155,
        y: 192,
        note: 'Historic blue-and-white azulejo pastry hall serving cinnamon-dusted custard tarts on porcelain plates and chilled port wine in stemmed glasses.',
        items: [
          {
            id: 'item-pastéis-belem-plate',
            name: 'Pasteis de Belem com Canela',
            kind: 'food',
            servingType: 'plate',
            costEur: 4.2,
            fullnessDelta: 28,
            energyDelta: 24,
            description: 'Pair of warm flaky custard tarts baked by the 1837 monastic recipe, served on a porcelain plate with cinnamon and powdered sugar.'
          },
          {
            id: 'item-porto-tawny-glass',
            name: 'Calice de Vinho do Porto Tawny',
            kind: 'food',
            servingType: 'glass',
            glassStyle: 'wine-red',
            costEur: 4.5,
            fullnessDelta: 10,
            energyDelta: 22,
            description: 'Velvety 10-year amber Tawny Port poured into a crystal tasting glass.'
          }
        ]
      },
      {
        id: 'belem-torre-15e',
        kind: 'landmark',
        name: 'Torre de Belem & Eletrico 15E Esplanade',
        badge: '[MONUMENT & 15E]',
        host: 'Carris Inspector Rui',
        x: 380,
        y: 192,
        note: '1515 UNESCO Manueline limestone fortress guarding the Tagus estuary alongside Carris Eletrico 15E and the CP Cascais coastal railway. Free waterfront rest (+25 Energy).'
      },
      {
        id: 'belem-maritime-shop',
        kind: 'shop',
        name: 'Atelier dos Descobrimentos',
        badge: '[MARITIME SHOP]',
        host: 'Mariana',
        x: 605,
        y: 192,
        note: 'Riverfront heritage shop offering carved Lioz stone miniatures and brass astrolabes.',
        items: [
          {
            id: 'item-torre-belem-mini',
            name: 'Lioz Limestone Torre de Belem',
            kind: 'souvenir',
            costEur: 14.0,
            fullnessDelta: 0,
            energyDelta: 6,
            description: 'Hand-carved cream limestone miniature of the 1515 Manueline watchtower.'
          },
          {
            id: 'item-armillary-astrolabe',
            name: 'Brass Armillary Sphere Charm',
            kind: 'souvenir',
            costEur: 11.5,
            fullnessDelta: 0,
            energyDelta: 5,
            description: 'Polished nautical brass sphere inspired by the stonework of Mosteiro dos Jeronimos.'
          }
        ]
      }
    ]
  },
  {
    id: 'district-rossio-restauradores',
    stationId: 'metro-rossio',
    name: 'Praca do Rossio, Restauradores & Santa Justa',
    shortName: 'Rossio / Baixa',
    zoneBadge: '[LINHA VERDE + SANTA JUSTA]',
    accentColor: '#15803d',
    skylineStyle: 'rossio-santa-justa',
    transitSummary: 'Linha Verde (Rossio - Martim Moniz) | Elevador de Santa Justa (1902) | CP Sintra Rail',
    description: 'Step out onto the rolling Mar Largo wave mosaic of Praca Dom Pedro IV (Rossio), framed by bronze French fountains, Neo-Manueline Rossio Station, and the 45-meter cast-iron Elevador de Santa Justa.',
    plazaNote: 'Admire the 1902 Neo-Gothic iron lattice of Elevador de Santa Justa, sip traditional cherry Ginjinha in a glass or dine on codfish croquettes, and browse Baixa theatre playbills.',
    phrase: {
      pt: 'Vamos subir no Elevador de Santa Justa para ver a Baixa!',
      pronunciation: 'Vah-moosh soo-beer noo Eh-leh-vah-dohr deh Sahn-tah Zhoosh-tah pah-rah vehr ah Bye-shah!',
      en: 'Let us ride the Santa Justa Lift up to see the Baixa!'
    },
    townSpots: [
      {
        id: 'rossio-ginjinha-cafe',
        kind: 'eatery',
        name: 'A Ginjinha & Cafe Nicola do Rossio',
        badge: '[CAFE & GINJINHA]',
        host: 'Senhor Fernando',
        x: 155,
        y: 192,
        note: 'Landmark 1840 Rossio tavern and literary cafe pouring sour-cherry liqueur in shot glasses alongside hot savory croquettes on porcelain plates.',
        items: [
          {
            id: 'item-rossio-ginjinha-glass',
            name: 'Copo de Ginjinha com Elas (1840)',
            kind: 'food',
            servingType: 'glass',
            glassStyle: 'ginjinha',
            costEur: 2.5,
            fullnessDelta: 8,
            energyDelta: 22,
            description: 'Traditional Morello cherry liqueur served in a small glass with a steeped cherry at the bottom.'
          },
          {
            id: 'item-rossio-empada-plate',
            name: 'Empadas de Pato & Croquetes',
            kind: 'food',
            servingType: 'plate',
            costEur: 6.5,
            fullnessDelta: 38,
            energyDelta: 20,
            description: 'Golden flaky duck pastry pie and crispy beef croquettes served on a porcelain bistro plate.'
          }
        ]
      },
      {
        id: 'rossio-santa-justa-lift',
        kind: 'landmark',
        name: 'Elevador de Santa Justa (1902) & Rossio Fountains',
        badge: '[1902 VERTICAL LIFT]',
        host: 'Lift Operator Jorge',
        x: 380,
        y: 192,
        note: '45-meter Neo-Gothic wrought-iron vertical public transit lift built by Raoul Mesnier du Ponsard in 1902, linking downtown Baixa to Largo do Carmo. Free panoramic rest (+25 Energy).'
      },
      {
        id: 'rossio-chapelaria',
        kind: 'shop',
        name: 'Chapelaria & Luvaria da Baixa (1886)',
        badge: '[HABERDASHERY]',
        host: 'Dona Helena',
        x: 605,
        y: 192,
        note: 'Centuries-old Pombaline storefront crafting wool fedoras, leather gloves, and theatre memorabilia.',
        items: [
          {
            id: 'item-rossio-fedora-pin',
            name: 'Pombaline Brass Tram & Lift Pin Set',
            kind: 'souvenir',
            costEur: 9.0,
            fullnessDelta: 0,
            energyDelta: 4,
            description: 'Enamel collector pins depicting Elevador de Santa Justa and Eletrico 12E.'
          },
          {
            id: 'item-sintra-rail-poster',
            name: 'Estacao do Rossio Horseshoe Arch Print',
            kind: 'souvenir',
            costEur: 11.0,
            fullnessDelta: 0,
            energyDelta: 5,
            description: 'Architectural lithograph of the 1890 Neo-Manueline twin horseshoe portals of Rossio Railway Station.'
          }
        ]
      }
    ]
  },
  {
    id: 'district-marques-pombal-avenida',
    stationId: 'metro-marques-pombal',
    name: 'Marques de Pombal, Avenida da Liberdade & Parque Eduardo VII',
    shortName: 'Marques de Pombal',
    zoneBadge: '[LINHA AZUL + LINHA AMARELA]',
    accentColor: '#2563eb',
    skylineStyle: 'marques-pombal',
    transitSummary: 'Linha Azul & Linha Amarela Interchange | Elevador do Lavra (1884) | Avenida Bus Corridor',
    description: 'Emerge at Lisbon grand circular rotunda crowned by the 36-meter Monumento ao Marques de Pombal, looking north up the sculpted boxwood hedges of Parque Eduardo VII and south down tree-lined Avenida da Liberdade.',
    plazaNote: 'Relax at an open-air Avenida quiosque under plane trees and acacias, ride Lisbon oldest funicular (Elevador do Lavra, 1884), or browse Estufa Fria botanical prints.',
    phrase: {
      pt: 'Na estacao do Marques de Pombal mudamos da Linha Azul para a Linha Amarela.',
      pronunciation: 'Nah ehsh-tah-sow doo Mahr-kehsh deh Pohm-bahl moo-dah-moosh dah Lee-nyah Ah-zool pah-rah ah Lee-nyah Ah-mah-reh-lah.',
      en: 'At Marques de Pombal station we transfer from the Blue Line to the Yellow Line.'
    },
    townSpots: [
      {
        id: 'avenida-quiosque-ribeira',
        kind: 'eatery',
        name: 'Quiosque da Avenida da Liberdade',
        badge: '[BOULEVARD CAFE]',
        host: 'Carolina',
        x: 155,
        y: 192,
        note: 'Shaded Art Deco boulevard pavilion set upon ornate floral calçada mosaics beside water ponds, serving fresh orchard mazagran in tall glasses and savory pastries on plates.',
        items: [
          {
            id: 'item-avenida-mazagran-glass',
            name: 'Mazagran de Cafe & Limao',
            kind: 'food',
            servingType: 'glass',
            glassStyle: 'limonada',
            costEur: 3.4,
            fullnessDelta: 12,
            energyDelta: 24,
            description: 'Chilled Portuguese espresso shaken with fresh lemon juice, mint, and ice in a tall crystal glass.'
          },
          {
            id: 'item-avenida-folhado-plate',
            name: 'Folhado de Queijo da Serra & Presunto',
            kind: 'food',
            servingType: 'plate',
            costEur: 6.0,
            fullnessDelta: 36,
            energyDelta: 20,
            description: 'Warm puff pastry filled with creamy Serra da Estrela cheese and cured ham on a porcelain plate.'
          }
        ]
      },
      {
        id: 'pombal-monument-lavra',
        kind: 'landmark',
        name: 'Monumento ao Marques de Pombal & Elevador do Lavra (1884)',
        badge: '[ROTUNDA & FUNICULAR]',
        host: 'Park Conservator Tiago',
        x: 380,
        y: 192,
        note: 'The 1934 bronze statue of Marques de Pombal with his lion overlooking Parque Eduardo VII, linked to Avenida da Liberdade and Elevador do Lavra (Lisbon oldest funicular, opened 1884). Free rest (+25 Energy).'
      },
      {
        id: 'estufa-fria-boutique',
        kind: 'shop',
        name: 'Boutique Botanica da Estufa Fria',
        badge: '[BOTANICAL SHOP]',
        host: 'Doutora Marta',
        x: 605,
        y: 192,
        note: 'Greenhouse conservatory pavilion from Parque Eduardo VII offering pressed fern folios and jacaranda scents.',
        items: [
          {
            id: 'item-estufa-fria-herbarium',
            name: 'Estufa Fria Botanical Folio',
            kind: 'souvenir',
            costEur: 12.0,
            fullnessDelta: 0,
            energyDelta: 5,
            description: 'Illustrated botanical guide to the tree ferns, camellias, and greenhouses of Parque Eduardo VII.'
          },
          {
            id: 'item-avenida-calcada-tile',
            name: 'Avenida Floral Calcada Plaque',
            kind: 'souvenir',
            costEur: 8.5,
            fullnessDelta: 0,
            energyDelta: 4,
            description: 'Carved limestone and basalt rosette reproducing the famous mosaics of Avenida da Liberdade.'
          }
        ]
      }
    ]
  },
  {
    id: 'district-rato-principe-real',
    stationId: 'metro-rato',
    name: 'Largo do Rato, Principe Real & Aguas Livres Aqueduct',
    shortName: 'Rato / Principe Real',
    zoneBadge: '[LINHA AMARELA + ELETRICO 24E]',
    accentColor: '#eab308',
    skylineStyle: 'rato-aqueduct',
    transitSummary: 'Linha Amarela Terminus | Eletrico 24E (Campolide - Camoes) | Carris Buses 758 / 773',
    description: 'Ascend to Largo do Rato where the 18th-century stone arches of the Aguas Livres Aqueduct meet the Mae d Agua reservoir, the giant cedar umbrella of Jardim do Principe Real, and the revived yellow Eletrico 24E.',
    plazaNote: 'Dine under the Principe Real cypress cedar, admire the 1746 Mae d Agua baroque water hall and Eletrico 24E, or visit the Casa Museu Amalia Rodrigues shop.',
    phrase: {
      pt: 'O eletrico vinte e quatro liga o Largo do Rato ao Principe Real e ao Chiado.',
      pronunciation: 'Oo eh-leh-tree-koo veen-teh ee kwah-troo lee-gah oo Lahr-goo doo Rah-too ow Preen-see-peh Reh-ahl ee ow Shee-ah-doo.',
      en: 'Tram 24 connects Largo do Rato to Principe Real and Chiado.'
    },
    townSpots: [
      {
        id: 'principe-real-esplanada',
        kind: 'eatery',
        name: 'Esplanada do Cedro - Principe Real',
        badge: '[GARDEN BISTRO]',
        host: 'Lourenco',
        x: 155,
        y: 192,
        note: 'Romantic garden terrace beneath the 20-meter spreading branches of the giant 19th-century cedar of Jardim do Principe Real.',
        items: [
          {
            id: 'item-rato-prego-plate',
            name: 'Prego no Prato com Batata Frita',
            kind: 'food',
            servingType: 'plate',
            costEur: 9.5,
            fullnessDelta: 48,
            energyDelta: 26,
            description: 'Garlic-seared tenderloin steak served on a porcelain dinner plate with crisp fries and mustard sauce.'
          },
          {
            id: 'item-rato-vinho-verde-glass',
            name: 'Copo de Vinho Verde Alvarinho',
            kind: 'food',
            servingType: 'glass',
            glassStyle: 'wine-white',
            costEur: 4.0,
            fullnessDelta: 10,
            energyDelta: 22,
            description: 'Crisp, lightly effervescent northern Portuguese Alvarinho white wine served chilled in a stemmed glass.'
          }
        ]
      },
      {
        id: 'rato-mae-dagua-24e',
        kind: 'landmark',
        name: 'Mae d Agua das Amoreiras (1746) & Eletrico 24E',
        badge: '[AQUEDUCT & 24E]',
        host: 'Aqueduct Curator Sofia',
        x: 380,
        y: 192,
        note: 'Vaulted 18th-century stone water reservoir terminus of the Aguas Livres Aqueduct designed by Carlos Mardel, right beside the historic Eletrico 24E streetcar stop. Free terrace rest (+25 Energy).'
      },
      {
        id: 'rato-ceramica-amalia',
        kind: 'shop',
        name: 'Galeria de Azulejos & Casa da Amalia',
        badge: '[TILE ATELIER]',
        host: 'Mestre Vicente',
        x: 605,
        y: 192,
        note: 'Artisan ceramic studio celebrating the Rato tilework tradition and nearby Rua de Sao Bento.',
        items: [
          {
            id: 'item-cargaleiro-tile',
            name: 'Cargaleiro Geometric Azulejo Panel',
            kind: 'souvenir',
            costEur: 13.5,
            fullnessDelta: 0,
            energyDelta: 6,
            description: 'Hand-glazed polychrome ceramic tile inspired by Manuel Cargaleiro Rato Metro murals.'
          },
          {
            id: 'item-aqueduct-etching',
            name: 'Aqueduto das Aguas Livres Arch Print',
            kind: 'souvenir',
            costEur: 9.5,
            fullnessDelta: 0,
            energyDelta: 4,
            description: 'Fine-line architectural drawing of the 65-meter stone pointed arches crossing the Alcantara valley.'
          }
        ]
      }
    ]
  },
  {
    id: 'district-saldanha-campo-pequeno',
    stationId: 'metro-saldanha-campo-pequeno',
    name: 'Saldanha, Avenidas Novas & Campo Pequeno (1892)',
    shortName: 'Saldanha / Campo Pequeno',
    zoneBadge: '[LINHA AMARELA + LINHA VERMELHA]',
    accentColor: '#d97706',
    skylineStyle: 'campo-pequeno',
    transitSummary: 'Linha Amarela & Linha Vermelha Hub | CP Entre Campos Rail | Carris Avenidas Express',
    description: 'Walk the broad modernist boulevards of Avenidas Novas from Praca Duque de Saldanha to the iconic 1892 octagonal red-brick domes and horseshoe arches of Campo Pequeno.',
    plazaNote: 'Feast on seafood platters or enjoy a chilled draft Imperial at a classic Avenidas Novas cervejaria, admire the 1892 Neo-Moorish brick bullring dome, or browse Art Nouveau design books.',
    phrase: {
      pt: 'No Saldanha cruzam-se a Linha Amarela e a Linha Vermelha para o Aeroporto.',
      pronunciation: 'Noo Sahl-dah-nyah kroo-zahm-seh ah Lee-nyah Ah-mah-reh-lah ee ah Lee-nyah Vehr-meh-lyah pah-rah oo Ah-eh-roh-pohr-too.',
      en: 'At Saldanha the Yellow Line and the Red Line to the Airport intersect.'
    },
    townSpots: [
      {
        id: 'saldanha-cervejaria',
        kind: 'eatery',
        name: 'Cervejaria Marisqueira das Avenidas',
        badge: '[CERVEJARIA]',
        host: 'Senhor Ramiro',
        x: 155,
        y: 192,
        note: 'Bustling marble-counter Avenidas Novas seafood beer hall famous for garlic tiger prawns on plates and frosty draft imperials in tall glasses.',
        items: [
          {
            id: 'item-saldanha-gambas-plate',
            name: 'Gambas ao Alhinho & Pao Torrado',
            kind: 'food',
            servingType: 'plate',
            costEur: 12.5,
            fullnessDelta: 50,
            energyDelta: 30,
            description: 'Sizzling garlic and chili prawns with buttered toasted bread served on a ceramic platter.'
          },
          {
            id: 'item-saldanha-imperial-glass',
            name: 'Imperial Fresquinha de Pressao',
            kind: 'food',
            servingType: 'glass',
            glassStyle: 'imperial',
            costEur: 2.6,
            fullnessDelta: 10,
            energyDelta: 18,
            description: 'Crisp golden Lisbon draft pilsner poured with a dense white foam collar in a chilled pilsner glass.'
          }
        ]
      },
      {
        id: 'campo-pequeno-dome',
        kind: 'landmark',
        name: 'Praca do Campo Pequeno (1892) & Saldanha Rotunda',
        badge: '[1892 BRICK DOME]',
        host: 'Architect Guide Nuno',
        x: 380,
        y: 192,
        note: 'Monumental 1892 red-brick Neo-Moorish rotunda designed by Antonio Jose Dias da Silva with eight onion-domed towers and landscaped gardens above the Linha Amarela tunnel. Free rest (+25 Energy).'
      },
      {
        id: 'avenidas-art-nouveau-shop',
        kind: 'shop',
        name: 'Livraria & Design Avenidas Novas',
        badge: '[ARCHITECTURE]',
        host: 'Beatriz V.',
        x: 605,
        y: 192,
        note: 'Design bookstore celebrating Premio Valmor mansions and Almada Negreiros modernist murals.',
        items: [
          {
            id: 'item-valmor-architecture-book',
            name: 'Premio Valmor Lisbon Mansions Guide',
            kind: 'souvenir',
            costEur: 13.0,
            fullnessDelta: 0,
            energyDelta: 5,
            description: 'Hardcover photographic survey of early 20th-century Art Nouveau and modernist facades in Avenidas Novas.'
          },
          {
            id: 'item-almada-sketch-print',
            name: 'Almada Negreiros Geometric Line Print',
            kind: 'souvenir',
            costEur: 10.0,
            fullnessDelta: 0,
            energyDelta: 4,
            description: 'Reproduction of mid-century modernist incised line drawings from Saldanha.'
          }
        ]
      }
    ]
  },
  {
    id: 'district-sao-sebastiao-sete-rios',
    stationId: 'metro-sao-sebastiao-zoologico',
    name: 'Sao Sebastiao, Gulbenkian Gardens, Sete Rios Zoo & Reboleira Corridor',
    shortName: 'Sao Sebastiao / Zoo',
    zoneBadge: '[LINHA AZUL + LINHA VERMELHA]',
    accentColor: '#1d4ed8',
    skylineStyle: 'gulbenkian-zoo',
    transitSummary: 'Linha Azul (to Jardim Zoologico, Luz & Reboleira) | Linha Vermelha Origin | Zoo Teleferico',
    description: 'Explore the western Linha Azul & Linha Vermelha hub spanning the modernist water gardens of Fundacao Calouste Gulbenkian, the aerial cable car of Jardim Zoologico in Sete Rios, and the northwestern stations to Reboleira.',
    plazaNote: 'Dine overlooking the Gulbenkian duck ponds, ride the Jardim Zoologico aerial Teleferico cable baskets, or collect museum art editions.',
    phrase: {
      pt: 'A Linha Azul segue de Sao Sebastiao para o Jardim Zoologico e a Reboleira.',
      pronunciation: 'Ah Lee-nyah Ah-zool seh-geh deh Sow Seh-bahsh-tee-ow pah-rah oo Zhahr-deem Zoh-oh-loh-zhee-koo ee ah Heh-boh-lay-rah.',
      en: 'The Blue Line continues from Sao Sebastiao to the Zoo and Reboleira.'
    },
    townSpots: [
      {
        id: 'gulbenkian-garden-cafe',
        kind: 'eatery',
        name: 'Cafetaria dos Jardins da Gulbenkian',
        badge: '[MUSEUM TERRACE]',
        host: 'Teresa M.',
        x: 155,
        y: 192,
        note: 'Tranquil cantilevered concrete terrace designed by Goncalo Ribeiro Telles overlooking water lilies, willow trees, and modernist sculptures.',
        items: [
          {
            id: 'item-gulbenkian-quiche-plate',
            name: 'Quiche de Espinafres & Queijo de Cabra',
            kind: 'food',
            servingType: 'plate',
            costEur: 7.5,
            fullnessDelta: 40,
            energyDelta: 24,
            description: 'Warm baked spinach and goat cheese tart with mixed garden greens served on a stoneware plate.'
          },
          {
            id: 'item-gulbenkian-hibisco-glass',
            name: 'Cha Frio de Hibisco & Hortela',
            kind: 'food',
            servingType: 'glass',
            glassStyle: 'sangria',
            costEur: 3.5,
            fullnessDelta: 12,
            energyDelta: 20,
            description: 'Ruby chilled hibiscus blossom and garden mint infusion served over ice in a glass.'
          }
        ]
      },
      {
        id: 'gulbenkian-zoo-teleferico',
        kind: 'landmark',
        name: 'Jardins da Gulbenkian & Teleferico do Jardim Zoologico',
        badge: '[GARDENS & CABLE CAR]',
        host: 'Curator Andre',
        x: 380,
        y: 192,
        note: 'Award-winning 1969 modernist museum park paired with the aerial Teleferico cable-car baskets gliding over Jardim Zoologico at Sete Rios along Linha Azul. Free rest (+25 Energy).'
      },
      {
        id: 'gulbenkian-museum-shop',
        kind: 'shop',
        name: 'Loja do Museu & Azulejos Julio Pomar',
        badge: '[MUSEUM SHOP]',
        host: 'Claudia',
        x: 605,
        y: 192,
        note: 'Museum gift pavilion featuring Lalique dragonfly motifs and Julio Pomar ceramic animal prints.',
        items: [
          {
            id: 'item-lalique-dragonfly-brooch',
            name: 'Rene Lalique Enamel Dragonfly Replica',
            kind: 'souvenir',
            costEur: 15.0,
            fullnessDelta: 0,
            energyDelta: 6,
            description: 'Translucent blue-green cloisonne pin inspired by the crown jewel of the Gulbenkian collection.'
          },
          {
            id: 'item-pomar-tiger-tile',
            name: 'Julio Pomar Zoo Fauna Ceramic Coaster',
            kind: 'souvenir',
            costEur: 8.5,
            fullnessDelta: 0,
            energyDelta: 4,
            description: 'Colorful glazed tile celebrating Julio Pomar lively animal murals inside Jardim Zoologico station.'
          }
        ]
      }
    ]
  },
  {
    id: 'district-campo-grande-alvalade',
    stationId: 'metro-campo-grande-alvalade',
    name: 'Campo Grande, Cidade Universitaria, Alvalade & Odivelas/Telheiras',
    shortName: 'Campo Grande / Alvalade',
    zoneBadge: '[LINHA AMARELA + LINHA VERDE]',
    accentColor: '#16a34a',
    skylineStyle: 'campo-grande-university',
    transitSummary: 'Linha Amarela (to Lumiar & Odivelas) | Linha Verde (to Telheiras & Alvalade) | University Hub',
    description: 'Stroll the tree-canopied gardens of Jardim do Campo Grande and the monumental porcelain-tiled Reitoria of Cidade Universitaria, where Linha Amarela and Linha Verde converge in northern Lisbon.',
    plazaNote: 'Enjoy a student bifana plate or fresh orange juice glass at an Alvalade pastry counter, rest beside the Campo Grande rowing lake, or pick up university notebooks.',
    phrase: {
      pt: 'No Campo Grande apanhamos a Linha Verde para Telheiras ou a Linha Amarela para Odivelas.',
      pronunciation: 'Noo Kahm-poo Grahn-deh ah-pah-nyah-moosh ah Lee-nyah Vehr-deh pah-rah Teh-lyay-rash oh ah Lee-nyah Ah-mah-reh-lah pah-rah Oh-dee-veh-lash.',
      en: 'At Campo Grande we catch the Green Line to Telheiras or the Yellow Line to Odivelas.'
    },
    townSpots: [
      {
        id: 'alvalade-pastelaria-universitaria',
        kind: 'eatery',
        name: 'Pastelaria & Cervejaria de Alvalade',
        badge: '[CAFE & SNACK]',
        host: 'Senhor Artur',
        x: 155,
        y: 192,
        note: 'Classic 1950s Alvalade neighborhood cafe serving university faculty and students with hearty plates and freshly squeezed Algarve orange juice in tall glasses.',
        items: [
          {
            id: 'item-alvalade-bitoque-plate',
            name: 'Bitoque de Vaca com Ovo a Cavalo',
            kind: 'food',
            servingType: 'plate',
            costEur: 10.5,
            fullnessDelta: 54,
            energyDelta: 28,
            description: 'Traditional Lisbon pan-seared steak topped with a fried egg, rice, and fries on a large dinner plate.'
          },
          {
            id: 'item-alvalade-sumo-laranja-glass',
            name: 'Copo de Sumo de Laranja do Algarve',
            kind: 'food',
            servingType: 'glass',
            glassStyle: 'limonada',
            costEur: 3.2,
            fullnessDelta: 16,
            energyDelta: 22,
            description: 'Freshly pressed sweet Algarve oranges served cold in a tall glass.'
          }
        ]
      },
      {
        id: 'campo-grande-reitoria-lake',
        kind: 'landmark',
        name: 'Reitoria da Universidade de Lisboa & Jardim do Campo Grande',
        badge: '[UNIVERSITY & PARK]',
        host: 'Professor Henrique',
        x: 380,
        y: 192,
        note: 'Monumental academic plaza adorned with Fred Kradolfer and Almada Negreiros murals beside the 18th-century tree-shaded rowing lake of Jardim do Campo Grande. Free rest (+25 Energy).'
      },
      {
        id: 'alvalade-livraria-academica',
        kind: 'shop',
        name: 'Papelaria & Livraria Academica',
        badge: '[UNIVERSITY SHOP]',
        host: 'Diogo',
        x: 605,
        y: 192,
        note: 'Campus bookshop stocking Eduardo Nery baroque tile prints and embossed leather academic journals.',
        items: [
          {
            id: 'item-nery-convite-figurine',
            name: 'Eduardo Nery Baroque Sentinel Plaque',
            kind: 'souvenir',
            costEur: 11.5,
            fullnessDelta: 0,
            energyDelta: 5,
            description: 'Blue-and-white glazed ceramic cutout figure modeled after the Campo Grande Metro station guardians.'
          },
          {
            id: 'item-ul-embossed-notebook',
            name: 'Cidade Universitaria Crest Journal',
            kind: 'souvenir',
            costEur: 9.0,
            fullnessDelta: 0,
            energyDelta: 4,
            description: 'Stitched linen notebook stamped with the botanical seal of northern Lisbon gardens.'
          }
        ]
      }
    ]
  },
  {
    id: 'district-alameda-arroios',
    stationId: 'metro-alameda',
    name: 'Alameda Dom Afonso Henriques, Fonte Luminosa & Olaias',
    shortName: 'Alameda / Fonte Luminosa',
    zoneBadge: '[LINHA VERDE + LINHA VERMELHA]',
    accentColor: '#dc2626',
    skylineStyle: 'alameda-fountain',
    transitSummary: 'Linha Verde & Linha Vermelha Interchange | Carris 708 / 717 / 720 / 735 | IST Campus',
    description: 'Stand before the monumental 1948 Lioz limestone basin and cascading water jets of Fonte Luminosa across the wide green lawn of Alameda Dom Afonso Henriques, crowned on the hill by Instituto Superior Tecnico.',
    plazaNote: 'Enjoy warm pastries or a cool imperial glass on the Alameda terrace, watch the high water jets of Fonte Luminosa (1948), or explore the polychrome architectural art of nearby Olaias.',
    phrase: {
      pt: 'Na Alameda apanhamos a Linha Vermelha direta para o Oriente e o Aeroporto.',
      pronunciation: 'Nah Ah-lah-meh-dah ah-pah-nyah-moosh ah Lee-nyah Vehr-meh-lyah dee-reh-tah pah-rah oo Oh-ree-eyn-teh ee oo Ah-eh-roh-pohr-too.',
      en: 'At Alameda we catch the Red Line direct to Oriente and the Airport.'
    },
    townSpots: [
      {
        id: 'alameda-esplanada-luminosa',
        kind: 'eatery',
        name: 'Esplanada da Fonte Luminosa',
        badge: '[PARK TERRACE]',
        host: 'Dona Fatima',
        x: 155,
        y: 192,
        note: 'Sunlit parkside cafe overlooking the Alameda lawns, serving codfish brás on plates and fruit sangria in chilled glasses.',
        items: [
          {
            id: 'item-alameda-bacalhau-plate',
            name: 'Bacalhau a Bras com Azeitonas',
            kind: 'food',
            servingType: 'plate',
            costEur: 11.0,
            fullnessDelta: 52,
            energyDelta: 28,
            description: 'Shredded salt cod sauteed with matchstick potatoes, golden eggs, parsley, and black olives on a porcelain plate.'
          },
          {
            id: 'item-alameda-sangria-glass',
            name: 'Copo de Sangria de Maracuja & Hortela',
            kind: 'food',
            servingType: 'glass',
            glassStyle: 'sangria',
            costEur: 4.0,
            fullnessDelta: 12,
            energyDelta: 22,
            description: 'Sparkling white sangria infused with passionfruit, citrus, and mint served in a tall stemmed glass.'
          }
        ]
      },
      {
        id: 'alameda-fonte-luminosa-monument',
        kind: 'landmark',
        name: 'Fonte Luminosa Monumental (1948) & IST Hilltop',
        badge: '[1948 FOUNTAIN]',
        host: 'Fountain Engineer Vasco',
        x: 380,
        y: 192,
        note: 'Monumental 1948 limestone water fountain designed by Carlos and Guilherme Rebelo de Andrade with sculptural bas-reliefs of the Tagus Nymphs by Maximiano Alves and Diogo de Macedo. Free rest (+25 Energy).'
      },
      {
        id: 'olaias-galeria-arquitetura',
        kind: 'shop',
        name: 'Galeria Policromatica Alameda & Olaias',
        badge: '[ART & CERAMICS]',
        host: 'Arquiteta Rita',
        x: 605,
        y: 192,
        note: 'Gallery celebrating the world-renowned underground architecture of the 1998 Linha Vermelha stations.',
        items: [
          {
            id: 'item-olaias-stained-glass-print',
            name: 'Olaias Polychrome Vault Art Print',
            kind: 'souvenir',
            costEur: 12.5,
            fullnessDelta: 0,
            energyDelta: 5,
            description: 'Vibrant architectural print of Tomas Taveira steel-and-glass cathedral arches at Olaias station.'
          },
          {
            id: 'item-fonte-luminosa-medal',
            name: 'Fonte Luminosa Bas-Relief Coaster',
            kind: 'souvenir',
            costEur: 8.0,
            fullnessDelta: 0,
            energyDelta: 4,
            description: 'Carved limestone coaster depicting the Tagus river nymphs of Alameda.'
          }
        ]
      }
    ]
  },
  {
    id: 'district-oriente-parque-nacoes',
    stationId: 'metro-oriente-aeroporto',
    name: 'Parque das Nacoes, Gare do Oriente, Oceanario & Aeroporto',
    shortName: 'Oriente / Parque das Nacoes',
    zoneBadge: '[LINHA VERMELHA + TELECABINE]',
    accentColor: '#dc2626',
    skylineStyle: 'oriente-calatrava',
    transitSummary: 'Linha Vermelha (Oriente to Aeroporto) | Gare do Oriente Rail | Telecabine Lisboa',
    description: 'Experience modern riverfront Lisboa at Parque das Nacoes: walk beneath Santiago Calatrava soaring white steel gothic tree-arches at Gare do Oriente, ride the aerial Telecabine Lisboa along the Tagus beside Oceanario de Lisboa, and connect north to Aeroporto Humberto Delgado.',
    plazaNote: 'Dine along the Marina Parque das Nacoes waterfront, ride the Telecabine Lisboa river gondola past Oceanario and Ponte Vasco da Gama, or browse Oceanario keepsakes.',
    phrase: {
      pt: 'A Linha Vermelha liga a Gare do Oriente e o Parque das Nacoes ao Aeroporto de Lisboa.',
      pronunciation: 'Ah Lee-nyah Vehr-meh-lyah lee-gah ah Gah-reh doo Oh-ree-eyn-teh ee oo Pahr-keh dash Nah-soysh ow Ah-eh-roh-pohr-too deh Leesh-boh-ah.',
      en: 'The Red Line connects Gare do Oriente and Parque das Nacoes to Lisbon Airport.'
    },
    townSpots: [
      {
        id: 'oriente-marina-restaurante',
        kind: 'eatery',
        name: 'Restaurante Doca das Nacoes',
        badge: '[WATERFRONT DINING]',
        host: 'Chef Pedro',
        x: 155,
        y: 192,
        note: 'Sleek riverfront terrace facing the Oceanario dock and Ponte Vasco da Gama, serving grilled sea bass on porcelain plates and sparkling sangria in stemmed glasses.',
        items: [
          {
            id: 'item-oriente-robalo-plate',
            name: 'Robalo Grelhado do Tejo com Legumes',
            kind: 'food',
            servingType: 'plate',
            costEur: 14.0,
            fullnessDelta: 58,
            energyDelta: 32,
            description: 'Char-grilled Atlantic sea bass fillet with roasted potatoes and olive oil served on a porcelain plate.'
          },
          {
            id: 'item-oriente-espumante-glass',
            name: 'Flute de Espumante Bruto Portugues',
            kind: 'food',
            servingType: 'glass',
            glassStyle: 'wine-white',
            costEur: 4.5,
            fullnessDelta: 10,
            energyDelta: 24,
            description: 'Chilled Bairrada sparkling brut wine served in a tall crystal flute overlooking the Tagus.'
          }
        ]
      },
      {
        id: 'oriente-calatrava-telecabine',
        kind: 'landmark',
        name: 'Gare do Oriente (Calatrava), Oceanario & Telecabine Lisboa',
        badge: '[CALATRAVA & TELECABINE]',
        host: 'Station Master Duarte',
        x: 380,
        y: 192,
        note: 'Santiago Calatrava soaring 1998 steel-and-glass tree canopy uniting Linha Vermelha (to Aeroporto), high-speed trains, Oceanario de Lisboa, and the riverfront Telecabine Lisboa gondola overlooking the 12.3 km Ponte Vasco da Gama. Free rest (+25 Energy).'
      },
      {
        id: 'oriente-oceanario-loja',
        kind: 'shop',
        name: 'Loja do Oceanario & Pavilhao dos Oceanos',
        badge: '[OCEANARIO SHOP]',
        host: 'Ines C.',
        x: 605,
        y: 192,
        note: 'Eco-marine gift pavilion celebrating Oceanario de Lisboa sea otters, sunfish, and Expo 98 ceramic art.',
        items: [
          {
            id: 'item-oceanario-lontra-keepsake',
            name: 'Oceanario Sea Otter Ceramic Figure',
            kind: 'souvenir',
            costEur: 13.0,
            fullnessDelta: 0,
            energyDelta: 6,
            description: 'Hand-painted glazed ceramic sea otter commemorating Peter Chermayeff Oceanario de Lisboa.'
          },
          {
            id: 'item-vasco-gama-bridge-print',
            name: 'Ponte Vasco da Gama & Calatrava Print',
            kind: 'souvenir',
            costEur: 11.0,
            fullnessDelta: 0,
            energyDelta: 5,
            description: 'Panoramic architectural print of Gare do Oriente and the cable-stayed Ponte Vasco da Gama.'
          }
        ]
      }
    ]
  }
];

export function getMetroLineById(lineId) {
  return METRO_NETWORK_LINES.find((l) => l.id === lineId) || null;
}

export function getMetroLineByName(lineName) {
  return METRO_NETWORK_LINES.find((l) => l.name === lineName) || null;
}

export function getStationLineIds(stationOrId) {
  const station =
    typeof stationOrId === 'string'
      ? ALL_METRO_STATIONS.find((s) => s.id === stationOrId)
      : stationOrId;
  if (!station) return ['linha-azul'];
  const stopName = station.canonicalStopName || '';
  const ids = METRO_NETWORK_LINES
    .filter((ln) => ln.stations.includes(stopName))
    .map((ln) => ln.id);
  if (ids.length > 0) return ids;
  return (station.lines || ['Linha Azul'])
    .map((name) => getMetroLineByName(name)?.id)
    .filter(Boolean);
}

export function getTransferHubForStopName(stopName) {
  if (!stopName) return null;
  return ALL_METRO_STATIONS.find((s) => s.canonicalStopName === stopName) || null;
}

/**
 * Returns every interactive station physically reachable directly on `lineId` from `stationId`,
 * ordered along the official track sequence of `METRO_NETWORK_LINES`.
 */
export function getDirectStationsOnLine(stationId, lineId) {
  const line = getMetroLineById(lineId);
  const origin = ALL_METRO_STATIONS.find((s) => s.id === stationId);
  if (!line || !origin) return [];
  const originStop = origin.canonicalStopName || '';
  const originIdx = line.stations.indexOf(originStop);
  if (originIdx === -1) return [];

  return ALL_METRO_STATIONS
    .filter((st) => st.id !== origin.id && line.stations.includes(st.canonicalStopName || ''))
    .map((st) => {
      const destIdx = line.stations.indexOf(st.canonicalStopName || '');
      const dir = destIdx > originIdx ? 1 : -1;
      const stopPath = [];
      for (let i = originIdx; i !== destIdx; i += dir) {
        stopPath.push(line.stations[i]);
      }
      stopPath.push(line.stations[destIdx]);
      return {
        station: st,
        line,
        originIdx,
        destIdx,
        direction: dir,
        hopCount: Math.abs(destIdx - originIdx),
        stopPath,
        intermediateStops: stopPath.slice(1, -1)
      };
    })
    .sort((a, b) => a.hopCount - b.hopCount || a.destIdx - b.destIdx);
}

/**
 * Computes the exact shortest multi-line path across the 56-station 4-line Metropolitano de Lisboa graph
 * between any two interactive stations in ALL_METRO_STATIONS, with full leg-by-leg transfer hub details.
 */
export function computeMetroNetworkRoute(fromStationId, toStationId, preferredStartLineId = null) {
  const fromStation = ALL_METRO_STATIONS.find((s) => s.id === fromStationId) || ALL_METRO_STATIONS[0];
  const toStation = ALL_METRO_STATIONS.find((s) => s.id === toStationId) || ALL_METRO_STATIONS[1];
  const startStop = fromStation.canonicalStopName || 'Baixa-Chiado';
  const endStop = toStation.canonicalStopName || 'Santa Apolonia';

  // Build adjacency list over all 56 official stations on the 4 lines
  const adj = new Map();
  const addEdge = (u, v, line) => {
    if (!adj.has(u)) adj.set(u, []);
    adj.get(u).push({ neighbor: v, line });
  };

  for (const line of METRO_NETWORK_LINES) {
    for (let i = 0; i < line.stations.length - 1; i += 1) {
      const a = line.stations[i];
      const b = line.stations[i + 1];
      addEdge(a, b, line);
      addEdge(b, a, line);
    }
  }

  // Check if a direct single-line route exists first (preferring preferredStartLineId when provided)
  let bestSteps = null;
  const candidateLines = preferredStartLineId
    ? [
        ...METRO_NETWORK_LINES.filter((l) => l.id === preferredStartLineId),
        ...METRO_NETWORK_LINES.filter((l) => l.id !== preferredStartLineId)
      ]
    : METRO_NETWORK_LINES;

  for (const line of candidateLines) {
    const idxA = line.stations.indexOf(startStop);
    const idxB = line.stations.indexOf(endStop);
    if (idxA !== -1 && idxB !== -1 && idxA !== idxB) {
      const dir = idxB > idxA ? 1 : -1;
      const steps = [];
      for (let i = idxA; i !== idxB; i += dir) {
        steps.push({ from: line.stations[i], to: line.stations[i + 1], line });
      }
      if (!bestSteps || (preferredStartLineId && line.id === preferredStartLineId) || (!preferredStartLineId && steps.length < bestSteps.length)) {
        bestSteps = steps;
        if (preferredStartLineId && line.id === preferredStartLineId) break;
      }
    }
  }

  // Otherwise run weighted BFS minimizing (transfers * 2.5 + hops) across the 56-station 4-line graph
  if (!bestSteps && startStop !== endStop) {
    const queue = [{ stop: startStop, steps: [], cost: 0 }];
    const bestCostByState = new Map();

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const curr = queue.shift();
      if (curr.stop === endStop) {
        bestSteps = curr.steps;
        break;
      }
      const prevLineId = curr.steps.length > 0 ? curr.steps[curr.steps.length - 1].line.id : null;
      const stateKey = `${curr.stop}|${prevLineId || 'start'}`;
      if (bestCostByState.has(stateKey) && bestCostByState.get(stateKey) < curr.cost) {
        continue;
      }
      for (const edge of adj.get(curr.stop) || []) {
        if (curr.steps.some((s) => s.from === edge.neighbor || s.to === edge.neighbor)) {
          continue;
        }
        const initialSwitchPenalty =
          !prevLineId && preferredStartLineId && edge.line.id !== preferredStartLineId ? 0.6 : 0;
        const transferPenalty = prevLineId && prevLineId !== edge.line.id ? 2.5 : 0;
        const nextCost = curr.cost + 1 + transferPenalty + initialSwitchPenalty;
        const nextKey = `${edge.neighbor}|${edge.line.id}`;
        if (!bestCostByState.has(nextKey) || nextCost < bestCostByState.get(nextKey)) {
          bestCostByState.set(nextKey, nextCost);
          queue.push({
            stop: edge.neighbor,
            steps: [...curr.steps, { from: curr.stop, to: edge.neighbor, line: edge.line }],
            cost: nextCost
          });
        }
      }
    }
  }

  const steps = bestSteps || [];
  const stationPath = [startStop, ...steps.map((s) => s.to)];
  const intermediateStops = stationPath.slice(1, -1);
  const linesUsed = [];
  const legs = [];
  let transferStation = null;

  for (let i = 0; i < steps.length; i += 1) {
    const stepLine = steps[i].line;
    if (linesUsed.length === 0 || linesUsed[linesUsed.length - 1].id !== stepLine.id) {
      if (linesUsed.length > 0 && !transferStation) {
        transferStation = steps[i].from;
      }
      linesUsed.push({
        id: stepLine.id,
        name: stepLine.name,
        badge: stepLine.badge,
        color: stepLine.color
      });
      legs.push({
        lineId: stepLine.id,
        lineName: stepLine.name,
        color: stepLine.color,
        fromStop: steps[i].from,
        toStop: steps[i].to,
        stops: [steps[i].from, steps[i].to]
      });
    } else {
      const curLeg = legs[legs.length - 1];
      curLeg.toStop = steps[i].to;
      curLeg.stops.push(steps[i].to);
    }
  }

  for (const leg of legs) {
    leg.fromStationId = getTransferHubForStopName(leg.fromStop)?.id || null;
    leg.toStationId = getTransferHubForStopName(leg.toStop)?.id || null;
  }

  if (linesUsed.length === 0) {
    const fallbackLine =
      METRO_NETWORK_LINES.find((l) => l.name === (fromStation.lines && fromStation.lines[0])) ||
      METRO_NETWORK_LINES[0];
    linesUsed.push({
      id: fallbackLine.id,
      name: fallbackLine.name,
      badge: fallbackLine.badge,
      color: fallbackLine.color
    });
  }

  const transferStationObj = transferStation ? getTransferHubForStopName(transferStation) : null;
  const transferStationId = transferStationObj?.id || null;
  const hopCount = Math.max(1, steps.length);
  const travelMinutes = Math.max(4, hopCount * 2 + (transferStation ? 3 : 0));
  const primaryColor = linesUsed[0].color;
  const arrivalColor = linesUsed[linesUsed.length - 1].color;
  const summary = transferStation
    ? `${linesUsed[0].name} -> Transfer at ${transferStation} -> ${linesUsed[linesUsed.length - 1].name} (${hopCount} stops)`
    : `${linesUsed[0].name} direct (${hopCount} ${hopCount === 1 ? 'stop' : 'stops'})`;

  return {
    fromStationId: fromStation.id,
    toStationId: toStation.id,
    fromStop: startStop,
    toStop: endStop,
    stationPath,
    intermediateStops,
    hopCount,
    travelMinutes,
    linesUsed,
    legs,
    transferStation,
    transferStationId,
    isDirect: !transferStation && linesUsed.length === 1,
    primaryColor,
    arrivalColor,
    summary
  };
}

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
