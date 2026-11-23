// Run only on a trusted local machine, never inside a Vercel Function.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const file = process.argv[2];
if (!file) throw new Error('Informe o caminho do PDF original como argumento.');
const info = await stat(file);
const hash = createHash('sha256');
for await (const chunk of createReadStream(file)) hash.update(chunk);
if (hash.digest('hex') !== '4b8c40fcd37b6704b9cc66e9d48709ea833c52d10908ea75ff20a22c6096e631') throw new Error('O arquivo não corresponde ao brandbook aprovado.');
const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: key, BRANDBOOK_OBJECT_PATH: path } = process.env;
if (!url || !key || !path) throw new Error('Configure as variáveis do servidor antes do upload.');
const base = new URL(url); if (base.protocol !== 'https:') throw new Error('Use HTTPS.');
const object = [process.env.MATERIALS_BUCKET || 'vivencia-materials', ...path.split('/')].map(encodeURIComponent).join('/');
const headers = { apikey: key, 'Content-Type': 'application/pdf', 'Content-Length': String(info.size), 'x-upsert': 'false' };
if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
const response = await fetch(new URL(`/storage/v1/object/${object}`, base), {
  method: 'POST', headers, body: createReadStream(file), duplex: 'half', signal: AbortSignal.timeout(600000),
});
if (!response.ok) throw new Error(`Upload não concluído (HTTP ${response.status}). Confira bucket, limite e se o objeto já existe.`);
console.log('Brandbook original enviado ao armazenamento privado.');
