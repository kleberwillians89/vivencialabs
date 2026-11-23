import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const code = await readFile(new URL('../apps-script/Code.gs',import.meta.url),'utf8');
const input = { name:'=Nome Literal',email:'PESSOA@example.com',company:'+Empresa',role:'@Cargo',support:"'=1+1",material:'brandbook',consent:true,newsletter:false,requestId:'bb446b93-bb21-4173-b3a6-f31aa6413153',secret:'test-secret' };
function fixture({wrongHeaders=false,lockAvailable=true,readCorruption=false}={}){
 let rows=[],notes=[],formulas=[],locked=false;
 const range=(r,c,n=1,m=1)=>({
  getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=> readCorruption && r>1&&c+j===3?'corrupted':rows[r+i-1]?.[c+j-1]??'')),
  setValues(values){values.forEach((row,i)=>row.forEach((v,j)=>{(rows[r+i-1]??=[])[c+j-1]=v}));return this},
  setNumberFormat(){return this},
  setRichTextValues(values){values.forEach((row,i)=>row.forEach((v,j)=>{(rows[r+i-1]??=[])[c+j-1]=v.text}));return this},
  setNote(value){(notes[r-1]??=[])[c-1]=value;return this},
  getNotes:()=>Array.from({length:n},(_,i)=>[notes[r+i-1]?.[c-1]??'']),
  getFormulas:()=>[Array(m).fill('')],
 });
 const sheet={getLastRow:()=>rows.length,getRange:range,getMaxRows:()=>100,insertRowsAfter(){},setFrozenRows(){}};
 const context=vm.createContext({
  ContentService:{MimeType:{JSON:'json'},createTextOutput(text){return{setMimeType(){return JSON.parse(text)}}}},
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>({SPREADSHEET_ID:'fake-sheet',LEADS_SECRET:'test-secret'})[key]})},
  SpreadsheetApp:{openById:()=>({getSheetByName:name=>name==='Leads'?sheet:null}),newRichTextValue:()=>({setText(text){this.text=text;return this},build(){return{text:this.text}}}),flush(){}},
  LockService:{getScriptLock:()=>({tryLock(){locked=lockAvailable;return locked},releaseLock(){locked=false}})},
  Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,v)=>createHash('sha256').update(v).digest(),base64EncodeWebSafe:b=>b.toString('base64url'),formatDate(date,zone,format){assert.equal(zone,'America/Sao_Paulo');assert.equal(format,'yyyy-MM-dd HH:mm:ss');return '2026-11-23 13:24:20'}},
 });
 vm.runInContext(code,context);rows.push(wrongHeaders?['wrong']:JSON.parse(JSON.stringify(context.LEAD_HEADERS)));
 return{context,rows,get locked(){return locked},post:(value=input)=>context.doPost({postData:{contents:JSON.stringify(value)}})};
}
test('Apps Script writes exactly A:I, literal strings, São Paulo time and separate boolean consents',()=>{
 const f=fixture(),r=f.post();assert.equal(r.ok,true);assert.equal(r.sheet,'Leads');assert.equal(r.columns,9);assert.equal(r.row,2);assert.deepEqual(f.rows[1],['2026-11-23 13:24:20',input.name,'pessoa@example.com',input.company,input.role,input.support,'brandbook',true,false]);assert.equal(f.locked,false);
});
test('Apps Script retry confirms the same completed row without duplicating it',()=>{const f=fixture();assert.equal(f.post().ok,true);assert.equal(f.post().duplicate,true);assert.equal(f.rows.length,2);assert.equal(f.post({...input,support:'changed'}).ok,false);assert.equal(f.rows.length,2)});
test('Apps Script rejects wrong secret, invalid fields, study, wrong headers, lock contention and corrupt readback',()=>{
 for(const value of [{...input,secret:'wrong'},{...input,consent:false},{...input,newsletter:'false'},{...input,email:'bad'},{...input,material:'study'}]){const f=fixture();assert.equal(f.post(value).ok,false);assert.equal(f.rows.length,1)}
 for(const options of [{wrongHeaders:true},{lockAvailable:false},{readCorruption:true}])assert.equal(fixture(options).post().ok,false);
});
test('Apps Script doGet is read-only and setup refuses to overwrite existing rows',()=>{const f=fixture();assert.equal(f.context.doGet().acceptsPost,true);assert.equal(f.rows.length,1);assert.throws(()=>f.context.setupLeads());assert.equal(f.rows.length,1)});
