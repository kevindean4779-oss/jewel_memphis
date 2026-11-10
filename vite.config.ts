import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

// Serves /api/rates during `npm run dev`, using the same code as the Vercel function
// and the METALS_API_* values from .env.local.
function devRatesApi(env: Record<string, string>): Plugin {
  return {
    name: 'dev-rates-api',
    configureServer(server) {
      server.middlewares.use('/api/rates', async (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        try {
          const mod = await server.ssrLoadModule('/api/rates.ts');
          res.end(JSON.stringify(await mod.fetchSpot(env)));
        } catch (e) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Rates unavailable' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'METALS_API_');
  return {
    plugins: [react(), devRatesApi(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
