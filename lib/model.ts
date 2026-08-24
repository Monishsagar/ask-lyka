import { Listing, formatMoney, getListing, parseMoney, parsePercent } from '@/data/listings'
export interface ModelClient { propose(question: string, context: Listing[]): Promise<{ answerText: string; citedRecordIds: string[] }> }
function first(context: Listing[]) { return context[0] }
export class StubClient implements ModelClient {
  async propose(question: string, context: Listing[]) {
    const x = first(context); if (!x) return { answerText: '', citedRecordIds: [] }
    if (/commission/i.test(question)) { const money = parseMoney(x.price)!; const pct = parsePercent(x.notes)!; return { answerText: `Commission: ${formatMoney(money.currency, money.amount * pct / 100)} (${money.amount.toLocaleString()} × ${pct}% = ${money.amount * pct / 100}), based on ${x.id}.`, citedRecordIds: [x.id] } }
    if (/available|buy/i.test(question)) return { answerText: x.status === 'Available' ? `Yes, it is ${x.status}.` : `No, it is ${x.status.toLowerCase()}.`, citedRecordIds: [x.id] }
    if (x.status === 'Withdrawn') return { answerText: 'The listing is withdrawn from market, so its price is no longer valid to quote.', citedRecordIds: [x.id] }
    if (!x.price) return { answerText: 'The price is missing because it is under negotiation.', citedRecordIds: [x.id] }
    return { answerText: `The price is ${x.price}.`, citedRecordIds: [x.id] }
  }
}
export class LiveClient implements ModelClient {
  async propose(question: string, context: Listing[]) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', { method:'POST', headers:{'content-type':'application/json', authorization:`Bearer ${process.env.MODEL_API_KEY}`}, body: JSON.stringify({ model: process.env.MODEL_MODEL || 'gpt-4o-mini', temperature: 0, messages:[{role:'system',content:'Answer only using the JSON records provided below. Do not use outside knowledge. State your answer and which record id(s)/field(s) support it.'},{role:'user',content:JSON.stringify({question, records:context})}] }) })
    const json = await response.json(); return { answerText: json.choices?.[0]?.message?.content || '', citedRecordIds: [...(json.choices?.[0]?.message?.content?.matchAll(/P-\d+/g) || [])].map((m:any)=>m[0]) }
  }
}
export function getModel(): ModelClient { return process.env.MODEL_PROVIDER === 'live' ? new LiveClient() : new StubClient() }
