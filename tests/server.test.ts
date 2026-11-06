import {describe,it,expect,vi} from 'vitest';
import {createServer} from 'node:http';
import {CallBudget,createProvider} from '../server/providers';
import {makeCreation,consumeCreation,pack,unpack,rateTicket,ipTicket} from '../server/security';
import {handler} from '../server/http';
import {mockExtract} from '../src/core/mock';
import {makeRows} from '../src/core/rules';
import {defaultConditions} from '../src/core/schema';
import {wordingOptions} from '../src/core/wording';
const env={AI_PROVIDER:'openai',AI_API_KEY:'test-placeholder-not-a-real-key',AI_MODEL:'test-model',AI_BASE_URL:'https://test.invalid/v1'};
const response=(content:string)=>new Response(JSON.stringify({choices:[{message:{content}}]}),{status:200});
describe('AI呼び出しの予算と検査',()=>{
 it('不正JSONは1回だけ取り直し、合計2回で終了',async()=>{const text='母 80歳 同居 杖をつく。';let calls=0;const provider=createProvider(env,async()=>{calls++;return response(calls===1?'broken':JSON.stringify(mockExtract(text)));});const budget=new CallBudget();const family=await provider.extract(text,budget);expect(family.people[0].name).toBe('母');expect(calls).toBe(2);expect(await provider.word([],budget)).toBeNull();expect(calls).toBe(2);});
 it('2回とも失敗しても3回目を呼ばない',async()=>{const fetcher=vi.fn(async()=>response('{}'));const p=createProvider(env,fetcher);await expect(p.extract('母 80歳',new CallBudget())).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(2);});
 it('原文にないAIの属性を拒否',async()=>{const family=mockExtract('母 80歳');family.people[0].needs=['酸素機器'];const p=createProvider(env,async()=>response(JSON.stringify(family)));await expect(p.extract('母 80歳',new CallBudget())).rejects.toThrow();});
 it('成功時は抽出＋言い回しの2回だけ',async()=>{const text='母 80歳 同居 杖をつく。';const family=mockExtract(text);const rows=makeRows(family,defaultConditions,{kind:'leave',title:'避難',reasons:[]},undefined);const b=wordingOptions(rows).map(v=>({id:v.id,text:v.texts[1]}));const fetcher=vi.fn(async()=>response(JSON.stringify(fetcher.mock.calls.length===1?family:{line:b,print:b})));const p=createProvider(env,fetcher);const budget=new CallBudget();await p.extract(text,budget);expect(await p.word(rows,budget)).not.toBeNull();expect(budget.used).toBe(2);});
 it('言い回し不正は定型文に戻すためnullを返す',async()=>{const p=createProvider(env,async()=>response('{"line":[],"print":[]}'));const b=new CallBudget(1);expect(await p.word([],b)).toBeNull();expect(b.used).toBe(2);});
 it('mockでは外部AIを呼ばない',async()=>{const fetcher=vi.fn();const p=createProvider({AI_PROVIDER:'mock'},fetcher);const b=new CallBudget();expect((await p.extract('母 80歳',b)).people).toHaveLength(1);await p.word([],b);expect(fetcher).not.toHaveBeenCalled();expect(b.used).toBe(0);});
 it('HTTPSの設定と呼び出し上限',()=>{expect(()=>createProvider({...env,AI_BASE_URL:'http://test.invalid'})).toThrow();expect(()=>new CallBudget(2).take()).toThrow();});
});
describe('回数制限と署名',()=>{
 it('改変したtokenは拒否',()=>{const t=pack({used:2},'secret');expect(unpack(t,'secret')).toEqual({used:2});expect(()=>unpack(t+'x','secret')).toThrow();});
 it('作成トークンの再使用は同じ実体で拒否',()=>{const t=makeCreation(1,'secret');expect(consumeCreation(t,'secret')).toBe(1);expect(()=>consumeCreation(t,'secret')).toThrow();});
 it('cookieの上限',()=>{const a=rateTicket(undefined,'s',1,123000);expect(a.allowed).toBe(true);expect(rateTicket(a.cookie,'s',1,123000).allowed).toBe(false);expect(rateTicket(a.cookie,'s',1,180000).allowed).toBe(true);});
 it('cookieなしでもIP制限',()=>{expect(ipTicket('test-ip','s',1,100000)).toBe(true);expect(ipTicket('test-ip','s',1,100000)).toBe(false);});
});
describe('HTTP境界',()=>{
 it('GET/POST、origin、巨大入力、不正な型を扱う',async()=>{
  vi.stubEnv('AI_PROVIDER','mock');const server=createServer(handler);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error();const root=`http://127.0.0.1:${address.port}`;
  try{
   expect((await fetch(root)).headers.get('cache-control')).toBe('no-store');
   expect((await fetch(root,{method:'DELETE'})).status).toBe(405);
   expect((await fetch(root,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.invalid'},body:'{}'})).status).toBe(403);
   expect((await fetch(root,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'extract',text:'x'.repeat(30000)})})).status).toBe(400);
   const r=await fetch(root,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'extract',text:'母 80歳 同居 杖をつく。'})});expect(r.status).toBe(200);const j=await r.json();expect(j.family.people[0].mobility).toBe('杖・歩行器');expect(j.aiCalls).toBe(0);expect(r.headers.get('set-cookie')).toContain('HttpOnly');
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));vi.unstubAllEnvs();}
 });
});
