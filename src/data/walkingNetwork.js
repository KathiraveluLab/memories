import { LISBOA_CITY_DISTRICTS } from './districts.js';

export const CITY_DISTRICT_PORTALS = {
  west: { slot: 'west', label: 'W', x: 78, y: 214, spawnX: 112, spawnY: 214, arriveFacing: 'right', arriveYaw: 0 },
  east: { slot: 'east', label: 'E', x: 682, y: 214, spawnX: 648, spawnY: 214, arriveFacing: 'left', arriveYaw: Math.PI },
  'north-west': { slot: 'north-west', label: 'NW', x: 267, y: 170, spawnX: 267, spawnY: 194, arriveFacing: 'down', arriveYaw: Math.PI * 0.5 },
  'north-east': { slot: 'north-east', label: 'NE', x: 493, y: 170, spawnX: 493, spawnY: 194, arriveFacing: 'down', arriveYaw: Math.PI * 0.5 },
  'south-west': { slot: 'south-west', label: 'SW', x: 168, y: 268, spawnX: 168, spawnY: 240, arriveFacing: 'up', arriveYaw: -Math.PI * 0.5 },
  'south-east': { slot: 'south-east', label: 'SE', x: 592, y: 268, spawnX: 592, spawnY: 240, arriveFacing: 'up', arriveYaw: -Math.PI * 0.5 }
};

// Walkable perimeter Lisbon Avenue Gateways along the edges of Historic Central Lisboa (Bairro Alto, Chiado & Alfama)
// allowing players to stroll continuously on foot into Greater Lisboa without needing the Metro!
export const OVERWORLD_CITY_GATEWAYS = [
  {
    id: 'gw-ow-west-cais',
    slot: 'west',
    x: 124,
    y: 996,
    spawnX: 168,
    spawnY: 996,
    pushDir: 'west',
    toZoneId: 'district-cais-sodre-belem',
    toSlot: 'east',
    avenueName: 'Avenida 24 de Julho & Ribeira das Naus',
    shortLabel: 'CAIS DO SODRE & BELEM',
    distanceMeters: 650,
    walkMinutes: 8,
    sceneryStyle: 'waterfront-avenue'
  },
  {
    id: 'gw-ow-nw-rato',
    slot: 'nw',
    x: 512,
    y: 128,
    spawnX: 512,
    spawnY: 186,
    pushDir: 'north',
    toZoneId: 'district-rato-principe-real',
    toSlot: 'south-east',
    avenueName: 'Rua Dom Pedro V & Principe Real',
    shortLabel: 'PRINCIPE REAL & RATO',
    distanceMeters: 620,
    walkMinutes: 8,
    sceneryStyle: 'hillside-boulevard'
  },
  {
    id: 'gw-ow-north-rossio',
    slot: 'north',
    x: 1308,
    y: 128,
    spawnX: 1308,
    spawnY: 188,
    pushDir: 'north',
    toZoneId: 'district-rossio-restauradores',
    toSlot: 'south-west',
    avenueName: 'Rua do Carmo & Rua Augusta',
    shortLabel: 'ROSSIO & BAIXA',
    distanceMeters: 420,
    walkMinutes: 5,
    sceneryStyle: 'pombaline-avenue'
  },
  {
    id: 'gw-ow-ne-alameda',
    slot: 'ne',
    x: 2266,
    y: 224,
    spawnX: 2218,
    spawnY: 224,
    pushDir: 'east',
    toZoneId: 'district-alameda-arroios',
    toSlot: 'south-east',
    avenueName: 'Calcada de Sao Vicente & Av. Almirante Reis',
    shortLabel: 'ALAMEDA & ARROIOS',
    distanceMeters: 1500,
    walkMinutes: 18,
    sceneryStyle: 'hillside-boulevard'
  },
  {
    id: 'gw-ow-se-oriente',
    slot: 'se',
    x: 2266,
    y: 996,
    spawnX: 2218,
    spawnY: 996,
    pushDir: 'east',
    toZoneId: 'district-oriente-parque-nacoes',
    toSlot: 'south-west',
    avenueName: 'Avenida Infante Dom Henrique (Tagus Waterfront)',
    shortLabel: 'ORIENTE & PARQUE DAS NACOES',
    distanceMeters: 4600,
    walkMinutes: 45,
    sceneryStyle: 'waterfront-avenue'
  }
];

// Complete symmetric bidirectional full-city Lisbon walking street graph uniting Historic Central Lisboa ('overworld')
// and all 9 Greater Lisboa City Districts (so every single one of the 12 Metro stations is 100% reachable on foot!)
export const LISBOA_WALKING_NETWORK = {
  overworld: OVERWORLD_CITY_GATEWAYS.map((g) => ({
    id: g.id,
    fromZoneId: 'overworld',
    slot: g.slot,
    toZoneId: g.toZoneId,
    toSlot: g.toSlot,
    avenueName: g.avenueName,
    shortLabel: g.shortLabel,
    distanceMeters: g.distanceMeters,
    walkMinutes: g.walkMinutes,
    sceneryStyle: g.sceneryStyle,
    x: g.x,
    y: g.y
  })),
  'district-cais-sodre-belem': [
    {
      id: 'walk-cais-to-overworld',
      fromZoneId: 'district-cais-sodre-belem',
      slot: 'east',
      toZoneId: 'overworld',
      toSlot: 'west',
      avenueName: 'Av. Ribeira das Naus -> Chiado & Baixa',
      shortLabel: 'CHIADO & BAIXA',
      distanceMeters: 650,
      walkMinutes: 8,
      sceneryStyle: 'waterfront-avenue'
    },
    {
      id: 'walk-cais-to-rato',
      fromZoneId: 'district-cais-sodre-belem',
      slot: 'north-west',
      toZoneId: 'district-rato-principe-real',
      toSlot: 'west',
      avenueName: 'Av. Dom Carlos I & Rua de Sao Bento',
      shortLabel: 'RATO & PRINCIPE REAL',
      distanceMeters: 1100,
      walkMinutes: 14,
      sceneryStyle: 'hillside-boulevard'
    }
  ],
  'district-rossio-restauradores': [
    {
      id: 'walk-rossio-to-overworld',
      fromZoneId: 'district-rossio-restauradores',
      slot: 'south-west',
      toZoneId: 'overworld',
      toSlot: 'north',
      avenueName: 'Rua do Carmo & Rua Augusta -> Baixa-Chiado',
      shortLabel: 'BAIXA-CHIADO & BAIRRO ALTO',
      distanceMeters: 420,
      walkMinutes: 5,
      sceneryStyle: 'pombaline-avenue'
    },
    {
      id: 'walk-rossio-to-rato',
      fromZoneId: 'district-rossio-restauradores',
      slot: 'west',
      toZoneId: 'district-rato-principe-real',
      toSlot: 'east',
      avenueName: 'Calcada da Gloria & Rua da Escola Politecnica',
      shortLabel: 'PRINCIPE REAL & RATO',
      distanceMeters: 850,
      walkMinutes: 11,
      sceneryStyle: 'hillside-boulevard'
    },
    {
      id: 'walk-rossio-to-marques',
      fromZoneId: 'district-rossio-restauradores',
      slot: 'north-west',
      toZoneId: 'district-marques-pombal-avenida',
      toSlot: 'south-west',
      avenueName: 'Avenida da Liberdade',
      shortLabel: 'MARQUES DE POMBAL',
      distanceMeters: 1200,
      walkMinutes: 14,
      sceneryStyle: 'grand-boulevard'
    },
    {
      id: 'walk-rossio-to-alameda',
      fromZoneId: 'district-rossio-restauradores',
      slot: 'east',
      toZoneId: 'district-alameda-arroios',
      toSlot: 'west',
      avenueName: 'Avenida Almirante Reis (Martim Moniz & Arroios)',
      shortLabel: 'ALAMEDA & FONTE LUMINOSA',
      distanceMeters: 1600,
      walkMinutes: 19,
      sceneryStyle: 'pombaline-avenue'
    }
  ],
  'district-rato-principe-real': [
    {
      id: 'walk-rato-to-overworld',
      fromZoneId: 'district-rato-principe-real',
      slot: 'south-east',
      toZoneId: 'overworld',
      toSlot: 'nw',
      avenueName: 'Rua Dom Pedro V -> Bairro Alto & Chiado',
      shortLabel: 'BAIRRO ALTO & CHIADO',
      distanceMeters: 620,
      walkMinutes: 8,
      sceneryStyle: 'hillside-boulevard'
    },
    {
      id: 'walk-rato-to-cais',
      fromZoneId: 'district-rato-principe-real',
      slot: 'west',
      toZoneId: 'district-cais-sodre-belem',
      toSlot: 'north-west',
      avenueName: 'Rua de Sao Bento & Av. Dom Carlos I',
      shortLabel: 'CAIS DO SODRE & BELEM',
      distanceMeters: 1100,
      walkMinutes: 14,
      sceneryStyle: 'hillside-boulevard'
    },
    {
      id: 'walk-rato-to-rossio',
      fromZoneId: 'district-rato-principe-real',
      slot: 'east',
      toZoneId: 'district-rossio-restauradores',
      toSlot: 'west',
      avenueName: 'Rua da Escola Politecnica & Calcada da Gloria',
      shortLabel: 'ROSSIO & RESTAURADORES',
      distanceMeters: 850,
      walkMinutes: 11,
      sceneryStyle: 'hillside-boulevard'
    },
    {
      id: 'walk-rato-to-marques',
      fromZoneId: 'district-rato-principe-real',
      slot: 'north-east',
      toZoneId: 'district-marques-pombal-avenida',
      toSlot: 'west',
      avenueName: 'Rua Alexandre Herculano',
      shortLabel: 'MARQUES DE POMBAL',
      distanceMeters: 550,
      walkMinutes: 7,
      sceneryStyle: 'grand-boulevard'
    }
  ],
  'district-marques-pombal-avenida': [
    {
      id: 'walk-marques-to-rossio',
      fromZoneId: 'district-marques-pombal-avenida',
      slot: 'south-west',
      toZoneId: 'district-rossio-restauradores',
      toSlot: 'north-west',
      avenueName: 'Avenida da Liberdade',
      shortLabel: 'ROSSIO & RESTAURADORES',
      distanceMeters: 1200,
      walkMinutes: 14,
      sceneryStyle: 'grand-boulevard'
    },
    {
      id: 'walk-marques-to-rato',
      fromZoneId: 'district-marques-pombal-avenida',
      slot: 'west',
      toZoneId: 'district-rato-principe-real',
      toSlot: 'north-east',
      avenueName: 'Rua Alexandre Herculano',
      shortLabel: 'RATO & PRINCIPE REAL',
      distanceMeters: 550,
      walkMinutes: 7,
      sceneryStyle: 'grand-boulevard'
    },
    {
      id: 'walk-marques-to-saoseb',
      fromZoneId: 'district-marques-pombal-avenida',
      slot: 'north-west',
      toZoneId: 'district-sao-sebastiao-sete-rios',
      toSlot: 'south-west',
      avenueName: 'Parque Eduardo VII & Av. Sidonio Pais',
      shortLabel: 'SAO SEBASTIAO & ZOO',
      distanceMeters: 950,
      walkMinutes: 12,
      sceneryStyle: 'park-boulevard'
    },
    {
      id: 'walk-marques-to-saldanha',
      fromZoneId: 'district-marques-pombal-avenida',
      slot: 'east',
      toZoneId: 'district-saldanha-campo-pequeno',
      toSlot: 'west',
      avenueName: 'Avenida Fontes Pereira de Melo',
      shortLabel: 'SALDANHA & CAMPO PEQUENO',
      distanceMeters: 750,
      walkMinutes: 9,
      sceneryStyle: 'grand-boulevard'
    }
  ],
  'district-sao-sebastiao-sete-rios': [
    {
      id: 'walk-saoseb-to-marques',
      fromZoneId: 'district-sao-sebastiao-sete-rios',
      slot: 'south-west',
      toZoneId: 'district-marques-pombal-avenida',
      toSlot: 'north-west',
      avenueName: 'Av. Sidonio Pais & Parque Eduardo VII',
      shortLabel: 'MARQUES DE POMBAL',
      distanceMeters: 950,
      walkMinutes: 12,
      sceneryStyle: 'park-boulevard'
    },
    {
      id: 'walk-saoseb-to-saldanha',
      fromZoneId: 'district-sao-sebastiao-sete-rios',
      slot: 'east',
      toZoneId: 'district-saldanha-campo-pequeno',
      toSlot: 'north-west',
      avenueName: 'Avenida Antonio Augusto de Aguiar',
      shortLabel: 'SALDANHA & CAMPO PEQUENO',
      distanceMeters: 650,
      walkMinutes: 8,
      sceneryStyle: 'grand-boulevard'
    },
    {
      id: 'walk-saoseb-to-campogrande',
      fromZoneId: 'district-sao-sebastiao-sete-rios',
      slot: 'north-east',
      toZoneId: 'district-campo-grande-alvalade',
      toSlot: 'west',
      avenueName: 'Avenida das Forcas Armadas',
      shortLabel: 'CAMPO GRANDE & ALVALADE',
      distanceMeters: 1750,
      walkMinutes: 21,
      sceneryStyle: 'park-boulevard'
    }
  ],
  'district-saldanha-campo-pequeno': [
    {
      id: 'walk-saldanha-to-marques',
      fromZoneId: 'district-saldanha-campo-pequeno',
      slot: 'west',
      toZoneId: 'district-marques-pombal-avenida',
      toSlot: 'east',
      avenueName: 'Avenida Fontes Pereira de Melo',
      shortLabel: 'MARQUES DE POMBAL',
      distanceMeters: 750,
      walkMinutes: 9,
      sceneryStyle: 'grand-boulevard'
    },
    {
      id: 'walk-saldanha-to-saoseb',
      fromZoneId: 'district-saldanha-campo-pequeno',
      slot: 'north-west',
      toZoneId: 'district-sao-sebastiao-sete-rios',
      toSlot: 'east',
      avenueName: 'Avenida Antonio Augusto de Aguiar',
      shortLabel: 'SAO SEBASTIAO & GULBENKIAN',
      distanceMeters: 650,
      walkMinutes: 8,
      sceneryStyle: 'grand-boulevard'
    },
    {
      id: 'walk-saldanha-to-campogrande',
      fromZoneId: 'district-saldanha-campo-pequeno',
      slot: 'north-east',
      toZoneId: 'district-campo-grande-alvalade',
      toSlot: 'south-west',
      avenueName: 'Avenida da Republica & Entrecampos',
      shortLabel: 'CAMPO GRANDE & ALVALADE',
      distanceMeters: 1800,
      walkMinutes: 21,
      sceneryStyle: 'grand-boulevard'
    },
    {
      id: 'walk-saldanha-to-alameda',
      fromZoneId: 'district-saldanha-campo-pequeno',
      slot: 'east',
      toZoneId: 'district-alameda-arroios',
      toSlot: 'north-west',
      avenueName: 'Avenida Rovisco Pais & Instituto Superior Tecnico',
      shortLabel: 'ALAMEDA & FONTE LUMINOSA',
      distanceMeters: 950,
      walkMinutes: 11,
      sceneryStyle: 'park-boulevard'
    }
  ],
  'district-campo-grande-alvalade': [
    {
      id: 'walk-cg-to-saoseb',
      fromZoneId: 'district-campo-grande-alvalade',
      slot: 'west',
      toZoneId: 'district-sao-sebastiao-sete-rios',
      toSlot: 'north-east',
      avenueName: 'Avenida das Forcas Armadas',
      shortLabel: 'SAO SEBASTIAO & ZOO',
      distanceMeters: 1750,
      walkMinutes: 21,
      sceneryStyle: 'park-boulevard'
    },
    {
      id: 'walk-cg-to-saldanha',
      fromZoneId: 'district-campo-grande-alvalade',
      slot: 'south-west',
      toZoneId: 'district-saldanha-campo-pequeno',
      toSlot: 'north-east',
      avenueName: 'Avenida da Republica & Entrecampos',
      shortLabel: 'SALDANHA & CAMPO PEQUENO',
      distanceMeters: 1800,
      walkMinutes: 21,
      sceneryStyle: 'grand-boulevard'
    },
    {
      id: 'walk-cg-to-alameda',
      fromZoneId: 'district-campo-grande-alvalade',
      slot: 'south-east',
      toZoneId: 'district-alameda-arroios',
      toSlot: 'north-east',
      avenueName: 'Avenida de Roma & Areeiro',
      shortLabel: 'ALAMEDA & ARROIOS',
      distanceMeters: 1700,
      walkMinutes: 20,
      sceneryStyle: 'grand-boulevard'
    },
    {
      id: 'walk-cg-to-oriente',
      fromZoneId: 'district-campo-grande-alvalade',
      slot: 'east',
      toZoneId: 'district-oriente-parque-nacoes',
      toSlot: 'north-west',
      avenueName: 'Av. Marechal Gomes da Costa -> Aeroporto & Oriente',
      shortLabel: 'ORIENTE & PARQUE DAS NACOES',
      distanceMeters: 3900,
      walkMinutes: 40,
      sceneryStyle: 'grand-boulevard'
    }
  ],
  'district-alameda-arroios': [
    {
      id: 'walk-alameda-to-overworld',
      fromZoneId: 'district-alameda-arroios',
      slot: 'south-east',
      toZoneId: 'overworld',
      toSlot: 'ne',
      avenueName: 'Av. Almirante Reis & Calcada de Sao Vicente -> Alfama',
      shortLabel: 'ALFAMA & HISTORIC CORE',
      distanceMeters: 1500,
      walkMinutes: 18,
      sceneryStyle: 'hillside-boulevard'
    },
    {
      id: 'walk-alameda-to-rossio',
      fromZoneId: 'district-alameda-arroios',
      slot: 'west',
      toZoneId: 'district-rossio-restauradores',
      toSlot: 'east',
      avenueName: 'Avenida Almirante Reis -> Martim Moniz & Rossio',
      shortLabel: 'ROSSIO & BAIXA',
      distanceMeters: 1600,
      walkMinutes: 19,
      sceneryStyle: 'pombaline-avenue'
    },
    {
      id: 'walk-alameda-to-saldanha',
      fromZoneId: 'district-alameda-arroios',
      slot: 'north-west',
      toZoneId: 'district-saldanha-campo-pequeno',
      toSlot: 'east',
      avenueName: 'Avenida Rovisco Pais & IST',
      shortLabel: 'SALDANHA & CAMPO PEQUENO',
      distanceMeters: 950,
      walkMinutes: 11,
      sceneryStyle: 'park-boulevard'
    },
    {
      id: 'walk-alameda-to-cg',
      fromZoneId: 'district-alameda-arroios',
      slot: 'north-east',
      toZoneId: 'district-campo-grande-alvalade',
      toSlot: 'south-east',
      avenueName: 'Avenida de Roma & Areeiro',
      shortLabel: 'CAMPO GRANDE & ALVALADE',
      distanceMeters: 1700,
      walkMinutes: 20,
      sceneryStyle: 'grand-boulevard'
    },
    {
      id: 'walk-alameda-to-oriente',
      fromZoneId: 'district-alameda-arroios',
      slot: 'east',
      toZoneId: 'district-oriente-parque-nacoes',
      toSlot: 'west',
      avenueName: 'Avenida Afonso Costa & Olaias -> Parque das Nacoes',
      shortLabel: 'ORIENTE & PARQUE DAS NACOES',
      distanceMeters: 3800,
      walkMinutes: 38,
      sceneryStyle: 'waterfront-avenue'
    }
  ],
  'district-oriente-parque-nacoes': [
    {
      id: 'walk-oriente-to-alameda',
      fromZoneId: 'district-oriente-parque-nacoes',
      slot: 'west',
      toZoneId: 'district-alameda-arroios',
      toSlot: 'east',
      avenueName: 'Olaias & Avenida Afonso Costa',
      shortLabel: 'ALAMEDA & FONTE LUMINOSA',
      distanceMeters: 3800,
      walkMinutes: 38,
      sceneryStyle: 'waterfront-avenue'
    },
    {
      id: 'walk-oriente-to-cg',
      fromZoneId: 'district-oriente-parque-nacoes',
      slot: 'north-west',
      toZoneId: 'district-campo-grande-alvalade',
      toSlot: 'east',
      avenueName: 'Av. Marechal Gomes da Costa -> Aeroporto & Campo Grande',
      shortLabel: 'CAMPO GRANDE & ALVALADE',
      distanceMeters: 3900,
      walkMinutes: 40,
      sceneryStyle: 'grand-boulevard'
    },
    {
      id: 'walk-oriente-to-overworld',
      fromZoneId: 'district-oriente-parque-nacoes',
      slot: 'south-west',
      toZoneId: 'overworld',
      toSlot: 'se',
      avenueName: 'Avenida Infante Dom Henrique (Tagus Waterfront)',
      shortLabel: 'SANTA APOLONIA & ALFAMA',
      distanceMeters: 4600,
      walkMinutes: 45,
      sceneryStyle: 'waterfront-avenue'
    }
  ]
};

// Geographic schematic coordinates (0..100%) & continuous open-world anchors for the interactive Full-City Lisboa Map
export const LISBOA_CITY_MAP_NODES = [
  { id: 'district-sao-sebastiao-sete-rios', shortName: 'Sao Sebastiao & Zoo', x: 24, y: 18, worldX: -406, worldY: -1134, color: '#2563eb' },
  { id: 'district-campo-grande-alvalade', shortName: 'Campo Grande', x: 52, y: 14, worldX: 1094, worldY: -1814, color: '#16a34a' },
  { id: 'district-aeroporto-lisboa', shortName: 'Aeroporto', x: 76, y: 12, worldX: 3484, worldY: -1814, color: '#b91c1c' },
  { id: 'district-oriente-parque-nacoes', shortName: 'Oriente & Expo', x: 88, y: 28, worldX: 3234, worldY: -454, color: '#dc2626' },
  { id: 'district-rato-principe-real', shortName: 'Rato & Pr. Real', x: 22, y: 50, worldX: -406, worldY: -454, color: '#eab308' },
  { id: 'district-marques-pombal-avenida', shortName: 'Marques de Pombal', x: 38, y: 38, worldX: 1094, worldY: -1134, color: '#eab308' },
  { id: 'district-saldanha-campo-pequeno', shortName: 'Saldanha', x: 54, y: 34, worldX: 1894, worldY: -1134, color: '#dc2626' },
  { id: 'district-alameda-arroios', shortName: 'Alameda', x: 70, y: 42, worldX: 1894, worldY: -454, color: '#dc2626' },
  { id: 'district-rossio-restauradores', shortName: 'Rossio & Baixa', x: 46, y: 58, worldX: 1094, worldY: -454, color: '#16a34a' },
  { id: 'district-cais-sodre-belem', shortName: 'Cais do Sodre & Belem', x: 14, y: 80, worldX: -326, worldY: 878, color: '#16a34a' },
  { id: 'overworld', shortName: 'Chiado, Bairro Alto & Alfama', x: 50, y: 80, worldX: 1151, worldY: 546, color: '#1d4ed8' }
];

export function getLisboaZoneLabel(zoneId) {
  if (zoneId === 'overworld') return 'Historic Central Lisboa (Bairro Alto, Chiado & Alfama)';
  const d = LISBOA_CITY_DISTRICTS.find((x) => x.id === zoneId);
  return d ? d.name : zoneId;
}

export function getLisboaZoneShortName(zoneId) {
  if (zoneId === 'overworld') return 'Chiado / Bairro Alto / Alfama';
  const d = LISBOA_CITY_DISTRICTS.find((x) => x.id === zoneId);
  return d ? d.shortName : zoneId;
}

export function getWalkingAvenuesFrom(zoneId) {
  const list = LISBOA_WALKING_NETWORK[zoneId] || [];
  return list.map((link) => {
    const portal = zoneId === 'overworld' ? null : CITY_DISTRICT_PORTALS[link.slot];
    return {
      ...link,
      x: Number.isFinite(link.x) ? link.x : (portal ? portal.x : 380),
      y: Number.isFinite(link.y) ? link.y : (portal ? portal.y : 214),
      portalLabel: portal ? portal.label : (link.slot || '').toUpperCase()
    };
  });
}

/**
 * Shortest on-foot walking route across the connected full-city Lisboa street network
 * between any two city zones ('overworld' or any of the 9 Greater Lisboa districts).
 */
export function computeLisboaWalkingRoute(fromZoneId, toZoneId) {
  if (!fromZoneId || !toZoneId) {
    return { ok: false, zones: [], legs: [], totalMeters: 0, totalMinutes: 0 };
  }
  if (fromZoneId === toZoneId) {
    return { ok: true, zones: [fromZoneId], legs: [], totalMeters: 0, totalMinutes: 0 };
  }
  // Dijkstra weighted by real street walking distance in meters
  const dist = new Map([[fromZoneId, 0]]);
  const prev = new Map();
  const visited = new Set();
  const queue = [{ zone: fromZoneId, d: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.d - b.d);
    const cur = queue.shift();
    if (visited.has(cur.zone)) continue;
    visited.add(cur.zone);
    if (cur.zone === toZoneId) break;
    for (const edge of getWalkingAvenuesFrom(cur.zone)) {
      const nd = cur.d + (edge.distanceMeters || 800);
      if (!dist.has(edge.toZoneId) || nd < dist.get(edge.toZoneId)) {
        dist.set(edge.toZoneId, nd);
        prev.set(edge.toZoneId, edge);
        queue.push({ zone: edge.toZoneId, d: nd });
      }
    }
  }

  if (!prev.has(toZoneId)) {
    return { ok: false, zones: [], legs: [], totalMeters: 0, totalMinutes: 0 };
  }
  const legs = [];
  const zones = [toZoneId];
  let curr = toZoneId;
  while (curr !== fromZoneId) {
    const edge = prev.get(curr);
    legs.unshift(edge);
    zones.unshift(edge.fromZoneId);
    curr = edge.fromZoneId;
  }
  const totalMeters = legs.reduce((sum, l) => sum + (l.distanceMeters || 0), 0);
  const totalMinutes = legs.reduce((sum, l) => sum + (l.walkMinutes || 0), 0);
  return { ok: true, zones, legs, totalMeters, totalMinutes };
}

