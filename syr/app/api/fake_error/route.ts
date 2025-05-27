import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: "Fake error API response" },
    { status: 500 }
  );
}