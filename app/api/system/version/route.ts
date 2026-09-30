import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  return NextResponse.json({
    version: 'v0.0.1',
    buildTime: '2026-08-17T15:24:17.933Z',
    buildDate: '22:24:17 17/8/2026',
    environment: process.env.NODE_ENV || 'production',
  });
}
