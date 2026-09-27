import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = 'android/app/src/main';
const manifest = readFileSync(`${base}/AndroidManifest.xml`, 'utf8');
const legacyRules = readFileSync(`${base}/res/xml/payslip_backup_rules.xml`, 'utf8');
const extractionRules = readFileSync(`${base}/res/xml/payslip_data_extraction_rules.xml`, 'utf8');

for (const attribute of [
  'android:allowBackup="false"',
  'android:fullBackupContent="@xml/payslip_backup_rules"',
  'android:dataExtractionRules="@xml/payslip_data_extraction_rules"',
]) {
  assert.ok(manifest.includes(attribute), `Missing Android backup attribute: ${attribute}`);
}

for (const domain of [
  'root', 'file', 'database', 'sharedpref', 'external',
  'device_root', 'device_file', 'device_database', 'device_sharedpref',
]) {
  const rule = `<exclude domain="${domain}" path="." />`;
  assert.ok(legacyRules.includes(rule), `Missing legacy backup exclusion: ${domain}`);
  assert.equal(extractionRules.split(rule).length - 1, 3, `Missing extraction exclusion: ${domain}`);
}

for (const section of ['cloud-backup', 'device-transfer', 'cross-platform-transfer']) {
  assert.ok(extractionRules.includes(`<${section}`), `Missing extraction mode: ${section}`);
}
