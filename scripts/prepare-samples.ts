// Rebuild the offline presentation examples from the supplied public-data recordings.
// Uses the existing parser, pipeline, rules and schema without contacting any service.
import {readFile,writeFile} from 'node:fs/promises';
import record from '../tests/fixtures/public-record.json';
import {samples} from '../src/core/samples';
import {defaultConditions} from '../src/core/schema';
import {mockExtract} from '../src/core/mock';
import {buildPlan} from '../server/pipeline';
import {planSchema} from '../src/core/share';
const plans=[];
for(const sample of samples){
 const saved=record.records.find(r=>r.id===sample.id)!;
 const fetcher:typeof fetch=async input=>{
  const url=String(input);
  const hazard=saved.hazards.find(h=>h.source===url);
  if(hazard){
   const file=saved.files.find(f=>f.hazard===hazard.id);
   return file?new Response(await readFile(`tests/fixtures/${file.file}`)):new Response(null,{status:404});
  }
  // The supplied shelter recording covers one tile. Missing neighbours stay unavailable.
  if(url.replace(/skhb\d+/, 'skhb01')===saved.shelterSource)
   return new Response(await readFile(`tests/fixtures/${saved.shelterFile}`));
  return new Response(null,{status:503});
 };
 const p=await buildPlan(saved.point,mockExtract(sample.family),{...defaultConditions},0,{AI_PROVIDER:'mock'},fetcher);
 p.createdAt=record.recordedAt;
 p.hazards.forEach(h=>h.checkedAt=saved.hazards.find(v=>v.id===h.id)!.checkedAt);
 for(const shelters of [p.shelters,p.tsunamiShelters])if(shelters){
  shelters.checkedAt=record.recordedAt;
  shelters.candidates.forEach(s=>s.source=saved.shelterSource);
  shelters.sources=shelters.sources.map(s=>s.replace(/skhb\d+/, 'skhb01'));
 }
 plans.push(planSchema.parse(p));
}
await writeFile('src/data/sample-plans.json',JSON.stringify(plans,null,2)+'\n');
console.log(`Prepared ${plans.length} offline examples; AI calls: 0; network requests: 0`);
