export const CONFIG = Object.freeze({
  tile: 64, fov: Math.PI / 3, walkSpeed: 145, sprintSpeed: 215,
  playerRadius: 13, maxHealth: 100, mouseSensitivity: 0.0022,
  weapon: { magazine: 15, reserve: 60, damage: 38, fireDelay: 180, reloadMs: 1500, recoil: 0.025, range: 620 },
});

export const MAP = [
  '1111111111111111',
  '1P00000001000001',
  '100001000100E001',
  '1000010001000001',
  '1000010001110101',
  '1000000000000001',
  '1011100111001101',
  '10000001E0000001',
  '100C000100011101',
  '1000000000000001',
  '1011100111001101',
  '1000000000E00001',
  '1000111000000001',
  '100000000000R001',
  '100000A000000001',
  '1111111111111111',
];
