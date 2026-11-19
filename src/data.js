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
    subtitle: 'Bohemian hillside lanes, evening fado taverns, and terraced viewpoints.'
  },
  {
    id: 'chiado',
    name: 'Chiado',
    minX: 840,
    maxX: 1660,
    accent: '#1b4d89',
    groundTint: '#ece6db',
    subtitle: 'Pombaline plazas, historic literary cafes, and limestone calcada promenades.'
  },
  {
    id: 'alfama',
    name: 'Alfama',
    minX: 1660,
    maxX: 2400,
    accent: '#0f766e',
    groundTint: '#e6e0d4',
    subtitle: 'Azulejo facades, winding hillside alleys, and sunlit overlooks above the Tagus.'
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
  { id: 'st-carmo', x: 1310, y: 230, w: 105, h: 760, style: 'cobble', name: 'Rua do Carmo' },
  { id: 'st-se', x: 1675, y: 230, w: 110, h: 760, style: 'cobble', name: 'Escadinhas da Se' },
  { id: 'st-east-edge', x: 2145, y: 230, w: 145, h: 760, style: 'bus-road', name: 'Largo das Portas do Sol' }
];

export const DECORATIVE_STRUCTURES = [
  {
    id: 'house-ba-north',
    neighborhood: 'bairro-alto',
    label: 'Residencias do Alto',
    x: 590,
    y: 55,
    w: 220,
    h: 140,
    wallColor: '#e7c6a5',
    roofColor: '#b5543c',
    trimColor: '#7a3324',
    style: 'townhouse'
  },
  {
    id: 'house-ba-mid',
    neighborhood: 'bairro-alto',
    label: 'Casas da Rosa',
    x: 590,
    y: 380,
    w: 220,
    h: 145,
    wallColor: '#dfbe9f',
    roofColor: '#a84732',
    trimColor: '#6f3224',
    style: 'townhouse'
  },
  {
    id: 'house-ba-south',
    neighborhood: 'bairro-alto',
    label: 'Palacete do Loreto',
    x: 245,
    y: 695,
    w: 195,
    h: 145,
    wallColor: '#ead3ad',
    roofColor: '#b95c3c',
    trimColor: '#864228',
    style: 'townhouse'
  },
  {
    id: 'house-chiado-north',
    neighborhood: 'chiado',
    label: 'Galeria Pombalina',
    x: 1445,
    y: 55,
    w: 200,
    h: 140,
    wallColor: '#d9e3ee',
    roofColor: '#9e4736',
    trimColor: '#244b7a',
    style: 'azulejo'
  },
  {
    id: 'landmark-se',
    neighborhood: 'chiado',
    label: 'Se de Lisboa',
    x: 1445,
    y: 375,
    w: 205,
    h: 150,
    wallColor: '#d7cfc1',
    roofColor: '#8e7d68',
    trimColor: '#5c4f41',
    style: 'cathedral'
  },
  {
    id: 'house-chiado-south',
    neighborhood: 'chiado',
    label: 'Arcadas do Chiado',
    x: 1070,
    y: 695,
    w: 210,
    h: 145,
    wallColor: '#dce5df',
    roofColor: '#ad4f3a',
    trimColor: '#2d5a4c',
    style: 'townhouse'
  },
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

export const VENUES = [
  // BAIRRO ALTO
  {
    id: 'quiosque-sao-pedro',
    name: 'Quiosque de Sao Pedro',
    neighborhood: 'bairro-alto',
    type: 'cafe',
    badge: '[CAFE]',
    x: 245,
    y: 60,
    w: 190,
    h: 135,
    doorSide: 'south',
    doorX: 340,
    doorY: 195,
    spawnOutside: { x: 340, y: 222 },
    wallColor: '#d8e6dc',
    roofColor: '#2f6f5e',
    awningColor: '#1f5748',
    accentColor: '#1f6e58',
    proprietor: 'Ines',
    proprietorRole: 'Kiosk Host',
    description: 'An octagonal wrought-iron kiosk near the garden terrace serving cold lemonade, espresso, and toasted sandwiches.',
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
    displayNote: 'Vintage Lisbon kiosk menus list homemade lemonade, toasted ham sandwiches, and dark-roast Portuguese coffee.',
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
    id: 'tasca-do-fado',
    name: 'Tasca do Fado',
    neighborhood: 'bairro-alto',
    type: 'restaurant',
    badge: '[RESTAURANT]',
    x: 245,
    y: 380,
    w: 195,
    h: 145,
    doorSide: 'south',
    doorX: 342,
    doorY: 525,
    spawnOutside: { x: 342, y: 548 },
    wallColor: '#eed7c5',
    roofColor: '#a63e2e',
    awningColor: '#8d2f22',
    accentColor: '#a63e2e',
    proprietor: 'Senhor Manuel',
    proprietorRole: 'Tasca Owner',
    description: 'A warm candlelit Bairro Alto tavern where stone soup bowls meet the gentle tuning of a twelve-string Portuguese guitar.',
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
    id: 'vinil-do-alto',
    name: 'Vinil & Gravuras do Alto',
    neighborhood: 'bairro-alto',
    type: 'shop',
    badge: '[SHOP]',
    x: 590,
    y: 695,
    w: 210,
    h: 145,
    doorSide: 'north',
    doorX: 695,
    doorY: 695,
    spawnOutside: { x: 695, y: 672 },
    wallColor: '#e4d8eb',
    roofColor: '#6d476c',
    awningColor: '#583758',
    accentColor: '#6d476c',
    proprietor: 'Beatriz',
    proprietorRole: 'Record & Print Curator',
    description: 'An independent Bairro Alto shop filled with classic fado vinyl sleeves and hand-pulled linocut prints of Lisbon streetcars.',
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
      layout: 'shop'
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
    name: 'Livraria Antiga do Chiado',
    neighborhood: 'chiado',
    type: 'shop',
    badge: '[SHOP]',
    x: 1060,
    y: 55,
    w: 215,
    h: 140,
    doorSide: 'south',
    doorX: 1167,
    doorY: 195,
    spawnOutside: { x: 1167, y: 222 },
    wallColor: '#d7e2ec',
    roofColor: '#1f4975',
    awningColor: '#16385b',
    accentColor: '#1b4d89',
    proprietor: 'Duarte',
    proprietorRole: 'Master Bookseller',
    description: 'Vaulted timber bookrooms inspired by Rua Garrett literary heritage, stocked with poetry, Lisbon maps, and notebooks.',
    greeting: 'Boa tarde! Step softly between the oak alcoves. Readers have traded stories under these arches for centuries.',
    phrase: {
      pt: 'Procura algum livro sobre a historia de Lisboa?',
      pronunciation: 'Proh-koo-rah ahl-goom lee-vroo soh-breh ah eesh-toh-ree-ah deh Leesh-boh-ah?',
      en: 'Are you looking for a book about the history of Lisbon?'
    },
    memory: {
      id: 'mem-livraria-chiado',
      title: 'Oak Shelves of Livraria Antiga',
      category: 'venue',
      neighborhood: 'Chiado',
      caption: 'Floor-to-ceiling bookcases scented with cedar, paper, and quiet Chiado afternoons.'
    },
    interiorTheme: {
      floorPrimary: '#b98f66',
      floorSecondary: '#ae845b',
      wall: '#efe8dc',
      trim: '#16385b',
      counter: '#6c492e',
      layout: 'shop'
    },
    displayNote: 'A glass display holds a bilingual pocket edition of poems celebrating Lisbon fog and river light.',
    items: [
      {
        id: 'item-pessoa-book',
        name: 'Pocket Book of Lisbon Verse',
        kind: 'souvenir',
        costEur: 11.0,
        fullnessDelta: 0,
        energyDelta: 5,
        description: 'Bilingual Portuguese-English poetry collection stamped with the bookshop seal.'
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
    id: 'cafe-do-poeta',
    name: 'Cafe do Poeta',
    neighborhood: 'chiado',
    type: 'cafe',
    badge: '[CAFE]',
    x: 1070,
    y: 380,
    w: 210,
    h: 145,
    doorSide: 'south',
    doorX: 1175,
    doorY: 525,
    spawnOutside: { x: 1175, y: 548 },
    wallColor: '#f0e5d1',
    roofColor: '#9c6724',
    awningColor: '#7c4f18',
    accentColor: '#a6701e',
    proprietor: 'Clara',
    proprietorRole: 'Head Barista',
    description: 'A brass-and-mirror Chiado coffee house where poets and travelers share marble tables over bica and warm custard tarts.',
    greeting: 'Bom dia! Fresh pasteis de nata just came out of the oven, dusted with cinnamon and powdered sugar.',
    phrase: {
      pt: 'Uma bica e um pastel de nata quentinho, se faz favor.',
      pronunciation: 'Oo-mah bee-kah ee oom pahsh-tehl deh nah-tah ken-tee-nyoo, seh fahsh fah-vohr.',
      en: 'An espresso and a warm custard tart, please.'
    },
    memory: {
      id: 'mem-cafe-do-poeta',
      title: 'Morning Bica at Cafe do Poeta',
      category: 'venue',
      neighborhood: 'Chiado',
      caption: 'Flaky warm pastry, dark Lisbon roast, and Tram 28E bells drifting through tall glass doors.'
    },
    interiorTheme: {
      floorPrimary: '#ede8de',
      floorSecondary: '#2d3540',
      wall: '#f7f1e3',
      trim: '#7c4f18',
      counter: '#5e3d24',
      layout: 'cafe'
    },
    displayNote: 'Polished brass coffee urns reflect the black-and-white marble checkerboard across the café salon.',
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
    id: 'atelier-cortica',
    name: 'Atelier de Cortica & Luvas',
    neighborhood: 'chiado',
    type: 'shop',
    badge: '[SHOP]',
    x: 1450,
    y: 695,
    w: 200,
    h: 145,
    doorSide: 'north',
    doorX: 1550,
    doorY: 695,
    spawnOutside: { x: 1550, y: 672 },
    wallColor: '#eadbc8',
    roofColor: '#995c38',
    awningColor: '#7a4526',
    accentColor: '#995c38',
    proprietor: 'Helena',
    proprietorRole: 'Artisan Maker',
    description: 'A sunlit Chiado craft atelier showcasing supple Alentejo cork journals, wallets, and fine hand-stitched goods.',
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
      caption: 'Warm honey-toned cork leather, brass stitching tools, and patient Lisbon craftsmanship.'
    },
    interiorTheme: {
      floorPrimary: '#d5b997',
      floorSecondary: '#caa983',
      wall: '#f6eee4',
      trim: '#7a4526',
      counter: '#7e5536',
      layout: 'shop'
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
    id: 'oficina-azulejos',
    name: 'Oficina de Azulejos',
    neighborhood: 'alfama',
    type: 'shop',
    badge: '[SHOP]',
    x: 1840,
    y: 55,
    w: 220,
    h: 140,
    doorSide: 'south',
    doorX: 1950,
    doorY: 195,
    spawnOutside: { x: 1950, y: 222 },
    wallColor: '#d9e6f2',
    roofColor: '#1d568a',
    awningColor: '#15406a',
    accentColor: '#1d568a',
    proprietor: 'Tiago',
    proprietorRole: 'Tile Painter',
    description: 'A cobalt-and-white Alfama ceramic studio where artisans glaze geometric tiles and maritime vignettes by hand.',
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
      layout: 'shop'
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
    x: 1845,
    y: 380,
    w: 220,
    h: 145,
    doorSide: 'south',
    doorX: 1955,
    doorY: 525,
    spawnOutside: { x: 1955, y: 548 },
    wallColor: '#f2e0c7',
    roofColor: '#bf5530',
    awningColor: '#9c3f21',
    accentColor: '#bf5530',
    proprietor: 'Dona Rosa',
    proprietorRole: 'Chef & Host',
    description: 'A lively Alfama neighborhood eatery fragrant with charcoal-grilled sardines, roasted peppers, and sea salt.',
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
      caption: 'Crisp grilled sardines on thick bread, laughter across linen tables, and Tagus sunshine.'
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
    x: 1845,
    y: 695,
    w: 220,
    h: 145,
    doorSide: 'north',
    doorX: 1955,
    doorY: 695,
    spawnOutside: { x: 1955, y: 672 },
    wallColor: '#e9e2ce',
    roofColor: '#1f7063',
    awningColor: '#15544a',
    accentColor: '#1f7063',
    proprietor: 'Joao',
    proprietorRole: 'Grocer',
    description: 'An old-world Alfama corner grocer gleaming with brightly illustrated Portuguese fish tins, fig sweets, and cherry cordial.',
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
      layout: 'shop'
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
      { x: 240, y: 610, stopId: 'stop-tram-loreto', stopName: 'Rua do Loreto (Bairro Alto)', platformY: 568 },
      { x: 960, y: 610, stopId: 'stop-tram-camoes', stopName: 'Praca Luis de Camoes (Chiado)', platformY: 568 },
      { x: 1360, y: 610, stopId: 'stop-tram-chiado', stopName: 'Largo do Chiado (Chiado)', platformY: 568 },
      { x: 1730, y: 610, stopId: 'stop-tram-se', stopName: 'Se de Lisboa (Alfama Edge)', platformY: 568 },
      { x: 2150, y: 610, stopId: 'stop-tram-alfama', stopName: 'Portas do Sol (Alfama)', platformY: 568 }
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
      { x: 340, y: 285, stopId: 'stop-bus-sao-pedro', stopName: 'Sao Pedro de Alcantara (Bairro Alto)', platformY: 242 },
      { x: 1170, y: 285, stopId: 'stop-bus-garrett', stopName: 'Rua Garrett (Chiado)', platformY: 242 },
      { x: 1950, y: 285, stopId: 'stop-bus-santa-luzia', stopName: 'Miradouro Santa Luzia (Alfama)', platformY: 242 },
      { x: 2215, y: 285 },
      { x: 2215, y: 932 },
      { x: 1920, y: 932, stopId: 'stop-bus-cais-alfama', stopName: 'Cais de Alfama (Waterfront)', platformY: 888 },
      { x: 950, y: 932, stopId: 'stop-bus-camoes-sul', stopName: 'Camoes Sul (Waterfront)', platformY: 888 },
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

export const AMBIENT_NPCS = [
  { id: 'npc-1', name: 'Local Artist', x: 520, y: 295, patrolAxis: 'y', min: 255, max: 495, speed: 24, shirt: '#3b6ea5', hair: '#3b2b20' },
  { id: 'npc-2', name: 'Musician', x: 930, y: 540, patrolAxis: 'x', min: 895, max: 1015, speed: 20, shirt: '#9f4438', hair: '#2a221e' },
  { id: 'npc-3', name: 'Reader', x: 1355, y: 390, patrolAxis: 'y', min: 260, max: 520, speed: 22, shirt: '#2b6e59', hair: '#5a3d28' },
  { id: 'npc-4', name: 'Tile Courier', x: 1730, y: 450, patrolAxis: 'y', min: 265, max: 545, speed: 26, shirt: '#c68a1e', hair: '#2c2521' },
  { id: 'npc-5', name: 'Waterfront Stroller', x: 1450, y: 900, patrolAxis: 'x', min: 1120, max: 1780, speed: 28, shirt: '#6a4c7a', hair: '#40312a' }
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
