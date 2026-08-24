import { listings, Listing } from '@/data/listings'
export type Retrieval = { records: Listing[]; reason?: string; outcome?: 'DECLINED_NOT_GROUNDED' | 'DECLINED_OUT_OF_POLICY' }
const policy = /good investment|recommend|should i|phone number|contact|email|advice|invest/i
export function retrieve(question: string): Retrieval {
  if (policy.test(question)) return { records: [], outcome: 'DECLINED_OUT_OF_POLICY', reason: 'question asks for advice or a field not present in the schema.' }
  const q = question.toLowerCase()
  const allProjects = [...new Set(listings.map(x => x.project))]
  const explicitProjects = allProjects.filter(p => q.includes(p.toLowerCase()))
  const projects = explicitProjects.length ? explicitProjects : allProjects.filter(p => p.toLowerCase().split(' ').some(w => w.length > 3 && q.includes(w)))
  const unit = q.match(/unit\s+(\d+)/)?.[1]
  const beds = q.match(/(\d)\s*[- ]?bed(?:room)?|([234])br/i)?.[1] || q.match(/([234])br/i)?.[1]
  let matches = listings.filter(x => (!projects.length || projects.includes(x.project)) && (!unit || x.unit === unit) && (!beds || x.beds.startsWith(beds)))
  if (!matches.length) return { records: [], outcome: 'DECLINED_NOT_GROUNDED', reason: 'no matching listing record found for this query.' }
  matches = [...matches].sort((a,b) => a.id.localeCompare(b.id))
  if (matches.length > 1 && !unit && projects.length > 1) return { records: matches, outcome: 'DECLINED_NOT_GROUNDED', reason: 'ambiguous project reference, multiple matches.' }
  const groups = new Map<string, Listing[]>()
  matches.forEach(x => { const key = `${x.project}|${x.unit}`; groups.set(key, [...(groups.get(key) || []), x]) })
  const resolved: Listing[] = []
  for (const group of groups.values()) {
    if (group.length === 1) { resolved.push(group[0]); continue }
    const same = group.every(x => x.price === group[0].price && x.status === group[0].status)
    if (same) { resolved.push(group.sort((a,b) => a.id.localeCompare(b.id))[0]); continue }
    const dates = new Set(group.map(x => x.updated_at)); if (dates.size === 1) return { records: group, outcome: 'DECLINED_NOT_GROUNDED', reason: 'conflicting records with identical updated_at, cannot resolve automatically, flagged for human review.' }
    const winner = [...group].sort((a,b) => b.updated_at.localeCompare(a.updated_at))[0]
    if (group.some(x => parseCurrency(x.price) !== parseCurrency(winner.price)) && winner.notes.includes('currency typo')) return { records: group, outcome: 'DECLINED_NOT_GROUNDED', reason: "conflicting currency across records, newer record's currency is flagged unreliable, cannot resolve automatically." }
    resolved.push(winner)
  }
  const finalRecords = resolved.sort((a,b) => a.id.localeCompare(b.id))
  if (finalRecords.length === 1 && !finalRecords[0].price && /price/i.test(question)) return { records: finalRecords, outcome: 'DECLINED_NOT_GROUNDED', reason: 'price field missing, under negotiation.' }
  if (finalRecords.length === 1 && finalRecords[0].status === 'Withdrawn' && /price/i.test(question)) return { records: finalRecords, outcome: 'DECLINED_NOT_GROUNDED', reason: 'listing withdrawn from market, price no longer valid to quote.' }
  return { records: finalRecords }
}
function parseCurrency(value: string) { return value.split(' ')[0] }
