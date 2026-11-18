import { userChangeError, validateUser } from '../server/validate.mjs';

const ITERATIONS = 120_000;

function bytesToBase64Url(bytes) {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlToBytes(value) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `usr_${Date.now().toString(36)}${hex}`;
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return `pbkdf2$${ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(new Uint8Array(bits))}`;
}

async function verifyPasswordHash(password, stored) {
  const [algo, iterations, salt, hash] = String(stored || '').split('$');
  if (algo !== 'pbkdf2' || !iterations || !salt || !hash) return false;
  const rounds = Number(iterations);
  if (!Number.isInteger(rounds) || rounds < 10_000 || rounds > 1_000_000) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password ?? '')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: base64UrlToBytes(salt), iterations: rounds, hash: 'SHA-256' },
    key,
    256,
  );
  const actual = new Uint8Array(bits);
  const expected = base64UrlToBytes(hash);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let index = 0; index < actual.length; index += 1) diff |= actual[index] ^ expected[index];
  return diff === 0;
}

function fromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email || '',
    role: row.role,
    active: row.active === 1 || row.active === true,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPublic(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function ensureSeed(env) {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first();
  if ((row?.n ?? 0) > 0 || !env.ADMIN_USER || !env.ADMIN_PASSWORD) return;
  const now = new Date().toISOString();
  await env.DB
    .prepare(
      `INSERT INTO users (id, username, name, email, role, active, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, '', 'admin', 1, ?, ?, ?)`,
    )
    .bind(
      newId(),
      String(env.ADMIN_USER).trim().toLowerCase(),
      '系統管理員',
      await hashPassword(env.ADMIN_PASSWORD),
      now,
      now,
    )
    .run();
}

export async function listUsers(env) {
  const { results } = await env.DB.prepare('SELECT * FROM users ORDER BY username COLLATE NOCASE').all();
  return (results ?? []).map((row) => toPublic(fromRow(row)));
}

export async function getUser(env, id) {
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  return toPublic(fromRow(row));
}

export async function authenticate(env, username, password) {
  await ensureSeed(env);
  const name = String(username || '').trim().toLowerCase();
  const row = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(name).first();
  const user = fromRow(row);
  if (!user || !user.active) return null;
  if (!(await verifyPasswordHash(password, user.passwordHash))) return null;
  return toPublic(user);
}

async function readAll(env) {
  const { results } = await env.DB.prepare('SELECT * FROM users').all();
  return (results ?? []).map(fromRow);
}

export async function createUser(env, input) {
  const parsed = validateUser(input, { creating: true });
  if (parsed.error) return parsed;
  const all = await readAll(env);
  if (all.some((item) => item.username === parsed.user.username)) return { error: '這個帳號已經存在。' };
  const now = new Date().toISOString();
  const user = {
    id: newId(),
    username: parsed.user.username,
    name: parsed.user.name,
    email: parsed.user.email,
    role: parsed.user.role,
    active: parsed.user.active,
    createdAt: now,
    updatedAt: now,
  };
  await env.DB
    .prepare(
      `INSERT INTO users (id, username, name, email, role, active, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      user.id,
      user.username,
      user.name,
      user.email,
      user.role,
      user.active ? 1 : 0,
      await hashPassword(parsed.user.password),
      user.createdAt,
      user.updatedAt,
    )
    .run();
  return { user };
}

export async function updateUser(env, id, input, actor) {
  const parsed = validateUser(input, { creating: false });
  if (parsed.error) return parsed;
  const all = await readAll(env);
  const current = all.find((item) => item.id === id);
  if (!current) return { error: '找不到這位使用者。' };
  if (all.some((item) => item.username === parsed.user.username && item.id !== id)) {
    return { error: '這個帳號已經存在。' };
  }
  const guard = userChangeError({ actor, target: toPublic(current), next: parsed.user, users: all.map(toPublic) });
  if (guard) return { error: guard };
  const user = {
    ...toPublic(current),
    username: parsed.user.username,
    name: parsed.user.name,
    email: parsed.user.email,
    role: parsed.user.role,
    active: parsed.user.active,
    updatedAt: new Date().toISOString(),
  };
  if (parsed.user.password) {
    await env.DB
      .prepare(
        `UPDATE users SET username = ?, name = ?, email = ?, role = ?, active = ?, password_hash = ?, updated_at = ? WHERE id = ?`,
      )
      .bind(user.username, user.name, user.email, user.role, user.active ? 1 : 0, await hashPassword(parsed.user.password), user.updatedAt, id)
      .run();
  } else {
    await env.DB
      .prepare(`UPDATE users SET username = ?, name = ?, email = ?, role = ?, active = ?, updated_at = ? WHERE id = ?`)
      .bind(user.username, user.name, user.email, user.role, user.active ? 1 : 0, user.updatedAt, id)
      .run();
  }
  return { user };
}

export async function deleteUser(env, id, actor) {
  const all = await readAll(env);
  const current = all.find((item) => item.id === id);
  if (!current) return { error: '找不到這位使用者。' };
  const guard = userChangeError({ actor, target: toPublic(current), users: all.map(toPublic), deleting: true });
  if (guard) return { error: guard };
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return { ok: true };
}
