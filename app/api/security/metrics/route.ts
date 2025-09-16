import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/db-secure';
import { metricsRL } from '@/lib/rl-enhanced';
import { constantTimeCompare } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  const expectedToken = process.env.METRICS_BEARER;

  if (!expectedToken || !constantTimeCompare(token, expectedToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await metricsRL.limit(ip);
  
  if (!success) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  try {
    // Gather security metrics
    const metrics = {
      timestamp: Date.now(),
      security: {
        blocked_ips: await redis.keys('blocked:*').then(keys => keys.length),
        active_sessions: await redis.keys('session:*').then(keys => keys.length),
        failed_auth_attempts: await redis.get('metric:failed_auth') || 0,
        suspicious_activities: await redis.get('metric:suspicious') || 0,
        rate_limit_violations: await redis.get('metric:rate_limit_violations') || 0,
      },
      health: {
        redis_connected: true,
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
      },
      audit: {
        total_events: await redis.keys('audit:*').then(async keys => {
          let total = 0;
          for (const key of keys) {
            total += await redis.llen(key);
          }
          return total;
        }),
      },
    };

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Metrics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
