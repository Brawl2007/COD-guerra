// Paleta de props M01 (sRGB), dessaturada e suja para luz de madrugada de Setembro de 1939 (sem cores saturadas).
import { hex } from './mesh.mjs';

export const P = Object.fromEntries(Object.entries({
  woodNew: '#8a7456', woodMid: '#74634b', woodOld: '#665848', woodGrey: '#7b7467', woodDark: '#43392f', creosote: '#463e34',
  fieldGrey: '#6a6f66', fieldGreen: '#5c644f', oliveDrab: '#6c6e55', dullBlack: '#3a3b3a',
  steel: '#5e6164', steelDark: '#3c3e40', steelLight: '#7b7e80', rust: '#6c4a37', rustLight: '#80583c',
  burlap: '#a2956f', burlapDark: '#8a7e5e', sand: '#a79a79', rope: '#8b7e62', twine: '#5d5240',
  coal: '#262627', coalBlue: '#313336', coalBrown: '#3a322b',
  porcelain: '#9a8e7a', porcelainBrown: '#6e5b49', glass: '#566260', glassDirty: '#6a706a',
  brass: '#7a6a42', leather: '#5a4636', canvas: '#8d8670',
  whiteFaded: '#a8a393', redFaded: '#7d4b40', hay: '#9a8c5e', mud: '#4a4034', concrete: '#85847c',
}).map(([k, v]) => [k, hex(v)]));
