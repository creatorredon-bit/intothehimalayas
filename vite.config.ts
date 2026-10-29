import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 3000,
    host: true,
    // The preview proxy forwards the public preview hostname; allow it explicitly.
    allowedHosts: ['pv-81affeb7cac2-946cd273-af40-4765-8b73-6066aa8d0b01.style.dev'],
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          map: ['leaflet', 'react-leaflet'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
