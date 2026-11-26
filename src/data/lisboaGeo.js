// Real WGS84 geographic GPS coordinates (lat, lon) for all 50 official Metropolitano de Lisboa stations
// and flagship Lisbon landmarks, used to plot interactive clickable pins on the live OpenStreetMap view.

export const LISBOA_MAP_CENTER = { lat: 38.7425, lon: -9.1465, zoom: 12 };

export const METRO_STATION_GEO = {
  // Linha Azul (18 stations)
  'metro-reboleira': { lat: 38.7522, lon: -9.2241 },
  'metro-amadora-este': { lat: 38.7584, lon: -9.2179 },
  'metro-alfornelos': { lat: 38.7604, lon: -9.2044 },
  'metro-pontinha': { lat: 38.7623, lon: -9.1969 },
  'metro-carnide': { lat: 38.7592, lon: -9.1927 },
  'metro-colegio-militar-luz': { lat: 38.7534, lon: -9.1887 },
  'metro-alto-dos-moinhos': { lat: 38.7498, lon: -9.1801 },
  'metro-laranjeiras': { lat: 38.7484, lon: -9.1725 },
  'metro-jardim-zoologico': { lat: 38.7413, lon: -9.1686 },
  'metro-praca-de-espanha': { lat: 38.7377, lon: -9.1593 },
  'metro-sao-sebastiao': { lat: 38.7340, lon: -9.1537 },
  'metro-parque': { lat: 38.7294, lon: -9.1501 },
  'metro-marques-pombal': { lat: 38.7253, lon: -9.1499 },
  'metro-avenida': { lat: 38.7201, lon: -9.1458 },
  'metro-restauradores': { lat: 38.7155, lon: -9.1419 },
  'metro-baixa-chiado': { lat: 38.7107, lon: -9.1400 },
  'metro-terreiro-paco': { lat: 38.7072, lon: -9.1333 },
  'metro-santa-apolonia': { lat: 38.7138, lon: -9.1225 },
  // Linha Amarela (additional 11 stations; Marques de Pombal shared)
  'metro-odivelas': { lat: 38.7932, lon: -9.1731 },
  'metro-senhor-roubado': { lat: 38.7858, lon: -9.1717 },
  'metro-ameixoeira': { lat: 38.7795, lon: -9.1599 },
  'metro-lumiar': { lat: 38.7734, lon: -9.1596 },
  'metro-quinta-das-conchas': { lat: 38.7671, lon: -9.1554 },
  'metro-campo-grande': { lat: 38.7601, lon: -9.1578 },
  'metro-cidade-universitaria': { lat: 38.7517, lon: -9.1591 },
  'metro-entre-campos': { lat: 38.7478, lon: -9.1483 },
  'metro-campo-pequeno': { lat: 38.7408, lon: -9.1466 },
  'metro-saldanha': { lat: 38.7352, lon: -9.1456 },
  'metro-picoas': { lat: 38.7306, lon: -9.1467 },
  'metro-rato': { lat: 38.7202, lon: -9.1542 },
  // Linha Verde (additional 10 stations; Campo Grande & Baixa-Chiado shared)
  'metro-telheiras': { lat: 38.7604, lon: -9.1660 },
  'metro-alvalade': { lat: 38.7534, lon: -9.1440 },
  'metro-roma': { lat: 38.7484, lon: -9.1413 },
  'metro-areeiro': { lat: 38.7426, lon: -9.1338 },
  'metro-alameda': { lat: 38.7371, lon: -9.1338 },
  'metro-arroios': { lat: 38.7330, lon: -9.1344 },
  'metro-anjos': { lat: 38.7267, lon: -9.1351 },
  'metro-intendente': { lat: 38.7222, lon: -9.1353 },
  'metro-martim-moniz': { lat: 38.7177, lon: -9.1358 },
  'metro-rossio': { lat: 38.7139, lon: -9.1389 },
  'metro-cais-sodre': { lat: 38.7061, lon: -9.1449 },
  // Linha Vermelha (additional 9 stations; Sao Sebastiao, Saldanha, Alameda shared)
  'metro-olaias': { lat: 38.7402, lon: -9.1229 },
  'metro-bela-vista': { lat: 38.7476, lon: -9.1177 },
  'metro-chelas': { lat: 38.7548, lon: -9.1140 },
  'metro-olivais': { lat: 38.7608, lon: -9.1120 },
  'metro-cabo-ruivo': { lat: 38.7631, lon: -9.1052 },
  'metro-oriente': { lat: 38.7678, lon: -9.0994 },
  'metro-moscavide': { lat: 38.7748, lon: -9.1027 },
  'metro-encarnacao': { lat: 38.7750, lon: -9.1153 },
  'metro-aeroporto': { lat: 38.7686, lon: -9.1285 }
};

export const LISBOA_LANDMARK_GEO_PINS = [
  { id: 'belem-torre-15e', name: 'Torre de Belem', kind: 'landmark', lat: 38.6916, lon: -9.2160, color: '#0284c7' },
  { id: 'belem-confeitaria', name: 'Pasteis de Belem', kind: 'eatery', lat: 38.6975, lon: -9.2032, color: '#d97706' },
  { id: 'site-timeout-mercado-ribeira', name: 'Time Out Market', kind: 'eatery', lat: 38.7071, lon: -9.1459, color: '#16a34a' },
  { id: 'cafe-a-brasileira', name: 'Cafe A Brasileira (Chiado)', kind: 'venue', lat: 38.7106, lon: -9.1421, color: '#b45309' },
  { id: 'rossio-santa-justa-lift', name: 'Elevador de Santa Justa', kind: 'santa-justa', lat: 38.7121, lon: -9.1394, color: '#7c3aed' },
  { id: 'site-arco-rua-augusta', name: 'Arco da Rua Augusta', kind: 'landmark', lat: 38.7084, lon: -9.1368, color: '#ca8a04' },
  { id: 'site-hard-rock-restauradores', name: 'Hard Rock Cafe Restauradores', kind: 'eatery', lat: 38.7159, lon: -9.1422, color: '#dc2626' },
  { id: 'site-ist-alameda', name: 'IST (Alameda Campus)', kind: 'landmark', lat: 38.7368, lon: -9.1387, color: '#2563eb' },
  { id: 'campo-pequeno-dome', name: 'Campo Pequeno (1892)', kind: 'landmark', lat: 38.7426, lon: -9.1453, color: '#b44123' },
  { id: 'site-pastelaria-mexicana', name: 'Pastelaria Mexicana (Roma-Areeiro)', kind: 'eatery', lat: 38.7438, lon: -9.1376, color: '#16a34a' },
  { id: 'site-estadio-da-luz', name: 'Estadio da Luz (SL Benfica)', kind: 'landmark', lat: 38.7527, lon: -9.1847, color: '#dc2626' },
  { id: 'site-centro-colombo-benfica', name: 'Centro Comercial Colombo', kind: 'shop', lat: 38.7540, lon: -9.1886, color: '#2563eb' },
  { id: 'site-estadio-jose-alvalade', name: 'Estadio Jose Alvalade', kind: 'landmark', lat: 38.7612, lon: -9.1608, color: '#16a34a' },
  { id: 'site-oceanario-de-lisboa', name: 'Oceanario de Lisboa', kind: 'landmark', lat: 38.7636, lon: -9.0937, color: '#0284c7' },
  { id: 'site-pavilhao-de-portugal', name: 'Pavilhao de Portugal', kind: 'landmark', lat: 38.7662, lon: -9.0956, color: '#0284c7' },
  { id: 'site-cc-vasco-da-gama', name: 'Centro Comercial Vasco da Gama', kind: 'shop', lat: 38.7676, lon: -9.0972, color: '#0284c7' },
  { id: 'site-torre-vasco-da-gama', name: 'Torre Vasco da Gama', kind: 'landmark', lat: 38.7746, lon: -9.0913, color: '#0284c7' },
  { id: 'aeroporto-terminal1-landmark', name: 'Aeroporto Humberto Delgado (T1)', kind: 'landmark', lat: 38.7742, lon: -9.1342, color: '#dc2626' }
];
