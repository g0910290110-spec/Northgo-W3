import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const SESSION_MS = 8 * 60 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const sessions = new Map();
const attempts = new Map();

export const ADMIN_USER = process.env.ADMIN_USER || 'admin';
export const usingDefaultPassword = !process.env.ADMIN_PASSWORD;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'northgo-admin';

const salt = randomBytes(16);
const passwordHash = await scryptAsync(ADMIN_PASSWORD, salt, 64);

export async function verifyPassword(username, password) {
  const userOk = username === ADMIN_USER;
  const hash = await scryptAsync(String(password ?? ''), salt, 64);
  const passOk = timingSafeEqual(hash, passwordHash);
  return userOk && passOk;
}

export function tooManyAttempts(ip) {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.start > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailure(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    attempts.set(ip, { start: now, count: 1 });
    return;
  }
  entry.count += 1;
}

export function clearFailures(ip) {
  attempts.delete(ip);
}

export function createSession() {
  const token = randomBytes(32).toString('hex');
  const csrf = randomBytes(24).toString('hex');
  sessions.set(token, { csrf, exp: Date.now() + SESSION_MS, user: ADMIN_USER });
  return { token, csrf };
}

export function readSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.exp < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function destroySession(token) {
  if (token) sessions.delete(token);
}

export function cookieHeader(token) {
  const secure = process.env.ADMIN_SECURE === '1' ? '; Secure' : '';
  return `ng_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}${secure}`;
}

export function clearCookieHeader() {
  return 'ng_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0';
}
