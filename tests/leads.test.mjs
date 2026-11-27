import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLeadHandler } from '../server/leads.mjs';
const data = { name: 'Pessoa TESTE', email: 'TESTE@example.com', company: 'Empresa TESTE', role: 'Pesquisa', support: '=1+1', material: 'estudo', consent: true, newsletter: false, requestId: 'bb446b93-bb21-4173-b3a6-f31aa6413153' };
const env = { GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test_deployment/exec', LEADS_SECRET: 'test-secret', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test' };
const request = (body = data, extra = {}) => new Request('https://site.example/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://site.example' }, body: JSON.stringify(body), ...extra });
function services({ acknowledgment = { ok: true, sheet: 'Leads', columns: 9, requestId: data.requestId, row: 2 }, scriptStatus = 200, scriptError, html = false } = {}) {
 const calls = []; let sent;
 return { calls, get sent(){return sent}, fetchImpl: async (url, options) => {
  calls.push(String(url)); assert.match(String(url), /^https:\/\/script.google.com\//, 'No storage, signing or other downstream service may be called');
  if(scriptError) throw scriptError;
  sent=JSON.parse(options.body); assert.equal(options.method,'POST'); assert.equal(options.redirect,'follow');
  return html ? new Response('<html>Login</html>') : Response.json(acknowledgment,{status:scriptStatus});
 }};
}
const handler=(s,config=env)=>createLeadHandler({env:config,fetchImpl:s.fetchImpl,logger:()=>{}});
function noDownload(result) { for(const key of ['downloadUrl','downloadReceipt','signedURL','expiresIn']) assert.equal(result[key],undefined); }
test('invalid fields, consent, newsletter, origin, method and bounded JSON never reach services',async()=>{
 const s=services(),handle=handler(s);
 for(const body of [{...data,email:'invalid'},{...data,consent:false},{...data,consent:'true'},{...data,newsletter:'false'},{...data,material:'other'},{...data,support:'x'.repeat(3001)},{...data,company:''},{...data,requestId:'bad'}]) assert.equal((await handle(request(body))).status,422);
 assert.equal((await handle(request(data,{method:'PUT'}))).status,405);
 assert.equal((await handle(request(data,{headers:{Origin:'https://evil.example','Content-Type':'application/json'}}))).status,403);
 assert.equal((await handle(request(data,{headers:{'Content-Type':'application/json-evil'}}))).status,415);
 assert.equal((await handle(request(data,{body:'x'.repeat(17000)}))).status,413);
 assert.equal((await handle(request(data,{body:'not json'}))).status,400);assert.equal(s.calls.length,0);
});
test('study interest is saved without storage configuration and without returning any download',async()=>{
 const s=services(),r=await handler(s,{GOOGLE_APPS_SCRIPT_URL:env.GOOGLE_APPS_SCRIPT_URL,LEADS_SECRET:env.LEADS_SECRET})(request());
 assert.equal(r.status,200);assert.equal(s.calls.length,1);assert.deepEqual(s.sent,{...data,email:'teste@example.com',secret:'test-secret'});
 const body=await r.json();assert.equal(body.ok,true);assert.equal(body.leadSaved,true);assert.equal(body.requestId,data.requestId);assert.equal(body.row,2);
 assert.equal(body.message,'Cadastro confirmado! Em breve, seu material será enviado por e-mail.');noDownload(body);assert.equal(r.headers.get('cache-control'),'no-store');
});
test('brandbook and legacy receipt calls cannot save or sign even with valid storage credentials',async()=>{
 for(const input of [{...data,material:'brandbook'},{...data,downloadReceipt:'old-receipt'}]){const s=services();const r=await handler(s)(request(input));assert.equal(r.status,409);noDownload(await r.json());assert.equal(s.calls.length,0);}
});
test('legacy study value normalizes to estudo',async()=>{const s=services();assert.equal((await handler(s)(request({...data,material:'study'}))).status,200);assert.equal(s.sent.material,'estudo');});
test('missing or unsafe Apps Script configuration never transmits a lead',async()=>{
 for(const config of [{...env,GOOGLE_APPS_SCRIPT_URL:''},{...env,GOOGLE_APPS_SCRIPT_URL:'https://evil.example/exec'},{...env,LEADS_SECRET:''}]){const s=services();const r=await handler(s,config)(request());assert([502,503].includes(r.status));assert.equal(s.calls.length,0);noDownload(await r.json());}
});
test('HTTP 200 alone, login HTML, wrong acknowledgments and upstream failures never confirm success',async()=>{
 for(const options of [{acknowledgment:{}},{acknowledgment:{ok:false}},{acknowledgment:{ok:'true'}},{acknowledgment:{ok:true,sheet:'Wrong'}},{acknowledgment:{ok:true,columns:11}},{acknowledgment:{ok:true,requestId:'wrong'}},{html:true},{scriptStatus:403},{scriptStatus:429},{scriptError:new Error('timeout')}]){
  const s=services(options),r=await handler(s)(request());assert.equal(r.status,502);assert.equal(s.calls.length,1);const body=await r.json();assert.equal(body.ok,false);assert.equal(body.leadSaved,false);noDownload(body);
 }
});
test('retry uses same request ID; optional newsletter false and omitted support are preserved',async()=>{
 const s=services();const {support,...input}=data;await handler(s)(request(input));await handler(s)(request(input));assert.equal(s.sent.requestId,data.requestId);assert.equal(s.sent.support,'');assert.equal(s.sent.newsletter,false);
});
test('both deployed client origin and Vercel origin work; cross-site impostors are rejected',async()=>{
 for(const origin of ['https://vivencialab.com.br','https://vivencialabs.vercel.app']){const s=services();assert.equal((await handler(s)(request(data,{headers:{Origin:origin,'Content-Type':'application/json'}}))).status,200);}
 const s=services();assert.equal((await handler(s)(request(data,{headers:{Origin:'https://vivencialab.com.br.evil.example','Content-Type':'application/json'}}))).status,403);assert.equal(s.calls.length,0);
});
test('Apps Script login and rejected secret are diagnosed without leaking credentials',async()=>{
 for(const [response,expected] of [[new Response('<html>Sign in Google accounts.google.com</html>',{status:401}),'APPS_SCRIPT_LOGIN'],[new Response('<html>Page not found</html>',{status:401}),'APPS_SCRIPT_ACCESS'],[Response.json({ok:false,code:'INVALID_SECRET'}),'APPS_SCRIPT_SECRET_REJECTED']]){
  const r=await createLeadHandler({env,fetchImpl:async()=>response,logger:()=>{}})(request());const result=await r.json();assert.equal(result.code,expected);assert(!JSON.stringify(result).includes(env.LEADS_SECRET));noDownload(result);
 }
});

test('API plus Code.gs: response lost after Sheets write retries into one complete row',async()=>{
 const {fixture}=await import('./helpers/apps-script-fixture.mjs');const f=fixture();let loseResponse=true;let calls=0;
 const handle=createLeadHandler({env:{GOOGLE_APPS_SCRIPT_URL:env.GOOGLE_APPS_SCRIPT_URL,LEADS_SECRET:env.LEADS_SECRET},logger:()=>{},fetchImpl:async(url,options)=>{calls++;assert.match(String(url),/^https:\/\/script.google.com\//);const result=f.post(JSON.parse(options.body));if(loseResponse){loseResponse=false;throw new Error('response lost');}return Response.json(result);}});
 const first=await handle(request());assert.equal(first.status,502);assert.equal(f.rows.length,2);noDownload(await first.json());
 const retry=await handle(request());assert.equal(retry.status,200);const body=await retry.json();assert.equal(body.duplicate,true);assert.equal(f.rows.length,2);assert.equal(f.rows[1][6],'estudo');assert.equal(f.rows[1][7],true);assert.equal(f.rows[1][8],false);assert.equal(calls,2);noDownload(body);
});
