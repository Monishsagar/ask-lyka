import { describe, expect, it } from 'vitest'
import { listings } from '@/data/listings'
import { verify } from '@/lib/verify'
import { retrieve } from '@/lib/retrieval'
import { runClientStub } from '@/lib/client-stub'

describe('grounding', () => {
  it('passes exact grounded price', () => {
    const r = listings.filter(x => x.id === 'P-10')
    expect(verify('The price is AED 1,420,000.', ['P-10'], r).ok).toBe(true)
  })

  it('catches fabricated claim', () => {
    expect(verify('I am confident: AED 9,999,999.', ['P-10'], [listings[9]]).ok).toBe(false)
  })

  it('declines currency conflict', () => {
    expect(retrieve("What's the price of Skyline Towers unit 2201?").outcome).toBe('DECLINED_NOT_GROUNDED')
  })

  it('requires transparent commission derivation', () => {
    const r = [listings[10]]
    expect(verify('AED 64,000 (3,200,000 × 2% = 64000)', ['P-11'], r).ok).toBe(true)
    expect(verify('Commission is AED 64,000.', ['P-11'], r).ok).toBe(false)
  })
})

describe('policy enforcement (advice & non-schema fields)', () => {
  it('declines advice questions in retrieval', () => {
    const questions = [
      'Is Marina Bay Residences unit 1204 a good investment right now?',
      'Should I buy Downtown Vista unit 802?',
      'Would you recommend Palm Vista unit 305?',
      'What is your opinion on unit 1502?',
      'What is the rental yield / ROI of unit 501?',
      'Is the price negotiable for unit 802?',
      'Which unit is the best deal?'
    ]
    for (const q of questions) {
      const res = retrieve(q)
      expect(res.outcome).toBe('DECLINED_OUT_OF_POLICY')
      expect(res.reason).toBe('question asks for advice or a field not present in the schema.')
    }
  })

  it('declines questions asking for fields not present in the schema', () => {
    const questions = [
      "What's the phone number of the agent on Downtown Vista unit 802?",
      'What is the agent email for unit 1204?',
      'Who is the broker for Seafront Elite?',
      'What is the sqft of Skyline Towers unit 2201?',
      'What floor is unit 1204 on?',
      'Where is Horizon Heights located?',
      'Does unit 1109 have a pool or parking spot?',
      'What is the maintenance fee for unit 802?',
      'What is the payment plan for Downtown Vista unit 1502?',
      'Who is the developer of Palm Vista?'
    ]
    for (const q of questions) {
      const res = retrieve(q)
      expect(res.outcome).toBe('DECLINED_OUT_OF_POLICY')
      expect(res.reason).toBe('question asks for advice or a field not present in the schema.')
    }
  })

  it('allows valid schema field queries including derived commission', () => {
    expect(retrieve("What's the price of Marina Bay Residences unit 1204?").outcome).toBeUndefined()
    expect(retrieve("Is Downtown Vista unit 802 available?").outcome).toBeUndefined()
    expect(retrieve("What's the agent's commission on Seafront Elite unit 501?").outcome).toBeUndefined()
  })

  it('declines out-of-policy questions in client offline stub mode', async () => {
    const resAdvice = await runClientStub('Is unit 1204 a good investment?')
    expect(resAdvice.outcome).toBe('DECLINED_OUT_OF_POLICY')
    expect(resAdvice.reason).toBe('question asks for advice or a field not present in the schema.')

    const resPhone = await runClientStub('Give me the agent phone number for unit 802')
    expect(resPhone.outcome).toBe('DECLINED_OUT_OF_POLICY')
    expect(resPhone.reason).toBe('question asks for advice or a field not present in the schema.')
  })
})

describe('QA Bug Regression Tests', () => {
  it('Bug 1: proposing AED 1,950,000 against cited P-02 verifies true', () => {
    const p02 = listings.filter(x => x.id === 'P-02')
    expect(verify('The current price of Marina Bay Residences unit 1204 is AED 1,950,000.', ['P-02'], p02).ok).toBe(true)
  })

  it('Bug 2: non-existent field sqft on conflicted record declines with field-does-not-exist reason', () => {
    const res = retrieve("What's the square footage of Skyline Towers unit 2201?")
    expect(res.outcome).toBe('DECLINED_OUT_OF_POLICY')
    expect(res.reason).toBe('question asks for advice or a field not present in the schema.')
  })

  it('Bug 3: cheapest listing query declines as aggregate out-of-policy', () => {
    const res = retrieve("Which of your listings is the cheapest?")
    expect(res.outcome).toBe('DECLINED_OUT_OF_POLICY')
    expect(res.reason).toBe('aggregate query across records, outside single-record answer scope.')
  })

  it('Bug 3: commission query on listing without commission percentage declines as missing input', () => {
    const res = retrieve("What commission would I earn on Marina Bay unit 1204?")
    expect(res.outcome).toBe('DECLINED_NOT_GROUNDED')
    expect(res.reason).toBe('derivation requires a commission percentage, which is not present on this record.')
  })

  it('Bug 3: comparison query between two units declines with multi-record reason', () => {
    const res = retrieve("Between Skyline Towers 2201 and Horizon Heights 1109, which is available?")
    expect(res.outcome).toBe('DECLINED_NOT_GROUNDED')
    expect(res.reason).toBe("question requires comparing multiple records, which this system's retrieval does not currently support.")
  })

  it('Bug 3 Determinism test: running Bug 3 questions twice returns identical output', () => {
    const bug3Questions = [
      "Which of your listings is the cheapest?",
      "What commission would I earn on Marina Bay unit 1204?",
      "Between Skyline Towers 2201 and Horizon Heights 1109, which is available?",
    ]
    for (const q of bug3Questions) {
      const run1 = retrieve(q)
      const run2 = retrieve(q)
      expect(run1).toEqual(run2)
    }
  })

  it('Bug 4: multi-entity comparison and price trend queries decline with multi-record reason', () => {
    const resSamePrice = retrieve("Is Marina Bay 1204 the same price as Marina Heights 704?")
    expect(resSamePrice.outcome).toBe('DECLINED_NOT_GROUNDED')
    expect(resSamePrice.reason).toBe("question requires comparing multiple records, which this system's retrieval does not currently support.")

    const resTrend = retrieve("Has the price of Marina Bay 1204 gone up or down recently?")
    expect(resTrend.outcome).toBe('DECLINED_NOT_GROUNDED')
    expect(resTrend.reason).toBe("question requires comparing multiple records, which this system's retrieval does not currently support.")
  })

  it('Issue 1: null/empty field on retrieved record declines as NOT GROUNDED with field null/empty reason', () => {
    const res = retrieve("What's the price for Downtown Vista unit 1502?")
    expect(res.outcome).toBe('DECLINED_NOT_GROUNDED')
    expect(res.reason).toBe('field price is null/empty on cited record P-04')
  })

  it('Issue 2: temporally-qualified question resolves to matching historical record P-01', () => {
    const res = retrieve("What was the price of Marina Bay Residences unit 1204 originally?")
    expect(res.outcome).toBeUndefined()
    expect(res.records.map(x => x.id)).toEqual(['P-01'])
  })
})



