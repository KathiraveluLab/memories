import { CITY_METRO_WORLD_COORDS } from './metro.js';

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
    stationId: 'metro-saldanha',
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
    stationId: 'metro-sao-sebastiao',
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
    stationId: 'metro-campo-grande',
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
    stationId: 'metro-oriente',
    name: 'Parque das Nacoes, Gare do Oriente & Oceanario',
    shortName: 'Oriente / Parque das Nacoes',
    zoneBadge: '[LINHA VERMELHA + TELECABINE]',
    accentColor: '#dc2626',
    skylineStyle: 'oriente-calatrava',
    transitSummary: 'Metro Oriente (Linha Vermelha) | Gare do Oriente Rail | Telecabine Lisboa | Bus 728 & 744',
    description: 'Experience modern riverfront Lisboa at Parque das Nacoes: walk beneath Santiago Calatrava soaring white steel gothic tree-arches at Gare do Oriente and visit Oceanario de Lisboa along the Tagus.',
    plazaNote: 'Dine along the Marina Parque das Nacoes waterfront, admire Gare do Oriente and Ponte Vasco da Gama, or continue north along Linha Vermelha through Moscavide and Encarnacao to Aeroporto.',
    phrase: {
      pt: 'A estacao do Oriente fica no Parque das Nacoes, tres paragens antes do Aeroporto.',
      pronunciation: 'Ah ehsh-tah-sow doo Oh-ree-eyn-teh fee-kah noo Pahr-keh dash Nah-soysh, trehsh pah-rah-zheynsh ahn-tehsh doo Ah-eh-roh-pohr-too.',
      en: 'Oriente station is in Parque das Nacoes, three stops before the Airport.'
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
        note: 'Santiago Calatrava soaring 1998 steel-and-glass tree canopy uniting Metro Oriente (Linha Vermelha), high-speed trains, Oceanario de Lisboa, and the riverfront Telecabine Lisboa gondola overlooking Ponte Vasco da Gama. Free rest (+25 Energy).'
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
  },
  {
    id: 'district-aeroporto-lisboa',
    stationId: 'metro-aeroporto',
    name: 'Aeroporto Humberto Delgado (Terminal 1)',
    shortName: 'Aeroporto de Lisboa',
    zoneBadge: '[LINHA VERMELHA TERMINUS]',
    accentColor: '#b91c1c',
    skylineStyle: 'aeroporto-terminal',
    transitSummary: 'Metro Aeroporto (Linha Vermelha Terminus) | Carris Bus 744 / 722 / 783 | Terminal 1 Departures',
    description: 'Arrive at Aeroporto Humberto Delgado (LIS), the true eastern terminus of Metropolitano de Lisboa Linha Vermelha (three stops past Oriente via Moscavide and Encarnacao) and directly served by Carris Bus 744.',
    plazaNote: 'Grab a last warm Lisbon pastry or juice at Terminal 1, admire the aviation departures canopy, or pick up Portuguese cork and azulejo keepsakes before boarding Metro Aeroporto or Bus 744.',
    phrase: {
      pt: 'A estacao do Aeroporto e a ultima paragem da Linha Vermelha.',
      pronunciation: 'Ah ehsh-tah-sow doo Ah-eh-roh-pohr-too eh ah ool-tee-mah pah-rah-zheym dah Lee-nyah Vehr-meh-lyah.',
      en: 'Aeroporto station is the last stop on the Red Line.'
    },
    townSpots: [
      {
        id: 'aeroporto-pastelaria-t1',
        kind: 'eatery',
        name: 'Pastelaria Portuguesa - Terminal 1',
        badge: '[AIRPORT CAFE]',
        host: 'Clara S.',
        x: 155,
        y: 192,
        note: 'Bright departures-hall cafe welcoming arriving and departing travelers with warm toasted Alentejo sandwiches on plates and chilled passionfruit juice in tall glasses.',
        items: [
          {
            id: 'item-aeroporto-tosta-plate',
            name: 'Tosta Mista em Pao Alentejano',
            kind: 'food',
            servingType: 'plate',
            costEur: 5.8,
            fullnessDelta: 36,
            energyDelta: 22,
            description: 'Crisp grilled cheese and smoked ham on rustic Alentejo sourdough bread served on a porcelain plate.'
          },
          {
            id: 'item-aeroporto-maracuja-glass',
            name: 'Sumo Natural de Maracuja dos Acores',
            kind: 'food',
            servingType: 'glass',
            glassStyle: 'limonada',
            costEur: 3.6,
            fullnessDelta: 14,
            energyDelta: 20,
            description: 'Freshly pressed Azorean passionfruit juice poured cold in a tall glass.'
          }
        ]
      },
      {
        id: 'aeroporto-terminal1-landmark',
        kind: 'landmark',
        name: 'Aeroporto Humberto Delgado - Terminal 1 (LIS)',
        badge: '[AIRPORT TERMINUS]',
        host: 'Coordinator Henrique',
        x: 380,
        y: 192,
        note: 'Lisbon international aviation gateway opened in 1942 and connected directly to Metro Linha Vermelha in 2012 (final terminus stop after Encarnacao and Moscavide). Free lounge rest (+25 Energy).'
      },
      {
        id: 'aeroporto-dutyfree-loja',
        kind: 'shop',
        name: 'Loja de Portugal & Cortica - Terminal 1',
        badge: '[AIRPORT SHOP]',
        host: 'Filipa',
        x: 605,
        y: 192,
        note: 'Terminal 1 Portuguese crafts boutique offering Alentejo cork travel journals and Antonio Antunes station caricature postcards.',
        items: [
          {
            id: 'item-aeroporto-cork-tag',
            name: 'Alentejo Cork Luggage Tag & Passport Case',
            kind: 'souvenir',
            costEur: 12.0,
            fullnessDelta: 0,
            energyDelta: 5,
            description: 'Hand-stitched natural Portuguese cork travel wallet stamped with the Lisbon skyline.'
          },
          {
            id: 'item-aeroporto-caricature-set',
            name: 'Metro Aeroporto Lisbon Icons Postcard Pack',
            kind: 'souvenir',
            costEur: 7.5,
            fullnessDelta: 0,
            energyDelta: 4,
            description: 'Collector postcard set celebrating Antonio Antunes stone-carved cultural portraits at Metro Aeroporto.'
          }
        ]
      }
    ]
  }
];


export const CITY_DISTRICT_SPOT_LAYOUT = {
  // Cais do Sodre & Belem Waterfront (Row 0 West, facing Av. da India / Av. 24 de Julho)
  'belem-confeitaria': { x: -240, y: 710, w: 196, h: 140, spawnOutside: { x: -142, y: 878 } },
  'belem-torre-15e': { x: -1290, y: 700, w: 185, h: 150, spawnOutside: { x: -1198, y: 878 } },
  'belem-maritime-shop': { x: -990, y: 710, w: 196, h: 140, spawnOutside: { x: -892, y: 878 } },
  // Rato & Principe Real (Row 3 West, facing Rua da Escola Politecnica)
  'principe-real-esplanada': { x: -1020, y: -624, w: 196, h: 140, spawnOutside: { x: -922, y: -454 } },
  'rato-mae-dagua-24e': { x: -780, y: -624, w: 170, h: 140, spawnOutside: { x: -695, y: -454 } },
  'rato-ceramica-amalia': { x: -290, y: -624, w: 196, h: 140, spawnOutside: { x: -192, y: -454 } },
  // Rossio & Restauradores (Row 3 Center, facing Praca Dom Pedro IV)
  'rossio-ginjinha-cafe': { x: 620, y: -624, w: 196, h: 140, spawnOutside: { x: 718, y: -454 } },
  'rossio-santa-justa-lift': { x: 1180, y: -624, w: 180, h: 140, spawnOutside: { x: 1270, y: -454 } },
  'rossio-chapelaria': { x: 1420, y: -624, w: 196, h: 140, spawnOutside: { x: 1518, y: -454 } },
  // Marques de Pombal & Parque Eduardo VII (Row 4 Center, top of Avenida da Liberdade)
  'avenida-quiosque-ribeira': { x: 620, y: -1304, w: 196, h: 140, spawnOutside: { x: 718, y: -1134 } },
  'pombal-monument-lavra': { x: 1180, y: -1304, w: 180, h: 140, spawnOutside: { x: 1270, y: -1134 } },
  'estufa-fria-boutique': { x: 1420, y: -1304, w: 196, h: 140, spawnOutside: { x: 1518, y: -1134 } },
  // Sao Sebastiao, Gulbenkian & Sete Rios Zoo (Row 4 West)
  'gulbenkian-garden-cafe': { x: -1040, y: -1304, w: 196, h: 140, spawnOutside: { x: -942, y: -1134 } },
  'gulbenkian-zoo-teleferico': { x: -790, y: -1304, w: 180, h: 140, spawnOutside: { x: -700, y: -1134 } },
  'gulbenkian-museum-shop': { x: -290, y: -1304, w: 196, h: 140, spawnOutside: { x: -192, y: -1134 } },
  // Saldanha & Campo Pequeno 1892 (Row 4 East)
  'saldanha-cervejaria': { x: 1980, y: -1304, w: 196, h: 140, spawnOutside: { x: 2078, y: -1134 } },
  'campo-pequeno-dome': { x: 2230, y: -1304, w: 185, h: 140, spawnOutside: { x: 2322, y: -1134 } },
  'avenidas-art-nouveau-shop': { x: 2470, y: -1304, w: 196, h: 140, spawnOutside: { x: 2568, y: -1134 } },
  // Campo Grande, Cidade Universitaria & Alvalade (Row 5 North)
  'alvalade-pastelaria-universitaria': { x: 620, y: -1984, w: 196, h: 140, spawnOutside: { x: 718, y: -1814 } },
  'campo-grande-reitoria-lake': { x: 1180, y: -1984, w: 196, h: 140, spawnOutside: { x: 1278, y: -1814 } },
  'alvalade-livraria-academica': { x: 1430, y: -1984, w: 196, h: 140, spawnOutside: { x: 1528, y: -1814 } },
  // Alameda, Arroios & Fonte Luminosa 1948 (Row 3 East)
  'alameda-esplanada-luminosa': { x: 1960, y: -624, w: 180, h: 140, spawnOutside: { x: 2050, y: -454 } },
  'alameda-fonte-luminosa-monument': { x: 2340, y: -624, w: 190, h: 140, spawnOutside: { x: 2435, y: -454 } },
  'olaias-galeria-arquitetura': { x: 2590, y: -624, w: 196, h: 140, spawnOutside: { x: 2688, y: -454 } },
  // Oriente, Parque das Nacoes & Oceanario (East Riverfront & Gare do Oriente)
  'oriente-marina-restaurante': { x: 2920, y: 710, w: 196, h: 140, spawnOutside: { x: 3018, y: 878 } },
  'oriente-calatrava-telecabine': { x: 3480, y: -624, w: 220, h: 140, spawnOutside: { x: 3590, y: -454 } },
  'oriente-oceanario-loja': { x: 3500, y: 710, w: 196, h: 140, spawnOutside: { x: 3598, y: 878 } },
  // Aeroporto Humberto Delgado - Terminal 1 (Row 5 Northeast, Linha Vermelha Terminus)
  'aeroporto-pastelaria-t1': { x: 2940, y: -1984, w: 196, h: 140, spawnOutside: { x: 3038, y: -1814 } },
  'aeroporto-terminal1-landmark': { x: 3550, y: -1984, w: 180, h: 140, spawnOutside: { x: 3640, y: -1814 } },
  'aeroporto-dutyfree-loja': { x: 3760, y: -1984, w: 170, h: 140, spawnOutside: { x: 3845, y: -1814 } }
};

export const CITY_DISTRICT_SPOTS = [];
for (const district of LISBOA_CITY_DISTRICTS) {
  const stationWc = CITY_METRO_WORLD_COORDS[district.stationId];
  if (stationWc) {
    district.worldCenter = { x: stationWc.spawnOutside.x, y: stationWc.spawnOutside.y };
  }
  for (const spot of district.townSpots || []) {
    const lay = CITY_DISTRICT_SPOT_LAYOUT[spot.id];
    if (lay) {
      spot.worldX = lay.x;
      spot.worldY = lay.y;
      spot.w = lay.w;
      spot.h = lay.h;
      spot.doorX = lay.x + lay.w * 0.5;
      spot.doorY = lay.y + lay.h;
      spot.spawnOutside = lay.spawnOutside;
      spot.districtId = district.id;
      spot.districtName = district.shortName;
      spot.accentColor = district.accentColor;
      spot.skylineStyle = district.skylineStyle;
      CITY_DISTRICT_SPOTS.push(spot);
    }
  }
}

// Iconic Real Lisboa Buildings, Stadiums, Monasteries, Theatres & Cultural Sites surrounding the Greater Lisboa Metro Corridors
