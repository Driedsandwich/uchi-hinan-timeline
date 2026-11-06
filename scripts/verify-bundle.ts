import {createServer} from 'node:http';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {defaultConditions} from '../src/core/schema';
process.env.AI_PROVIDER='mock';
const entry:string=process.env.TEST_API_ENTRY||'../api/timeline.js';const {default:handler}=await import(entry);
const server=createServer(handler);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const a=server.address();if(!a||typeof a==='string')throw new Error();const url=`http://127.0.0.1:${a.port}`;
try{
 const post=async(body:unknown)=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');return r.json();};
 const geo=await post({action:'geocode',address:'東京都江戸川区中央一丁目4番1号'});const ex=await post({action:'extract',text:'母 82歳 同居 杖をつく。'});const plan=await post({action:'plan',point:geo.points[0],family:ex.family,conditions:defaultConditions,token:ex.token});assert.equal(plan.decision.kind,'leave');assert.equal(plan.hazards[0].label,'3〜5m未満');assert(plan.shelters.candidates.length>0);assert.equal(plan.aiCalls,0);
 const report={at:new Date().toISOString(),bundledApi:true,steps:3,passed:true,hazard:plan.hazards[0].label,aiCalls:plan.aiCalls};await writeFile('docs/results/bundle.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
