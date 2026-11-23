import { createAppsScriptWriter, appsScriptConfigured } from './apps-script.mjs';
import { issueReceipt, verifyReceipt } from './download-receipt.mjs';
const json = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const failure = 'Não foi possível concluir a solicitação. Seus campos foram mantidos. Tente novamente.';

export function validateLead(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const limits = { name: 160, email: 254, company: 200, role: 160, support: 3000 };
  const lead = {};
  for (const [key, max] of Object.entries(limits)) {
    const value = key === 'support' && input[key] === undefined ? '' : input[key];
    if (typeof value !== 'string') return null;
    lead[key] = value.trim();
    if (lead[key].length > max || (key !== 'support' && !lead[key]) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(lead[key])) return null;
  }
  if (lead.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return null;
  if (!['brandbook', 'study'].includes(input.material) || input.consent !== true || typeof input.newsletter !== 'boolean') return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) return null;
  return { ...lead, email: lead.email.toLowerCase(), material: input.material,
    contact_consent: true, newsletter_consent: input.newsletter,
    consent_version: '2026-11-23', request_id: input.requestId };
}

export function createLeadHandler({ env = process.env, fetchImpl = fetch, logger = event => console.warn(JSON.stringify(event)) } = {}) {
  const saveLead = createAppsScriptWriter({ env, fetchImpl });
  return async function handle(request) {
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    const origin = request.headers.get('origin');
    const expectedOrigin = env.SITE_ORIGIN || new URL(request.url).origin;
    if (origin && origin !== expectedOrigin) return json(403, { message: 'Origem não permitida.' });
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json(415, { message: 'Envie dados em JSON.' });
    let input;
    try {
      // Read a bounded stream, including when Content-Length is absent or incorrect.
      const reader = request.body?.getReader(); let size = 0; const chunks = [];
      if (!reader) return json(400, { message: 'Dados inválidos.' });
      while (true) { const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength; if (size > 16384) { await reader.cancel(); return json(413, { message: 'Dados muito extensos.' }); } chunks.push(value); }
      input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { return json(400, { message: 'Dados inválidos.' }); }
    const lead = validateLead(input);
    if (!lead) return json(422, { message: 'Confira os campos obrigatórios, o e-mail e a autorização de contato.' });
    // The youth study must never resolve to the institutional brandbook.
    if (lead.material === 'study') return json(409, { message: 'O PDF oficial do estudo sobre juventude ainda não está disponível. Nenhum cadastro foi enviado.' });
    const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: key } = env;
    const bucket = 'vivencia-materials';
    const path = 'brandbook/BRANDBOOK_VIVENCIA LAB_VERSAO.pdf';
    const retry = input.downloadReceipt !== undefined;
    let downloadReceipt;
    let leadSaved = false;
    if (retry) {
      if (!verifyReceipt(input.downloadReceipt, lead, env)) return json(422, { ok: false, code: 'INVALID_RECEIPT', message: 'A confirmação expirou ou os dados foram alterados. Tente novamente para verificar seu cadastro.' });
      downloadReceipt = input.downloadReceipt;
      leadSaved = true;
    }
    const reject = (code, message) => {
      logger({ event: 'lead_request_failed', code, requestId: lead.request_id, leadSaved });
      return json(503, { ok: false, code, leadSaved, ...(downloadReceipt ? { downloadReceipt } : {}), message });
    };
    if (!leadSaved && !appsScriptConfigured(env)) return reject('APPS_SCRIPT_NOT_CONFIGURED', 'O cadastro aguarda a configuração do Apps Script. Seus campos foram mantidos.');
    if (!url || !key || !path || url.includes('YOUR_STORAGE_PROJECT')) return reject('STORAGE_NOT_CONFIGURED', leadSaved
      ? 'Seu cadastro já está confirmado. O armazenamento do PDF está pendente; tente baixar novamente mais tarde, sem reenviar o cadastro.'
      : 'O armazenamento privado do brandbook ainda não foi configurado. Nenhum cadastro foi enviado; seus campos foram mantidos.');
    try {
      const base = new URL(url); if (base.protocol !== 'https:') throw new Error('Invalid server configuration');
      if (!leadSaved) {
        await saveLead(lead);
        leadSaved = true;
        downloadReceipt = issueReceipt(lead, env);
        logger({ event: 'lead_confirmed', requestId: lead.request_id });
      }
      const headers = { apikey: key, 'Content-Type': 'application/json' };
      if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
      const object = [bucket, ...path.split('/')].map(encodeURIComponent).join('/');
      const signed = await fetchImpl(new URL(`/storage/v1/object/sign/${object}`, base), {
        method: 'POST', headers, body: JSON.stringify({ expiresIn: 300 }), signal: AbortSignal.timeout(10000),
      });
      if (!signed.ok) throw Object.assign(new Error('Signing failed'), { code: 'STORAGE_SIGN_FAILED', status: signed.status });
      const { signedURL } = await signed.json();
      if (typeof signedURL !== 'string') throw new Error('Missing signed URL');
      const signedPath = signedURL.startsWith('/object/sign/') ? `/storage/v1${signedURL}` : signedURL;
      const downloadUrl = new URL(signedPath, `${base.origin}/storage/v1/`);
      if (downloadUrl.origin !== base.origin || downloadUrl.pathname !== `/storage/v1/object/sign/${object}`) throw new Error('Invalid signed URL');
      downloadUrl.searchParams.set('download', 'BRANDBOOK_VIVENCIA LAB_VERSAO.pdf');
      logger({ event: 'brandbook_link_ready', requestId: lead.request_id, savedAgain: false });
      return json(200, { ok: true, leadSaved: true, requestId: lead.request_id, downloadReceipt, downloadUrl: downloadUrl.href, expiresIn: 300 });
    } catch (error) {
      logger({ event: 'lead_request_failed', requestId: lead.request_id, leadSaved, code: error.code || (leadSaved ? 'STORAGE_SIGN_FAILED' : 'LEAD_SAVE_FAILED'), upstreamStatus: error.status });
      return json(502, { ok: false, leadSaved, ...(downloadReceipt ? { downloadReceipt } : {}), code: error.code || (leadSaved ? 'STORAGE_SIGN_FAILED' : 'LEAD_SAVE_FAILED'), message: leadSaved
        ? 'Cadastro confirmado. Não foi possível gerar o link do PDF. Clique em Tentar baixar PDF: seu cadastro não será enviado outra vez.'
        : error.code ? error.message : failure });
    }
  };
}
