import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true }); await mkdir('dist');
for (const name of ['index.html', 'styles.css', 'design.css', 'app.js', 'site-config.js', 'assets']) await cp(name, `dist/${name}`, { recursive: true });
