const fs = require('node:fs/promises');
const path = require('node:path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const BACKUP_RULES = '@xml/payslip_backup_rules';
const EXTRACTION_RULES = '@xml/payslip_data_extraction_rules';
const DOMAINS = [
  'root',
  'file',
  'database',
  'sharedpref',
  'external',
  'device_root',
  'device_file',
  'device_database',
  'device_sharedpref',
];

const exclusions = DOMAINS.map((domain) => `    <exclude domain="${domain}" path="." />`).join('\n');
const fullBackupContent = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
${exclusions}
</full-backup-content>
`;
const extractionRules = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
${exclusions}
  </cloud-backup>
  <device-transfer>
${exclusions}
  </device-transfer>
  <cross-platform-transfer platform="ios">
${exclusions}
    <platform-specific-params bundleId="dev.sakuma.payslipnavi" teamId="0000000000" contentVersion="1" />
  </cross-platform-transfer>
</data-extraction-rules>
`;

function withBackupExclusion(config) {
  config = withAndroidManifest(config, (manifestConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifestConfig.modResults);
    application.$['android:allowBackup'] = 'false';
    application.$['android:fullBackupContent'] = BACKUP_RULES;
    application.$['android:dataExtractionRules'] = EXTRACTION_RULES;
    return manifestConfig;
  });

  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const xmlDirectory = path.join(modConfig.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      await fs.mkdir(xmlDirectory, { recursive: true });
      await Promise.all([
        fs.writeFile(path.join(xmlDirectory, 'payslip_backup_rules.xml'), fullBackupContent),
        fs.writeFile(path.join(xmlDirectory, 'payslip_data_extraction_rules.xml'), extractionRules),
      ]);
      return modConfig;
    },
  ]);
}

module.exports = withBackupExclusion;
