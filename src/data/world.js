export const WORLD_MIN_X = -2400;
export const WORLD_MAX_X = 4400;
export const WORLD_MIN_Y = -2700;
export const WORLD_WIDTH = 4400;
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

export const ALL_LISBOA_NEIGHBORHOODS = [
  ...NEIGHBORHOODS,
  {
    id: 'cais-sodre-belem',
    districtId: 'district-cais-sodre-belem',
    name: 'Cais do Sodre & Belem',
    accent: '#16a34a',
    groundTint: '#e8e4d8',
    subtitle: 'Tagus riverfront avenue served by Eletrico 15E, Bus 728, Bus 706, and Linha Verde toward Torre de Belem.'
  },
  {
    id: 'rato-principe-real',
    districtId: 'district-rato-principe-real',
    name: 'Rato & Principe Real',
    accent: '#ca8a04',
    groundTint: '#ebe5d5',
    subtitle: 'Hilltop gardens, Mae d Agua aqueduct reservoir, Eletrico 24E, Bus 706, and Linha Amarela.'
  },
  {
    id: 'rossio-restauradores',
    districtId: 'district-rossio-restauradores',
    name: 'Rossio & Restauradores',
    accent: '#15803d',
    groundTint: '#ede7dc',
    subtitle: 'Pombaline plazas, baroque fountains, Bus 736, Bus 744, and Linha Verde downtown interchange.'
  },
  {
    id: 'marques-pombal-avenida',
    districtId: 'district-marques-pombal-avenida',
    name: 'Marques de Pombal & Avenida',
    accent: '#1d4ed8',
    groundTint: '#eae5da',
    subtitle: 'Avenida da Liberdade grand boulevard, Parque Eduardo VII, Bus 736, Bus 746, and Blue/Yellow Metro hub.'
  },
  {
    id: 'sao-sebastiao-sete-rios',
    districtId: 'district-sao-sebastiao-sete-rios',
    name: 'Sao Sebastiao, Gulbenkian & Zoo',
    accent: '#2563eb',
    groundTint: '#e6eadf',
    subtitle: 'Gulbenkian water gardens, Sete Rios Zoo Teleferico, Bus 746, and Blue/Red Metro interchange.'
  },
  {
    id: 'saldanha-campo-pequeno',
    districtId: 'district-saldanha-campo-pequeno',
    name: 'Saldanha & Campo Pequeno',
    accent: '#d97706',
    groundTint: '#efe5d8',
    subtitle: 'Avenidas Novas boulevards, 1892 Neo-Moorish brick rotunda, Bus 736, Bus 744, and Yellow/Red Metro hub.'
  },
  {
    id: 'campo-grande-alvalade',
    districtId: 'district-campo-grande-alvalade',
    name: 'Campo Grande & Alvalade',
    accent: '#15803d',
    groundTint: '#e4ebe2',
    subtitle: 'Cidade Universitaria campus, Jardim do Campo Grande, Bus 736, Bus 746, and Yellow/Green Metro hub.'
  },
  {
    id: 'alameda-arroios',
    districtId: 'district-alameda-arroios',
    name: 'Alameda & Arroios',
    accent: '#b91c1c',
    groundTint: '#ece2dc',
    subtitle: 'Avenida Almirante Reis, 1948 Fonte Luminosa, Bus 706, Bus 744, and Green/Red Metro interchange.'
  },
  {
    id: 'oriente-parque-nacoes',
    districtId: 'district-oriente-parque-nacoes',
    name: 'Oriente & Parque das Nacoes',
    accent: '#dc2626',
    groundTint: '#e4eaf0',
    subtitle: 'Calatrava Gare do Oriente, Oceanario waterfront, Metro Oriente, Bus 728, and Bus 744.'
  },
  {
    id: 'aeroporto-lisboa',
    districtId: 'district-aeroporto-lisboa',
    name: 'Aeroporto Humberto Delgado',
    accent: '#b91c1c',
    groundTint: '#e2e8f0',
    subtitle: 'Lisbon International Airport Terminal 1, Linha Vermelha eastern terminus (Metro Aeroporto), and Carris Bus 744.'
  }
];

export const WATERFRONT_Y = 1030;

/**
 * Authentic Lisbon Seven-Hills topographic elevation across the entire unified city (world Z units):
 * - Tagus Waterfront Promenade (y >= 972, Belem to Parque das Nacoes): sea level (0)
 * - Historic Core (x: 0..2400, y: 0..1030): exact Bairro Alto hilltop (~86), Chiado basin (0..22), Alfama ridge (~52)
 * - Western Belem slopes gently to sea level; Principe Real / Rato stays elevated on the western hill (~48)
 * - Rossio valley rises north up Avenida da Liberdade to Marques de Pombal / Parque Eduardo VII / Gulbenkian (~44)
 * - Alameda / IST sits on an eastern hill (~42) sloping smoothly down to modern flat Parque das Nacoes riverfront (0..10)
 */
export function getTerrainElevation(wx, wy) {
  if (wy >= WATERFRONT_Y - 36) return 0;

  // Preserve exact historic central Lisboa elevation profile in x: [0..2400], y: [36..WATERFRONT_Y]
  if (wx >= 0 && wx <= 2400 && wy >= 36) {
    const clampedY = Math.max(36, Math.min(WATERFRONT_Y - 36, wy));
    const northT = (WATERFRONT_Y - 36 - clampedY) / (WATERFRONT_Y - 36 - 36);
    const wfRamp = Math.max(0, Math.min(1, (WATERFRONT_Y - 42 - clampedY) / 220));
    const wfSmooth = wfRamp * wfRamp * (3 - 2 * wfRamp);

    const baT = Math.max(0, Math.min(1, (980 - wx) / 760));
    const baSmooth = baT * (1.55 - 0.55 * baT);

    const alfT = Math.max(0, Math.min(1, (wx - 1580) / 680));
    const alfSmooth = alfT * (1.45 - 0.45 * alfT);

    const chiadoBaseRise = northT * 22;
    const bairroAltoLift = baSmooth * wfSmooth * (18 + northT * 68);
    const alfamaLift = alfSmooth * wfSmooth * (12 + northT * 36);
    return chiadoBaseRise + bairroAltoLift + alfamaLift;
  }

  // Smooth continuous elevation across Greater Lisboa (real Lisbon Seven Hills & plateaus, 1 Z unit ~= 0.65 meters)
  const wfRamp = Math.max(0, Math.min(1, (WATERFRONT_Y - 42 - wy) / 240));
  const wfSmooth = wfRamp * wfRamp * (3 - 2 * wfRamp);
  const clampedY = Math.max(36, Math.min(WATERFRONT_Y - 36, wy));
  const coreNorthT = (WATERFRONT_Y - 36 - clampedY) / (WATERFRONT_Y - 36 - 36);

  // Eastern Parque das Nacoes riverfront sits near sea level (2m - 8m)
  const eastFade = wx > 2400 ? Math.max(0, 1 - (wx - 2400) / 720) : 1;
  // Western Belem riverfront slopes smoothly down westward from Bairro Alto ridge
  const westBelemFade = wx < 0 && wy > 180 ? Math.max(0.08, 1 - (-wx) / 760) : 1;

  const baT = Math.max(0, Math.min(1, (980 - Math.max(0, wx)) / 760));
  const baSmooth = baT * (1.55 - 0.55 * baT);
  const alfT = Math.max(0, Math.min(1, (Math.min(2400, wx) - 1580) / 680));
  const alfSmooth = alfT * (1.45 - 0.45 * alfT);

  let base =
    coreNorthT * 22 * eastFade +
    baSmooth * wfSmooth * (18 + coreNorthT * 68) * westBelemFade * (wy < 36 ? Math.max(0.45, 1 - (36 - wy) / 900) : 1) +
    alfSmooth * wfSmooth * (12 + coreNorthT * 36) * eastFade * (wy < 36 ? Math.max(0.55, 1 - (36 - wy) / 1100) : 1);

  // Factual Lisbon Greater-City Hills, Valleys & Plateaus north of historic Baixa (wy < 36):
  if (wy < 36) {
    const gauss = (cx, cy, sx, sy, amp) => {
      const dx = (wx - cx) / sx;
      const dy = (wy - cy) / sy;
      return amp * Math.exp(-(dx * dx + dy * dy));
    };
    const northRamp = Math.min(1, (36 - wy) / 260);
    // Low Rossio / Avenida da Liberdade valley (~14m = 22 Z) climbing north to Avenidas Novas & Northern Plateau (~75-105m)
    const eastWaterfrontDrop = wx > 2950 && wy > -900 ? Math.max(0.06, 1 - (wx - 2950) / 480) : 1;
    let realZ = 22 + Math.min(1, (36 - wy) / 1350) * 108 * eastWaterfrontDrop;

    // 1) Rossio & Restauradores valley dip (~14m)
    realZ -= gauss(620, -520, 620, 260, 46);
    // 2) Principe Real & Rato high western ridge (~74m = 114 Z)
    realZ += gauss(-620, -560, 560, 320, 62);
    // 3) Parque Eduardo VII & Parque hilltop (~88m = 135 Z) above Marques de Pombal (~48m)
    realZ += gauss(220, -1240, 480, 320, 48);
    // 4) Alameda Dom Afonso Henriques valley & Fonte Luminosa (~60m = 92 Z) vs. steep IST Alameda Campus hilltop (~94m = 145 Z, +34m climb!)
    realZ += gauss(2435, -560, 340, 240, 26); // Fonte Luminosa terrace (~60m)
    realZ -= gauss(2180, -490, 240, 170, 20); // Alameda central valley dip
    realZ += gauss(1955, -220, 230, 170, 88); // Steep IST Alameda Campus hilltop (+30m+ above Fonte Luminosa & Alameda!)
    // 5) Olaias & Parque da Bela Vista eastern hills (~96m = 148 Z) dropping steeply down to Parque das Nacoes (~4m)
    realZ += gauss(3040, -1120, 340, 340, 44);
    // 6) Aeroporto Humberto Delgado Portela plateau (true 114m = 175 Z!)
    realZ += gauss(3580, -1960, 560, 420, 52);
    // 7) Northern hills: Benfica/Luz (~88m), Areeiro (~85m), Lumiar/Ameixoeira (~106m)
    realZ += gauss(2680, -1840, 360, 260, 16);
    realZ += gauss(820, -2520, 900, 340, 32);

    // Flat Expo 98 Parque das Nacoes riverfront (Oriente -> Oceanario -> Torre Vasco da Gama: ~4m - 8m)
    if (wx >= 3120 && wy >= -740) {
      const pnT = Math.min(1, (wx - 3120) / 260) * Math.min(1, (wy + 740) / 260);
      realZ = realZ * (1 - pnT) + 8 * pnT;
    }

    base = base * (1 - northRamp) + Math.max(4, realZ) * northRamp;
  }
  return Math.max(0, base * wfSmooth);
}

export function getTerrainSlope(wx, wy) {
  const eps = 6;
  const dzdx = (getTerrainElevation(wx + eps, wy) - getTerrainElevation(wx - eps, wy)) / (2 * eps);
  const dzdy = (getTerrainElevation(wx, wy + eps) - getTerrainElevation(wx, wy - eps)) / (2 * eps);
  return { dzdx, dzdy };
}

export const STREETS = [
  // Continuous City-Wide Horizontal Boulevards (Amadora/Belem x=-2320 to Parque das Nacoes/Aeroporto x=4320)
  { id: 'ave-northern-ring', x: -2320, y: -2480, w: 6640, h: 110, style: 'bus-road', name: 'Reboleira / Amadora / Pontinha / Odivelas / Lumiar / Quinta das Conchas' },
  { id: 'ave-campo-grande', x: -2320, y: -1800, w: 6640, h: 110, style: 'bus-road', name: 'Carnide / Luz / Telheiras / Campo Grande / Alvalade / Roma / Areeiro / Aeroporto' },
  { id: 'ave-marques-saldanha', x: -2320, y: -1120, w: 6640, h: 110, style: 'bus-road', name: 'Alto dos Moinhos / Jardim Zoologico / Sao Sebastiao / Marques de Pombal / Saldanha / Olivais / Encarnacao' },
  { id: 'ave-rossio-alameda', x: -2320, y: -440, w: 6640, h: 110, style: 'bus-road', name: 'Rato / Restauradores / Rossio / Alameda / Olaias / Cabo Ruivo / Gare do Oriente / Moscavide' },
  { id: 'ave-north', x: -2320, y: 230, w: 6640, h: 110, style: 'bus-road', name: 'Rua de Sao Pedro / Rua Garrett / Martim Moniz / Intendente / Anjos / Arroios' },
  { id: 'ave-tram', x: -2320, y: 555, w: 6640, h: 110, style: 'tram-avenue', name: 'Calcada da Ajuda / Rua do Loreto / Largo do Chiado / Calcada da Se' },
  { id: 'ave-south', x: -2320, y: 875, w: 6640, h: 115, style: 'bus-road', name: 'Av. da India (Belem) / Av. 24 de Julho / Ribeira / Av. Infante Dom Henrique' },
  // Continuous City-Wide Vertical Connecting Avenues
  { id: 'st-amadora-reboleira', x: -2312, y: -2480, w: 105, h: 3470, style: 'bus-road', name: 'Avenida de Reboleira & Amadora' },
  { id: 'st-belem-west', x: -1512, y: -2480, w: 105, h: 3470, style: 'bus-road', name: 'Avenida da Torre de Belem & Benfica' },
  { id: 'st-rato-cais', x: -612, y: -2480, w: 105, h: 3470, style: 'bus-road', name: 'Av. Dom Carlos I / Rua de Sao Bento / Sao Sebastiao / Telheiras' },
  { id: 'st-west-edge', x: 110, y: 230, w: 105, h: 760, style: 'bus-road', name: 'Rua da Misericordia Oeste' },
  { id: 'st-bairro-mid', x: 465, y: -440, w: 95, h: 1430, style: 'cobble', name: 'Rua da Rosa / Rua Dom Pedro V (Principe Real)' },
  { id: 'st-av-liberdade', x: 865, y: -2480, w: 170, h: 3470, style: 'plaza', name: 'Avenida da Liberdade / Praca Luis de Camoes / Lumiar' },
  { id: 'st-carmo', x: 1334, y: -440, w: 98, h: 1430, style: 'cobble', name: 'Rua do Carmo / Rua Augusta' },
  { id: 'st-almirante-reis', x: 1680, y: -2480, w: 130, h: 3470, style: 'bus-road', name: 'Av. da Republica / Av. Almirante Reis / Escadinhas da Se' },
  { id: 'st-east-edge', x: 2145, y: -440, w: 145, h: 1430, style: 'bus-road', name: 'Largo das Portas do Sol / Olaias' },
  { id: 'st-parque-nacoes', x: 3308, y: -2480, w: 112, h: 3470, style: 'bus-road', name: 'Alameda dos Oceanos / Av. Berlim (Oriente & Aeroporto)' },
  { id: 'st-aeroporto-east', x: 4100, y: -2480, w: 105, h: 3470, style: 'bus-road', name: 'Avenida do Aeroporto & Moscavide' }
];

export const CROSSWALKS = [
  // Crosswalks across all 7 horizontal boulevards at every major vertical corridor
  ...[-2284, -1484, -584, 488, 882, 1358, 1720, 2190, 3336, 4128].flatMap((cx) => [
    { x: cx, y: -2458, w: 50, h: 70, orientation: 'vertical' },
    { x: cx, y: -1778, w: 50, h: 70, orientation: 'vertical' },
    { x: cx, y: -1098, w: 50, h: 70, orientation: 'vertical' },
    { x: cx, y: -418, w: 50, h: 70, orientation: 'vertical' },
    { x: cx, y: 250, w: 50, h: 70, orientation: 'vertical' },
    { x: cx, y: 575, w: 50, h: 70, orientation: 'vertical' },
    { x: cx, y: 896, w: 50, h: 70, orientation: 'vertical' }
  ])
];

// Walkable carved Lioz limestone Lisbon staircases bridging steep Seven-Hills transitions
// (Alameda <-> IST Campus, Alameda <-> Fonte Luminosa, and Baixa/Almirante Reis <-> Castelo de Sao Jorge)
export const LISBOA_STAIRCASES = [
  {
    id: 'stairs-ist-alameda',
    name: 'Escadaria Monumental do IST (Alameda)',
    x: 1924,
    y: -332,
    w: 62,
    h: 44,
    steps: 9,
    orientation: 'vertical',
    note: 'Monumental limestone grand staircase climbing steeply from Alameda Dom Afonso Henriques up to Instituto Superior Tecnico.'
  },
  {
    id: 'stairs-fonte-luminosa',
    name: 'Escadinhas da Alameda & Fonte Luminosa',
    x: 2300,
    y: -484,
    w: 58,
    h: 42,
    steps: 8,
    orientation: 'vertical',
    note: 'Carved stone steps linking the lower Alameda lawn up to the 1948 Fonte Luminosa colonnade.'
  },
  {
    id: 'stairs-graca-castelo',
    name: 'Escadinhas da Graca & Castelo de Sao Jorge',
    x: 2180,
    y: 120,
    w: 58,
    h: 106,
    steps: 14,
    orientation: 'vertical',
    note: 'Steep historic Alfama and Graca stone steps climbing toward Castelo de Sao Jorge and Portas do Sol.'
  },
  {
    id: 'stairs-sao-cristovao-castelo',
    name: 'Escadinhas de Sao Cristovao (Baixa - Castelo)',
    x: 1715,
    y: 344,
    w: 58,
    h: 112,
    steps: 14,
    orientation: 'vertical',
    note: 'Classic steep medieval Lisbon staircase with wrought-iron handrails rising from Baixa toward Castelo de Sao Jorge.'
  }
];

// Interactive wrought-iron Lisbon Miradouro railing viewpoints overlooking steep hillside valleys
export const MIRADOURO_VIEWPOINTS = [
  {
    id: 'miradouro-ist-alameda',
    name: 'Miradouro do Terraco do IST',
    badge: '[ALAMEDA OVERLOOK]',
    x: 1955,
    y: -306,
    railingWidth: 116,
    facing: 'north',
    note: 'Stone terrace and wrought-iron balustrade atop the IST grand staircase gazing down across Alameda Dom Afonso Henriques to Fonte Luminosa.',
    compassSignposts: [
      { dir: 'E', label: 'Fonte Luminosa (1948) & Olaias' },
      { dir: 'N', label: 'Areeiro, Roma & Aeroporto Plateau' },
      { dir: 'W', label: 'Saldanha & Parque Eduardo VII' },
      { dir: 'S', label: 'Castelo de Sao Jorge & Rio Tejo' }
    ]
  },
  {
    id: 'miradouro-fonte-luminosa',
    name: 'Miradouro da Fonte Luminosa',
    badge: '[FOUNTAIN TERRACE]',
    x: 2435,
    y: -468,
    railingWidth: 112,
    facing: 'south',
    note: 'Elevated limestone balustrade beside the 1948 Fonte Luminosa looking across the Alameda valley up to the twin towers of IST.',
    compassSignposts: [
      { dir: 'W', label: 'IST (Alameda Campus) & Twin Towers' },
      { dir: 'E', label: 'Olaias, Bela Vista & Parque das Nacoes' },
      { dir: 'N', label: 'Areeiro & Alvalade' },
      { dir: 'S', label: 'Arroios & Baixa' }
    ]
  },
  {
    id: 'miradouro-castelo-graca',
    name: 'Miradouro do Castelo de Sao Jorge & Graca',
    badge: '[CASTELO PANORAMA]',
    x: 2210,
    y: 184,
    railingWidth: 108,
    facing: 'south',
    note: 'Wrought-iron hillside lookout along the Castelo de Sao Jorge ridge surveying Baixa, the Tagus Estuary, and Ponte 25 de Abril.',
    compassSignposts: [
      { dir: 'SW', label: 'Ponte 25 de Abril & Cristo Rei' },
      { dir: 'W', label: 'Baixa, Santa Justa & Bairro Alto' },
      { dir: 'S', label: 'Se de Lisboa & Rio Tejo' },
      { dir: 'E', label: 'Panteao Nacional & Alfama' }
    ]
  }
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


export function getNeighborhoodAt(x, y = 500) {
  const byId = (id) => ALL_LISBOA_NEIGHBORHOODS.find((n) => n.id === id) || NEIGHBORHOODS[1];
  if (y < -1440) {
    if (x >= 2860) return byId('aeroporto-lisboa');
    if (x < -900) return byId('sao-sebastiao-sete-rios');
    return byId('campo-grande-alvalade');
  }
  if (y < -760) {
    if (x < 320) return byId('sao-sebastiao-sete-rios');
    if (x < 1680) return byId('marques-pombal-avenida');
    if (x < 2960) return byId('saldanha-campo-pequeno');
    if (x >= 3800) return byId('aeroporto-lisboa');
    return byId('oriente-parque-nacoes');
  }
  if (y < -60) {
    if (x < 80) return byId('rato-principe-real');
    if (x < 1680) return byId('rossio-restauradores');
    if (x < 2980) return byId('alameda-arroios');
    return byId('oriente-parque-nacoes');
  }
  if (x < 0) return byId('cais-sodre-belem');
  if (x >= 2460) return byId('oriente-parque-nacoes');
  for (const hood of NEIGHBORHOODS) {
    if (x >= hood.minX && x < hood.maxX) {
      return hood;
    }
  }
  return NEIGHBORHOODS[NEIGHBORHOODS.length - 1];
}

export function getNeighborhoodForX(x, y = 500) {
  return getNeighborhoodAt(x, y);
}
