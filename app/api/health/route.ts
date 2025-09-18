import { NextResponse } from 'next/server';
import { redis } from '@/lib/db';

export async function GET() {
  let redisHealthy = false;
  
  try {
    // Check if redis has ping method (actual Redis) or is InMemoryStore
    if ('ping' in redis && typeof redis.ping === 'function') {
      await redis.ping();
      redisHealthy = true;
    } else {
      // InMemoryStore doesn't have ping, but if we got here it's working
    }
    
    return NextResponse.json({
      ok: true,
      redis: redisHealthy,
      kid: process.env.JWT_KID || 'default',
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
