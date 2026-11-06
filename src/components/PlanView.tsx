import {useRef,useState} from 'react';
import {PlanSummary} from './PlanSummary';
import {FamilyPromises} from './FamilyPromise';
import type {Plan} from '../core/schema';
import {DATA_PAGE,layers} from '../core/hazards';
import {GUIDELINE,SPEED_SOURCE,SHELTER_SOURCE} from '../core/rules';
import {encodePlan} from '../core/share';
import {samples} from '../core/samples';
export function PlanView({plan:p,shared,sample=false,onReset,onOwnInput}:{plan:Plan;shared:boolean;sample?:boolean;onReset:()=>void;onOwnInput:()=>void}){
 const [message,setMessage]=useState(''),[link,setLink]=useState('');
 const shareDialog=useRef<HTMLDialogElement>(null);
 const isSample=sample||samples.some(s=>s.family.split('。').map(t=>t.trim()).filter(Boolean).join('。')===p.family.people.map(person=>person.evidence.trim()).join('。'));
 const early=p.rows.find(r=>r.id==='l3')||p.rows[1],before=p.rows.find(r=>r.id==='before')||p.rows[0];
 async function copy(text:string){try{await navigator.clipboard.writeText(text);setMessage('コピーしました。');}catch{setMessage('自動コピーができませんでした。表示された文やリンクを選んでコピーしてください。');}}
 async function share(){try{const hash=await encodePlan(p);const url=location.origin+location.pathname+hash;setLink(url);await copy(url);}catch{setMessage('共有リンクを作れませんでした。この端末では印刷をご利用ください。');}}
 return <>
 <div className="plan-heading no-print"><h1>家族の約束の1枚</h1><span className="sample-badge">{isSample?'見本・架空の家族':'事前の計画'}</span></div>
 <p className="no-print">1枚ができました。家族で確認して、印刷や共有に使えます。</p>
 <div className="toolbar no-print result-navigation"><button onClick={onReset}>最初に戻る</button><button onClick={onOwnInput}>自分の入力で試す</button></div>
 <div className="share-toolbar no-print"><button className="primary share-primary" onClick={()=>shareDialog.current?.showModal()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 9 15M21 3l-7 18-5-6-6-5 18-7Z"/></svg>家族へ送る<span>内容を確認 →</span></button></div>
 <dialog ref={shareDialog} className="share-dialog" aria-labelledby="share-title"><p className="eyebrow">3 / 3 · 家族の約束の1枚</p><h2 id="share-title">家族に送る前に確認</h2><p>避難先・支援する人・持ち物を家族で確かめてください。</p><p className="small">リンクの中身は暗号化されません。送った相手は住所や家族の情報を読めます。リンク自体に情報を含める仕組みで、アプリのサーバーには保存しません。</p><div className="share-preview pre-wrap">{p.lineText}</div><div className="toolbar"><button className="primary" onClick={share}>共有リンクを作る</button><button onClick={()=>copy(p.lineText)}>家族への文をコピー</button><button className="quiet" onClick={()=>shareDialog.current?.close()}>閉じる</button></div><p role="status">{message}</p>{link&&<label>共有リンク（住所・家族の情報が含まれます）<textarea readOnly value={link} rows={3} onFocus={e=>e.target.select()}/></label>}</dialog>
 {shared&&<div className="notice no-print"><strong>家族が共有した計画です</strong><p>公的データの再取得はしていません。共有された内容の正しさ・最新性は作成した家族と確認してください。</p></div>}
 <article className="sheet" aria-label="避難の1枚">
 <header className="sheet-head"><div className="print-only"><h2>うちの避難タイムライン</h2><div className="print-subtitle"><strong>わが家の約束</strong><span className="sample-badge">{isSample?'見本・架空の家族':'事前の計画'}</span></div></div><p className="plan-premise">事前の計画です。発令・開設状況は取得していません。</p>{isSample&&<p className="small">家族は架空の例／地図・避難先は記録済みの公的データ（取得日は下部に記載）</p>}</header>
 <PlanSummary plan={p}/>
 <p className="family-caption no-print">わが家の約束</p>
 <FamilyPromises plan={p}/>
 <section className="promise-notes"><div><h3>夜になる前</h3><p className="no-print">{before.action}</p><p className="print-only">開設・道の安全・迎え・連絡方法を確認。</p></div><div className="no-print"><h3>行く場所</h3><p>{early.where}</p></div><div><h3>持ち物</h3><p>{early.carry}</p></div><div><h3>連絡</h3><p>{p.family.people.map(person=>`${person.name}：${person.contactRole}`).join(' ／ ')}</p><p className="print-only">電話：________________________</p></div></section>
 <p className="hand-note">家族で読み合わせて、わが家の約束にしよう。</p>
 <p className="sheet-meta">{p.point.label}<br/>作成 {new Date(p.createdAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}（日本時間）／ 自治体の指示が優先です。</p>
 <p className="tsunami"><b>津波は別の行動です。</b> 強い揺れ・長い揺れや津波警報等では、この表や夜を待たず直ちに避難。高台・津波の指定緊急避難場所へ。</p>
 <footer className="print-source">出典：国土地理院「重ねるハザードマップ」「指定緊急避難場所」、内閣府「避難情報に関するガイドライン（令和8年3月）」。取得日時・URLと計算の前提は画面の詳細に記載。経路・開設・受入れ条件は自治体へ確認。</footer>
 </article>
 <div className="toolbar no-print"><button className="print-button" onClick={()=>window.print()}>印刷・保存する <span>A4の紙 / PDFファイル ↗</span></button></div>
 <section className="card no-print"><h2>計画の詳細を確認</h2>{p.decision.reasons.map(r=><p key={r}>{r}</p>)}<div className="hazard-summary">{p.hazards.map(h=><div key={h.id}><span>{h.name}</span><strong>{h.label}</strong></div>)}</div>
 <details><summary>時間ごとの行動・場所・持ち物</summary>{p.rows.map(r=><section key={r.id} className="detail-row"><h3>{r.when} {r.id!=='before'&&'発令時'}</h3><p>誰が：{r.who}</p><p>どこへ：{r.where}</p><p>{r.action}</p><p>持ち物：{r.carry}</p></section>)}</details>
 <section className="estimate"><h3>移動に必要な時間の目安</h3><p>道のりを「直線距離×1.5」、準備を {p.conditions.readyMinutes} 分とした仮の計算です。安全な経路や到着を保証しません。</p><div className="estimate-grid">{p.estimates.map((e,i)=><p key={i}><b>{e.name}</b>：{e.minutes===null?'計算できません':`準備を含め約 ${e.minutes} 分`}{e.speed!==null&&`（${e.speed} m/秒）`}</p>)}</div><p>別居の人の迎え・車いすや歩行困難な人の移動時間は計算しません。近くの支援者と相談してください。</p></section>
 <section className="family-notes"><h3>連絡と、忘れたくないこと</h3><p>{p.family.people.map(person=>`${person.name}：${person.contactRole}／${person.senses}／${person.night}`).join('　')}</p></section>
 </section>
 <section className="card no-print"><h2>候補の避難場所</h2><p>取得できた範囲で、必要な災害すべてに対応する候補を直線距離順に表示しています。開いているか、必要な支援を受けられるかは自治体に確認してください。</p>
 <p>対応する災害：{p.shelters.required.map(n=>({1:'洪水',2:'土砂',3:'高潮',5:'津波'}[n]||n)).join('・')} ／ 取得できた地図 {p.shelters.total-p.shelters.failed}/{p.shelters.total} 枚 ／ 取得日時：{p.shelters.checkedAt}</p>
 {!p.shelters.candidates.length&&<p className="notice">10km以内に条件に合う候補を取得できませんでした。避難先は未確定です。</p>}
 {p.shelters.candidates.map((s,i)=><div className="shelter" key={i}><h3>{i+1}. {s.name} <span>直線 {s.distanceM} m</span></h3><p>{s.address}</p><p><b>利用条件：</b>{s.remarks||'データに記載がありません。自治体に確認してください。'}</p><a href={s.source} target="_blank" rel="noreferrer">国土地理院の元データ</a></div>)}
 {p.tsunamiShelters&&<div className="notice"><h3>津波用の候補（雨の表とは別）</h3>{p.tsunamiShelters.candidates.length?p.tsunamiShelters.candidates.map(s=><p key={s.name}>{s.name}（直線 {s.distanceM} m）{s.remarks}</p>):<p>津波に対応する候補を取得できませんでした。自治体に確認してください。</p>}</div>}
 </section>
 <section className="card no-print"><h2>家族に送る文</h2><p>{p.wording==='verified-ai'?'AIが整えた文章が、決められた行動や場所と一致するか確かめました。':'事実をそのまま伝える定型文を使っています。'} AIを使った回数：{p.aiCalls} 回</p><textarea aria-label="家族に送る文" readOnly rows={14} value={p.lineText}/><details><summary>冷蔵庫に貼る文の言い回し</summary><p className="pre-wrap">{p.printText}</p></details></section>
 <section className="card no-print"><h2>出典と、確認できていないこと</h2><ul>{p.warnings.map(w=><li key={w}>{w}</li>)}</ul><p>調べた点：緯度 {p.point.lat}・経度 {p.point.lon}（地図で使う位置の数値）</p>
 <ul><li><a href="https://msearch.gsi.go.jp/address-search/AddressSearch" target="_blank" rel="noreferrer">国土地理院 住所検索</a></li><li><a href={DATA_PAGE} target="_blank" rel="noreferrer">重ねるハザードマップ・配信情報と利用条件</a>（国・都道府県等作成／国土地理院配信）</li><li><a href={SHELTER_SOURCE} target="_blank" rel="noreferrer">指定緊急避難場所（市町村登録／国土地理院配信）</a></li><li><a href={GUIDELINE} target="_blank" rel="noreferrer">内閣府 避難情報ガイドライン（令和8年3月）</a></li><li><a href={SPEED_SOURCE} target="_blank" rel="noreferrer">歩行速度の公的参考資料（津波向けの数値を雨の事前計画へ仮適用）</a></li></ul>
 {p.hazards.map(h=><details key={h.id}><summary>{h.name}：{h.label}</summary><p>確認日時：{h.checkedAt}</p><p>地図の色の数値：{h.rgba?.join(', ')||h.error} ／ 地図の区画番号：{h.pixel&&`${h.pixel.z}/${h.pixel.x}/${h.pixel.y} (${h.pixel.px},${h.pixel.py})`}</p><a href={h.source} target="_blank" rel="noreferrer">調べた公的な地図画像</a> ・ <a href={layers[h.id].legend} target="_blank" rel="noreferrer">色と記号の説明</a></details>)}
 </section>
 </>;
}
