// Firebase Analytics on iPhone WITHOUT the advertising ID (IDFA).
// With this switch the app does not ask the "Allow tracking" question and does not use the advertising ID.
// Google Ads still counts iPhone installs through Apple's own SKAdNetwork.
// It runs while EAS builds the iPhone app and adds one line at the top of ios/Podfile.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const LINE = '$RNFirebaseAnalyticsWithoutAdIdSupport = true';

module.exports = function withFirebaseNoAdId(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      const text = fs.readFileSync(podfile, 'utf8');
      if (!text.includes(LINE)) {
        fs.writeFileSync(podfile, LINE + '\n' + text);
      }
      return cfg;
    },
  ]);
};
