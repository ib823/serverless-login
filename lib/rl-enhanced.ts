import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/db';

export const webauthnRL = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1m'),
  analytics: true,
  prefix: 'rl:webauthn',
});

export const oauthRL = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1m'),
  analytics: true,
  prefix: 'rl:oauth',
});

export const credentialsRL = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1m'),
  analytics: true,
  prefix: 'rl:credentials',
});

export const metricsRL = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1m'),
  analytics: true,
  prefix: 'rl:metrics',
});
