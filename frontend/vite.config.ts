import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

declare const process: { env: Record<string, string | undefined> };

const webPort = Number(process.env.RENJANA_FRONTEND_PORT || 5173);
const apiPort = Number(process.env.RENJANA_API_PORT || 8787);

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    strictPort: Boolean(process.env.RENJANA_FRONTEND_PORT),
    host: '0.0.0.0',
    allowedHosts: ['lankiness-chewy-backboard.ngrok-free.dev', ...(process.env.CEMILIN_ALLOWED_HOSTS || '').split(',').map(host => host.trim()).filter(Boolean)],
    proxy: { '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: true } },
  },
});
