import { parseArgs } from 'node:util';
import { createLocalServer } from '../server/local-server.mjs';
import { createLeadHandler } from '../server/leads.mjs';
const { values } = parseArgs({ options: { host: { type: 'string' }, port: { type: 'string' } }, strict: true });
const host = values.host || process.env.HOST || '127.0.0.1';
const port = Number(values.port || process.env.PORT || 8081);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta inválida. Use um número de 1 a 65535.');
// Local preview can use localhost or the Mac's LAN address. Keep same-origin
// validation against the actual request host instead of the deployment origin.
const handle = createLeadHandler({ env: { ...process.env, SITE_ORIGIN: '' } });
const server = createLocalServer({ handle });
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `A porta ${port} já está em uso. Encerre o servidor anterior ou use --port.` : `Não foi possível iniciar o servidor (${error.code || 'erro'}).`);
  process.exitCode = 1;
});
server.listen(port, host, () => console.log(`Vivência Lab + POST /api/leads: http://${host}:${port}`));
