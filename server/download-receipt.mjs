import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
function digest(lead) { return createHash('sha256').update(JSON.stringify(lead)).digest('hex'); }
function key(env) { return env.LEAD_RECEIPT_SECRET || env.LEADS_SECRET || env.SUPABASE_SECRET_KEY; }
export function issueReceipt(lead, env, now = Date.now()) {
  if (!key(env)) throw new Error('Receipt secret missing');
  const body = Buffer.from(JSON.stringify({ scope: 'brandbook-lead-v1', id: lead.request_id, hash: digest(lead), exp: now + 3600000 })).toString('base64url');
  return `${body}.${createHmac('sha256', key(env)).update(`receipt.v1.${body}`).digest('base64url')}`;
}
export function verifyReceipt(token, lead, env, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 2048 || !key(env)) return false;
  try {
    const [body, signature, extra] = token.split('.');
    if (extra || !body || !signature) return false;
    const expected = createHmac('sha256', key(env)).update(`receipt.v1.${body}`).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const value = JSON.parse(Buffer.from(body, 'base64url'));
    return value.scope === 'brandbook-lead-v1' && value.id === lead.request_id && value.hash === digest(lead) && value.exp > now && value.exp <= now + 3600000;
  } catch { return false; }
}
