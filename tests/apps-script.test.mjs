import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, input } from './helpers/apps-script-fixture.mjs';
test('Apps Script writes exactly A:I, literal strings, São Paulo time and separate boolean consents',()=>{
 const f=fixture(),r=f.post();assert.equal(r.ok,true);assert.equal(r.sheet,'Leads');assert.equal(r.columns,9);assert.equal(r.row,2);assert.deepEqual(f.rows[1],['2026-11-23 13:24:20',input.name,'pessoa@example.com',input.company,input.role,input.support,'estudo',true,false]);assert.equal(f.locked,false);
});
test('Apps Script retry confirms the same completed row without duplicating it',()=>{const f=fixture();assert.equal(f.post().ok,true);assert.equal(f.post().duplicate,true);assert.equal(f.rows.length,2);assert.equal(f.post({...input,support:'changed'}).ok,false);assert.equal(f.rows.length,2)});
test('Apps Script rejects wrong secret, invalid fields, brandbook, wrong headers, lock contention and corrupt readback',()=>{
 for(const value of [{...input,secret:'wrong'},{...input,consent:false},{...input,newsletter:'false'},{...input,email:'bad'},{...input,material:'brandbook'}]){const f=fixture();assert.equal(f.post(value).ok,false);assert.equal(f.rows.length,1)}
 for(const options of [{wrongHeaders:true},{lockAvailable:false},{readCorruption:true}])assert.equal(fixture(options).post().ok,false);
});
test('Apps Script doGet is read-only and setup refuses to overwrite existing rows',()=>{const f=fixture();assert.equal(f.context.doGet().acceptsPost,true);assert.equal(f.rows.length,1);assert.throws(()=>f.context.setupLeads());assert.equal(f.rows.length,1)});
