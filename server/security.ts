import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
const windows=new Map<string,{w:number;count:number}>();
export function ipTicket(ip:string,secret:string,max:number,now=Date.now()){
 const key=createHmac('sha256',secret).update(ip).digest('hex'),w=Math.floor(now/600000);
 for(const [k,v] of windows)if(v.w!==w)windows.delete(k);
 if(windows.size>=5000&&!windows.has(key))return false;
 const old=windows.get(key),count=old?.w===w?old.count+1:1;windows.set(key,{w,count});return count<=max;
}
function sign(value:string,secret:string){return createHmac('sha256',secret).update(value).digest('base64url');}
export function pack(data:unknown,secret:string){const body=Buffer.from(JSON.stringify(data)).toString('base64url');return body+'.'+sign(body,secret);}
export function unpack(token:string,secret:string):unknown{
 if(token.length>1500)throw new Error('token');const [body,sig,...rest]=token.split('.'),expected=sign(body||'',secret);
 if(rest.length||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new Error('token');return JSON.parse(Buffer.from(body,'base64url').toString());
}
export function rateTicket(cookie:string|undefined,secret:string,max:number,now=Date.now()){
 const w=Math.floor(now/60000);let count=0;
 try{const raw=unpack(cookie?.match(/(?:^|;\s*)uchi_rate=([^;]+)/)?.[1]||'',secret) as {w:number;count:number};if(raw.w===w&&Number.isInteger(raw.count))count=raw.count;}catch{}
 const allowed=count<max;return {allowed,cookie:`uchi_rate=${pack({w,count:allowed?count+1:count},secret)}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=60`};
}
export function makeCreation(used:number,secret:string){return pack({id:randomUUID(),used,expires:Date.now()+30*60000},secret);}
const spent=new Map<string,number>();
export function consumeCreation(token:string,secret:string){
 const v=unpack(token,secret) as {id:string;used:number;expires:number};
 if(typeof v.id!=='string'||!Number.isInteger(v.used)||v.used<0||v.used>2||!Number.isFinite(v.expires)||v.expires<Date.now())throw new Error('期限が切れました。家族の読み取りからやり直してください。');
 for(const [k,exp] of spent)if(exp<Date.now())spent.delete(k);
 if(spent.has(v.id)||spent.size>5000)throw new Error('この作成は処理済みです。家族の読み取りからやり直してください。');
 spent.set(v.id,v.expires);return v.used;
}
