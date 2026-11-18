import { randomBytes } from 'node:crypto';
import { authenticate, ensureSeed } from './users.mjs';

const SESSION_MS = 8 * 60 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const sessions = new Map();
const attempts = new Map();

export const ADMIN_USER = process.env.ADMIN_USER || 'admin';
export const usingDefaultPassword = !process.env.ADMIN_PASSWORD;

export async function verifyPassword(username, password) {
  await ensureSeed();
  return authenticate(username, password);
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

export function createSession(account) {
  const token = randomBytes(32).toString('hex');
  const csrf = randomBytes(24).toString('hex');
  const user = {
    id: account.id,
    username: account.username,
    name: account.name,
    role: account.role,
  };
  sessions.set(token, { csrf, exp: Date.now() + SESSION_MS, user });
  return { token, csrf, user };
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

export function updateSessionUser(token, account) {
  const session = sessions.get(token);
  if (!session) return;
  session.user = {
    id: account.id,
    username: account.username,
    name: account.name,
    role: account.role,
  };
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
