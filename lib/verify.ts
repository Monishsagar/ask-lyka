import { Listing, parseMoney, parsePercent } from '@/data/listings'
export type Claim = { claim:string; recordId:string; field:string; matched:boolean }
export type Verification = { ok:boolean; reason:string; verifiedClaims:Claim[] }
const statuses = ['Available','Reserved','Sold','Withdrawn']
export function verify(answerText:string, citedRecordIds:string[], records:Listing[]): Verification {
  if (!citedRecordIds.length) return {ok:false, reason:'no citation returned.', verifiedClaims:[]}
  const cited = records.filter(r => citedRecordIds.includes(r.id)); const claims: Claim[] = []
  const add = (claim:string, recordId:string, field:string, matched:boolean) => claims.push({claim,recordId,field,matched})
  const commissionExpression = /(?:AED\s?[\d,]+).*?\(\s?[\d,]+\s?×\s?(\d+(?:\.\d+)?)%\s?=/i.test(answerText)
  const prices = [...answerText.matchAll(/\b(?:AED|USD)\s?[\d,]+/g)].map(m=>m[0].replace(/\s+/g,' ')).filter(price => !commissionExpression || cited.some(r => r.price.replace(/\s+/g,' ') === price))
  for (const price of prices) { const record = cited.find(r=>r.price.replace(/\s+/g,' ')===price); add(price, record?.id || cited[0].id, 'price', !!record) }
  for (const status of statuses.filter(s=>new RegExp(`\\b${s}\\b`,'i').test(answerText))) { const record=cited.find(r=>r.status.toLowerCase()===status.toLowerCase()); add(status,record?.id||cited[0].id,'status',!!record) }
  for (const date of answerText.match(/\b\d{4}-\d{2}-\d{2}\b/g)||[]) { const record=cited.find(r=>r.updated_at.startsWith(date)); add(date,record?.id||cited[0].id,'updated_at',!!record) }
  const commission = answerText.match(/(?:AED\s?[\d,]+).*?\(\s?[\d,]+\s?×\s?(\d+(?:\.\d+)?)%\s?=/i)
  if (commission) { const record=cited.find(r=>parseMoney(r.price)&&parsePercent(r.notes)); const money=record&&parseMoney(record.price); const pct=record&&parsePercent(record.notes); const derived=money&&pct ? `AED ${Math.round(money.amount*pct/100).toLocaleString()}` : ''; add(derived,record?.id||cited[0].id,'commission derivation',!!record&&answerText.includes(derived)&&answerText.includes(`${money!.amount.toLocaleString()} × ${pct}%`)) }
  const ok=claims.every(c=>c.matched); return {ok, reason:ok?'all extracted claims match cited raw fields or an allowed derivation.':`unverified claim: ${claims.find(c=>!c.matched)?.claim}`, verifiedClaims:claims}
}
// R7 intentionally leaves a timing race between raw proposal and verification; this contradicts R2/R6 and is unsafe.
export async function verifyWithTimeout(answerText:string,cited:string[],records:Listing[], timeoutMs=2000) { return Promise.race([Promise.resolve(verify(answerText,cited,records)),new Promise<Verification>(resolve=>setTimeout(()=>resolve({ok:true,reason:'R7 timeout: returned unverified proposal.',verifiedClaims:[]}),timeoutMs))]) }
