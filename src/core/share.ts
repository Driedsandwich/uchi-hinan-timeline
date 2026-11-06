import {z} from 'zod';
import {pointSchema,familySchema,conditionsSchema,hazardIds,type Plan} from './schema';
const source=z.string().max(500).refine(v=>{try{const u=new URL(v);return u.protocol==='https:'&&['disaportaldata.gsi.go.jp','cyberjapandata.gsi.go.jp'].includes(u.hostname);}catch{return false;}});
const shelter=z.object({name:z.string().max(160),address:z.string().max(200),remarks:z.string().max(500),lat:z.number().min(20).max(46),lon:z.number().min(122).max(154),disasters:z.array(z.number().int().min(1).max(8)).max(8),distanceM:z.number().min(0).max(10000),source});
const sr=z.object({candidates:z.array(shelter).max(3),required:z.array(z.number().int().min(1).max(8)).max(8),sources:z.array(source).max(9),failed:z.number().int().min(0).max(9),total:z.number().int().min(0).max(9),checkedAt:z.string().datetime()});
export const planSchema=z.object({version:z.literal(1),createdAt:z.string().datetime(),point:pointSchema,family:familySchema,conditions:conditionsSchema,
 hazards:z.array(z.object({id:z.enum(hazardIds),name:z.string().max(60),status:z.enum(['colored','uncolored','unavailable','unknown']),label:z.string().max(120),rgba:z.array(z.number().int().min(0).max(255)).length(4).optional(),upper:z.number().min(0).max(100).optional(),source,checkedAt:z.string().datetime(),pixel:z.object({z:z.literal(17),x:z.number().int().min(0).max(131071),y:z.number().int().min(0).max(131071),px:z.number().int().min(0).max(255),py:z.number().int().min(0).max(255)}).optional(),error:z.string().max(120).optional()})).length(6),shelters:sr,tsunamiShelters:sr.optional(),
 decision:z.object({kind:z.enum(['leave','indoor','check']),title:z.string().max(80),reasons:z.array(z.string().max(200)).max(6)}),
 rows:z.array(z.object({id:z.string().max(20),when:z.string().max(80),who:z.string().max(300),where:z.string().max(1000),action:z.string().max(400),carry:z.string().max(2400)})).length(4),
 estimates:z.array(z.object({name:z.string().max(24),speed:z.number().min(0.1).max(2).nullable(),minutes:z.number().int().min(0).max(10000).nullable(),reason:z.string().max(200)})).max(8),lineText:z.string().max(15000),printText:z.string().max(15000),wording:z.enum(['verified-ai','template']),aiCalls:z.number().int().min(0).max(2),provider:z.enum(['mock','openai']),warnings:z.array(z.string().max(300)).max(20)});
async function collect(stream:ReadableStream<Uint8Array>,max:number){const reader=stream.getReader();let n=0;const parts:Uint8Array[]=[];try{for(;;){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>max)throw new Error('共有データが大きすぎます');parts.push(r.value);}}finally{await reader.cancel().catch(()=>{});}const out=new Uint8Array(n);let i=0;for(const p of parts){out.set(p,i);i+=p.length;}return out;}
export async function encodePlan(plan:Plan){const raw=new TextEncoder().encode(JSON.stringify(planSchema.parse(plan)));const compressed=await collect(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip')),30000);let str='';for(const b of compressed)str+=String.fromCharCode(b);return '#plan='+btoa(str).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
export async function decodePlan(hash:string):Promise<Plan>{
 if(!/^#plan=[A-Za-z0-9_-]+$/.test(hash)||hash.length>40000)throw new Error('共有リンクの形式を確認してください');
 const bytes=Uint8Array.from(atob(hash.slice(6).replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
 const raw=await collect(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),100000);
 return planSchema.parse(JSON.parse(new TextDecoder().decode(raw))) as Plan;
}
