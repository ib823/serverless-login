import { logAudit } from './db';

export async function audit(
  type: string,
  sub?: string,
  ip?: string,
  details?: Record<string, any>
) {
  await logAudit({
    type,
    timestamp: Date.now(),
    sub,
    ip,
    details: details || {}
  });
}
