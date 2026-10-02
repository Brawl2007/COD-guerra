// Variantes de cabeça (alvos CC0 do MakeHuman aplicados só à cabeça) e de pintura do rosto, por nação.
// Personagens nomeados seguem STORY_BIBLE.md (idade, aparência); os genéricos dão variedade às secções.
// Pesos dos alvos em 0..1. Cores em sRGB 0..1.
const sym = (name, w) => [[`${name.split('/')[0]}/l-${name.split('/')[1]}.target`, w], [`${name.split('/')[0]}/r-${name.split('/')[1]}.target`, w]];
const t = (name, w) => [[`${name}.target`, w]];

const HAIR = {
  blond: [0.56, 0.45, 0.30], lightBrown: [0.36, 0.26, 0.17], brown: [0.24, 0.17, 0.11], darkBrown: [0.15, 0.11, 0.08],
  black: [0.07, 0.06, 0.05], reddish: [0.40, 0.22, 0.12], ash: [0.42, 0.38, 0.32],
};
const EYES = { blueGrey: [0.42, 0.52, 0.58], blue: [0.30, 0.45, 0.62], grey: [0.47, 0.49, 0.48], green: [0.38, 0.45, 0.30], hazel: [0.42, 0.33, 0.18], brown: [0.28, 0.17, 0.09] };
const SKIN = { fair: [0.86, 0.68, 0.58], light: [0.80, 0.62, 0.51], medium: [0.74, 0.55, 0.43], tanned: [0.70, 0.50, 0.38] };

/**
 * Campos: id, nome (para documentação), idade visível, targets, hairLength (m de volume extra no topo),
 * hair (cor), grey (0..1 de brancas), eyes, skin, stubble (0..1), moustache (0..1), wrinkles, sunburn, freckles, grime.
 */
export const HEADS = {
  pl: [
    { id: 'wrona', name: 'Jan Wrona (21)', note: 'rosto jovem, barba rala, olhos claros cansados', hair: HAIR.lightBrown, eyes: EYES.blueGrey, skin: SKIN.light,
      stubble: 0.3, tired: 0.6, hairLength: 0.004,
      targets: [...t('head/head-age-decr', 0.35), ...t('head/head-oval', 0.5), ...t('chin/chin-width-decr', 0.25), ...t('nose/nose-scale-horiz-decr', 0.2), ...sym('cheek/cheek-bones-incr', 0.2)] },
    { id: 'zielinski', name: 'Sierżant Marek Zieliński (38)', note: 'bigode curto, rosto marcado', hair: HAIR.darkBrown, grey: 0.25, eyes: EYES.grey, skin: SKIN.medium,
      stubble: 0.45, moustache: 1, wrinkles: 0.8, sunburn: 0.35, hairLength: 0.003,
      targets: [...t('head/head-age-incr', 0.55), ...t('head/head-square', 0.55), ...t('chin/chin-prominent-incr', 0.3), ...t('nose/nose-hump-incr', 0.45),
        ...t('eyebrows/eyebrows-angle-down', 0.35), ...sym('cheek/cheek-bones-incr', 0.4), ...sym('cheek/cheek-volume-decr', 0.3), ...t('mouth/mouth-angles-down', 0.25)] },
    { id: 'krawiec', name: 'Kapral Paweł Krawiec (29), sapador', note: 'graxa no rosto e nas mãos', hair: HAIR.ash, eyes: EYES.hazel, skin: SKIN.light,
      stubble: 0.55, grime: 0.6, wrinkles: 0.25, hairLength: 0.0035,
      targets: [...t('head/head-rectangular', 0.45), ...t('nose/nose-scale-vert-incr', 0.3), ...t('mouth/mouth-scale-horiz-incr', 0.2), ...t('chin/chin-cleft-incr', 0.35), ...t('eyebrows/eyebrows-trans-down', 0.25)] },
    { id: 'nowicki', name: 'Strzelec Tadeusz Nowicki (22)', note: 'sardas, ar brincalhão', hair: HAIR.reddish, eyes: EYES.green, skin: SKIN.fair,
      stubble: 0.15, freckles: 0.8, hairLength: 0.005,
      targets: [...t('head/head-age-decr', 0.25), ...t('head/head-round', 0.4), ...t('nose/nose-point-up', 0.45), ...t('mouth/mouth-angles-up', 0.45), ...t('mouth/mouth-dimples-in', 0.4)] },
    { id: 'bak', name: 'Strzelec Józef Bąk (19)', note: 'o mais novo; orelhas salientes', hair: HAIR.blond, eyes: EYES.blue, skin: SKIN.fair,
      stubble: 0, hairLength: 0.005,
      targets: [...t('head/head-age-decr', 0.7), ...t('head/head-fat-incr', 0.25), ...t('nose/nose-scale-horiz-incr', 0.15), ...sym('ears/ear-wing-incr', 0.6), ...sym('ears/ear-scale-incr', 0.3)] },
    { id: 'kowal', name: 'St. strzelec Szymon Kowal (25)', note: 'rosto queimado de sol', hair: HAIR.brown, eyes: EYES.brown, skin: SKIN.tanned,
      stubble: 0.35, sunburn: 0.8, hairLength: 0.004,
      targets: [...t('head/head-square', 0.35), ...t('chin/chin-width-incr', 0.45), ...t('neck/neck-scale-horiz-incr', 0.4), ...t('nose/nose-flaring-incr', 0.35), ...t('mouth/mouth-lowerlip-volume-incr', 0.3)] },
    { id: 'dudek', name: 'Sanitariusz Leon Dudek (31)', note: 'socorrista; olheiras', hair: HAIR.black, eyes: EYES.brown, skin: SKIN.light,
      stubble: 0.4, tired: 0.4, wrinkles: 0.3, hairLength: 0.0035,
      targets: [...t('head/head-oval', 0.35), ...t('nose/nose-scale-depth-incr', 0.3), ...sym('eyes/eye-bag-incr', 0.4), ...t('mouth/mouth-scale-horiz-decr', 0.2)] },
    { id: 'pl_a', name: 'Genérico polaco A', hair: HAIR.brown, eyes: EYES.blueGrey, skin: SKIN.medium, stubble: 0.5, hairLength: 0.004,
      targets: [...t('head/head-diamond', 0.4), ...t('nose/nose-greek-incr', 0.4), ...t('chin/chin-height-incr', 0.3)] },
  ],
  de: [
    { id: 'de_a', name: 'Genérico alemão A', hair: HAIR.blond, eyes: EYES.blue, skin: SKIN.light, stubble: 0.1, hairLength: 0.003,
      targets: [...t('head/head-rectangular', 0.4), ...t('nose/nose-scale-vert-incr', 0.3), ...t('chin/chin-prominent-incr', 0.35)] },
    { id: 'de_b', name: 'Genérico alemão B', hair: HAIR.darkBrown, eyes: EYES.brown, skin: SKIN.medium, stubble: 0.35, wrinkles: 0.3, hairLength: 0.003,
      targets: [...t('head/head-age-incr', 0.3), ...t('head/head-square', 0.4), ...t('nose/nose-hump-incr', 0.3), ...t('eyebrows/eyebrows-angle-down', 0.3)] },
    { id: 'de_c', name: 'Genérico alemão C', hair: HAIR.lightBrown, eyes: EYES.grey, skin: SKIN.fair, stubble: 0.15, freckles: 0.3, hairLength: 0.0035,
      targets: [...t('head/head-age-decr', 0.4), ...t('head/head-oval', 0.4), ...t('nose/nose-point-up', 0.3), ...sym('ears/ear-wing-incr', 0.3)] },
  ],
};
