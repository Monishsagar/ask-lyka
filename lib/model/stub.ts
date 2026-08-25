import { Listing, formatMoney, parseMoney, parsePercent } from '@/data/listings'
import { ModelClient } from './types'

function first(context: Listing[]) { return context[0] }

export class StubClient implements ModelClient {
  async propose(question: string, context: Listing[]) {
    const x = first(context)
    if (!x) return { answerText: '', citedRecordIds: [] }

    // --- Commission ---
    if (/commission/i.test(question)) {
      const money = parseMoney(x.price)
      const pct = parsePercent(x.notes)
      if (!money || !pct)
        return { answerText: 'No commission information found for this listing.', citedRecordIds: [x.id] }
      const amount = Math.round(money.amount * pct / 100)
      return {
        answerText: `Commission: ${formatMoney(money.currency, amount)} (${money.amount.toLocaleString('en-US')} × ${pct}% = ${amount}), based on ${x.id}.`,
        citedRecordIds: [x.id],
      }
    }

    // --- Status / availability / can I buy ---
    if (/status|available|buy|purchase|sold|reserved|withdrawn/i.test(question)) {
      const statusMap: Record<string, string> = {
        Available: `Yes — ${x.project} unit ${x.unit} is Available (record ${x.id}).`,
        Reserved: `No — ${x.project} unit ${x.unit} is Reserved and not available for purchase (record ${x.id}).`,
        Sold: `No — ${x.project} unit ${x.unit} has been Sold (record ${x.id}).`,
        Withdrawn: `No — ${x.project} unit ${x.unit} has been Withdrawn from the market (record ${x.id}).`,
      }
      return {
        answerText: statusMap[x.status] ?? `The status of ${x.project} unit ${x.unit} is ${x.status} (record ${x.id}).`,
        citedRecordIds: [x.id],
      }
    }

    // --- Price ---
    if (/price|cost|worth|value|how much/i.test(question)) {
      if (x.status === 'Withdrawn')
        return { answerText: `The listing for ${x.project} unit ${x.unit} is withdrawn from market, so its price is no longer valid to quote (record ${x.id}).`, citedRecordIds: [x.id] }
      if (!x.price)
        return { answerText: `The price for ${x.project} unit ${x.unit} is missing — it is currently under negotiation (record ${x.id}).`, citedRecordIds: [x.id] }
      return { answerText: `The price of ${x.project} unit ${x.unit} is ${x.price} (record ${x.id}).`, citedRecordIds: [x.id] }
    }

    // --- Beds / bedrooms ---
    if (/bed|bedroom|br|studio/i.test(question))
      return { answerText: `${x.project} unit ${x.unit} is a ${x.beds} unit (record ${x.id}).`, citedRecordIds: [x.id] }

    // --- Date / last updated / when ---
    if (/date|updated|when|last/i.test(question))
      return { answerText: `${x.project} unit ${x.unit} was last updated on ${x.updated_at} (record ${x.id}).`, citedRecordIds: [x.id] }

    // --- Notes ---
    if (/note|remark|comment|info/i.test(question))
      return { answerText: `Notes for ${x.project} unit ${x.unit}: "${x.notes}" (record ${x.id}).`, citedRecordIds: [x.id] }

    // --- Withdrawn guard (default) ---
    if (x.status === 'Withdrawn')
      return { answerText: `The listing for ${x.project} unit ${x.unit} is withdrawn from market, so its price is no longer valid to quote (record ${x.id}).`, citedRecordIds: [x.id] }

    // --- Missing price guard (default) ---
    if (!x.price)
      return { answerText: `The price for ${x.project} unit ${x.unit} is missing — it is currently under negotiation (record ${x.id}).`, citedRecordIds: [x.id] }

    // --- Default: price ---
    return { answerText: `The price of ${x.project} unit ${x.unit} is ${x.price} (record ${x.id}).`, citedRecordIds: [x.id] }
  }
}
