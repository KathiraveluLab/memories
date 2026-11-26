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

// Factual Metropolitano de Lisboa Greater Lisboa stations - EVERY SINGLE ONE of the 50 unique official stations
// (56 stops across Linha Azul [18], Linha Amarela [13], Linha Verde [13], Linha Vermelha [12], with 6 2-line interchanges).
// Zero merged/combined stations: Oriente and Aeroporto are separate stations, with Aeroporto as the true Red Line terminus!
const FEATURED_CITY_METRO_STATIONS = [
  {
    id: 'metro-cais-sodre',
    name: 'Metro Cais do Sodre',
    canonicalStopName: 'Cais do Sodre',
    corridorStops: ['Cais do Sodre'],
    neighborhood: 'cais-sodre-belem',
    zoneLabel: 'Cais do Sodre Riverfront & Belem Corridor',
    districtId: 'district-cais-sodre-belem',
    order: 3,
    lines: ['Linha Verde'],
    lineColors: ['#16a34a'],
    transitConnections: ['Eletrico 15E (Belem / Alges)', 'CP Linha de Cascais', 'Transtejo Ferry (Cacilhas / Seixal / Montijo)'],
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
      oppositeDest: 'Terminus (Cais do Sodre)',
      transferLine: 'CP Cascais Rail, Eletrico 15E & Transtejo Ferries'
    },
    note: 'Award-winning southern Linha Verde terminus adorned with cobalt Alice-in-Wonderland rabbit panels, linking directly to Eletrico 15E and Transtejo ferries.'
  },
  {
    id: 'metro-rossio',
    name: 'Metro Rossio',
    canonicalStopName: 'Rossio',
    corridorStops: ['Rossio'],
    neighborhood: 'rossio-restauradores',
    zoneLabel: 'Praca Dom Pedro IV (Rossio) & Baixa',
    districtId: 'district-rossio-restauradores',
    order: 4,
    lines: ['Linha Verde'],
    lineColors: ['#16a34a'],
    transitConnections: ['Elevador de Santa Justa (1902)', 'CP Linha de Sintra (Estacao do Rossio)', 'Carris Buses 736 / 706 / 744'],
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
    note: 'Historic downtown Linha Verde station opening directly onto Praca Dom Pedro IV (Rossio), the baroque fountains, and Teatro Nacional D. Maria II.'
  },
  {
    id: 'metro-marques-pombal',
    name: 'Metro Marques de Pombal',
    canonicalStopName: 'Marques de Pombal',
    corridorStops: ['Marques de Pombal'],
    neighborhood: 'marques-pombal-avenida',
    zoneLabel: 'Praca Marques de Pombal & Parque Eduardo VII',
    districtId: 'district-marques-pombal-avenida',
    order: 5,
    lines: ['Linha Azul', 'Linha Amarela'],
    lineColors: ['#2563eb', '#eab308'],
    transitConnections: ['Linha Azul & Linha Amarela Interchange', 'Carris Buses 736 / 746 / 744'],
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
    note: 'Central Lisbon interchange where the original 1959 network joins Linha Azul and Linha Amarela beneath the Monumento ao Marques de Pombal.'
  },
  {
    id: 'metro-rato',
    name: 'Metro Rato',
    canonicalStopName: 'Rato',
    corridorStops: ['Rato'],
    neighborhood: 'rato-principe-real',
    zoneLabel: 'Largo do Rato & Principe Real',
    districtId: 'district-rato-principe-real',
    order: 6,
    lines: ['Linha Amarela'],
    lineColors: ['#eab308'],
    transitConnections: ['Eletrico 24E (Campolide - Principe Real - Camoes)', 'Carris Buses 706 / 758 / 773'],
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
    note: 'Southern terminus of Linha Amarela featuring polychrome geometric tile panels by Manuel Cargaleiro beneath Largo do Rato.'
  },
  {
    id: 'metro-saldanha',
    name: 'Metro Saldanha',
    canonicalStopName: 'Saldanha',
    corridorStops: ['Saldanha'],
    neighborhood: 'saldanha-campo-pequeno',
    zoneLabel: 'Praca Duque de Saldanha & Avenidas Novas',
    districtId: 'district-saldanha-campo-pequeno',
    order: 7,
    lines: ['Linha Amarela', 'Linha Vermelha'],
    lineColors: ['#eab308', '#dc2626'],
    transitConnections: ['Linha Amarela & Linha Vermelha Interchange', 'Carris Buses 736 / 744 / 727'],
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
    note: 'Major Avenidas Novas interchange uniting Linha Amarela and Linha Vermelha beneath Praca Duque de Saldanha.'
  },
  {
    id: 'metro-sao-sebastiao',
    name: 'Metro Sao Sebastiao',
    canonicalStopName: 'Sao Sebastiao',
    corridorStops: ['Sao Sebastiao'],
    neighborhood: 'sao-sebastiao-sete-rios',
    zoneLabel: 'Sao Sebastiao & Fundacao Calouste Gulbenkian',
    districtId: 'district-sao-sebastiao-sete-rios',
    order: 8,
    lines: ['Linha Azul', 'Linha Vermelha'],
    lineColors: ['#2563eb', '#dc2626'],
    transitConnections: ['Linha Azul & Linha Vermelha Interchange', 'Carris Bus 746', 'Fundacao Calouste Gulbenkian'],
    undergroundTheme: {
      wallPrimary: '#e5ecf6',
      tileAccent: '#1d4ed8',
      platformFloor: '#d5dce4',
      trim: '#b91c1c',
      artLabel: 'MARIA KEIL & TIAGO HENRIQUES - AZUL & VERMELHA HUB',
      architect: 'Falcao e Cunha (1959) / Tiago Henriques (2009)',
      artist: 'Maria Keil',
      muralStyle: 'keil-geometric-patterns',
      nextTrainDest: 'Aeroporto / Reboleira',
      oppositeDest: 'Santa Apolonia (via Marques de Pombal & Baixa-Chiado)',
      transferLine: 'Linha Azul & Linha Vermelha Western Terminus Hub'
    },
    note: 'Western transfer hub linking Linha Azul with the western terminus of Linha Vermelha directly beside Fundacao Calouste Gulbenkian.'
  },
  {
    id: 'metro-campo-grande',
    name: 'Metro Campo Grande',
    canonicalStopName: 'Campo Grande',
    corridorStops: ['Campo Grande'],
    neighborhood: 'campo-grande-alvalade',
    zoneLabel: 'Jardim do Campo Grande & Northern Viaduct Hub',
    districtId: 'district-campo-grande-alvalade',
    order: 9,
    lines: ['Linha Amarela', 'Linha Verde'],
    lineColors: ['#eab308', '#16a34a'],
    transitConnections: ['Linha Amarela & Linha Verde Interchange', 'Carris Bus 736 / 746', 'Carris Metropolitana Terminal'],
    undergroundTheme: {
      wallPrimary: '#e4efe8',
      tileAccent: '#15803d',
      platformFloor: '#d4ddd6',
      trim: '#ca8a04',
      artLabel: 'EDUARDO NERY - 18TH-CENTURY BAROQUE CONVITE TILE FIGURES',
      architect: 'Ezequiel Nicolau (1993)',
      artist: 'Eduardo Nery (Fabrica Viuva Lamego Cutouts)',
      muralStyle: 'nery-convite-sentinels',
      nextTrainDest: 'Odivelas / Telheiras',
      oppositeDest: 'Rato / Cais do Sodre',
      transferLine: 'Linha Amarela & Linha Verde Interchange'
    },
    note: 'Elevated viaduct interchange uniting Linha Amarela (Odivelas) and Linha Verde (Telheiras), guarded by Eduardo Nery blue-and-white baroque tile sentinels.'
  },
  {
    id: 'metro-alameda',
    name: 'Metro Alameda',
    canonicalStopName: 'Alameda',
    corridorStops: ['Alameda'],
    neighborhood: 'alameda-arroios',
    zoneLabel: 'Alameda Dom Afonso Henriques & Fonte Luminosa',
    districtId: 'district-alameda-arroios',
    order: 10,
    lines: ['Linha Verde', 'Linha Vermelha'],
    lineColors: ['#16a34a', '#dc2626'],
    transitConnections: ['Linha Verde & Linha Vermelha Interchange', 'Carris Buses 706 / 708 / 717 / 720', 'Instituto Superior Tecnico'],
    undergroundTheme: {
      wallPrimary: '#f5e4dc',
      tileAccent: '#dc2626',
      platformFloor: '#dfd4ce',
      trim: '#15803d',
      artLabel: 'COSTA PINHEIRO & MARIA KEIL - NAVIGATORS AZULEJOS',
      architect: 'Falcao e Cunha (1972) / Manuel Tainha (1998)',
      artist: 'Maria Keil, Costa Pinheiro, Noronha da Costa & Alberto Carneiro',
      muralStyle: 'taveira-polychrome-arches',
      nextTrainDest: 'Aeroporto (via Oriente) / Telheiras',
      oppositeDest: 'Cais do Sodre / Sao Sebastiao',
      transferLine: 'Linha Verde & Linha Vermelha Interchange'
    },
    note: 'Eastern interchange where Linha Verde meets Linha Vermelha beneath the 1948 Fonte Luminosa and Instituto Superior Tecnico.'
  },
  {
    id: 'metro-oriente',
    name: 'Metro Oriente',
    canonicalStopName: 'Oriente',
    corridorStops: ['Oriente'],
    neighborhood: 'oriente-parque-nacoes',
    zoneLabel: 'Gare do Oriente & Parque das Nacoes',
    districtId: 'district-oriente-parque-nacoes',
    order: 11,
    lines: ['Linha Vermelha'],
    lineColors: ['#dc2626'],
    transitConnections: ['Gare do Oriente High-Speed CP Rail & Bus Hub', 'Carris Buses 728 / 744', 'Telecabine Lisboa & Oceanario'],
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
      transferLine: 'Gare do Oriente Rail & Parque das Nacoes'
    },
    note: 'Monumental Expo 98 Linha Vermelha station beneath Santiago Calatrava white gothic canopy at Gare do Oriente, three stops before Aeroporto.'
  },
  {
    id: 'metro-aeroporto',
    name: 'Metro Aeroporto',
    canonicalStopName: 'Aeroporto',
    corridorStops: ['Aeroporto'],
    neighborhood: 'aeroporto-lisboa',
    zoneLabel: 'Aeroporto Humberto Delgado (Terminal 1)',
    districtId: 'district-aeroporto-lisboa',
    order: 12,
    lines: ['Linha Vermelha'],
    lineColors: ['#dc2626'],
    transitConnections: ['Aeroporto Humberto Delgado Terminal 1 Arrivals & Departures', 'Carris Bus 744 (Restauradores - Saldanha - Aeroporto - Oriente)', 'Carris Bus 722 / 783'],
    undergroundTheme: {
      wallPrimary: '#f1f5f9',
      tileAccent: '#dc2626',
      platformFloor: '#d8dee6',
      trim: '#b91c1c',
      artLabel: 'ANTONIO ANTUNES - CARICATURES OF LISBON CULTURAL ICONS',
      architect: 'Leopoldo de Almeida Rosa (2012)',
      artist: 'Antonio Antunes (Stone-Engraved Portraits of Amalia, Pessoa & Eca)',
      muralStyle: 'calatrava-oceans-mural',
      nextTrainDest: 'Terminus (Aeroporto Humberto Delgado)',
      oppositeDest: 'Sao Sebastiao (via Encarnacao, Moscavide & Oriente)',
      transferLine: 'Linha Vermelha Eastern Terminus - Lisbon Airport Terminal 1'
    },
    note: 'Official eastern terminus of Linha Vermelha opening directly beneath Terminal 1 of Aeroporto Humberto Delgado, lined with stone-engraved caricatures of Lisbon cultural legends by Antonio Antunes.'
  }
];

// All 37 remaining official individual Metropolitano de Lisboa stations across Linha Azul, Amarela, Verde, and Vermelha
// so every single one of the 50 physical stations (56 line stops) is individually modeled, walkable, and rideable!
const ADDITIONAL_METRO_STATION_SPECS = [
  // Linha Azul (13 additional stations: Reboleira -> Restauradores)
  { id: 'metro-reboleira', stop: 'Reboleira', lineId: 'linha-azul', hood: 'sao-sebastiao-sete-rios', zone: 'Reboleira (Amadora) - Blue Line Western Terminus', x: -2140, y: -2596, architect: 'Leopoldo de Almeida Rosa (2016)', artist: 'Viuva Lamego Contemporary Panels', mural: 'transparencia-blue-glass', conn: ['CP Linha de Sintra & Azambuja Rail', 'Carris Metropolitana Amadora'], note: 'Western terminus of Linha Azul connecting Amadora directly with CP Linha de Sintra suburban rail.' },
  { id: 'metro-amadora-este', stop: 'Amadora Este', lineId: 'linha-azul', hood: 'sao-sebastiao-sete-rios', zone: 'Falagueira / Amadora Este', x: -1860, y: -2596, architect: 'Leopoldo de Almeida Rosa (2004)', artist: 'Graca Morais', mural: 'transparencia-blue-glass', conn: ['Carris Metropolitana 1502 / 1508'], note: 'Linha Azul station in Amadora adorned with expressive ceramic murals by Graca Morais.' },
  { id: 'metro-alfornelos', stop: 'Alfornelos', lineId: 'linha-azul', hood: 'sao-sebastiao-sete-rios', zone: 'Alfornelos (Amadora)', x: -1620, y: -2596, architect: 'Alberto Barradas (2004)', artist: 'Ana Vidigal', mural: 'keil-geometric-patterns', conn: ['Carris Metropolitana Alfornelos'], note: 'Linha Azul station featuring bright red-and-white playful tile motifs by Ana Vidigal.' },
  { id: 'metro-pontinha', stop: 'Pontinha', lineId: 'linha-azul', hood: 'sao-sebastiao-sete-rios', zone: 'Pontinha & Estrada Militar', x: -1240, y: -2596, architect: 'Ana Nascimento (1997)', artist: 'Jacinto Luis', mural: 'keil-geometric-patterns', conn: ['Carris Bus 726 / 747', 'Pontinha Bus Terminal'], note: 'Linha Azul station on the northwest rim of Lisbon decorated with deep ultramarine mosaics by Jacinto Luis.' },
  { id: 'metro-carnide', stop: 'Carnide', lineId: 'linha-azul', hood: 'sao-sebastiao-sete-rios', zone: 'Carnide Historic Village', x: -1960, y: -1916, architect: 'Jose de Almeida (1997)', artist: 'Jose de Guimaraes', mural: 'cargaleiro-polychrome', conn: ['Carris Bus 729 / 747'], note: 'Linha Azul station serving historic Carnide, celebrated for colorful modernist totems and ceramic reliefs by Jose de Guimaraes.' },
  { id: 'metro-colegio-militar-luz', stop: 'Colegio Militar/Luz', lineId: 'linha-azul', hood: 'sao-sebastiao-sete-rios', zone: 'Benfica, Estadio da Luz & Colombo', x: -1720, y: -1916, architect: 'Antonio J. Mendes (1988)', artist: 'Manuel Cargaleiro', mural: 'cargaleiro-polychrome', conn: ['Estadio da Luz', 'Carris Buses 703 / 729 / 750 / 767'], note: 'Major Benfica Linha Azul hub next to Estadio da Luz decorated with blue-and-ochre geometric azulejos by Manuel Cargaleiro.' },
  { id: 'metro-alto-dos-moinhos', stop: 'Alto dos Moinhos', lineId: 'linha-azul', hood: 'sao-sebastiao-sete-rios', zone: 'Alto dos Moinhos & Sao Domingos de Benfica', x: -2060, y: -1236, architect: 'Ezequiel Nicolau (1988)', artist: 'Julio Pomar', mural: 'pomar-zoo-fauna', conn: ['Carris Bus 754', 'Museu da Musica'], note: 'Linha Azul station famous for Julio Pomar large ceramic portraits of Fernando Pessoa, Camoes, Bocage, and Almada Negreiros.' },
  { id: 'metro-laranjeiras', stop: 'Laranjeiras', lineId: 'linha-azul', hood: 'sao-sebastiao-sete-rios', zone: 'Laranjeiras & Estrada da Luz', x: -1820, y: -1236, architect: 'Antonio J. Mendes (1988)', artist: 'Rolando Sa Nogueira', mural: 'keil-geometric-patterns', conn: ['Carris Bus 726 / 768'], note: 'Linha Azul station decorated with warm terracotta orange-tree tile panels by Rolando Sa Nogueira.' },
  { id: 'metro-jardim-zoologico', stop: 'Jardim Zoologico', lineId: 'linha-azul', hood: 'sao-sebastiao-sete-rios', zone: 'Sete Rios & Jardim Zoologico de Lisboa', x: -1300, y: -1236, architect: 'Falcao e Cunha (1959) / Benoliel de Carvalho (1995)', artist: 'Julio Pomar', mural: 'pomar-zoo-fauna', conn: ['CP Sete Rios Rail', 'Jardim Zoologico Teleferico', 'Carris Bus 746'], note: 'Original 1959 Linha Azul station at Sete Rios celebrated for lively ceramic animal murals by Julio Pomar right outside Lisbon Zoo.' },
  { id: 'metro-praca-de-espanha', stop: 'Praca de Espanha', lineId: 'linha-azul', hood: 'sao-sebastiao-sete-rios', zone: 'Praca de Espanha & Parque Urbano', x: -1140, y: -1236, architect: 'Falcao e Cunha (1959)', artist: 'Maria Keil', mural: 'keil-geometric-patterns', conn: ['Fundacao Calouste Gulbenkian West', 'Carris Buses 716 / 726 / 746'], note: '1959 Linha Azul station beside Parque Urbano Goncalo Ribeiro Telles, adorned with Maria Keil classic geometric tilework.' },
  { id: 'metro-parque', stop: 'Parque', lineId: 'linha-azul', hood: 'marques-pombal-avenida', zone: 'Parque Eduardo VII & Av. Antonio Augusto de Aguiar', x: 160, y: -1236, architect: 'Falcao e Cunha (1959) / Sanchez Jorge (1994)', artist: 'Francoise Schein & Federica Matta', mural: 'transparencia-blue-glass', conn: ['Parque Eduardo VII', 'Carris Bus 746'], note: 'Linha Azul station celebrated for its cobalt azulejo tribute to the Universal Declaration of Human Rights and Portuguese maritime exploration by Francoise Schein.' },
  { id: 'metro-avenida', stop: 'Avenida', lineId: 'linha-azul', hood: 'rossio-restauradores', zone: 'Avenida da Liberdade & Teatro Tivoli', x: 320, y: -556, architect: 'Falcao e Cunha (1959) / Sanchez Jorge (1982)', artist: 'Rogerio Ribeiro', mural: 'keil-geometric-patterns', conn: ['Avenida da Liberdade', 'Carris Buses 709 / 711 / 732 / 736'], note: 'Original 1959 Linha Azul station midway along tree-lined Avenida da Liberdade featuring Rogerio Ribeiro rhythmic azulejo panels.' },
  { id: 'metro-restauradores', stop: 'Restauradores', lineId: 'linha-azul', hood: 'rossio-restauradores', zone: 'Praca dos Restauradores & Elevador da Gloria', x: 140, y: -556, architect: 'Falcao e Cunha (1959) / Manuel Ponte (1994)', artist: 'Maria Keil, Luiz Ventura & Nadir Afonso', mural: 'cargaleiro-polychrome', conn: ['Elevador da Gloria (1885)', 'CP Rossio Station', 'Carris Bus 736 / 744'], note: 'Downtown Linha Azul station at Praca dos Restauradores connecting to Elevador da Gloria and featuring Brasil-Portugal murals by Luiz Ventura and Nadir Afonso.' },
  // Linha Amarela (9 additional stations: Odivelas -> Picoas)
  { id: 'metro-odivelas', stop: 'Odivelas', lineId: 'linha-amarela', hood: 'campo-grande-alvalade', zone: 'Odivelas - Yellow Line Northern Terminus', x: -360, y: -2596, architect: 'Paulo Brito da Silva (2004)', artist: 'Alvaro Lapa', mural: 'almada-marble-reliefs', conn: ['Carris Metropolitana Odivelas', 'Mosteiro de Sao Dinis'], note: 'Northern terminus of Linha Amarela featuring sculptural tile compositions by Alvaro Lapa.' },
  { id: 'metro-senhor-roubado', stop: 'Senhor Roubado', lineId: 'linha-amarela', hood: 'campo-grande-alvalade', zone: 'Senhor Roubado Viaduct & Transport Hub', x: 160, y: -2596, architect: 'Manuel Bastos (2004)', artist: 'Pedro Croft', mural: 'almada-marble-reliefs', conn: ['Senhor Roubado Bus Interface'], note: 'Elevated Linha Amarela station north of Lumiar with minimalist geometric art interventions by Pedro Croft.' },
  { id: 'metro-ameixoeira', stop: 'Ameixoeira', lineId: 'linha-amarela', hood: 'campo-grande-alvalade', zone: 'Ameixoeira & Santa Clara', x: 620, y: -2596, architect: 'Robert Mac Fadden (2004)', artist: 'Irene Buarque', mural: 'cargaleiro-polychrome', conn: ['Carris Bus 703 / 717 / 796'], note: 'Linha Amarela station featuring luminous stained-glass and ceramic compositions by Irene Buarque.' },
  { id: 'metro-lumiar', stop: 'Lumiar', lineId: 'linha-amarela', hood: 'campo-grande-alvalade', zone: 'Lumiar & Alameda das Linhas de Torres', x: 1180, y: -2596, architect: 'Dinis Gomes (2004)', artist: 'Antonio Moutinho, Marta Lima & Susete Rebelo', mural: 'nery-convite-sentinels', conn: ['Carris Bus 717 / 736 / 796', 'Museu Nacional do Traje'], note: 'Northern Lisbon Linha Amarela station serving Lumiar and Quinta das Lilases with vibrant contemporary tile mosaics.' },
  { id: 'metro-quinta-das-conchas', stop: 'Quinta das Conchas', lineId: 'linha-amarela', hood: 'campo-grande-alvalade', zone: 'Parque da Quinta das Conchas e dos Lilases', x: 1520, y: -2596, architect: 'Bartolomeu Costa Cabral (2004)', artist: 'Joana Rosa & Manuel Batista', mural: 'nery-convite-sentinels', conn: ['Parque da Quinta das Conchas', 'Carris Bus 717 / 736'], note: 'Linha Amarela station right beside Lisbon third-largest green park, decorated with sculptural reliefs by Joana Rosa and Manuel Batista.' },
  { id: 'metro-cidade-universitaria', stop: 'Cidade Universitaria', lineId: 'linha-amarela', hood: 'campo-grande-alvalade', zone: 'Universidade de Lisboa & Reitoria Campus', x: 240, y: -1916, architect: 'Sanchez Jorge (1988)', artist: 'Maria Helena Vieira da Silva', mural: 'cargaleiro-polychrome', conn: ['Universidade de Lisboa Reitoria', 'Hospital de Santa Maria', 'Carris Bus 738 / 746'], note: 'Linha Amarela station directly serving the University of Lisbon campus, famous for monumental azulejo murals by Maria Helena Vieira da Silva.' },
  { id: 'metro-entre-campos', stop: 'Entre Campos', lineId: 'linha-amarela', hood: 'saldanha-campo-pequeno', zone: 'Entre Campos & Avenida da Republica', x: 2910, y: -1236, architect: 'Falcao e Cunha (1959) / Sanchez Jorge (1993)', artist: 'Bartolomeu Cid dos Santos & Jose Santa Barbara', mural: 'almada-marble-reliefs', conn: ['CP Entre Campos Urban & Fertagus Rail', 'Carris Bus 736 / 744'], note: 'Major rail-metro hub along Avenida da Republica featuring engraved stone calligraphy panels by Bartolomeu Cid dos Santos.' },
  { id: 'metro-campo-pequeno', stop: 'Campo Pequeno', lineId: 'linha-amarela', hood: 'saldanha-campo-pequeno', zone: 'Praca do Campo Pequeno (1892)', x: 2700, y: -1236, architect: 'Falcao e Cunha (1959) / Duarte Nuno Simoes (1994)', artist: 'Francisco Simoes & Maria Keil', mural: 'almada-marble-reliefs', conn: ['Praca do Campo Pequeno 1892', 'Carris Bus 736 / 744'], note: 'Linha Amarela station beneath the 1892 Neo-Moorish red-brick rotunda of Campo Pequeno, displaying limestone reliefs of Lisbon merchants by Francisco Simoes.' },
  { id: 'metro-picoas', stop: 'Picoas', lineId: 'linha-amarela', hood: 'marques-pombal-avenida', zone: 'Picoas & Avenida Fontes Pereira de Melo', x: 340, y: -1236, architect: 'Falcao e Cunha (1959) / Dinis Gomes (1995)', artist: 'Martins Correia & Hector Guimard Access', mural: 'keil-geometric-patterns', conn: ['Guimard Paris Art Nouveau Metro Arch', 'Carris Bus 736 / 744'], note: 'Linha Amarela station crowned by an authentic Hector Guimard Art Nouveau Paris Metro cast-iron entrance gifted by RATP and stone friezes by Martins Correia.' },
  // Linha Verde (8 additional stations: Telheiras -> Martim Moniz)
  { id: 'metro-telheiras', stop: 'Telheiras', lineId: 'linha-verde', hood: 'campo-grande-alvalade', zone: 'Telheiras - Green Line Northern Terminus', x: -360, y: -1916, architect: 'Duarte Nuno Simoes (2002)', artist: 'Eduardo Batarda', mural: 'dacosta-wonderland-tiles', conn: ['Carris Bus 747 / 767'], note: 'Northern terminus of Linha Verde celebrated for witty graphic ceramic friezes by Eduardo Batarda.' },
  { id: 'metro-alvalade', stop: 'Alvalade', lineId: 'linha-verde', hood: 'campo-grande-alvalade', zone: 'Praca de Alvalade & Avenida da Igreja', x: 1860, y: -1916, architect: 'Dinis Gomes (1972) / Sanchez Jorge (2006)', artist: 'Maria Keil & Bela Silva', mural: 'keil-geometric-patterns', conn: ['Avenida da Igreja', 'Carris Bus 717 / 735 / 767'], note: 'Beloved Linha Verde station in Alvalade pairing Maria Keil 1972 tiles with Bela Silva vibrant floral ceramic panels.' },
  { id: 'metro-roma', stop: 'Roma', lineId: 'linha-verde', hood: 'campo-grande-alvalade', zone: 'Avenida de Roma', x: 2150, y: -1916, architect: 'Dinis Gomes (1972)', artist: 'Maria Keil & Lourdes de Castro', mural: 'keil-geometric-patterns', conn: ['CP Roma-Areeiro Rail', 'Avenida de Roma Shops'], note: 'Linha Verde station beneath lively Avenida de Roma adorned with shadow silhouettes by Lourdes de Castro and Maria Keil tilework.' },
  { id: 'metro-areeiro', stop: 'Areeiro', lineId: 'linha-verde', hood: 'campo-grande-alvalade', zone: 'Praca Francisco Sa Carneiro (Areeiro)', x: 2720, y: -1916, architect: 'Dinis Gomes (1972) / Alberto Barradas (2013)', artist: 'Maria Keil & Julia Ventura', mural: 'keil-geometric-patterns', conn: ['CP Roma-Areeiro Rail', 'Carris Bus 705 / 708 / 722'], note: 'Linha Verde station serving Areeiro traffic circle with Maria Keil classic geometric tiles and contemporary renovations.' },
  { id: 'metro-arroios', stop: 'Arroios', lineId: 'linha-verde', hood: 'alameda-arroios', zone: 'Praca do Chile & Avenida Almirante Reis', x: 3120, y: 122, architect: 'Dinis Gomes (1972) / Paulo Brito da Silva (2021)', artist: 'Maria Keil & Nikias Skapinakis', mural: 'keil-geometric-patterns', conn: ['Avenida Almirante Reis', 'Carris Bus 708 / 718'], note: 'Modernized Linha Verde station at Praca do Chile featuring restored Maria Keil tilework and Nikias Skapinakis ceramic panels.' },
  { id: 'metro-anjos', stop: 'Anjos', lineId: 'linha-verde', hood: 'alameda-arroios', zone: 'Anjos & Avenida Almirante Reis', x: 2920, y: 122, architect: 'Dinis Gomes (1966)', artist: 'Maria Keil & Rogerio Ribeiro', mural: 'keil-geometric-patterns', conn: ['Avenida Almirante Reis', 'Carris Bus 708'], note: '1966 Linha Verde station in the bohemian Anjos quarter decorated with warm ochre-and-emerald geometric azulejos.' },
  { id: 'metro-intendente', stop: 'Intendente', lineId: 'linha-verde', hood: 'alameda-arroios', zone: 'Largo do Intendente Pina Manique', x: 2660, y: 122, architect: 'Dinis Gomes (1966)', artist: 'Maria Keil', mural: 'keil-geometric-patterns', conn: ['Largo do Intendente', 'Fabrica Viuva Lamego Historic Facade', 'Eletrico 28E'], note: '1966 Linha Verde station right beside the historic Viuva Lamego azulejo factory at Largo do Intendente.' },
  { id: 'metro-martim-moniz', stop: 'Martim Moniz', lineId: 'linha-verde', hood: 'rossio-restauradores', zone: 'Praca Martim Moniz & Mouraria', x: 2480, y: 122, architect: 'Dinis Gomes (1966) / Paulo Brito da Silva (1997)', artist: 'Graca Morais & Jose Joao Brito', mural: 'ferroviarios-railway-tiles', conn: ['Eletrico 28E Terminus', 'Eletrico 12E', 'Mouraria Historic Quarter'], note: 'Linha Verde station beneath Praca Martim Moniz and Castelo de Sao Jorge, decorated with medieval Lisbon siege ceramic reliefs.' },
  // Linha Vermelha (7 additional stations: Olaias -> Encarnacao)
  { id: 'metro-olaias', stop: 'Olaias', lineId: 'linha-vermelha', hood: 'alameda-arroios', zone: 'Olaias & Parque da Bela Vista South', x: 2900, y: -556, architect: 'Tomas Taveira (1998)', artist: 'Pedro Cabrita Reis, Graca Pereira Coutinho, Pedro Calapez & Rui Sanchez', mural: 'taveira-polychrome-arches', conn: ['Carris Bus 756 / 793'], note: 'World-famous 1998 Linha Vermelha cathedral station designed by Tomas Taveira with soaring polychrome steel columns and stained glass.' },
  { id: 'metro-bela-vista', stop: 'Bela Vista', lineId: 'linha-vermelha', hood: 'oriente-parque-nacoes', zone: 'Parque da Bela Vista & Chelas', x: 3080, y: -1236, architect: 'Paulo Brito da Silva (1998)', artist: 'Querubim Lapa', mural: 'taveira-polychrome-arches', conn: ['Parque da Bela Vista', 'Carris Bus 755 / 793'], note: 'Linha Vermelha station beside Lisbon vast Parque da Bela Vista, celebrated for expressive sculptural ceramic walls by Querubim Lapa.' },
  { id: 'metro-chelas', stop: 'Chelas', lineId: 'linha-vermelha', hood: 'oriente-parque-nacoes', zone: 'Chelas & Instituto Superior de Engenharia', x: 3480, y: -1236, architect: 'Ana Nascimento (1998)', artist: 'Jorge Martins', mural: 'taveira-polychrome-arches', conn: ['ISEL Campus', 'Carris Bus 718 / 755 / 759'], note: 'Linha Vermelha station in Chelas adorned with rhythmic abstract geometric stone and ceramic panels by Jorge Martins.' },
  { id: 'metro-olivais', stop: 'Olivais', lineId: 'linha-vermelha', hood: 'oriente-parque-nacoes', zone: 'Olivais Sul & Jardim Vale do Silencio', x: 3680, y: -1236, architect: 'Rui Cardim (1998)', artist: 'Nuno de Siqueira & Cecilia de Sousa', mural: 'calatrava-oceans-mural', conn: ['Carris Bus 708 / 759 / 779'], note: 'Deep Linha Vermelha station serving the modernist garden neighborhood of Olivais Sul, featuring stylized olive-tree ceramic murals.' },
  { id: 'metro-cabo-ruivo', stop: 'Cabo Ruivo', lineId: 'linha-vermelha', hood: 'oriente-parque-nacoes', zone: 'Cabo Ruivo & Parque das Nacoes Sul', x: 3060, y: -556, architect: 'Duarte Nuno Simoes (1998)', artist: 'David de Almeida', mural: 'calatrava-oceans-mural', conn: ['Carris Bus 728 / 750 / 759', 'Parque das Nacoes South'], note: 'Linha Vermelha station just south of Gare do Oriente decorated with prehistoric rock-art inspired granite engravings by David de Almeida.' },
  { id: 'metro-moscavide', stop: 'Moscavide', lineId: 'linha-vermelha', hood: 'oriente-parque-nacoes', zone: 'Moscavide & Parque das Nacoes Norte', x: 3760, y: -556, architect: 'Manuel Bastos (2012)', artist: 'Manuel Baptista', mural: 'calatrava-oceans-mural', conn: ['CP Moscavide', 'Carris Bus 728 / 744 / 759'], note: 'Linha Vermelha station one stop north of Oriente toward Lisbon Airport, featuring luminous azure and scarlet spatial panels by Manuel Baptista.' },
  { id: 'metro-encarnacao', stop: 'Encarnacao', lineId: 'linha-vermelha', hood: 'aeroporto-lisboa', zone: 'Bairro da Encarnacao (Last Stop Before Airport)', x: 3850, y: -1236, architect: 'Alberto Barradas (2012)', artist: 'Eduardo Nery', mural: 'nery-convite-sentinels', conn: ['Bairro da Encarnacao', 'Carris Bus 705 / 722 / 779'], note: 'Penultimate Linha Vermelha station immediately before Aeroporto Humberto Delgado, lined with crisp kinetic ceramic compositions by Eduardo Nery.' }
];

const BUILT_ADDITIONAL_STATIONS = ADDITIONAL_METRO_STATION_SPECS.map((spec, idx) => {
  const line = METRO_NETWORK_LINES.find((l) => l.id === spec.lineId) || METRO_NETWORK_LINES[0];
  const stopIdx = line.stations.indexOf(spec.stop);
  const nextStop = stopIdx >= 0 && stopIdx < line.stations.length - 1 ? line.stations[stopIdx + 1] : line.termini[1];
  const prevStop = stopIdx > 0 ? line.stations[stopIdx - 1] : line.termini[0];
  const wallBg =
    spec.lineId === 'linha-azul' ? '#e5ecf6'
      : spec.lineId === 'linha-amarela' ? '#f5eed8'
        : spec.lineId === 'linha-verde' ? '#e2efe6'
          : '#f5e6e4';
  const spawnY = spec.y === 122 ? 220 : spec.y + 102;
  return {
    id: spec.id,
    name: `Metro ${spec.stop}`,
    canonicalStopName: spec.stop,
    corridorStops: [spec.stop],
    neighborhood: spec.hood,
    zoneLabel: spec.zone,
    order: 13 + idx,
    lines: [line.name],
    lineColors: [line.color],
    transitConnections: spec.conn,
    x: spec.x,
    y: spec.y,
    w: 68,
    h: 72,
    doorX: spec.x + 34,
    doorY: spec.y + 72,
    spawnOutside: { x: spec.x + 34, y: spawnY },
    undergroundTheme: {
      wallPrimary: wallBg,
      tileAccent: line.color,
      platformFloor: '#d6dce2',
      trim: line.darkColor,
      artLabel: `${spec.stop.toUpperCase()} - ${spec.artist.toUpperCase()}`,
      architect: spec.architect,
      artist: spec.artist,
      muralStyle: spec.mural,
      nextTrainDest: `${line.termini[1]} (next: ${nextStop})`,
      oppositeDest: `${line.termini[0]} (prev: ${prevStop})`,
      transferLine: line.name
    },
    note: spec.note
  };
});

export const CITY_METRO_STATIONS = [...FEATURED_CITY_METRO_STATIONS, ...BUILT_ADDITIONAL_STATIONS];

export const ALL_METRO_STATIONS = [...METRO_STATIONS, ...CITY_METRO_STATIONS];

// Walkable 3D & 2D Lisbon City Districts connected to the 9 city-wide Metropolitano de Lisboa stations

// Geographic unified open-world layout coordinates for featured Greater Lisboa Metro entrances & landmarks!
// Every single one of the 50 official Metropolitano de Lisboa stations sits on the continuous street grid with zero portals.
export const CITY_METRO_WORLD_COORDS = {
  'metro-cais-sodre': { x: -360, y: 782, w: 68, h: 66, doorX: -326, doorY: 848, spawnOutside: { x: -326, y: 878 } },
  'metro-rato': { x: -440, y: -556, w: 68, h: 72, doorX: -406, doorY: -484, spawnOutside: { x: -406, y: -454 } },
  'metro-rossio': { x: 1060, y: -556, w: 68, h: 72, doorX: 1094, doorY: -484, spawnOutside: { x: 1094, y: -454 } },
  'metro-marques-pombal': { x: 1060, y: -1236, w: 68, h: 72, doorX: 1094, doorY: -1164, spawnOutside: { x: 1094, y: -1134 } },
  'metro-saldanha': { x: 1860, y: -1236, w: 68, h: 72, doorX: 1894, doorY: -1164, spawnOutside: { x: 1894, y: -1134 } },
  'metro-sao-sebastiao': { x: -440, y: -1236, w: 68, h: 72, doorX: -406, doorY: -1164, spawnOutside: { x: -406, y: -1134 } },
  'metro-campo-grande': { x: 1060, y: -1916, w: 68, h: 72, doorX: 1094, doorY: -1844, spawnOutside: { x: 1094, y: -1814 } },
  'metro-alameda': { x: 1860, y: -556, w: 68, h: 72, doorX: 1894, doorY: -484, spawnOutside: { x: 1894, y: -454 } },
  'metro-oriente': { x: 3200, y: -556, w: 68, h: 72, doorX: 3234, doorY: -484, spawnOutside: { x: 3234, y: -454 } },
  'metro-aeroporto': { x: 3450, y: -1916, w: 68, h: 72, doorX: 3484, doorY: -1844, spawnOutside: { x: 3484, y: -1814 } }
};

for (const st of CITY_METRO_STATIONS) {
  const wc = CITY_METRO_WORLD_COORDS[st.id];
  if (wc) {
    Object.assign(st, wc);
  }
}


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

