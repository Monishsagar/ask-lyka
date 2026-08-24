import { NextResponse } from 'next/server'
import { retrieve } from '@/lib/retrieval'
import { getModel } from '@/lib/model'
import { verify } from '@/lib/verify'
import { addLog } from '@/lib/log'
export const runtime='nodejs'
export async function POST(req:Request){ const {question}=await req.json(); const found=retrieve(String(question||'')); let result:any
 if(found.outcome) result={outcome:found.outcome,answer:null,citations:[],reason:found.reason,verifiedClaims:[]}
 else { const proposal=await getModel().propose(question,found.records); const check=verify(proposal.answerText,proposal.citedRecordIds,found.records); result=check.ok?{outcome:'ANSWERED',answer:proposal.answerText,citations:check.verifiedClaims.map(c=>({id:c.recordId,field:c.field})),reason:check.reason,verifiedClaims:check.verifiedClaims}:{outcome:'DECLINED_NOT_GROUNDED',answer:null,citations:[],reason:check.reason,verifiedClaims:check.verifiedClaims} }
 const response={...result,timestamp:new Date().toISOString(),mode:process.env.MODEL_PROVIDER==='live'?'live':'stub',question}; addLog(response); return NextResponse.json(response) }
