import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';

export async function GET(request: NextRequest) {
  const cookies = parse(request.headers.get('cookie') || '');
  const session = cookies['__Host-session'];
  
  return NextResponse.json({
    user: session || null
  });
}
