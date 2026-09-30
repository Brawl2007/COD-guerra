export const CONFIG = Object.freeze({
  tile: 64, fov: Math.PI / 3, walkSpeed: 145, sprintSpeed: 215,
  playerRadius: 13, maxHealth: 100, mouseSensitivity: 0.0022,
  weapon: { magazine: 15, reserve: 60, damage: 38, fireDelay: 180, reloadMs: 1500, recoil: 0.025, range: 620 },
});

// Gameplay retains its planar x/y grid. Three.js uses x/z in metres, with y up.
// A 64-unit tile is 2 metres; heights are ALWAYS expressed in metres.
export const UNITS_PER_METRE = 32;
export const EYE_HEIGHT = 1.64;
export const WALL_HEIGHT = 3.4;

export const MAP = [
  '11111111111111111111',
  '1PAAAAAA000000000001',
  '10001111100011111001',
  '1000100010001000E001',
  '10001000100010E00001',
  '10001000000010001E01',
  '10001110100011111001',
  '1000000010E000000001',
  '10111000111100111001',
  '100C00E0100000000001',
  '10000000100E00E00001',
  '10111000100000111001',
  '10000E0010000000E001',
  '10001111100111110001',
  '1000100000010ER10001',
  '10001000000000E10001',
  '10001101100111110E01',
  '11111111111111111111',
];
