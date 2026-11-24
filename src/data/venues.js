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
