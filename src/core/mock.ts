import type {Family,Person} from './schema';
// 鍵なし時だけ使う限定的な規則パーサー。文の意味を理解するAIではない。
export function mockExtract(text:string):Family{
 const chunks=text.split(/[。\n；;]/).map(s=>s.trim()).filter(Boolean);
 const people:Person[]=chunks.slice(0,8).map((s,i)=>{
  const name=s.match(/^(?:名前[:：]\s*)?([^\s、,\d０-９]{1,24}?)(?=\s|[、,\d０-９]|は|が)/)?.[1]||s.match(/^(祖母|祖父|おばあちゃん|おじいちゃん|母|父|娘|息子|夫|妻|私|兄|姉|弟|妹)/)?.[1]||`家族${i+1}`;
  const age=s.normalize('NFKC').match(/(\d{1,3})\s*歳/),a=age?Number(age[1]):null;
  return {name,ageBand:a===null?'不明':a>=65?'高齢':a<18?'子ども':'成人',mobility:/車[い椅]す|車椅子/.test(s)?'車いす':/歩けない|寝たきり|歩行困難/.test(s)?'歩行困難':/杖|歩行器/.test(s)?'杖・歩行器':/自力歩行|自分で歩ける|普通に歩ける/.test(s)?'自力歩行':'不明',
   senses:s.match(/耳が遠い|難聴|目が見えにくい|目が見えない|補聴器|聞こえにくい/)?.[0]||'不明',
   night:s.match(/夜は\s*\d{1,2}\s*時に寝る|\d{1,2}\s*時に寝る|夜は起きにくい|夜勤|夜は不在/)?.[0]||'不明',
   needs:[...new Set(s.match(/お薬手帳|服薬|薬|インスリン|酸素機器|補聴器|眼鏡|杖|歩行器|車いす/g)||[])],
   contactRole:s.match(/連絡係|電話で確認|迎えに来る|付き添う/)?.[0]||'不明',residence:/別居|隣の市|離れて住む/.test(s)?'別居':/同居|一緒に住む/.test(s)?'同居':'不明',evidence:s.slice(0,300)};
 });
 return {people:people.length?people:[{name:'家族',ageBand:'不明',mobility:'不明',senses:'不明',night:'不明',needs:[],contactRole:'不明',residence:'不明',evidence:text.slice(0,300)}],questions:['自宅で一緒に避難する人と、歩くときに必要な支援を確認してください。','そばで支援する人と、離れて安否を確認する人は誰ですか？','薬や機器、夜の連絡方法について足りないことはありますか？']};
}
