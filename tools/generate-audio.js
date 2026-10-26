'use strict';
const fs = require('fs');
const path = require('path');
const {
  SFX_NAMES, MUSIC_NAMES, SFX_RATE, MUSIC_RATE, renderSfx, renderMusic, toWav,
} = require('./synth');

const root = path.join(__dirname, '..', 'assets', 'audio');
fs.mkdirSync(path.join(root, 'sfx'), { recursive: true });
fs.mkdirSync(path.join(root, 'music'), { recursive: true });

let total = 0;
function write(rel, wav) {
  fs.writeFileSync(path.join(root, rel), wav);
  total += wav.length;
  console.log(`${rel.padEnd(28)} ${(wav.length / 1024).toFixed(0).padStart(5)} KB`);
}

SFX_NAMES.forEach((n) => write(`sfx/${n}.wav`, toWav(renderSfx(n), SFX_RATE)));
MUSIC_NAMES.forEach((n) => write(`music/${n}.wav`, toWav(renderMusic(n), MUSIC_RATE)));
console.log(`\nTotal ${(total / 1024 / 1024).toFixed(1)} MB`);