import {writeFile,mkdir,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {cases} from './cases';
import {CallBudget,createProvider} from '../server/providers';
import {geocode,hazardsAt,readTile} from '../server/public-data';
import {classifyPixel} from '../src/core/hazards';
import type {HazardId,Person} from '../src/core/schema';
const live=process.argv.includes('--live'),real=process.argv.includes('--real');
if(real&&(!process.env.AI_API_KEY||!process.env.AI_MODEL)){console.error('本物のAI評価は未実施：AI_API_KEY と AI_MODEL が必要です。鍵をファイルに書かず環境変数で渡してください。');process.exit(2);}
const provider=createProvider(real?{...process.env,AI_PROVIDER:'openai'}:{AI_PROVIDER:'mock'});
const fields: (keyof Person)[]=['name','ageBand','mobility','senses','night','needs','contactRole','residence'];
let matched=0,total=0;const results=[];
for(const c of cases){const budget=new CallBudget();try{const actual=await provider.extract(c.text,budget);let hit=0,count=0;
 for(let i=0;i<Math.max(c.expected.length,actual.people.length);i++)for(const key of fields){count++;let a=actual.people[i]?.[key],b=c.expected[i]?.[key];if(Array.isArray(a)&&Array.isArray(b)){a=[...a].sort();b=[...b].sort();}if(JSON.stringify(a)===JSON.stringify(b))hit++;}
 matched+=hit;total+=count;results.push({id:c.id,matched:hit,total:count,aiCalls:budget.used,passSchema:true});
 }catch{const count=c.expected.length*fields.length;total+=count;results.push({id:c.id,matched:0,total:count,aiCalls:budget.used,passSchema:false});}}
const record=JSON.parse(await readFile('tests/fixtures/public-record.json','utf8'));const publicResults=[];
for(const sample of record.records){
 if(live){const candidates=await geocode(sample.address);assert(candidates.some(p=>Math.abs(p.lat-sample.point.lat)<0.000001&&Math.abs(p.lon-sample.point.lon)<0.000001),'住所代表点が記録と違います');const current=await hazardsAt(sample.point);
  for(const h of current){const expected=sample.hazards.find((a:{id:string})=>a.id===h.id);assert.equal(h.status,expected.status,`${sample.id}/${h.id} status`);assert.equal(h.label,expected.label,`${sample.id}/${h.id} label`);assert.deepEqual(h.rgba,expected.rgba,`${sample.id}/${h.id} rgba`);}publicResults.push({id:sample.id,checks:6,mode:'live',pass:true});
 }else{for(const f of sample.files){const h=sample.hazards.find((a:{id:string})=>a.id===f.hazard);const rgba=readTile(await readFile(`tests/fixtures/${f.file}`),h.pixel.px,h.pixel.py);assert.deepEqual(rgba,h.rgba);assert.equal(classifyPixel(f.hazard as HazardId,rgba).label,h.label);}publicResults.push({id:sample.id,checks:sample.files.length,mode:'fixed',pass:true});}
}
const report={at:new Date().toISOString(),provider:provider.name,realAI:real?'実施':'未実施（別コマンド）',cases:cases.length,matched,total,accuracy:Math.round(matched/total*10000)/100,results,publicResults};
await mkdir('docs/results',{recursive:true});const file=`docs/results/eval-${real?'real':live?'live':'mock'}.json`;await writeFile(file,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
// mockは限定パーサー。否定や複雑な文の失敗も含めて報告し、90%を回帰ゲートとする。
if(matched/total<0.9||results.some(r=>!r.passSchema))process.exitCode=1;
