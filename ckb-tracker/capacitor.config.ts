import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://ckb-tracker.vercel.app';

const config: CapacitorConfig = {
  appId: 'com.ckbtracker.app',
  appName: 'CKB Tracker',
  webDir: 'public',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
  },
};

export default config;
