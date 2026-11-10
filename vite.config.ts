import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

// During `npm run dev`, serves /api/<name> from api/<name>.ts exactly as Vercel does
// (a GET/POST export receiving a Web Request), with server variables from .env.local.
function devApi(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const name = (req.url || '').split('?')[0].replace(/^\/+|\/+$/g, '');
        if (!/^[a-z0-9-]+$/.test(name) || !fs.existsSync(path.resolve(__dirname, 'api', `${name}.ts`))) {
          res.statusCode = 404; res.end(); return;
        }
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          const handler = mod[req.method || 'GET'];
          if (typeof handler !== 'function') { res.statusCode = 405; res.end(); return; }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const body = chunks.length ? Buffer.concat(chunks) : undefined;
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
          const request = new Request(`http://localhost${req.originalUrl || req.url}`, { method: req.method, headers, body });
          const response: Response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Server error' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode, command }) => {
  if (command === 'serve') {
    // Server-only variables for the dev API (never exposed to the browser bundle,
    // which only sees VITE_-prefixed values).
    const env = loadEnv(mode, process.cwd(), ['METALS_API_', 'SUPABASE_']);
    for (const [k, v] of Object.entries(env)) process.env[k] ??= v;
  }
  return {
    plugins: [react(), devApi()],
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
