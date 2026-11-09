import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Dev: forward /api to the NestJS server
    proxy: { '/api': 'http://localhost:3000', '/files': 'http://localhost:3000' },
  },
});
