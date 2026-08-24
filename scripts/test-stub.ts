import { listings } from '../data/listings'
import { StubClient } from '../lib/model/stub'
import { verify } from '../lib/verify'

async function main() {
  const client = new StubClient()

  const cases = [
    { q: 'What is the status of Marina Heights Unit 704?',           ids: ['P-12'] },
    { q: "What's the price of Marina Bay Residences unit 1204?",     ids: ['P-02'] },
    { q: "Can I still buy Palm Vista Residences unit 305?",          ids: ['P-05'] },
    { q: "What's the agent's commission on Seafront Elite unit 501?", ids: ['P-11'] },
    { q: "How many bedrooms does Horizon Heights unit 1109 have?",   ids: ['P-10'] },
    { q: "What is the price of Downtown Vista unit 1502?",           ids: ['P-04'] },
    { q: "When was Horizon Heights unit 1108 last updated?",         ids: ['P-09'] },
  ]

  for (const { q, ids } of cases) {
    const records = listings.filter(x => ids.includes(x.id))
    const proposal = await client.propose(q, records)
    const check = verify(proposal.answerText, proposal.citedRecordIds, records)
    console.log(`Q: ${q}`)
    console.log(`A: ${proposal.answerText}`)
    console.log(`→ ${check.ok ? 'ANSWERED ✓' : 'DECLINED ✗'} | ${check.reason}`)
    console.log()
  }
}

main()
