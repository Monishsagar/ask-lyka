import { Listing } from '@/data/listings'

export interface ModelClient {
  propose(question: string, context: Listing[]): Promise<{ answerText: string; citedRecordIds: string[] }>
}
