const { checkAppConfig, checkDevFlags, checkGitignore, checkSaveDefaults } = require('../check-release');

const goodApp = {
  expo: {
    version: '1.0.0', orientation: 'landscape', icon: './assets/icon.png',
    android: {
      package: 'com.shadowkiller.game', versionCode: 1,
      adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png' },
      blockedPermissions: ['android.permission.RECORD_AUDIO'],
    },
  },
};

describe('release checks', () => {
  it('flags debug switches that are left on', () => {
    expect(checkDevFlags('export const DEV_UNLOCK_ALL = false;\nexport const SHOW_PERF = false;')).toEqual([]);
    expect(checkDevFlags('export const DEV_UNLOCK_ALL = true;')).toHaveLength(1);
    expect(checkDevFlags('export const SHOW_PERF   =  true;')).toHaveLength(1);
  });
  it('flags a save that starts with test coins', () => {
    expect(checkSaveDefaults('return { version: 4, coins: 0, levels: {} }')).toEqual([]);
    expect(checkSaveDefaults('return { version: 4, coins: 5000, levels: {} }')).toHaveLength(1);
  });
  it('accepts a good app config and rejects broken ones', () => {
    expect(checkAppConfig(goodApp)).toEqual([]);
    const bad = JSON.parse(JSON.stringify(goodApp));
    bad.expo.android.package = 'Shadow Killer';
    bad.expo.android.versionCode = 0;
    bad.expo.version = '1';
    bad.expo.android.blockedPermissions = [];
    expect(checkAppConfig(bad).length).toBeGreaterThanOrEqual(4);
    expect(checkAppConfig({})).not.toEqual([]);
  });
  it('requires the signing files to be git-ignored', () => {
    expect(checkGitignore('*.jks\nkeystore.properties\n')).toEqual([]);
    expect(checkGitignore('node_modules/\n')).toHaveLength(2);
  });
});