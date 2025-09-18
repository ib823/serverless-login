import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { constantTimeCompare } from './crypto';

const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = '__Host-csrf';
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
export function validateCSRFToken(request: NextRequest): boolean {
  // Skip for GET requests
  if (request.method === 'GET' || request.method === 'HEAD') {
    return true;
  }
  const token = request.headers.get(CSRF_HEADER);
  const cookie = request.cookies.get(CSRF_COOKIE)?.value;
  if (!token || !cookie) {
    return false;
  return constantTimeCompare(token, cookie);
export function setCSRFCookie(token: string): string {
  return `__Host-csrf=${token}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`;
