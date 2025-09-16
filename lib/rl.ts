import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './db';

export const webauthnRL = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'rl:webauthn'
});

export const oauthRL = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rl:oauth'
});

export const credentialsRL = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rl:credentials'
});

export const metricsRL = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rl:metrics'
});
