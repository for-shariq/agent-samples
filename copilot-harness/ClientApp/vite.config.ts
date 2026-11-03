import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development Vite serves the UI and proxies /api to the .NET backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5000' },
  },
});
