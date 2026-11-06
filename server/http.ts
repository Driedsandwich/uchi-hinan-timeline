import type {IncomingMessage,ServerResponse} from 'node:http';
import {z} from 'zod';
import {familySchema,pointSchema,conditionsSchema} from '../src/core/schema';
import {geocode} from './public-data';
import {CallBudget,createProvider} from './providers';
import {buildPlan} from './pipeline';
import {ipTicket,rateTicket,makeCreation,consumeCreation} from './security';
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('geocode'),address:z.string().trim().min(3).max(180)}).strict(),
 z.object({action:z.literal('extract'),text:z.string().trim().min(2).max(2000)}).strict(),
 z.object({action:z.literal('plan'),point:pointSchema,family:familySchema,conditions:conditionsSchema,token:z.string().max(1500)}).strict()
]);
type Request=IncomingMessage&{body?:unknown};
async function readBody(req:Request){
 if(req.body!==undefined){const s=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(s)>24000)throw new Error('入力が大きすぎます');return JSON.parse(s);}
 const chunks:Buffer[]=[];let size=0;for await(const c of req){size+=Buffer.byteLength(c);if(size>24000)throw new Error('入力が大きすぎます');chunks.push(Buffer.from(c));}return JSON.parse(Buffer.concat(chunks).toString());
}
export async function handler(req:Request,res:ServerResponse){
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const reply=(code:number,data:unknown)=>{res.statusCode=code;res.end(JSON.stringify(data));};
 if(req.method==='GET')return reply(200,{provider:process.env.AI_PROVIDER||'mock',version:1});
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return reply(405,{error:'POSTで送信してください'});}
 if(!req.headers['content-type']?.startsWith('application/json'))return reply(415,{error:'JSONで送信してください'});
 if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return reply(403,{error:'このサイトから送信してください'});}catch{return reply(403,{error:'送信元が不正です'});}}
 const real=Boolean(process.env.AI_PROVIDER&&process.env.AI_PROVIDER!=='mock');
 const secret=process.env.RATE_LIMIT_SECRET||'mock-only-public-rate-secret-not-for-paid-ai';
 if(real&&(!process.env.RATE_LIMIT_SECRET||secret.length<32))return reply(503,{error:'サーバーの回数制限の設定が必要です'});
 const rate=rateTicket(req.headers.cookie,secret,Math.min(60,Math.max(3,Number(process.env.RATE_LIMIT_MAX)||15)));
 res.setHeader('Set-Cookie',rate.cookie+(process.env.VERCEL?'; Secure':''));
 const ip=process.env.VERCEL?String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown').split(',')[0]:req.socket.remoteAddress||'local';
 if(!rate.allowed||!ipTicket(ip,secret,Math.min(1000,Math.max(10,Number(process.env.IP_RATE_MAX)||120)))){res.setHeader('Retry-After','60');return reply(429,{error:'短い間に何度も作成されました。少し待ってお試しください。'});}
 let v:z.infer<typeof input>;
 try{v=input.parse(await readBody(req));}catch{return reply(400,{error:'入力の長さや形式を確認してください。'});}
 try{
  if(v.action==='geocode')return reply(200,{points:await geocode(v.address)});
  if(v.action==='extract'){const provider=createProvider(),budget=new CallBudget();const family=await provider.extract(v.text,budget);return reply(200,{family,token:makeCreation(budget.used,secret),provider:provider.name,aiCalls:budget.used});}
  let used:number;try{used=consumeCreation(v.token,secret);}catch{return reply(409,{error:'作成の期限切れか、処理済みです。家族の読み取りからやり直してください。'});}
  return reply(200,await buildPlan(v.point,v.family,v.conditions,used));
 }catch{return reply(502,{error:v.action==='geocode'?'国土地理院の住所検索から情報を取れませんでした。住所を短くするか、時間をおいてお試しください。':'読み取り・作成を完了できませんでした。家族の読み取りからやり直してください。'});}
}
