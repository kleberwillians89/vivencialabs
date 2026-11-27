import { createAppsScriptWriter, appsScriptConfigured } from './apps-script.mjs';
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
  if (!['brandbook', 'study', 'estudo'].includes(input.material) || input.consent !== true || typeof input.newsletter !== 'boolean') return null;
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
    const allowedOrigins = new Set([new URL(request.url).origin, env.SITE_ORIGIN,
      'https://vivencialabs.vercel.app', 'https://vivencialab.com.br']);
    if (origin && !allowedOrigins.has(origin)) return json(403, { ok: false, message: 'Origem não permitida.' });
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) return json(415, { ok: false, message: 'Envie dados em JSON.' });
    let input;
    try {
      const reader = request.body?.getReader(); let size = 0; const chunks = [];
      if (!reader) return json(400, { ok: false, message: 'Dados inválidos.' });
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 16384) { await reader.cancel(); return json(413, { ok: false, message: 'Dados muito extensos.' }); }
        chunks.push(value);
      }
      input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { return json(400, { ok: false, message: 'Dados inválidos.' }); }
    const lead = validateLead(input);
    if (!lead) return json(422, { ok: false, message: 'Confira os campos obrigatórios, o e-mail e a autorização de contato.' });
    // All file delivery is disabled, including direct legacy brandbook requests.
    if (lead.material === 'brandbook' || input.downloadReceipt !== undefined) return json(409, { ok: false, code: 'DOWNLOAD_DISABLED', message: 'Downloads desativados. Cadastre seu interesse no estudo.' });
    lead.material = 'estudo';
    if (!appsScriptConfigured(env)) return json(503, { ok: false, code: 'APPS_SCRIPT_NOT_CONFIGURED', message: failure });
    try {
      const confirmation = await saveLead(lead);
      logger({ event: 'study_interest_confirmed', requestId: lead.request_id });
      return json(200, { ok: true, leadSaved: true, requestId: lead.request_id,
        ...(Number.isInteger(confirmation.row) ? { row: confirmation.row } : {}),
        duplicate: confirmation.duplicate === true,
        message: 'Cadastro confirmado! Em breve, seu material será enviado por e-mail.' });
    } catch (error) {
      logger({ event: 'lead_request_failed', requestId: lead.request_id, code: error.code || 'LEAD_SAVE_FAILED', upstreamStatus: error.status });
      return json(502, { ok: false, leadSaved: false, code: error.code || 'LEAD_SAVE_FAILED', message: failure });
    }
  };
}
