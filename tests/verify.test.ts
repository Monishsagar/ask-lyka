import { describe, expect, it } from 'vitest'
import { listings } from '@/data/listings'
import { verify } from '@/lib/verify'
import { retrieve } from '@/lib/retrieval'
describe('grounding',()=>{it('passes exact grounded price',()=>{const r=listings.filter(x=>x.id==='P-10');expect(verify('The price is AED 1,420,000.',['P-10'],r).ok).toBe(true)});it('catches fabricated claim',()=>{expect(verify('I am confident: AED 9,999,999.',['P-10'],[listings[9]]).ok).toBe(false)});it('declines currency conflict',()=>{expect(retrieve("What's the price of Skyline Towers unit 2201?").outcome).toBe('DECLINED_NOT_GROUNDED')});it('requires transparent commission derivation',()=>{const r=[listings[10]];expect(verify('AED 64,000 (3,200,000 × 2% = 64000)', ['P-11'],r).ok).toBe(true);expect(verify('Commission is AED 64,000.', ['P-11'],r).ok).toBe(false)})})
