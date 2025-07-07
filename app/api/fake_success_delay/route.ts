import { NextResponse } from 'next/server';
import { generateCorrelationId } from '@/lib/services/logger';

export async function POST() {
  const correlationId = generateCorrelationId()
  // Wait 1.5 seconds before responding
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const response = NextResponse.json(
    { msg: "Fake success API with 1.5s delay" },
    { status: 200 }
  )
  response.headers.set('x-spideryarn-correlation-id', correlationId)
  return response;
}