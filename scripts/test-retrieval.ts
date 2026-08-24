import { retrieve } from '../lib/retrieval'

const tests = [
  // Should DECLINE — project does not exist
  "What is the price of Marina mall Unit 704?",
  "What is the price of NonExistent Tower unit 100?",
  "What is the price of Sunset Marina unit 505?",
  // Should PROCEED — exact project names
  "What is the price of Marina Heights unit 704?",
  "What's the price of Marina Bay Residences unit 1204?",
  "What's the price of Horizon Heights unit 1109?",
]

for (const q of tests) {
  const r = retrieve(q)
  const status = r.outcome ? `DECLINED (${r.reason})` : `OK → records: [${r.records.map(x => x.id).join(', ')}]`
  console.log(`Q: ${q}\n   ${status}\n`)
}
