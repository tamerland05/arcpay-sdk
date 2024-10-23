import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'ArcPaySDK',
      fileName: (format) => `arcpay-sdk.${format}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@telegram-apps/sdk-react'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@telegram-apps/sdk-react': 'TelegramAppsSDKReact',
        },
      },
    },
  },
});
