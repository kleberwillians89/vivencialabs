import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLeadHandler } from '../server/leads.mjs';
const data = { name: 'Pessoa Teste', email: 'TESTE@example.com', company: 'Empresa', role: 'Pesquisa', support: '=1+1', material: 'brandbook', consent: true, newsletter: false, requestId: 'bb446b93-bb21-4173-b3a6-f31aa6413153' };
const env = { GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test_deployment/exec', LEADS_SECRET: 'test-secret', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test', BRANDBOOK_OBJECT_PATH: 'brandbook/BRANDBOOK_VIVENCIA LAB_VERSAO.pdf' };
const request = (body = data, extra = {}) => new Request('https://site.example/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://site.example' }, body: JSON.stringify(body), ...extra });
function services({ acknowledgment = { ok: true, sheet: 'Leads', columns: 9, requestId: data.requestId }, scriptStatus = 200, storageStatus = 200, signedURL = '/object/sign/vivencia-materials/brandbook/BRANDBOOK_VIVENCIA LAB_VERSAO.pdf?token=demo', scriptError, html = false } = {}) {
 const calls = []; let sent;
 return { calls, get sent(){return sent}, fetchImpl: async (url, options) => {
  url=String(url);calls.push(url);
  if (url.startsWith('https://script.google.com/')) {
   if(scriptError)throw scriptError;
   sent=JSON.parse(options.body); assert.equal(options.method,'POST');assert.equal(options.redirect,'follow');
   return html ? new Response('<html>Login</html>') : Response.json(acknowledgment,{status:scriptStatus});
  }
  assert.match(url,/storage\/v1\/object\/sign/);assert.equal(JSON.parse(options.body).expiresIn,300);
  assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY);
  return Response.json({signedURL},{status:storageStatus});
 }};
}
const handler=(s,config=env)=>createLeadHandler({env:config,fetchImpl:s.fetchImpl,logger:()=>{}});
test('invalid inputs, content type, origin, method and oversized bodies never reach services',async()=>{
 const s=services(),handle=handler(s);
 for(const body of [{...data,email:'invalid'},{...data,consent:false},{...data,newsletter:'false'},{...data,material:'other'},{...data,support:'x'.repeat(3001)},{...data,company:''},{...data,requestId:'bad'}])assert.equal((await handle(request(body))).status,422);
 assert.equal((await handle(request(data,{method:'PUT'}))).status,405);
 assert.equal((await handle(request(data,{headers:{Origin:'https://evil.example','Content-Type':'application/json'}}))).status,403);
 assert.equal((await handle(request(data,{headers:{'Content-Type':'text/plain'}}))).status,415);
 assert.equal((await handle(request(data,{body:'x'.repeat(17000)}))).status,413);
 assert.equal((await handle(request(data,{body:'not json'}))).status,400);assert.equal(s.calls.length,0);
});
test('study is separate and cannot return the institutional PDF',async()=>{const s=services();assert.equal((await handler(s)(request({...data,material:'study'}))).status,409);assert.equal(s.calls.length,0)});
test('missing or unsafe Apps Script config and missing storage do not save a lead',async()=>{
 for(const config of [{...env,GOOGLE_APPS_SCRIPT_URL:''},{...env,GOOGLE_APPS_SCRIPT_URL:'https://evil.example/exec'},{...env,SUPABASE_SECRET_KEY:''}]){let s=services();assert.equal((await handler(s,config)(request())).status,503);assert.equal(s.calls.length,0)}
});
test('HTTP 200 without explicit ok true, HTML and wrong receipts never sign a download',async()=>{
 for(const options of [{acknowledgment:{}},{acknowledgment:{ok:false}},{acknowledgment:{ok:'true'}},{acknowledgment:{ok:true,sheet:'Wrong'}},{acknowledgment:{ok:true,columns:11}},{acknowledgment:{ok:true,requestId:'wrong'}},{html:true},{scriptStatus:403},{scriptStatus:429},{scriptError:new Error('timeout')}]){
  const s=services(options),r=await handler(s)(request());assert.equal(r.status,502);assert.equal(s.calls.length,1);assert.equal((await r.json()).downloadUrl,undefined);
 }
});
test('acknowledged Apps Script POST precedes signing; all fields and literal text are preserved',async()=>{
 const s=services(),r=await handler(s)(request());assert.equal(r.status,200);assert.equal(s.calls.length,2);assert.match(s.calls[0],/script.google.com/);assert.match(s.calls[1],/storage/);
 assert.deepEqual(s.sent,{...data,email:'teste@example.com',secret:'test-secret'});
 const body=await r.json();assert.equal(body.ok,true);assert.equal(body.leadSaved,true);assert.equal(body.requestId,data.requestId);assert.equal(body.expiresIn,300);assert.equal(new URL(body.downloadUrl).searchParams.get('download'),'BRANDBOOK_VIVENCIA LAB_VERSAO.pdf');assert.equal(r.headers.get('cache-control'),'no-store');
});
test('minimal explicit ok true confirmation is supported',async()=>{const s=services({acknowledgment:{ok:true}});assert.equal((await handler(s)(request())).status,200)});
test('storage errors, wrong PDF paths or hosts block download even after saving',async()=>{
 for(const options of [{storageStatus:500},{signedURL:'https://evil.example/file'},{signedURL:'/object/sign/vivencia-materials/other.pdf?token=demo'}]){const s=services(options),r=await handler(s)(request());assert.equal(r.status,502);const result=await r.json();assert.equal(result.leadSaved,true);assert.equal(result.downloadUrl,undefined);assert.equal(s.calls.length,2)}
});
test('a retry sends the same request ID for Apps Script deduplication',async()=>{const s=services();await handler(s)(request());await handler(s)(request());assert.equal(s.sent.requestId,data.requestId)});

test('after a saved lead and failed PDF, receipt retries only storage across fresh handlers',async()=>{
 const failed=services({storageStatus:500});
 const first=await handler(failed)(request());const confirmation=await first.json();
 assert.equal(confirmation.leadSaved,true);assert.equal(typeof confirmation.downloadReceipt,'string');
 const retry=services();const response=await handler(retry)(request({...data,downloadReceipt:confirmation.downloadReceipt}));
 assert.equal(response.status,200);assert.equal(retry.calls.length,1);assert.match(retry.calls[0],/storage/);
 assert.equal((await response.json()).leadSaved,true);
});
test('a forged receipt or changed data never bypasses saving or accesses storage',async()=>{
 const first=services();const saved=await (await handler(first)(request())).json();
 for(const body of [{...data,downloadReceipt:'forged'},{...data,company:'Altered',downloadReceipt:saved.downloadReceipt}]){
  const s=services();assert.equal((await handler(s)(request(body))).status,422);assert.equal(s.calls.length,0);
 }
});

test('Apps Script login redirect is diagnosed explicitly and never signs a PDF',async()=>{
 const calls=[];const handle=createLeadHandler({env,logger:()=>{},fetchImpl:async(url)=>{calls.push(String(url));const r=new Response('<html>Login</html>',{status:200});Object.defineProperty(r,'url',{value:'https://accounts.google.com/ServiceLogin'});return r;}});
 const r=await handle(request());assert.equal(r.status,502);assert.equal((await r.json()).code,'APPS_SCRIPT_LOGIN');assert.equal(calls.length,1);
});

test('missing local secret never transmits a lead',async()=>{
 const s=services(); const r=await handler(s,{...env,LEADS_SECRET:''})(request());
 assert.equal((await r.json()).code,'LEADS_SECRET_NOT_CONFIGURED');assert.equal(s.calls.length,0);
});
test('Google login HTML with HTTP 401 is distinguished from secret rejection',async()=>{
 for(const [response,expected] of [
  [new Response('<html>Sign in Google accounts.google.com</html>',{status:401}),'APPS_SCRIPT_LOGIN'],
  [new Response('<html>Page not found</html>',{status:401,headers:{'Content-Type':'text/html'}}),'APPS_SCRIPT_ACCESS'],
  [Response.json({ok:false,code:'INVALID_SECRET'}),'APPS_SCRIPT_SECRET_REJECTED']
 ]) {
  const r=await createLeadHandler({env,fetchImpl:async()=>response,logger:()=>{}})(request());
  assert.equal((await r.json()).code,expected);
 }
});

test('omitted support is sent as an empty string',async()=>{
 const s=services(); const {support,...input}=data;
 const r=await handler(s)(request(input));
 assert.equal(r.status,200);assert.equal(s.sent.support,'');
});
