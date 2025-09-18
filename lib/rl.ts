import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './db';

export const webauthnRL = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'rl:webauthn'
});
export const oauthRL = new Ratelimit({
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rl:oauth'
export const credentialsRL = new Ratelimit({
  prefix: 'rl:credentials'
export const metricsRL = new Ratelimit({
  prefix: 'rl:metrics'
