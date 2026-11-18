import { request as proxyRequest } from 'node:http';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

function adminDevProxy() {
  return {
    name: 'northgo-admin-dev-proxy',
    enforce: 'post',
    configureServer(server) {
      return () => {
      server.middlewares.stack.unshift({
        route: '',
        handle: (req, res, next) => {
        const raw = req.url || '/';
        const path = raw.split('?')[0];
        const search = raw.includes('?') ? raw.slice(raw.indexOf('?')) : '';
        const localized = path.match(/^\/(?:en|zh-tw|ja|vi)(\/(?:admin|api)(?:\/.*)?)$/);
        if (localized) {
          res.statusCode = 302;
          res.setHeader('Location', `${localized[1]}${search}`);
          res.end();
          return;
        }
        if (!(path === '/admin' || path.startsWith('/admin/') || path === '/api' || path.startsWith('/api/'))) {
          next();
          return;
        }
        const upstream = proxyRequest(
          {
            hostname: '127.0.0.1',
            port: Number(process.env.ADMIN_PORT || 8787),
            path: raw,
            method: req.method,
            headers: { ...req.headers, host: '127.0.0.1:8787' },
          },
          (upstreamRes) => {
            res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
            upstreamRes.pipe(res);
          },
        );
        upstream.on('error', () => {
          if (!res.headersSent) {
            res.statusCode = 502;
            res.end('後台尚未啟動。');
          }
        });
        req.pipe(upstream);
      },
      });
      };
    },
  };
}

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://www.northgo.com',
  base: process.env.BASE_PATH ?? '/',
  trailingSlash: 'always',
  build: { format: 'directory' },
  vite: { plugins: [adminDevProxy()] },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', 'zh-tw': 'zh-Hant-TW', ja: 'ja', vi: 'vi' },
      },
    }),
  ],
});
