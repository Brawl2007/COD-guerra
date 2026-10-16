// Registo dos props: id, categoria, descrição, referências históricas (só em palavras) e construtor.
import * as supply from './props-supply.mjs';
import * as line from './props-line.mjs';
import * as rail from './props-rail.mjs';
import * as carts from './props-carts.mjs';

const R = {
  crate: 'Caixas de munição e de mantimentos de madeira com cintas, de tipo corrente nos exércitos polaco e alemão em 1939; proporções de memória do tipo, sem cópia de peças reais.',
  pkp: 'Equipamento de via das ferrovias do Estado polaco (PKP) e alemãs (Reichsbahn) de 1939: material fundido ou de madeira creosotada pintado de forma utilitária.',
};

export const PROPS = [
  { id: 'ammo_crate_wood', fn: supply.ammoCrateWood, seed: 1, name: 'Caixa de munição de madeira', category: 'crates', description: 'Caixa de munição de madeira verde-oliva gasta, tampa com cintas de aço e pegas de corda nas cabeceiras.', reference: R.crate },
  { id: 'supply_crate_planked', fn: supply.supplyCratePlanked, seed: 2, name: 'Caixa de mantimentos de tábuas', category: 'crates', description: 'Caixa de tábuas com prumos de canto, uma tábua partida e uma da tampa levantada.', reference: R.crate },
  { id: 'ammo_tin_box', fn: supply.ammoTinBox, seed: 3, name: 'Caixa metálica de munição', category: 'crates', description: 'Caixa de chapa de aço cinzento-campanha com tampa, pega, dois fechos e ferrugem.', reference: R.crate },
  { id: 'sandbag_run', fn: supply.sandbagRun, seed: 4, name: 'Sacos de areia: troço recto', category: 'sandbags', description: 'Parapeito recto de quatro fiadas, dois sacos de espessura, ligação em quincôncio (cada saco 0,6 × 0,3 × 0,15 m).', reference: 'Parapeitos de sacos de areia improvisados em postos de 1939; sacos de serapilheira atados nas pontas.' },
  { id: 'sandbag_corner', fn: supply.sandbagCorner, seed: 5, name: 'Sacos de areia: canto em L', category: 'sandbags', description: 'Canto em L de três fiadas com duas pernas de 1,2 m e dois sacos de espessura.', reference: 'Parapeitos de sacos de areia improvisados em postos de 1939.' },
  { id: 'sandbag_burst', fn: supply.sandbagBurst, seed: 6, name: 'Sacos de areia: rebentado', category: 'sandbags', description: 'Parapeito desfeito: fiadas incompletas, sacos caídos, um saco rasgado e areia derramada.', reference: 'Danos de explosão sobre sacos de areia.' },
  { id: 'barrel_wood', fn: supply.barrelWood, seed: 7, name: 'Barril de madeira', category: 'barrels', description: 'Barril de aduelas com quatro arcos de ferro; aduelas de tons diferentes.', reference: 'Barril de tanoaria comum (água, conservas), ø ≈ 0,58 m.' },
  { id: 'drum_fuel_200l', fn: supply.drumFuel200, seed: 8, name: 'Bidão de combustível de 200 l', category: 'barrels', description: 'Bidão de chapa de 200 l com duas nervuras de reforço, dois bujões e tinta verde-oliva gasta com ferrugem.', reference: 'Bidão de chapa de 200 litros de uso militar e civil da época (ø ≈ 0,585 m).' },
  { id: 'jerrycans', fn: supply.jerrycans, seed: 9, name: 'Jerricans (grupo)', category: 'barrels', description: 'Três jerricans de 20 l de pé e um deitado, em tons de aço cinzento e ferrugem.', reference: 'Wehrmachtskanister de 20 l (introduzido em 1937–1939), 0,34 × 0,16 × 0,46 m.' },
  { id: 'telegraph_pole', fn: line.telegraphPole, seed: 10, name: 'Poste de telégrafo', category: 'line', description: 'Poste de madeira de 7 m, base creosotada, dois braços com escoras e seis isoladores de porcelana; âncoras de fio nos sockets.', reference: R.pkp },
  { id: 'telegraph_wire_span', fn: line.wireSpan, seed: 11, name: 'Vão de fio de telégrafo', category: 'line', description: 'Seis fios de 12 m com flecha de 0,28 m entre as âncoras de dois postes iguais (x=0 e x=12); repetir por vão.', reference: R.pkp },
  { id: 'fence_wood', fn: line.fenceWood, seed: 12, name: 'Cerca de ripas de madeira', category: 'fences', description: 'Secção de 3 m com três postes, duas travessas e ripas pontiagudas, algumas em falta ou tortas.', reference: 'Cerca rural de ripas de aldeia europeia.' },
  { id: 'fence_barbed', fn: line.fenceBarbed, seed: 13, name: 'Cerca de arame farpado', category: 'fences', description: 'Secção de 3 m com três estacas inclinadas, cinco fios com flecha e farpas, e um rolo caído.', reference: 'Cerca de arame farpado de campo.' },
  { id: 'railway_lantern', fn: line.railwayLantern, seed: 14, name: 'Lanterna ferroviária de mão', category: 'rail', description: 'Lanterna de petróleo de chapa escura com vidro sujo, grelha e alça.', reference: 'Lanterna de mão de ferroviário, tipo de furacão.' },
  { id: 'hand_cart', fn: carts.handCart, seed: 15, name: 'Carrinho de mão de estação', category: 'carts', description: 'Carrinho de duas rodas de raios com aro de ferro, plataforma de tábuas e varais para −Z, com dois sacos.', reference: 'Carrinho de bagagem e carga de estação.' },
  { id: 'horse_cart', fn: carts.horseCart, seed: 16, name: 'Carroça de cavalo (silhueta)', category: 'carts', description: 'Carroça de escadas de quatro rodas com banco, timão e balança para −Z; sem cavalo.', reference: 'Carroça agrícola de escadas polaca (wóz drabiniasty).' },
  { id: 'point_lever', fn: rail.pointLever, seed: 17, name: 'Alavanca de agulha', category: 'rail', description: 'Alavanca de mão de agulha com alvo de duas faces, lanterna, braço com contrapeso e tirante para a via (−Z→+Z).', reference: R.pkp },
  { id: 'semaphore_signal', fn: rail.semaphoreSignal, seed: 18, name: 'Semáforo mecânico', category: 'rail', description: 'Mastro tubular de 5,5 m com escada, braço horizontal (parar) a +X, lanterna de espectáculo e fio de transmissão.', reference: R.pkp },
  { id: 'water_crane', fn: rail.waterCrane, seed: 19, name: 'Grua de água', category: 'rail', description: 'Coluna de ferro fundido de 4,6 m, braço em pescoço de cisne para +X, manga de lona, roda de válvula e braseiro anti-gelo.', reference: R.pkp },
  { id: 'coal_pile', fn: rail.coalPile, seed: 20, name: 'Monte de carvão', category: 'rail', description: 'Monte facetado de carvão com pedaços soltos e uma pá cravada.', reference: 'Depósito de carvão de tender de estação.' },
  { id: 'sleeper_stack', fn: rail.sleeperStack, seed: 21, name: 'Pilha de travessas', category: 'rail', description: 'Oito fiadas de quatro travessas de 2,6 m, calços em cruz e uma travessa caída.', reference: 'Travessas de via de madeira creosotada, 2,6 × 0,26 × 0,15 m.' },
];
