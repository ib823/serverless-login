import { logAudit } from './db';

export async function audit(type: string, sub: string, ip: string) {
  await logAudit({
    type,
    sub,
    timestamp: Date.now(),
    ip,
  });
}
