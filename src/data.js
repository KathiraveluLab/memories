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
    x: 924,
    y: 410,
    w: 52,
    h: 52,
    wallColor: '#c5bca9',
    roofColor: '#68736b',
    trimColor: '#4c544e',
    style: 'monument'
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
      artLabel: 'ALVARO SIZA LIMESTONE VAULT - DEEP ESCALATORS'
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
      artLabel: 'TAGUS RIVER BLUE GLAZED TILE GALLERY'
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
      artLabel: 'ALFAMA WATERFRONT & RAIL TERMINUS VAULT'
    },
    note: 'Eastern Blue Line terminus along the Alfama riverfront, framing the steep hillside below Portas do Sol.'
  }
];

export const VENUES = [
  // BAIRRO ALTO
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
    proprietorRole: 'Kiosk Host',
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
        costEur: 3.0,
        fullnessDelta: 15,
        energyDelta: 18,
        description: 'Freshly squeezed lemon and mint served over ice.'
      },
      {
        id: 'item-tosta-mista',
        name: 'Tosta Mista',
        kind: 'food',
        costEur: 4.5,
        fullnessDelta: 30,
        energyDelta: 14,
        description: 'Crisp grilled cheese and ham sandwich on country bread.'
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
    wallColor: '#f1dec4',
    roofColor: '#b5543c',
    awningColor: '#7a3324',
    accentColor: '#b5543c',
    proprietor: 'Dona Teresa',
    proprietorRole: 'Guesthouse Host',
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
    wallColor: '#eed7c5',
    roofColor: '#a63e2e',
    awningColor: '#7a251a',
    accentColor: '#a63e2e',
    proprietor: 'Senhor Manuel',
    proprietorRole: 'Tasca Owner',
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
    displayNote: 'A hand-crafted Portuguese guitar rests beside old playbills from Bairro Alto fado nights.',
    items: [
      {
        id: 'item-caldo-verde',
        name: 'Caldo Verde & Broa',
        kind: 'food',
        costEur: 7.5,
        fullnessDelta: 42,
        energyDelta: 24,
        description: 'Velvety kale and potato soup served with warm corn bread.'
      },
      {
        id: 'item-pasteis-bacalhau',
        name: 'Pasteis de Bacalhau',
        kind: 'food',
        costEur: 9.0,
        fullnessDelta: 48,
        energyDelta: 28,
        description: 'Golden salt-cod fritters paired with fragrant tomato rice.'
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
    wallColor: '#ebd4da',
    roofColor: '#a84732',
    awningColor: '#6f3224',
    accentColor: '#a84732',
    proprietor: 'Antonio',
    proprietorRole: 'Master Baker',
    description: 'A rose-plastered Rua da Rosa neighborhood bakery beneath fluttering balcony laundry, fragrant with wood-oven bread and pastries.',
    greeting: 'Bom dia! The wood oven just turned out warm pao com chourico and flaky almond travesseiros.',
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
    displayNote: 'Wicker bread baskets line the tiled wall behind stone-baked Mafra loaves and custard pastries.',
    items: [
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
    wallColor: '#f1dec4',
    roofColor: '#b95c3c',
    awningColor: '#864228',
    accentColor: '#b95c3c',
    proprietor: 'Sofia',
    proprietorRole: 'Art Curator',
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
    wallColor: '#e4d8eb',
    roofColor: '#6d476c',
    awningColor: '#523254',
    accentColor: '#6d476c',
    proprietor: 'Beatriz',
    proprietorRole: 'Record & Print Curator',
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
    proprietorRole: 'Master Bookseller',
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
    wallColor: '#f2f6fb',
    roofColor: '#9e4736',
    awningColor: '#244b7a',
    accentColor: '#1b4d89',
    proprietor: 'Miguel',
    proprietorRole: 'Architecture Curator',
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
    proprietorRole: 'Head Barista',
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
        costEur: 3.5,
        fullnessDelta: 22,
        energyDelta: 30,
        description: 'Classic Lisbon espresso paired with a blistered warm custard tart.'
      },
      {
        id: 'item-galao-bolo',
        name: 'Galao & Bolo de Arroz',
        kind: 'food',
        costEur: 5.0,
        fullnessDelta: 32,
        energyDelta: 25,
        description: 'Tall glass of milky coffee with a lemon-scented Portuguese rice muffin.'
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
    wallColor: '#f2f6fb',
    roofColor: '#ad4f3a',
    awningColor: '#1b4d89',
    accentColor: '#1b4d89',
    proprietor: 'Mariana',
    proprietorRole: 'Pastry Chef',
    description: 'An arched-stone Chiado tea salon and traditional confectioner beneath cobalt diamond azulejos, serving convent sweets and Azores tea.',
    greeting: 'Boa tarde! Step beneath our stone arcades for fragrant Azores Gorreana tea and handmade convent almond sweets.',
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
      layout: 'cafe'
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
    proprietorRole: 'Artisan Maker',
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
    proprietorRole: 'Tile Painter',
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
    proprietorRole: 'Chef & Host',
    description: 'A whitewashed Alfama hillside taberna adorned with festive Santos Populares garlands, cobalt doorway trim, and glowing charcoal grill.',
    greeting: 'Boa tarde, querido! The charcoal grill is hot and the sardines arrived from the river quay this morning.',
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
    displayNote: 'Ceramic platters painted with silver sardines line the kitchen pass above baskets of crusty bread.',
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
    wallColor: '#f2f6fb',
    roofColor: '#1f7063',
    awningColor: '#15544a',
    accentColor: '#1f7063',
    proprietor: 'Joao',
    proprietorRole: 'Grocer',
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
    speedPxPerSec: 138,
    dwellSeconds: 4.0,
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
    speedPxPerSec: 155,
    dwellSeconds: 3.8,
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

// All ambient Lisbon locals patrol strictly on sidewalks, plazas, and pedestrian steps (never inside vehicle lanes)
export const AMBIENT_NPCS = [
  { id: 'npc-1', name: 'Local Artist', x: 526, y: 420, patrolAxis: 'y', min: 360, max: 510, speed: 24, shirt: '#3b6ea5', hair: '#3b2b20' },
  { id: 'npc-2', name: 'Chiado Musician', x: 1120, y: 660, patrolAxis: 'x', min: 1060, max: 1340, speed: 20, shirt: '#9f4438', hair: '#2a221e' },
  { id: 'npc-3', name: 'Rua Garrett Reader', x: 1120, y: 218, patrolAxis: 'x', min: 1040, max: 1320, speed: 22, shirt: '#2b6e59', hair: '#5a3d28' },
  { id: 'npc-4', name: 'Alfama Neighbor', x: 1730, y: 440, patrolAxis: 'y', min: 360, max: 510, speed: 24, shirt: '#c68a1e', hair: '#2c2521' },
  { id: 'npc-5', name: 'Tagus Stroller', x: 1420, y: 996, patrolAxis: 'x', min: 1050, max: 1860, speed: 28, shirt: '#6a4c7a', hair: '#40312a' },
  { id: 'npc-6', name: 'Bairro Alto Stroller', x: 380, y: 660, patrolAxis: 'x', min: 240, max: 560, speed: 22, shirt: '#2c5f8a', hair: '#3b2e26' }
];

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
