'use strict';
const fs = require('fs');
const path = require('path');

const MARK = '// SHADOWKILLER-SIGNING';

/**
 * Makes the release build use ../keystore.properties (project root, ignored by git).
 * If that file is missing it falls back to the debug key (fine for friends, rejected by Google Play).
 * Throws instead of guessing when the Gradle file looks different from what we expect.
 */
function patchGradle(src) {
  if (src.includes(MARK)) return src;
  let out = src;

  const sc = /signingConfigs\s*\{/;
  if (!sc.test(out)) throw new Error('signingConfigs block not found in build.gradle');
  out = out.replace(sc, (m) => [
    m,
    '        release {',
    "            if (skProps['storeFile']) {",
    "                storeFile file(skProps['storeFile'])",
    "                storePassword skProps['storePassword']",
    "                keyAlias skProps['keyAlias']",
    "                keyPassword skProps['keyPassword']",
    '            }',
    '        }',
  ].join('\n'));

  const rel = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/;
  if (!rel.test(out)) throw new Error('release buildType with signingConfigs.debug not found in build.gradle');
  out = out.replace(rel, "$1signingConfig skProps['storeFile'] ? signingConfigs.release : signingConfigs.debug");

  const an = /^android\s*\{/m;
  if (!an.test(out)) throw new Error('android block not found in build.gradle');
  const header = [
    MARK,
    'def skProps = new Properties()',
    "def skFile = rootProject.file('../keystore.properties')",
    'if (skFile.exists()) { skFile.withInputStream { skProps.load(it) } }',
    'else { println "WARNING: keystore.properties not found - release will be signed with the DEBUG key (not accepted by Google Play)" }',
    '',
    '',
  ].join('\n');
  return out.replace(an, (m) => header + m);
}

module.exports = { patchGradle, MARK };

if (require.main === module) {
  const file = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
  if (!fs.existsSync(file)) {
    console.error('android/app/build.gradle not found. Run: npx expo prebuild --platform android');
    process.exit(1);
  }
  try {
    const src = fs.readFileSync(file, 'utf8');
    const out = patchGradle(src);
    if (out === src) console.log('Already patched.');
    else { fs.writeFileSync(file, out); console.log('Release signing configured.'); }
  } catch (e) {
    console.error(`Could not patch: ${e.message}\nOpen android/app/build.gradle and send me the signingConfigs and buildTypes blocks.`);
    process.exit(1);
  }
}