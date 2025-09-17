export const runtime = 'nodejs';
import { metricsRL } from '@/lib/rl';
import { NextRequest, NextResponse } from 'next/server';
import { audit } from '@/lib/audit';

const counters: Record<string, number> = {
  webauthn_register_options: 0,
  webauthn_register_verify: 0,
  webauthn_auth_options: 0,
  webauthn_auth_verify: 0,
  oauth_authorize: 0,
  oauth_token: 0,
  oauth_refresh: 0,
  rate_limit_blocks: 0,
  verify_failures: 0,
  refresh_reuse_detections: 0,
  scrapes: 0,
};

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ') || authHeader.slice(7) !== process.env.METRICS_BEARER) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { success } = await metricsRL.limit(ip);
  if (!success) {
    counters.rate_limit_blocks++;
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  counters.scrapes++;
  await audit('metrics_read', '', ip);

  const lines = Object.entries(counters).map(([k, v]) => `passkeys_idp_${k}_total ${v}`).join('\n');
  return new NextResponse(lines + '\n', { headers: { 'Content-Type': 'text/plain' } });
}
