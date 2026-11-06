import {describe,it,expect} from 'vitest';
import {encodePlan,decodePlan} from '../src/core/share';
import {defaultConditions,hazardIds,type Plan} from '../src/core/schema';
import {mockExtract} from '../src/core/mock';
import {decide,makeRows,estimate} from '../src/core/rules';
import {templateWording} from '../src/core/wording';
const family=mockExtract('母 80歳 同居 杖をつく。'),now=new Date().toISOString();
const hazards=hazardIds.map(id=>({id,name:id,status:'unavailable' as const,label:'未取得',source:'https://disaportaldata.gsi.go.jp/example.png',checkedAt:now}));
const decision=decide(hazards,defaultConditions),rows=makeRows(family,defaultConditions,decision,undefined);
const plan:Plan={version:1,createdAt:now,point:{lat:35.7,lon:139.8,label:'共有用の架空地点'},family,conditions:defaultConditions,hazards,decision,rows,estimates:estimate(family,null,20),shelters:{candidates:[],required:[1],sources:[],failed:0,total:0,checkedAt:now},...templateWording(rows),wording:'template',provider:'mock',aiCalls:0,warnings:['自治体の指示が優先']};
describe('URL内の共有',()=>{
 it('日本語と全ての計画情報を圧縮して復元',async()=>{const hash=await encodePlan(plan);expect(hash).toMatch(/^#plan=[A-Za-z0-9_-]+$/);expect(await decodePlan(hash)).toEqual(plan);});
 it('壊れたリンクを拒否',async()=>{await expect(decodePlan('#plan=invalid')).rejects.toThrow();await expect(decodePlan('#x=abc')).rejects.toThrow();});
 it('過大なリンクを拒否',async()=>{await expect(decodePlan('#plan='+'a'.repeat(40000))).rejects.toThrow();});
 it('圧縮爆弾を容量上限で止める',async()=>{const raw=new TextEncoder().encode('a'.repeat(110000));const data=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());let str='';for(const b of data)str+=String.fromCharCode(b);const hash='#plan='+btoa(str).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');await expect(decodePlan(hash)).rejects.toThrow('共有データが大きすぎます');});
 it('共有データに任意サイトの出典リンクを入れられない',async()=>{const changed=structuredClone(plan);changed.hazards[0].source='javascript:alert(1)';await expect(encodePlan(changed)).rejects.toThrow();});
});
