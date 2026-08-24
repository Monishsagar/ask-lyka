import { NextResponse } from 'next/server'
import { getLog } from '@/lib/log'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(await getLog())
}
