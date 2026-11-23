import { test } from 'node:test';
import assert from 'node:assert/strict';
import { issueReceipt, verifyReceipt } from '../server/download-receipt.mjs';
const env={LEADS_SECRET:'private-test-key'};
const lead={request_id:'test-request',material:'brandbook',name:'Teste',contact_consent:true};
test('receipt is bound to confirmed data, material, secret and one-hour expiration',()=>{
 const token=issueReceipt(lead,env,1000);
 assert.equal(verifyReceipt(token,lead,env,2000),true);
 assert.equal(verifyReceipt(token,lead,env,3601001),false);
 assert.equal(verifyReceipt(token,{...lead,material:'study'},env,2000),false);
 assert.equal(verifyReceipt(token,lead,{LEADS_SECRET:'wrong'},2000),false);
 assert.equal(verifyReceipt(token+'tampered',lead,env,2000),false);
});
