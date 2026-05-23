import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 47200,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:47201',
        changeOrigin: true,
      },
    },
  },
});
