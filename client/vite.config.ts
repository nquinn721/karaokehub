import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: '.', // Set root to current directory
  publicDir: 'public', // Use the public directory for static assets
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
        target: 'http://localhost:8000', // Backend is running on port 8000
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:8000', // Backend is running on port 8000
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: process.env.DOCKER_BUILD ? './dist' : '../dist/client',
  },
});
