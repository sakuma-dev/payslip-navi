import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: '給与明細ナビ',
  slug: 'payslip-navi',
  scheme: 'payslipnavi',
  version: '0.1.0',
  orientation: 'portrait',
  ios: {
    bundleIdentifier: 'dev.sakuma.payslipnavi',
    deploymentTarget: '16.4',
    supportsTablet: true,
  },
  android: {
    package: 'dev.sakuma.payslipnavi',
    allowBackup: false,
    permissions: ['android.permission.CAMERA'],
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.ACCESS_MEDIA_LOCATION',
    ],
  },
  web: {
    bundler: 'metro',
  },
  plugins: [
    'expo-sqlite',
    [
      'expo-image-picker',
      {
        cameraPermission: '給与明細の文字を端末内で読み取るためにカメラを使用します。',
        photosPermission: '選択した給与明細の画像を端末内で読み取ります。',
        microphonePermission: false,
      },
    ],
    'expo-sharing',
    './plugins/withBackupExclusion',
  ],
};

export default config;
