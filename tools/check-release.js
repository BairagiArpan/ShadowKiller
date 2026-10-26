'use strict';
const fs = require('fs');
const path = require('path');

function checkDevFlags(text) {
  const p = [];
  if (/DEV_UNLOCK_ALL\s*=\s*true/.test(text)) p.push('DEV_UNLOCK_ALL is true (src/config/dev.ts): every level is unlocked');
  if (/SHOW_PERF\s*=\s*true/.test(text)) p.push('SHOW_PERF is true (src/config/dev.ts): the FPS overlay would be visible');
  return p;
}

function checkSaveDefaults(text) {
  const m = /version:\s*\d+,\s*coins:\s*(\d+)/.exec(text);
  return m && Number(m[1]) !== 0 ? [`defaultSave() starts with ${m[1]} coins (src/persistence/saveData.ts): set it back to 0`] : [];
}

function checkAppConfig(cfg) {
  const p = [];
  const e = (cfg && cfg.expo) || {};
  const a = e.android || {};
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(a.package || '')) p.push('android.package is missing or not a valid application id');
  if (!Number.isInteger(a.versionCode) || a.versionCode < 1) p.push('android.versionCode must be a whole number >= 1');
  if (!/^\d+\.\d+\.\d+$/.test(e.version || '')) p.push('version must look like 1.0.0');
  if (!e.icon) p.push('icon is missing');
  if (!(a.adaptiveIcon && a.adaptiveIcon.foregroundImage)) p.push('android.adaptiveIcon.foregroundImage is missing');
  if (e.orientation !== 'landscape') p.push('orientation should be "landscape" (the game is designed for it)');
  const blocked = a.blockedPermissions || [];
  if (!blocked.includes('android.permission.RECORD_AUDIO')) p.push('RECORD_AUDIO is not blocked (the game never records audio)');
  return p;
}

function checkGitignore(text) {
  const p = [];
  for (const needle of ['*.jks', 'keystore.properties']) {
    if (!text.split(/\r?\n/).some((l) => l.trim() === needle)) p.push(`.gitignore is missing "${needle}"`);
  }
  return p;
}

module.exports = { checkDevFlags, checkSaveDefaults, checkAppConfig, checkGitignore };

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const read = (rel) => (fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : null);
  const problems = [];

  const dev = read('src/config/dev.ts');
  problems.push(...(dev === null ? ['src/config/dev.ts not found'] : checkDevFlags(dev)));
  const save = read('src/persistence/saveData.ts');
  if (save !== null) problems.push(...checkSaveDefaults(save));
  const app = read('app.json');
  problems.push(...(app === null ? ['app.json not found'] : checkAppConfig(JSON.parse(app))));
  const ign = read('.gitignore');
  problems.push(...(ign === null ? ['.gitignore not found'] : checkGitignore(ign)));

  const need = ['assets/icon.png', 'assets/adaptive-icon.png', 'assets/splash-icon.png'];
  const { SFX_NAMES, MUSIC_NAMES } = require('./synth');
  SFX_NAMES.forEach((n) => need.push(`assets/audio/sfx/${n}.wav`));
  MUSIC_NAMES.forEach((n) => need.push(`assets/audio/music/${n}.wav`));
  need.filter((f) => !fs.existsSync(path.join(root, f))).forEach((f) => problems.push(`missing ${f} (run: npm run gen:assets)`));

  if (problems.length === 0) console.log('Release check passed.');
  else { console.error(`Release check FAILED:\n - ${problems.join('\n - ')}`); process.exit(1); }
}