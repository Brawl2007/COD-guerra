#!/usr/bin/env node
// NOAA ESRL Solar Calculator (Meeus simplificado). Puro Node, sem dependências.
// Hora local = UTC+1 (CET, sem DST). Em 1939 a Polónia usava CET (UTC+1); a ocupação
// alemã impôs depois outra hora (não aplicada aqui). Sol em Łęczyca: 52,06 N; 19,20 E.
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
export const LECZYCA = Object.freeze({ lat: 52.06, lon: 19.2 });

export function julianDay(dateUTC) {
  return dateUTC.getTime() / 86400000 + 2440587.5;
}

function sunParams(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = (((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360) + 360) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T))
    + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * RAD) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const appLong = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const meanObl = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const obl = meanObl + 0.00256 * Math.cos(omega * RAD);
  const decl = Math.asin(Math.sin(obl * RAD) * Math.sin(appLong * RAD)) * DEG;
  const y = Math.tan((obl / 2) * RAD) ** 2;
  const eqTime = 4 * DEG * (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD)
    + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD)
    - 0.5 * y * y * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD)); // minutos
  return { decl, eqTime };
}

export function refraction(elev) {
  if (elev > 85) return 0;
  const t = Math.tan(elev * RAD);
  let r;
  if (elev > 5) r = 58.1 / t - 0.07 / t ** 3 + 0.000086 / t ** 5;
  else if (elev > -0.575) r = 1735 + elev * (-518.2 + elev * (103.4 + elev * (-12.79 + elev * 0.711)));
  else r = -20.772 / t;
  return r / 3600;
}

/** @returns {{elevation:number, elevationGeometric:number, azimuth:number, declination:number, eqTimeMin:number}} graus; azimute a partir do Norte, horário */
export function solarPosition(dateUTC, lat, lon) {
  const { decl, eqTime } = sunParams(julianDay(dateUTC));
  const minUTC = dateUTC.getUTCHours() * 60 + dateUTC.getUTCMinutes() + dateUTC.getUTCSeconds() / 60
    + dateUTC.getUTCMilliseconds() / 60000;
  const trueSolar = (((minUTC + eqTime + 4 * lon) % 1440) + 1440) % 1440;
  let ha = trueSolar / 4 - 180;
  if (ha < -180) ha += 360;
  const cosZ = Math.sin(lat * RAD) * Math.sin(decl * RAD) + Math.cos(lat * RAD) * Math.cos(decl * RAD) * Math.cos(ha * RAD);
  const zen = Math.acos(Math.min(1, Math.max(-1, cosZ))) * DEG;
  const elevG = 90 - zen;
  const sinZ = Math.sin(zen * RAD);
  let az;
  if (sinZ > 1e-9) {
    const c = (Math.sin(lat * RAD) * Math.cos(zen * RAD) - Math.sin(decl * RAD)) / (Math.cos(lat * RAD) * sinZ);
    const a = Math.acos(Math.min(1, Math.max(-1, c))) * DEG;
    az = ha > 0 ? (a + 180) % 360 : (540 - a) % 360;
  } else az = lat > 0 ? 180 : 0;
  return { elevation: elevG + refraction(elevG), elevationGeometric: elevG, azimuth: az, declination: decl, eqTimeMin: eqTime };
}

/** Nascer/ocaso (zénite 90,833°). dateYMD = [ano, mês, dia]. Devolve minutos locais desde 00:00 e strings HH:MM. */
export function sunriseSunset(dateYMD, lat, lon, tzOffsetHours) {
  const [y, m, d] = dateYMD;
  const noonUTC = Date.UTC(y, m - 1, d, 12 - tzOffsetHours, 0, 0);
  const res = {};
  for (const kind of ['rise', 'set']) {
    let t = kind === 'rise' ? 360 : 1080; // minutos locais, iterado
    for (let i = 0; i < 5; i++) {
      const dt = new Date(noonUTC + (t - 720) * 60000);
      const { decl, eqTime } = sunParams(julianDay(dt));
      const ha = Math.acos(Math.cos(90.833 * RAD) / (Math.cos(lat * RAD) * Math.cos(decl * RAD)) - Math.tan(lat * RAD) * Math.tan(decl * RAD)) * DEG;
      const utcMin = 720 - 4 * (lon + (kind === 'rise' ? ha : -ha)) - eqTime;
      t = utcMin + tzOffsetHours * 60;
    }
    res[kind] = t;
  }
  const fmt = (t) => { const r = Math.round(t); return `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`; };
  return { sunriseMin: res.rise, sunsetMin: res.set, sunrise: fmt(res.rise), sunset: fmt(res.set) };
}

const TZ = 1; // CET
function at(y, m, d, hh, mm) { return new Date(Date.UTC(y, m - 1, d, hh - TZ, mm)); }

export function referenceTable() {
  const { lat, lon } = LECZYCA;
  const rows = [];
  const add = (label, date) => { const p = solarPosition(date, lat, lon); rows.push({ label, elev: p.elevation, az: p.azimuth }); };
  const s9 = sunriseSunset([1939, 9, 9], lat, lon, TZ);
  const s10 = sunriseSunset([1939, 9, 10], lat, lon, TZ);
  const fromMin = (y, m, d, t) => new Date(Date.UTC(y, m - 1, d, 0, 0) + (t - TZ * 60) * 60000);
  add('09/09 16:30', at(1939, 9, 9, 16, 30));
  add('09/09 17:00', at(1939, 9, 9, 17, 0));
  add('09/09 17:30', at(1939, 9, 9, 17, 30));
  rows.push({ label: `09/09 ocaso ${s9.sunset}`, elev: 0, az: solarPosition(fromMin(1939, 9, 9, s9.sunsetMin), lat, lon).azimuth });
  rows.push({ label: `10/09 nascer ${s10.sunrise}`, elev: 0, az: solarPosition(fromMin(1939, 9, 10, s10.sunriseMin), lat, lon).azimuth });
  add('10/09 07:30', at(1939, 9, 10, 7, 30));
  add('10/09 12:00', at(1939, 9, 10, 12, 0));
  add('10/09 16:00', at(1939, 9, 10, 16, 0));
  return { rows, s9, s10 };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { rows } = referenceTable();
  console.log('Łęczyca 52,06 N 19,20 E; CET = UTC+1; elevação aparente (com refração); azimute desde o Norte');
  console.log('momento (CET)'.padEnd(26) + 'elev(°)'.padStart(8) + 'az(°)'.padStart(8));
  for (const r of rows) console.log(r.label.padEnd(26) + r.elev.toFixed(1).padStart(8) + r.az.toFixed(0).padStart(8));
}
