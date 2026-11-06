export const costMessage='このページを使っても、あなたにお金はかかりません（AI の代金は作者が持ちます）。見本は AI を呼びません。';
export function CostNotice(){return <p className="cost-notice">{costMessage}<span>ログイン・支払い情報の入力はありません。</span></p>;}
export function Journey({stage}:{stage:number}){
 const steps=['住所と家族の様子を入れる（見本あり）','この家の危険と避難先を見る','家族の約束の1枚を受け取る'];
 return <nav className="journey no-print" aria-label="作成の流れ"><p className="step-count" tabIndex={-1} id="step-heading">{stage} / 3<span> · {steps[stage-1]}</span></p><ol className="steps">{steps.map((s,i)=><li aria-current={stage===i+1?'step':undefined} key={s}><b>{i+1}</b><span>{s}</span>{i<2&&<span className="step-arrow" aria-hidden="true">→</span>}</li>)}</ol></nav>;
}
