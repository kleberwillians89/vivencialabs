export class LeadServiceError extends Error {
  constructor(code, message, status) { super(message); this.code = code; this.status = status; }
}
export function appsScriptConfigured(env) {
  try {
    const url = new URL(env.GOOGLE_APPS_SCRIPT_URL);
    return url.protocol === 'https:' && url.hostname === 'script.google.com' &&
      /^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname) && !url.search && !url.username && !url.password;
  } catch { return false; }
}

export function createAppsScriptWriter({ env = process.env, fetchImpl = fetch } = {}) {
  return async function saveLead(lead) {
    if (!appsScriptConfigured(env)) throw new Error('Apps Script configuration missing');
    if (!env.LEADS_SECRET) throw new LeadServiceError('LEADS_SECRET_NOT_CONFIGURED', 'Configure LEADS_SECRET no servidor local com o mesmo valor das propriedades do Apps Script. Seus campos foram mantidos.');
    const response = await fetchImpl(env.GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: lead.request_id, name: lead.name, email: lead.email,
        company: lead.company, role: lead.role, support: lead.support,
        material: lead.material, consent: lead.contact_consent,
        newsletter: lead.newsletter_consent,
        ...(env.LEADS_SECRET ? { secret: env.LEADS_SECRET } : {}),
      }),
      // ContentService redirects the response to script.googleusercontent.com.
      redirect: 'follow', signal: AbortSignal.timeout(18000),
    });
    if (response.url && new URL(response.url).hostname === 'accounts.google.com') throw new LeadServiceError('APPS_SCRIPT_LOGIN', 'O Apps Script está exigindo login do Google. A implantação precisa permitir as chamadas do servidor.', response.status);
    const responseText = await response.text();
    if (/accounts\.google\.com|ServiceLogin|Sign in.*Google/i.test(responseText) && !response.headers.get('content-type')?.includes('application/json')) throw new LeadServiceError('APPS_SCRIPT_LOGIN', 'A implantação do Apps Script exige login do Google. Libere acesso para chamadas do servidor.', response.status);
    if (response.status === 401 && !response.headers.get('content-type')?.includes('application/json')) throw new LeadServiceError('APPS_SCRIPT_ACCESS', 'O Google bloqueou o acesso à implantação do Apps Script (HTTP 401, sem JSON). Confira a implantação ativa e permita chamadas sem login.', response.status);
    if (!response.ok) throw new LeadServiceError('APPS_SCRIPT_HTTP', `O Apps Script recusou o cadastro (HTTP ${response.status}). Seus dados foram mantidos.`, response.status);
    let result;
    try { result = JSON.parse(responseText); }
    catch { throw new LeadServiceError('APPS_SCRIPT_INVALID_RESPONSE', 'O Apps Script não retornou uma confirmação JSON. Confira o acesso e a versão publicada.', response.status); }
    if (result?.ok !== true && (result?.code === 'INVALID_SECRET' || result?.code === 'UNAUTHORIZED')) throw new LeadServiceError('APPS_SCRIPT_SECRET_REJECTED', 'O Apps Script recusou a validação do campo secret. Confira LEADS_SECRET no servidor e nas propriedades do script.', response.status);
    // Never infer persistence from HTTP 200, an HTML login page, or a truthy string.
    if (result?.ok !== true || result.requestId !== lead.request_id ||
        result.sheet !== 'Leads' ||
        result.columns !== 9 || !Number.isInteger(result.row) || result.row < 2) {
      throw new LeadServiceError('APPS_SCRIPT_NOT_CONFIRMED', 'O Apps Script não confirmou a gravação na aba Leads. Seus dados foram mantidos.', response.status);
    }
    return result;
  };
}
