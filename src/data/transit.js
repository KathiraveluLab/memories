export const TRANSIT_LINES = [
  {
    id: 'tram-28e',
    routeNumber: '28E',
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
    routeNumber: '737',
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
  },
  {
    id: 'tram-15e',
    routeNumber: '15E',
    mode: 'tram',
    name: 'Eletrico 15E (Belem - Cais do Sodre - Praca do Comercio)',
    operator: 'Carris',
    badge: '[TRAM 15E]',
    fareEur: 3.1,
    speedPxPerSec: 132,
    dwellSeconds: 3.0,
    color: '#d97706',
    trimColor: '#f8fafc',
    loopType: 'pingpong',
    phrase: {
      pt: 'O eletrico quinze vai direto para os Jeronimos e a Torre de Belem.',
      pronunciation: 'Oo eh-leh-tree-koo keen-zeh vah-ee dee-reh-too pah-rah oosh Zheh-roh-nee-moosh ee ah Toh-reh deh Beh-leym.',
      en: 'Tram 15 goes straight to Jeronimos and Belem Tower.'
    },
    waypoints: [
      { x: -1200, y: 932, stopId: 'stop-tram15-belem', stopName: 'Torre de Belem / Jeronimos (15E)', platformY: 878 },
      { x: -890, y: 932, stopId: 'stop-tram15-maat', stopName: 'MAAT & Alcantara Waterfront (15E)', platformY: 878 },
      { x: -326, y: 932, stopId: 'stop-tram15-cais', stopName: 'Cais do Sodre / Mercado da Ribeira (15E)', platformY: 878 },
      { x: 1550, y: 932, stopId: 'stop-tram15-comercio', stopName: 'Praca do Comercio / Terreiro do Paco (15E)', platformY: 878 }
    ]
  },
  {
    id: 'tram-24e',
    routeNumber: '24E',
    mode: 'tram',
    name: 'Eletrico 24E (Camoes - Principe Real - Rato)',
    operator: 'Carris',
    badge: '[TRAM 24E]',
    fareEur: 3.1,
    speedPxPerSec: 122,
    dwellSeconds: 3.0,
    color: '#ca8a04',
    trimColor: '#fef9c3',
    loopType: 'pingpong',
    phrase: {
      pt: 'O eletrico vinte e quatro sobe do Chiado ao Principe Real e ao Rato.',
      pronunciation: 'Oo eh-leh-tree-koo veen-teh ee kwah-troo soh-beh doo Shee-ah-doo ow Preen-see-peh Heh-ahl ee ow Hah-too.',
      en: 'Tram 24 climbs from Chiado to Principe Real and Rato.'
    },
    waypoints: [
      { x: 892, y: 285, stopId: 'stop-tram24-camoes', stopName: 'Chiado / Camoes Norte (24E)', platformX: 892, platformY: 224 },
      { x: -560, y: 285 },
      { x: -560, y: -384 },
      { x: -406, y: -384, stopId: 'stop-tram24-rato', stopName: 'Largo do Rato / Metro Rato (24E)', platformY: -454 },
      { x: -700, y: -384, stopId: 'stop-tram24-principe', stopName: 'Principe Real / Mae d Agua (24E)', platformY: -454 }
    ]
  },
  {
    id: 'bus-736',
    routeNumber: '736',
    mode: 'bus',
    name: 'Carris Bus 736 (Baixa - Rossio - Marques - Saldanha - Campo Grande)',
    operator: 'Carris',
    badge: '[BUS 736]',
    fareEur: 2.1,
    speedPxPerSec: 158,
    dwellSeconds: 3.0,
    color: '#0f766e',
    trimColor: '#facc15',
    loopType: 'cycle',
    phrase: {
      pt: 'O autocarro sete tres seis sobe a Avenida da Liberdade ate ao Campo Grande.',
      pronunciation: 'Oo ow-too-kah-roo seh-teh trehsh saysh soh-beh ah Ah-veh-nee-dah dah Lee-behr-dah-deh ah-teh ow Kahm-poo Grahn-deh.',
      en: 'Bus 736 climbs Avenida da Liberdade all the way to Campo Grande.'
    },
    waypoints: [
      { x: 935, y: 285 },
      { x: 1090, y: 285, stopId: 'stop-bus736-baixa', stopName: 'Baixa-Chiado / Rua Garrett (736)', platformY: 224 },
      { x: 1745, y: 285 },
      { x: 1745, y: -1064, stopId: 'stop-bus736-saldanha', stopName: 'Saldanha / Av. da Republica (736)', platformX: 1824, platformY: -1134 },
      { x: 1745, y: -1744 },
      { x: 1120, y: -1744, stopId: 'stop-bus736-campo-grande', stopName: 'Campo Grande / Cidade Universitaria (736)', platformY: -1814 },
      { x: 935, y: -1744 },
      { x: 935, y: -1064, stopId: 'stop-bus736-marques', stopName: 'Marques de Pombal / Av. Liberdade (736)', platformX: 1014, platformY: -1134 },
      { x: 935, y: -384, stopId: 'stop-bus736-rossio', stopName: 'Rossio / Restauradores (736)', platformX: 1014, platformY: -454 }
    ]
  },
  {
    id: 'bus-728',
    routeNumber: '728',
    mode: 'bus',
    name: 'Carris Bus 728 (Belem - Cais do Sodre - Santa Apolonia - Oriente)',
    operator: 'Carris',
    badge: '[BUS 728]',
    fareEur: 2.1,
    speedPxPerSec: 164,
    dwellSeconds: 3.0,
    color: '#166534',
    trimColor: '#fde047',
    loopType: 'pingpong',
    phrase: {
      pt: 'O sete dois oito percorre toda a marginal do Tejo de Belem ao Oriente.',
      pronunciation: 'Oo seh-teh doysh oy-too pehr-koh-reh toh-dah ah mahr-zhee-nahl doo Teh-zhoo deh Beh-leym ow Oh-ree-eyn-teh.',
      en: 'Bus 728 runs along the entire Tagus waterfront from Belem to Oriente.'
    },
    waypoints: [
      { x: -1310, y: 932, stopId: 'stop-bus728-belem', stopName: 'Belem / Mosteiro dos Jeronimos (728)', platformY: 878 },
      { x: -160, y: 932, stopId: 'stop-bus728-cais', stopName: 'Cais do Sodre Waterfront (728)', platformY: 878 },
      { x: 1460, y: 932, stopId: 'stop-bus728-terreiro', stopName: 'Terreiro do Paco (728)', platformY: 878 },
      { x: 2040, y: 932, stopId: 'stop-bus728-santa-apolonia', stopName: 'Santa Apolonia Rail Hub (728)', platformY: 878 },
      { x: 3020, y: 932, stopId: 'stop-bus728-oceanario', stopName: 'Doca das Nacoes / Oceanario (728)', platformY: 878 },
      { x: 3360, y: 932 },
      { x: 3360, y: -384 },
      { x: 3110, y: -384, stopId: 'stop-bus728-oriente', stopName: 'Gare do Oriente / Parque das Nacoes (728)', platformY: -454 }
    ]
  },
  {
    id: 'bus-746',
    routeNumber: '746',
    mode: 'bus',
    name: 'Carris Bus 746 (Marques de Pombal - Sao Sebastiao - Sete Rios Zoo - Campo Grande)',
    operator: 'Carris',
    badge: '[BUS 746]',
    fareEur: 2.1,
    speedPxPerSec: 154,
    dwellSeconds: 3.0,
    color: '#1e40af',
    trimColor: '#fde047',
    loopType: 'pingpong',
    phrase: {
      pt: 'O autocarro sete quatro seis liga o Marques de Pombal a Sao Sebastiao e ao Zoo.',
      pronunciation: 'Oo ow-too-kah-roo seh-teh kwah-troo saysh lee-gah oo Mahr-kehsh deh Pohm-bahl ah Sow Seh-bahsh-tee-ow ee ow Zoh-oh.',
      en: 'Bus 746 links Marques de Pombal to Sao Sebastiao and the Zoo.'
    },
    waypoints: [
      { x: 1270, y: -1064, stopId: 'stop-bus746-marques', stopName: 'Marques de Pombal / Parque Eduardo VII (746)', platformY: -1134 },
      { x: -406, y: -1064, stopId: 'stop-bus746-saoseb', stopName: 'Metro Sao Sebastiao / Gulbenkian (746)', platformY: -1134 },
      { x: -940, y: -1064, stopId: 'stop-bus746-zoo', stopName: 'Sete Rios / Jardim Zoologico (746)', platformY: -1134 },
      { x: -560, y: -1064 },
      { x: -560, y: -1744 },
      { x: 740, y: -1744, stopId: 'stop-bus746-universidade', stopName: 'Cidade Universitaria / Alvalade (746)', platformY: -1814 }
    ]
  },
  {
    id: 'bus-706',
    routeNumber: '706',
    mode: 'bus',
    name: 'Carris Bus 706 (Cais do Sodre - Rato - Rossio - Alameda - Santa Apolonia)',
    operator: 'Carris',
    badge: '[BUS 706]',
    fareEur: 2.1,
    speedPxPerSec: 152,
    dwellSeconds: 3.0,
    color: '#047857',
    trimColor: '#fef08a',
    loopType: 'pingpong',
    phrase: {
      pt: 'O autocarro sete zero seis liga o Cais do Sodre ao Rato e a Alameda.',
      pronunciation: 'Oo ow-too-kah-roo seh-teh zeh-roo saysh lee-gah oo Kah-eesh doo Soh-dreh ow Hah-too ee ah Ah-lah-meh-dah.',
      en: 'Bus 706 connects Cais do Sodre to Rato and Alameda.'
    },
    waypoints: [
      { x: -560, y: 932, stopId: 'stop-bus706-cais', stopName: 'Cais do Sodre / Santos (706)', platformX: -486, platformY: 878 },
      { x: -560, y: -384, stopId: 'stop-bus706-rato', stopName: 'Metro Rato / Sao Bento (706)', platformX: -486, platformY: -454 },
      { x: 720, y: -384, stopId: 'stop-bus706-rossio', stopName: 'Rossio Oeste / Avenida (706)', platformY: -454 },
      { x: 1910, y: -384, stopId: 'stop-bus706-alameda', stopName: 'Metro Alameda / Fonte Luminosa (706)', platformY: -454 },
      { x: 2215, y: -384 },
      { x: 2215, y: 932, stopId: 'stop-bus706-santa-apolonia', stopName: 'Santa Apolonia Leste (706)', platformX: 2140, platformY: 878 }
    ]
  },
  {
    id: 'bus-744',
    routeNumber: '744',
    mode: 'bus',
    name: 'Carris Bus 744 (Restauradores - Saldanha - Aeroporto - Oriente)',
    operator: 'Carris',
    badge: '[BUS 744]',
    fareEur: 2.1,
    speedPxPerSec: 162,
    dwellSeconds: 3.0,
    color: '#b45309',
    trimColor: '#fef3c7',
    loopType: 'pingpong',
    phrase: {
      pt: 'O sete quatro quatro vai dos Restauradores ao Saldanha e a Gare do Oriente.',
      pronunciation: 'Oo seh-teh kwah-troo kwah-troo vah-ee doosh Hehsh-tow-rah-doh-resh ow Sahl-dah-nyah ee ah Gah-reh doo Oh-ree-eyn-teh.',
      en: 'Bus 744 runs from Restauradores to Saldanha and Gare do Oriente.'
    },
    waypoints: [
      { x: 1270, y: -384, stopId: 'stop-bus744-rossio', stopName: 'Rossio / Restauradores (744)', platformY: -454 },
      { x: 1745, y: -384 },
      { x: 1745, y: -1064 },
      { x: 2090, y: -1064, stopId: 'stop-bus744-saldanha', stopName: 'Saldanha / Campo Pequeno (744)', platformY: -1134 },
      { x: 2560, y: -1064, stopId: 'stop-bus744-avenidas', stopName: 'Avenidas Novas / Olaias Norte (744)', platformY: -1134 },
      { x: 3360, y: -1064 },
      { x: 3360, y: -1744 },
      { x: 3484, y: -1744, stopId: 'stop-bus744-aeroporto', stopName: 'Aeroporto Humberto Delgado (744)', platformY: -1814 },
      { x: 3360, y: -1744 },
      { x: 3360, y: -384 },
      { x: 3580, y: -384, stopId: 'stop-bus744-oriente', stopName: 'Gare do Oriente / Calatrava (744)', platformY: -454 }
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


export function getAllTransitStops() {
  const stops = [];
  for (const line of TRANSIT_LINES) {
    line.waypoints.forEach((wp, index) => {
      if (wp.stopId) {
        stops.push({
          stopId: wp.stopId,
          stopName: wp.stopName,
          lineId: line.id,
          routeNumber: line.routeNumber || line.badge,
          lineName: line.name,
          mode: line.mode,
          badge: line.badge,
          fareEur: line.fareEur,
          waypointIndex: index,
          x: wp.x,
          y: wp.y,
          platformX: Number.isFinite(wp.platformX) ? wp.platformX : wp.x,
          platformY: Number.isFinite(wp.platformY) ? wp.platformY : wp.y
        });
      }
    });
  }
  return stops;
}

