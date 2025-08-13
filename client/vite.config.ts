import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@theme': path.resolve(__dirname, './src/theme'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 5173, // Updated to match our documentation
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // Updated to new backend port
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:8000', // Updated to new backend port
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: '../dist/client',
  },
});
