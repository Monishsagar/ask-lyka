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
    /\b(sqft|sq\s*ft|sq\.?\s*ft|square\s+feet|square\s+foot|square\s+footage|sq\s+footage|footage|sqm|sq\.?\s*m|square\s+meter|square\s+meters|square\s+metre|square\s+metres|dimensions|area\s+size|total\s+area|living\s+area|surface\s+area)\b/.test(q) ||
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

function parsePercent(val: string): number | null {
  const match = val.match(/(\d+(?:\.\d+)?)%/)
  return match ? Number(match[1]) : null
}

export function retrieve(question: string): Retrieval {
  if (isOutOfPolicy(question)) return { records: [], outcome: 'DECLINED_OUT_OF_POLICY', reason: 'question asks for advice or a field not present in the schema.' }

  const q = question.toLowerCase()

  // Aggregate / superlative queries across the dataset
  if (/\b(cheapest|most\s+expensive|lowest\s+price|highest\s+price|least\s+expensive|most\s+affordable|average\s+price|min\s+price|max\s+price)\b/.test(q)) {
    return { records: [], outcome: 'DECLINED_OUT_OF_POLICY', reason: 'aggregate query across records, outside single-record answer scope.' }
  }

  // Multi-entity comparison or trend queries across multiple records
  const mentionsMultipleUnits = (q.match(/\b\d{3,4}\b/g) || []).length >= 2
  if (
    mentionsMultipleUnits ||
    /\b(between|same\s+price\s+as|compare|comparison|cheaper\b.*?\bthan|more\s+expensive\b.*?\bthan|gone\s+up\s+or\s+down|price\s+trend|recently)\b/.test(q)
  ) {
    return { records: [], outcome: 'DECLINED_NOT_GROUNDED', reason: "question requires comparing multiple records, which this system's retrieval does not currently support." }
  }

  const allProjects = [...new Set(listings.map(x => x.project))]

  // Step 1: exact full project name match or distinct multi-word phrase match (case-insensitive)
  const projectAliases: Record<string, string> = {
    'marina bay': 'Marina Bay Residences',
    'marina heights': 'Marina Heights',
    'palm vista': 'Palm Vista Residences',
    'downtown vista': 'Downtown Vista',
    'horizon heights': 'Horizon Heights',
    'skyline towers': 'Skyline Towers',
    'seafront elite': 'Seafront Elite',
  }

  let explicitProjects = allProjects.filter(p => q.includes(p.toLowerCase()))
  if (!explicitProjects.length) {
    for (const [alias, fullName] of Object.entries(projectAliases)) {
      if (q.includes(alias)) {
        explicitProjects = [fullName]
        break
      }
    }
  }

  let projects: string[]
  if (explicitProjects.length) {
    projects = explicitProjects
  } else {
    const wordMatches = allProjects.filter(p =>
      p.toLowerCase().split(' ').some(w => w.length >= 5 && q.includes(w))
    )
    projects = wordMatches.length === 1 ? wordMatches : []
  }

  const projectVocab = new Set(
    allProjects.flatMap(p => p.toLowerCase().split(' ').filter(w => w.length >= 4))
  )
  const queryWords = q.split(/\W+/).filter(Boolean)
  const hasProjectHintWord = queryWords.some(w => projectVocab.has(w))
  if (!projects.length && hasProjectHintWord) {
    return { records: [], outcome: 'DECLINED_NOT_GROUNDED', reason: 'no matching listing record found for this query.' }
  }

  const unit = q.match(/(?:unit\s+)?(\d{3,4})\b/i)?.[1]
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
  if (/commission/i.test(question) && !finalRecords.some(r => parsePercent(r.notes) !== null)) {
    return { records: finalRecords, outcome: 'DECLINED_NOT_GROUNDED', reason: 'derivation requires a commission percentage, which is not present on this record.' }
  }
  return { records: finalRecords }
}
function parseCurrency(value: string) { return value.split(' ')[0] }
