/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'in.svit.erp',
  appName: 'SVIT ERP',
  webDir: 'out',
  server: {
    url: 'https://svit-erp.vercel.app',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
  android: {
    backgroundColor: '#0a0a0a',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

module.exports = config;
