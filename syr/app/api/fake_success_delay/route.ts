import { NextResponse } from 'next/server';

export async function POST() {
  // Wait 1.5 seconds before responding
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return NextResponse.json(
    { msg: "Fake success API with 1.5s delay" },
    { status: 200 }
  );
}