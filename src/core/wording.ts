import { z } from 'zod';
import type {Row} from './schema';
export function wordingOptions(rows:Row[]){return rows.map(r=>({id:r.id,texts:[`${r.when}：${r.who}。${r.where}。${r.action} 持ち物：${r.carry}。`,`${r.when}になったら、${r.who}で確認しましょう。行く場所：${r.where}。${r.action} 持っていくもの：${r.carry}。`]}));}
const block=z.object({id:z.string().max(20),text:z.string().max(5000)}).strict();
export const wordingSchema=z.object({line:z.array(block).length(4),print:z.array(block).length(4)}).strict();
export function numbers(text:string){return text.normalize('NFKC').match(/\d+(?:\.\d+)?(?:[:：]\d+)?/g)||[];}
export function verifyWording(raw:unknown,rows:Row[]):{lineText:string;printText:string}|null{
 const r=wordingSchema.safeParse(raw);if(!r.success)return null;const options=wordingOptions(rows);
 for(const output of [r.data.line,r.data.print]){
  if(output.some((b,i)=>b.id!==options[i].id||!options[i].texts.includes(b.text)))return null;
  // 数字の増減・置換に加え、全文一致で場所のすり替えや否定の反転も拒否。
  if(output.some((b,i)=>JSON.stringify(numbers(b.text))!==JSON.stringify(numbers(options[i].texts[0]))))return null;
 }
 const suffix='自治体の指示が優先です。これは事前の計画で、現在の警報や開設情報ではありません。警戒レベル4までに危険な場所から避難。津波はこの表を待たず、強い揺れ・長い揺れや津波警報等で直ちに避難してください。';
 return {lineText:r.data.line.map(b=>b.text).join('\n\n')+'\n\n'+suffix,printText:r.data.print.map(b=>b.text).join('\n\n')+'\n\n'+suffix};
}
export function templateWording(rows:Row[]){const blocks=wordingOptions(rows).map(o=>({id:o.id,text:o.texts[0]}));return verifyWording({line:blocks,print:blocks},rows)!;}
