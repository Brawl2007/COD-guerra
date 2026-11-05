// M02 «Operação Bzura» — luz solar pelo TIME-01 (docs/m02/research/TIME-01-solar.md; ferramenta tools/m02/solar-noaa.mjs).
// Módulo PURO (sem Three.js, sem DOM): converte (elevação, azimute) em posição da luz direcional e vice-versa, e define os momentos de cada preset.
// Convenção da bancada (TIME-01): NORTE = −Z, ESTE = +X, y para cima (metros). Azimute em graus a partir do Norte, sentido horário (E = 90°, S = 180°, W = 270°).
// A posição devolvida é a posição da LUZ (do alvo para o sol), a M02_SUN_DISTANCE_M do centro do mundo.

export const M02_SUN_DISTANCE_M = 90;

/** Posição da luz [x, y, z] (m) para um sol a `elevationDeg` e `azimuthDeg` (norte = −Z, este = +X). Arredonda a 0,01 m. */
export function sunPositionFromSolar(elevationDeg, azimuthDeg, distanceM = M02_SUN_DISTANCE_M) {
  const el = (elevationDeg * Math.PI) / 180;
  const az = (azimuthDeg * Math.PI) / 180;
  const round = (v) => Math.round(v * 100) / 100;
  return [
    round(distanceM * Math.cos(el) * Math.sin(az)),
    round(distanceM * Math.sin(el)),
    round(-distanceM * Math.cos(el) * Math.cos(az)),
  ];
}

/** Inverso de sunPositionFromSolar: `{ elevationDeg, azimuthDeg }` (azimute em [0, 360)) a partir de uma posição de luz [x, y, z]. */
export function solarFromSunPosition([x, y, z]) {
  const horizontal = Math.hypot(x, z);
  const elevationDeg = (Math.atan2(y, horizontal) * 180) / Math.PI;
  const azimuthDeg = ((((Math.atan2(x, -z) * 180) / Math.PI) % 360) + 360) % 360;
  return { elevationDeg, azimuthDeg };
}

/**
 * Meia-altura (m) do volume de sombras ao longo do «cima» da câmara da luz. Com o sol baixo as sombras alongam-se pelo chão (1/sin(elevação)) mas, vistas da luz,
 * ocupam pouca altura de imagem: R·sin(elevação) + margem para a altura dos edifícios. Permite concentrar o mapa de sombras (mais resolução) quando o sol está baixo.
 */
export function shadowHalfHeightM(elevationDeg, reachM = 95, marginM = 14) {
  const el = Math.max(0, elevationDeg);
  return Math.min(reachM + marginM, reachM * Math.sin((el * Math.PI) / 180) + marginM);
}
