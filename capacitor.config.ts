import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lucas.unitracker',
  appName: 'uni-tracker',
  webDir: 'out',
  server: {
    // Replace with your actual production Vercel URL
    url: 'https://uni-work-tracker.vercel.app', 
    cleartext: true
  }
};

export default config;
