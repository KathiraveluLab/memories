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


export const SANTA_JUSTA_LIFT = {
  id: 'elevador-santa-justa',
  name: 'Elevador de Santa Justa (1902)',
  shortName: 'Elevador de Santa Justa',
  badge: '[1902 LIFT]',
  neighborhood: 'chiado',
  architect: 'Raoul Mesnier du Ponsard',
  yearBuilt: 1902,
  heightMeters: 45,
  fareEur: 1.8,
  travelMinutes: 8,
  x: 1344,
  y: 78,
  w: 78,
  h: 112,
  doorX: 1383,
  doorY: 190,
  doorSide: 'south',
  spawnOutside: { x: 1383, y: 214 },
  note: '45-meter Neo-Gothic cast-iron vertical street lift designed by Raoul Mesnier du Ponsard (1902). Step into the mahogany-and-brass cabin to ascend above Baixa and walk out onto the open-air 360-degree Lisbon panoramic miradouro.',
  phrase: {
    pt: 'Do topo do Elevador de Santa Justa ve-se toda a Baixa, o Castelo e o Tejo!',
    pronunciation: 'Doo toh-poo doo Eh-leh-vah-dohr deh Sahn-tah Zhoosh-tah veh-seh toh-dah ah Bye-shah, oo Kahsh-teh-loo ee oo Teh-zhoo!',
    en: 'From the top of the Santa Justa Lift you see all of Baixa, the Castle, and the Tagus!'
  }
};

// Exact factual 360-degree panoramic Lisbon landmarks visible from the 45m observation deck
// of Elevador de Santa Justa (38.7121 N, 9.1394 W). Compass bearing 0 deg = North, 90 = East, 180 = South, 270 = West.
export const SANTA_JUSTA_PANORAMA_LANDMARKS = [
  {
    id: 'sj-rossio',
    name: 'Praca Dom Pedro IV (Rossio) & Teatro Nacional D. Maria II',
    shortName: 'Rossio & Teatro Nacional',
    compassBearing: 4,
    compassLabel: 'N',
    distanceMeters: 210,
    year: '1846 / 1870',
    category: 'plaza',
    accentColor: '#15803d',
    description: 'Directly north down Rua Aurea lies Rossio Square with its rolling Mar Largo wave calcada, the 27-meter Dom Pedro IV bronze column, twin French fountains, and the neoclassical pediment of Teatro Nacional D. Maria II.'
  },
  {
    id: 'sj-estacao-rossio',
    name: 'Estacao do Rossio & Avenida da Liberdade',
    shortName: 'Estacao do Rossio',
    compassBearing: 332,
    compassLabel: 'NNW',
    distanceMeters: 290,
    year: '1890',
    category: 'transit',
    accentColor: '#b45309',
    description: 'Jose Luis Monteiro Neo-Manueline twin horseshoe-arch railway station gateway beneath the green tree-lined rise of Avenida da Liberdade toward Marques de Pombal.'
  },
  {
    id: 'sj-graca',
    name: 'Igreja de Sao Domingos, Martim Moniz & Miradouro da Graca',
    shortName: 'Graca & Senhora do Monte',
    compassBearing: 42,
    compassLabel: 'NE',
    distanceMeters: 780,
    year: '1241 / 1556',
    category: 'hill',
    accentColor: '#d97706',
    description: 'Terracotta roofs climb northeast past Martim Moniz toward the pine-shaded hill of Graca and Senhora do Monte, the highest central ridge of historic Lisbon.'
  },
  {
    id: 'sj-castelo',
    name: 'Castelo de Sao Jorge (St. George Castle)',
    shortName: 'Castelo de Sao Jorge',
    compassBearing: 84,
    compassLabel: 'E',
    distanceMeters: 520,
    year: '11th c.',
    category: 'fortress',
    accentColor: '#b91c1c',
    description: 'Directly east across the Baixa valley rises Lisbon iconic hilltop citadel with eleven limestone watchtowers, crenellated medieval walls, umbrella pines, and the Portuguese flag overlooking the city.'
  },
  {
    id: 'sj-baixa-grid',
    name: 'Baixa Pombalina Grid (Rua do Ouro, Rua Augusta & Rua da Prata)',
    shortName: 'Baixa Pombalina Grid',
    compassBearing: 112,
    compassLabel: 'ESE',
    distanceMeters: 160,
    year: '1755-1775',
    category: 'urban',
    accentColor: '#c2410c',
    description: 'Directly beneath the 45-meter iron tower spreads Marques de Pombal earthquake-resistant geometric grid of uniform terracotta mansard roofs, dormer windows, and sunlit downtown avenues.'
  },
  {
    id: 'sj-se-panteao',
    name: 'Se de Lisboa (1147) & Panteao Nacional Dome',
    shortName: 'Se Cathedral & Panteao',
    compassBearing: 136,
    compassLabel: 'SE',
    distanceMeters: 690,
    year: '1147 / 1682',
    category: 'cathedral',
    accentColor: '#1d4ed8',
    description: 'Southeast along the Alfama slope stand the twin crenellated Romanesque bell towers of Lisbon Cathedral (1147), backed in the distance by the gleaming white cupola of the National Pantheon.'
  },
  {
    id: 'sj-rua-augusta-tejo',
    name: 'Arco da Rua Augusta, Praca do Comercio & Rio Tejo',
    shortName: 'Rua Augusta & Tagus River',
    compassBearing: 174,
    compassLabel: 'S',
    distanceMeters: 580,
    year: '1755 / 1873',
    category: 'waterfront',
    accentColor: '#0284c7',
    description: 'Looking straight south down Rua Augusta reveals Verissimo Jose da Costa triumphal arch, the yellow Pombaline arcades of Terreiro do Paco, and the sunlit Tagus River estuary.'
  },
  {
    id: 'sj-ponte-cristo-rei',
    name: 'Ponte 25 de Abril & Santuario de Cristo Rei (Almada)',
    shortName: 'Ponte 25 de Abril & Cristo Rei',
    compassBearing: 214,
    compassLabel: 'SSW',
    distanceMeters: 3600,
    year: '1959 / 1966',
    category: 'bridge',
    accentColor: '#dc2626',
    description: 'Across the shimmering Tagus water to the southwest rise the twin red suspension towers of Ponte 25 de Abril and the outstretched-arms statue of Cristo Rei crowning the Almada cliffs.'
  },
  {
    id: 'sj-chiado',
    name: 'Chiado Hill & Rua Garrett Rooftops',
    shortName: 'Chiado & Rua Garrett',
    compassBearing: 244,
    compassLabel: 'SW',
    distanceMeters: 240,
    year: '18th c.',
    category: 'urban',
    accentColor: '#7c3aed',
    description: 'Pastel ochre and cream Pombaline facades climb westward up Chiado toward Rua Garrett, Cafe A Brasileira, and Largo do Chiado.'
  },
  {
    id: 'sj-convento-carmo',
    name: 'Ruinas do Convento do Carmo (1389) & Passadico Iron Skybridge',
    shortName: 'Convento do Carmo Ruins',
    compassBearing: 274,
    compassLabel: 'W',
    distanceMeters: 65,
    year: '1389 / 1755',
    category: 'ruins',
    accentColor: '#475569',
    description: 'Right beside the western railing, Raoul Mesnier Neo-Gothic wrought-iron walkway bridge leads straight into Largo do Carmo beneath the open-air pointed Gothic stone nave arches of Convento do Carmo.'
  }
];

