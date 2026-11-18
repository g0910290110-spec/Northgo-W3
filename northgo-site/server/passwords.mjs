import { pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2Async = promisify(pbkdf2);
const ITERATIONS = 120_000;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await pbkdf2Async(String(password), salt, ITERATIONS, 32, 'sha256');
  return `pbkdf2$${ITERATIONS}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPasswordHash(password, stored) {
  const [algo, iterations, salt, hash] = String(stored || '').split('$');
  if (algo !== 'pbkdf2' || !iterations || !salt || !hash) return false;
  const rounds = Number(iterations);
  if (!Number.isInteger(rounds) || rounds < 10_000 || rounds > 1_000_000) return false;
  const actual = await pbkdf2Async(String(password ?? ''), Buffer.from(salt, 'base64url'), rounds, 32, 'sha256');
  const expected = Buffer.from(hash, 'base64url');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
