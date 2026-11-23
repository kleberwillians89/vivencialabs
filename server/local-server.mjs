import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createLeadHandler } from './leads.mjs';
const types = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf' };
export function createLocalServer({ handle = createLeadHandler() } = {}) {
  return http.createServer(async (req, res) => {
    let api = false;
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      api = url.pathname === '/api/leads';
      if (api) {
        const request = new Request(url, { method: req.method, headers: req.headers, ...(req.method === 'GET' || req.method === 'HEAD' ? {} : { body: req, duplex: 'half' }) });
        const response = await handle(request);
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer())); return;
      }
      const file = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
      if (!['index.html', 'styles.css', 'design.css', 'app.js', 'site-config.js'].includes(file) && (!file.startsWith('assets/') || file.split('/').includes('..'))) { res.writeHead(404); res.end(); return; }
      const bytes = await readFile(new URL(`../${file}`, import.meta.url));
      res.writeHead(200, { 'Content-Type': types[file.split('.').pop()] || 'application/octet-stream' }); res.end(bytes);
    } catch {
      res.writeHead(api ? 500 : 404, api ? { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } : {});
      res.end(api ? JSON.stringify({ ok: false, message: 'O servidor não conseguiu concluir a solicitação. Seus dados foram mantidos.' }) : '');
    }
  });
}
