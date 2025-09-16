import { NextResponse } from 'next/server';
import { redis } from '@/lib/db';

export async function GET() {
  try {
    await redis.ping();
    
    return NextResponse.json({
      ok: true,
      redis: true,
      kid: 'main',
      uptime: process.uptime(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        redis: false,
        error: String(error),
      },
      { status: 503 }
    );
  }
}
