'use strict';
const fs = require('fs');
const path = require('path');
const { encodePng, renderRgba } = require('./Icons');

const dir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(dir, { recursive: true });

const SIZE = 1024;
const jobs = [
  ['icon.png', { bg: true, scale: 1 }],            // full-bleed app icon
  ['adaptive-icon.png', { bg: false, scale: 0.62 }], // Android adaptive foreground: art stays inside the safe zone
  ['splash-icon.png', { bg: false, scale: 0.9 }],  // transparent; the background color comes from app.json
];

for (const [name, opts] of jobs) {
  const png = encodePng(SIZE, SIZE, renderRgba(SIZE, opts));
  fs.writeFileSync(path.join(dir, name), png);
  console.log(`${name.padEnd(20)} ${(png.length / 1024).toFixed(0)} KB`);
}