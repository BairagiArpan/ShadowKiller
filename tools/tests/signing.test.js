const { MARK, patchGradle } = require('../apply-signing');

const SAMPLE = `apply plugin: "com.android.application"

android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution!
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}
`;

describe('patchGradle', () => {
  const out = patchGradle(SAMPLE);

  it('adds a release signing config that reads keystore.properties', () => {
    expect(out).toContain(MARK);
    expect(out).toContain("rootProject.file('../keystore.properties')");
    expect(out).toMatch(/signingConfigs\s*\{\s*release\s*\{/);
    expect(out).toContain("storePassword skProps['storePassword']");
  });
  it('points only the release build type at it and leaves debug alone', () => {
    expect(out).toContain("signingConfig skProps['storeFile'] ? signingConfigs.release : signingConfigs.debug");
    expect(out.split('signingConfig signingConfigs.debug').length - 1).toBe(1);
  });
  it('places the property loading before the android block', () => {
    expect(out.indexOf('def skProps')).toBeLessThan(out.search(/^android\s*\{/m));
  });
  it('is idempotent', () => {
    expect(patchGradle(out)).toBe(out);
  });
  it('refuses a file it does not understand instead of guessing', () => {
    expect(() => patchGradle('android { }')).toThrow(/signingConfigs/);
    expect(() => patchGradle('android { signingConfigs { debug {} } buildTypes { release {} } }')).toThrow(/release/);
  });
});