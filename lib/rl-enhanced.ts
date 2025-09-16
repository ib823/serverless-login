import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './db';

// Progressive rate limiting
export const webauthnRL = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'rl:webauthn',
  analytics: true,
});

// Stricter OAuth limits
export const oauthRL = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '5 m'),
  prefix: 'rl:oauth',
  analytics: true,
});

// Credentials management
export const credentialsRL = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '5 m'),
  prefix: 'rl:credentials',
  analytics: true,
});

// Metrics endpoint
export const metricsRL = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, '10 m'),
  prefix: 'rl:metrics',
  analytics: true,
});

// IP-based blocking for repeated violations
export const blocklistRL = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(1, '24 h'),
  prefix: 'rl:blocklist',
});

// Helper to check if IP is blocked
export async function isBlocked(ip: string): Promise<boolean> {
  const { success } = await blocklistRL.limit(ip);
  return !success;
}

// Helper to block an IP
export async function blockIP(ip: string): Promise<void> {
  await redis.set(`blocked:${ip}`, true, { ex: 86400 }); // 24 hour block
}

// Progressive delay calculation
export function calculateDelay(attempts: number): number {
  return Math.min(1000 * Math.pow(2, attempts), 30000); // Max 30 seconds
}
