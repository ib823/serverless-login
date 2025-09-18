import crypto from 'crypto';
import { redis } from './db-secure';
import { logAudit } from './db-secure';

interface LoginPattern {
  times: number[];
  locations: string[];
  devices: string[];
  failedAttempts: number;
}
export async function checkLoginAnomaly(
  userId: string,
  ip: string,
  userAgent: string,
  location?: string
): Promise<{ suspicious: boolean; reasons: string[] }> {
  const key = `pattern:${userId}`;
  const pattern = await redis.get<LoginPattern>(key) || {
    times: [],
    locations: [],
    devices: [],
    failedAttempts: 0,
  };
  const reasons: string[] = [];
  const currentHour = new Date().getHours();
  
  // Check time-based anomaly
  if (pattern.times.length > 10) {
    const avgHour = pattern.times.reduce((a, b) => a + b, 0) / pattern.times.length;
    if (Math.abs(currentHour - avgHour) > 6) {
      reasons.push('Unusual login time');
    }
  }
  // Check location anomaly
  if (location && pattern.locations.length > 0) {
    if (!pattern.locations.includes(location)) {
      reasons.push('New location detected');
  // Check device anomaly
  if (pattern.devices.length > 0) {
    if (!pattern.devices.includes(userAgent)) {
      reasons.push('New device detected');
  // Check failed attempts
  if (pattern.failedAttempts > 3) {
    reasons.push('Multiple failed attempts');
  // Update pattern
  pattern.times.push(currentHour);
  if (pattern.times.length > 100) pattern.times.shift();
  if (location && !pattern.locations.includes(location)) {
    pattern.locations.push(location);
    if (pattern.locations.length > 10) pattern.locations.shift();
  if (!pattern.devices.includes(userAgent)) {
    pattern.devices.push(userAgent);
    if (pattern.devices.length > 5) pattern.devices.shift();
  await redis.set(key, pattern, { ex: 2592000 }); // 30 days
  const suspicious = reasons.length > 0;
  if (suspicious) {
    await logAudit({
      type: 'anomaly_detected',
      sub: userId,
      timestamp: Date.now(),
      ip,
      details: reasons.join(', '),
    });
  return { suspicious, reasons };
// Device fingerprinting
export function generateDeviceFingerprint(req: Request): string {
  const headers = [
    req.headers.get('user-agent'),
    req.headers.get('accept-language'),
    req.headers.get('accept-encoding'),
    req.headers.get('accept'),
  ].join('|');
  return crypto
    .createHash('sha256')
    .update(headers)
    .digest('hex');
// Impossible travel detection
export async function checkImpossibleTravel(
  currentLocation: { lat: number; lon: number },
  timestamp: number
): Promise<boolean> {
  const lastLocationKey = `last-location:${userId}`;
  const lastLocation = await redis.get<{
    lat: number;
    lon: number;
    timestamp: number;
  }>(lastLocationKey);
  if (!lastLocation) {
    await redis.set(lastLocationKey, { ...currentLocation, timestamp }, { ex: 86400 });
    return false;
  const timeDiff = (timestamp - lastLocation.timestamp) / 3600000; // hours
  const distance = calculateDistance(
    lastLocation.lat,
    lastLocation.lon,
    currentLocation.lat,
    currentLocation.lon
  );
  const maxSpeed = 900; // km/h (airplane speed)
  const possibleDistance = maxSpeed * timeDiff;
  if (distance > possibleDistance) {
      type: 'impossible_travel',
      timestamp,
      ip: '',
      details: `Distance: ${distance}km in ${timeDiff}h`,
    return true;
  await redis.set(lastLocationKey, { ...currentLocation, timestamp }, { ex: 86400 });
  return false;
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
