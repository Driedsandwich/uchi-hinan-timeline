import {useEffect,useState} from 'react';
import {defaultConditions,familySchema,conditionsSchema,pointSchema,type Family,type Conditions,type Point,type Plan} from './core/schema';
import {samples} from './core/samples';
import {decodePlan,planSchema} from './core/share';
import {FamilyReview} from './components/FamilyReview';
import {PlanView} from './components/PlanView';
import {PlanSummary} from './components/PlanSummary';
import {Journey,CostNotice} from './components/Journey';
import samplePlans from './data/sample-plans.json';
async function api(data:unknown){const r=await fetch('/api/timeline',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(55000)});const out=await r.json();if(!r.ok)throw new Error(out.error||'通信に失敗しました');return out;}
export default function App(){
 const [address,setAddress]=useState(''),[text,setText]=useState(''),[provider,setProvider]=useState('確認中'),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const [family,setFamily]=useState<Family|null>(null),[points,setPoints]=useState<Point[]>([]),[point,setPoint]=useState<Point|null>(null),[confirmed,setConfirmed]=useState(false),[token,setToken]=useState('');
 const [demo,setDemo]=useState<Plan|null>(null),[received,setReceived]=useState(false);
 const [conditions,setConditions]=useState<Conditions>({...defaultConditions}),[plan,setPlan]=useState<Plan|null>(null),[shared,setShared]=useState(false),[reviewed,setReviewed]=useState(false);
 useEffect(()=>{
  if(location.hash.startsWith('#plan=')){setBusy('共有された計画を開いています');setShared(true);decodePlan(location.hash).then(p=>{setPlan(p);setReceived(true);}).catch(()=>setError('共有リンクを開けませんでした。リンクが途中で切れていないか確認してください。')).finally(()=>setBusy(''));return;}
  fetch('/api/timeline').then(r=>r.json()).then(v=>setProvider(v.provider)).catch(()=>setProvider('接続できません'));
 },[]);
 async function start(a=address,t=text){
  setError('');setBusy('住所の候補と家族の様子を確認しています…');setFamily(null);setConfirmed(false);setReviewed(false);setToken('');setPoints([]);setPoint(null);
  try{const [geo,ex]=await Promise.all([api({action:'geocode',address:a}),api({action:'extract',text:t})]);const ps=geo.points.map((p:unknown)=>pointSchema.parse(p));if(!ps.length)throw new Error('住所の候補が見つかりませんでした。市区町村・町名・番地で入力してください。');setPoints(ps);setPoint(ps[0]);setFamily(familySchema.parse(ex.family));setToken(ex.token);setProvider(ex.provider);}
  catch(e){setError(e instanceof Error?e.message:'通信に失敗しました');}finally{setBusy('');}
 }
 async function make(){
  if(!point||!family||!confirmed||!reviewed)return;
  if(demo){setPlan(demo);setReceived(false);return;}
  setError('');setBusy('公的な地図で災害の危険と避難先を調べています…');
  try{const result=await api({action:'plan',point:pointSchema.parse(point),family:familySchema.parse(family),conditions:conditionsSchema.parse(conditions),token});setPlan(planSchema.parse(result) as Plan);setReceived(false);window.scrollTo(0,0);}
  catch(e){setToken('');setError(e instanceof Error?e.message:'作成に失敗しました');}finally{setBusy('');}
 }
 function reset(){if(busy)return;if(shared)fetch('/api/timeline').then(r=>r.json()).then(v=>setProvider(v.provider)).catch(()=>setProvider('接続できません'));history.replaceState(null,'',location.pathname);setDemo(null);setReceived(false);setPlan(null);setFamily(null);setPoints([]);setPoint(null);setShared(false);setError('');setText('');setAddress('');setConditions({...defaultConditions});setConfirmed(false);setReviewed(false);setToken('');window.scrollTo(0,0);}
 function ownInput(){reset();requestAnimationFrame(()=>document.getElementById('home-address')?.focus());}
 function trySample(index=0){
  const p=planSchema.parse(samplePlans[index]) as Plan;
  setShared(false);history.replaceState(null,'',location.pathname);setDemo(p);setAddress(samples[index].address);setText(samples[index].family);setFamily(p.family);setPoints([p.point]);setPoint(p.point);setConditions(p.conditions);setConfirmed(false);setReviewed(false);setError('');setToken('');setReceived(false);
 }
 const stage=plan?(received?3:2):1;
 useEffect(()=>{window.scrollTo(0,0);if(family||plan)document.getElementById('step-heading')?.focus({preventScroll:true});},[stage,!!family]);
 return <><header className="site-header no-print"><a href="/" onClick={e=>{e.preventDefault();if(!busy)reset();}}><span className="logo" aria-hidden="true">⌂</span> うちの避難タイムライン</a><span className="mode">無料・ログイン不要</span></header>
 <main className={plan?'plan-main':''}>
 <Journey stage={stage}/>
 {!plan&&!family&&<section className="hero no-print"><span className="eyebrow">大雨の前に、家族で決めておく</span><h1>「うちは、いつ動く？」<br/>を、1枚に。</h1><p>家族の様子と住所から、公的な地図を確かめて、<br className="wide"/>誰が・いつ・どこへ避難するかを整理します。</p><p className="small">今の危険を知らせるアプリではありません。自治体の指示を優先してください。</p><CostNotice/><button className="primary try-sample" disabled={!!busy} onClick={()=>trySample()}>見本で試す</button><p className="button-help">架空の家族の入力を開き、危険・避難先・約束の1枚まで見られます。</p><a className="own-input-link" href="#own-input" onClick={e=>{e.preventDefault();document.getElementById('home-address')?.focus();}}>自分の住所と家族の様子を入れる ↓</a></section>}
 {error&&<div role="alert" className="error no-print">{error}{!token&&family&&!demo&&<><CostNotice/><button onClick={()=>start()} disabled={!!busy}>{provider==='mock'?'入力を読み直す（AI は使いません）':'AI で読み直す（数秒かかります）'}</button></>}{shared&&<button onClick={reset}>最初に戻る</button>}</div>}
 {busy&&<div className="loading no-print" role="status"><span className="spinner"/>{busy}<small>通信の状況によって少し時間がかかります。この画面でお待ちください。</small></div>}
 {plan?(received?<PlanView plan={plan} sample={!!demo} shared={shared} onReset={reset} onOwnInput={ownInput}/>:<section className="card overview no-print">
 <h1>この家の危険と避難先</h1><p>次の2つを確かめたら、家族がいつ・どう動くかの1枚へ進みます。</p>
 {demo&&<p className="notice">見本です。架空の家族と、2026年11月6日（日本時間）に記録した公的な地図を使っています。AI は使いません。</p>}
 <p>{plan.point.label}</p><PlanSummary plan={plan}/>
 <p>今の警戒レベルや、避難場所が開いているかは調べていません。実際の避難は自治体の指示を優先してください。</p>
 <details><summary>危険の詳しい情報を見る</summary>{plan.hazards.map(h=><p key={h.id}><strong>{h.name}</strong>：{h.label}</p>)}</details>
 <div className="toolbar"><button className="primary" onClick={()=>setReceived(true)}>家族の約束の1枚を受け取る →</button><button onClick={()=>{setPlan(null);if(!demo){setFamily(null);setToken('');}}}>{demo?'入力の確認に戻る':'入力からやり直す'}</button></div><p className="button-help">すでに調べた内容を1枚で表示します。ここでは AI を呼びません。</p>
 </section>):!family?<div className="entry-layout">
 <section className="card sample-card no-print"><h2>3つの家族の見本</h2><p>公共施設の場所に、架空の家族が住むと仮定した例です。施設自体の避難計画ではありません。</p><div className="samples">{samples.map((s,i)=><button key={s.id} disabled={!!busy} className="sample" onClick={()=>trySample(i)}><span className="sample-num">0{i+1}</span><strong>{['水につかるおそれのある平地の家','土砂災害のおそれのある家','高台の家（安全かは要確認）'][i]}</strong><small>{s.place.replace('住所代表点','住所を検索した場所')}</small><span>この見本を開く →</span></button>)}</div><p className="help">記録済みの公的な地図を使用。見本の内容は固定です。</p></section>
 <section id="own-input" className="card input-card no-print"><h2>自分の入力で試す</h2>{provider==='mock'&&<p className="notice">現在は AI を使わず、決められた読み取り方で家族の文を読みます。次の画面で確認・修正してください。地図は公的なデータを調べます。</p>}
 <form onSubmit={e=>{e.preventDefault();void start();}}>
 <label>避難を考える家の住所<input id="home-address" required minLength={3} maxLength={180} autoComplete="off" value={address} onChange={e=>setAddress(e.target.value)} placeholder="例：東京都江戸川区中央一丁目4番1号"/></label><p className="help">都道府県から入力。建物名・部屋番号は不要です。次に検索された位置を確かめます。</p>
 <label>家族の様子<textarea required minLength={2} maxLength={2000} rows={5} value={text} onChange={e=>setText(e.target.value)} placeholder="例：母 82歳 同居 杖をつく 薬が必要。父 85歳 同居 耳が遠い 夜は21時に寝る。息子は隣の市に住む。"/></label><p className="help">1人ずつ「。」で区切ると読み取りやすくなります。本名・電話番号は書かず、「母」「息子」などの呼び名で大丈夫です。</p>
 <p className="privacy">住所は国土地理院の住所検索へ送ります。AI を使う場合は、家族の文を作者が設定した AI サービスへ送ります。このアプリのサーバーには保存しません。AI サービス側の扱いは作者の契約設定によります。</p><CostNotice/><button type="submit" disabled={!!busy||!['mock','openai'].includes(provider)}>{provider==='mock'?'入力を読む（AI は使いません）':'AI で読む（数秒かかります）'}</button><p className="button-help">住所を検索して、家族の文を確認・修正できる形にします。</p>{!['mock','openai'].includes(provider)&&<p role="status">{provider==='確認中'?'読み取りの準備をしています。':'読み取りに接続できません。見本はそのまま試せます。'}</p>}
 </form></section></div>:<section className="card no-print"><p className="eyebrow">1 / 3 · 入力内容の確認</p><h2>この場所・この家族で合っていますか？</h2>
 <p>場所と家族の2か所を確認して、下のチェックを付けると次へ進めます。</p>
 {demo?<><p className="notice">架空の家族の見本です。内容は固定で、AI は使いません。</p><h3>見本の住所</h3><p>{address}</p><label className="check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>調べる地点を確認しました（見本の施設の場所）</label><h3>見本の家族の様子</h3>{demo.family.people.map((person,i)=><p key={i}>{person.evidence}</p>)}</>:<>
 <fieldset className="location"><legend>調べる位置を確認</legend><p>住所検索は、家の場所ではなく町の中心などを示す場合があります。下の地図で確かめてください。ずれている場合は「位置を数値で直す」を開いて調整できます。</p>
 <label>住所の候補<select value={points.findIndex(p=>p===point)} onChange={e=>{setPoint(points[Number(e.target.value)]);setConfirmed(false);}}>{points.map((p,i)=><option value={i} key={i}>{p.label}</option>)}{point&&!points.includes(point)&&<option value={-1}>位置を手で調整しました</option>}</select></label>
 {point&&<><details><summary>位置を数値で直す（緯度・経度）</summary><div className="two-col"><label>緯度<input type="number" step="any" min={20} max={46} value={point.lat} onChange={e=>{setPoint({...point,lat:Number(e.target.value)});setConfirmed(false);}}/></label><label>経度<input type="number" step="any" min={122} max={154} value={point.lon} onChange={e=>{setPoint({...point,lon:Number(e.target.value)});setConfirmed(false);}}/></label></div></details><a target="_blank" rel="noreferrer" href={`https://maps.gsi.go.jp/#18/${point.lat}/${point.lon}/&base=std&ls=std&disp=1&vs=c1j0h0k0l0u0t0z0r0s0m0f1`}>地理院地図でこの位置を見る ↗</a></>}
 <label className="check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>調べる地点を確認しました</label></fieldset>
 <FamilyReview family={family} onChange={f=>{setFamily(f);setReviewed(false);}} conditions={conditions} onConditions={setConditions}/>
 </>}
 <label className="check"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>家族の読み取りを確認しました。不明な項目は確認が必要だと理解しました。</label>
 {!demo&&<CostNotice/>}
 <p className="next-help" role="status">{!confirmed&&!reviewed?'場所と家族の2か所にチェックを付けてください。':!confirmed?'場所の確認にチェックを付けてください。':!reviewed?'家族の確認にチェックを付けてください。':'確認できました。次は危険と避難先を見ます。'}</p>
 <div className="toolbar"><button className="primary" disabled={!!busy||!confirmed||!reviewed||(!demo&&!token)} onClick={make}>{demo?'この家の危険と避難先を見る →':provider==='mock'?'公的な地図で危険と避難先を見る →':'AI で文章を整え、危険と避難先を見る（数秒かかります）'}</button><button disabled={!!busy} className="quiet" onClick={()=>{setDemo(null);setFamily(null);setToken('');}}>入力に戻る</button></div>
 <p className="button-help">{demo?'記録済みの地図と避難先を表示します。AI は使いません。':'公的な地図を調べます。通信の状況により時間がかかることがあります。'}</p>
 </section>}
 <footer className="site-footer no-print"><p>うちの避難タイムライン — 家族の備えを、公的な情報につなぐ。</p><p>データのない所を「安全」にしない。AIの文を、そのまま判断にしない。</p></footer>
 </main></>;
}
