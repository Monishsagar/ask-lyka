import { listings, Listing } from '@/data/listings'
export type Retrieval = { records: Listing[]; reason?: string; outcome?: 'DECLINED_NOT_GROUNDED' | 'DECLINED_OUT_OF_POLICY' }
export function isOutOfPolicy(question: string): boolean {
  const q = question.toLowerCase()

  // 1. Advice, Recommendations, Investment, Opinion, Speculation
  if (
    /\b(advice|advise|advising|advisable|recommend|recommendation|recommending|suggest|suggestion|opinion|viewpoint)\b/.test(q) ||
    /\b(invest|investing|investment|investor|roi|return on investment|yield|rental yield|cap rate|appreciation|capital growth|future value|forecast|predict|prediction|speculate)\b/.test(q) ||
    /\bshould\s+(i|we|one|a\s+client)\b/.test(q) ||
    /\bwould\s+you\b/.test(q) ||
    /\bdo\s+you\s+(think|suggest|recommend)\b/.test(q) ||
    /\bis\s+it\s+(worth|wise|smart|advisable|a\s+good|a\s+bad|a\s+smart)\b/.test(q) ||
    /\bworth\s+(buying|it|the\s+money|purchasing)\b/.test(q) ||
    /\b(good|great|bad|smart)\s+(deal|buy|investment|purchase|idea)\b/.test(q) ||
    /\b(good|fair|overpriced|underpriced|cheap|expensive)\s+price\b/.test(q) ||
    /\b(overpriced|underpriced)\b/.test(q) ||
    /\b(negotiable|negotiate|negotiation|discount)\b/.test(q) ||
    /\bwhich\s+(unit|one|property)\s+(is\s+best|should)\b/.test(q) ||
    /\b(best|top)\s+(unit|choice|deal|investment|option)\b/.test(q)
  ) {
    return true
  }

  // 2. Contact Info & People Not In Schema (phone, email, contact, broker, developer, owner, agent info)
  const asksCommission = /\bcommission\b/.test(q)
  const mentionsAgent = /\bagent\b/.test(q)

  if (
    /\b(phone|telephone|mobile|cell|whatsapp)\b/.test(q) ||
    /\b(email|mail)\b/.test(q) ||
    /\b(contact|reach)\b/.test(q) ||
    /\b(owner|landlord|seller|buyer|tenant|developer|builder|constructor|realtor|broker)\b/.test(q) ||
    (mentionsAgent && !asksCommission) ||
    (mentionsAgent && /\b(phone|email|contact|number|name|details|info)\b/.test(q))
  ) {
    return true
  }

  // 3. Physical / Spatial Properties Not In Schema (sqft, size, floor, location, address)
  if (
    /\b(sqft|sq\s*ft|sq\.?\s*ft|square\s+feet|square\s+foot|sqm|sq\.?\s*m|square\s+meter|square\s+meters|square\s+metre|square\s+metres|dimensions|area\s+size|total\s+area|living\s+area|surface\s+area)\b/.test(q) ||
    /\b(floor|floors|floor\s+number|story|stories|storey|storeys|level|levels|floorplan|floor\s+plan|blueprint|layout)\b/.test(q) ||
    /\b(address|location|neighborhood|district|zip|zipcode|postal\s+code|street|map|gps|coordinates|directions)\b/.test(q) ||
    /\bwhere\s+is\b/.test(q) ||
    /\bhow\s+(big|large)\b/.test(q)
  ) {
    return true
  }

  // 4. Amenities & Features Not In Schema (parking, pool, gym, balcony, furnished, pets, elevator, view)
  if (
    /\b(amenity|amenities|facility|facilities)\b/.test(q) ||
    /\b(parking|garage|parking\s+spot|parking\s+space)\b/.test(q) ||
    /\b(pool|swimming\s+pool)\b/.test(q) ||
    /\b(gym|fitness)\b/.test(q) ||
    /\b(balcony|terrace|patio|yard|garden)\b/.test(q) ||
    /\b(furnished|furnishing|furniture|appliance|appliances)\b/.test(q) ||
    /\b(pet|pets|pet\s+friendly)\b/.test(q) ||
    /\b(elevator|lift)\b/.test(q) ||
    /\b(sea\s+view|city\s+view|marina\s+view)\b/.test(q)
  ) {
    return true
  }

  // 5. Financial & Legal Fields Not In Schema (rent, lease, payment plan, mortgage, fees, tax)
  if (
    /\b(rent|rental|lease|leasing)\b/.test(q) ||
    /\b(payment\s+plan|down\s+payment|installment|installments|deposit)\b/.test(q) ||
    /\b(mortgage|loan|financing|interest\s+rate)\b/.test(q) ||
    /\b(maintenance\s+fee|service\s+charge|hoa|hoa\s+fee|building\s+fee|property\s+tax|tax)\b/.test(q)
  ) {
    return true
  }

  return false
}

export function retrieve(question: string): Retrieval {
  if (isOutOfPolicy(question)) return { records: [], outcome: 'DECLINED_OUT_OF_POLICY', reason: 'question asks for advice or a field not present in the schema.' }
  const q = question.toLowerCase()
  const allProjects = [...new Set(listings.map(x => x.project))]

  // Step 1: exact full project name match (case-insensitive)
  const explicitProjects = allProjects.filter(p => q.includes(p.toLowerCase()))

  // Step 2: word-level fallback — only use when no exact match found.
  // A word must UNIQUELY identify ONE project to be trusted; if it matches
  // multiple projects (e.g. "marina" → Bay, Heights, Heights) we treat it as
  // ambiguous rather than guessing. Words shorter than 5 chars are too generic.
  let projects: string[]
  if (explicitProjects.length) {
    projects = explicitProjects
  } else {
    const wordMatches = allProjects.filter(p =>
      p.toLowerCase().split(' ').some(w => w.length >= 5 && q.includes(w))
    )
    // Only use the word-fallback when it narrows to a single unambiguous project
    projects = wordMatches.length === 1 ? wordMatches : []
  }

  // Step 3: Guard against wrong-project unit matches.
  // Collect all meaningful words that appear in ANY known project name.
  // If the query contains one of those words but projects resolved to empty,
  // the user is referencing a project that either doesn't exist ("Marina mall")
  // or is ambiguous. Either way, do NOT fall through to a unit-only search
  // that would silently match the wrong project.
  const projectVocab = new Set(
    allProjects.flatMap(p => p.toLowerCase().split(' ').filter(w => w.length >= 4))
  )
  const queryWords = q.split(/\W+/).filter(Boolean)
  const hasProjectHintWord = queryWords.some(w => projectVocab.has(w))
  if (!projects.length && hasProjectHintWord) {
    return { records: [], outcome: 'DECLINED_NOT_GROUNDED', reason: 'no matching listing record found for this query.' }
  }

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
