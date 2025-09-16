import { NextRequest, NextResponse } from 'next/server';
import { metricsRL } from '@/lib/rl';
import { audit } from '@/lib/audit';

const metrics = {
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
};

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  if (token !== process.env.METRICS_BEARER) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { success } = await metricsRL.limit(ip);
  if (!success) {
    metrics.rate_limit_blocks++;
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  await audit('metrics_read', undefined, ip);

  const prometheusMetrics = Object.entries(metrics)
    .map(([key, value]) => \`passkeys_idp_\${key}_total \${value}\`)
    .join('\n');

  return new NextResponse(prometheusMetrics, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
