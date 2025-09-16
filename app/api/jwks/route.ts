import { NextResponse } from 'next/server';
import { getJWKS } from '@/lib/jwt';

export async function GET() {
  const jwks = await getJWKS();
  return NextResponse.json(jwks);
}
