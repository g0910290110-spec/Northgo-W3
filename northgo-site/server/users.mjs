import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword, verifyPasswordHash } from './passwords.mjs';
import { userChangeError, validateUser } from './validate.mjs';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
const filePath = path.join(dataDir, 'users.json');

let queue = Promise.resolve();

function withLock(task) {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function newId() {
  return `usr_${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
}

export function toPublic(user) {
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

async function readAll() {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeAll(users) {
  await mkdir(dataDir, { recursive: true });
  const temp = `${filePath}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(users, null, 2));
  await rename(temp, filePath);
}

export function ensureSeed() {
  return withLock(async () => {
    const all = await readAll();
    if (all.length) return { created: false };
    const now = new Date().toISOString();
    const username = String(process.env.ADMIN_USER || 'admin').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'northgo-admin';
    await writeAll([
      {
        id: newId(),
        username,
        name: '系統管理員',
        email: '',
        role: 'admin',
        active: true,
        passwordHash: await hashPassword(password),
        createdAt: now,
        updatedAt: now,
      },
    ]);
    return { created: true };
  });
}

export function listUsers() {
  return withLock(async () => {
    const all = await readAll();
    return all
      .map(toPublic)
      .sort((a, b) => a.username.localeCompare(b.username, 'en') || a.name.localeCompare(b.name, 'zh-Hant'));
  });
}

export function getUser(id) {
  return withLock(async () => toPublic((await readAll()).find((item) => item.id === id)));
}

export function authenticate(username, password) {
  return withLock(async () => {
    const all = await readAll();
    const name = String(username || '').trim().toLowerCase();
    const user = all.find((item) => item.username === name);
    if (!user || !user.active) return null;
    if (!(await verifyPasswordHash(password, user.passwordHash))) return null;
    return toPublic(user);
  });
}

export function createUser(input) {
  return withLock(async () => {
    const parsed = validateUser(input, { creating: true });
    if (parsed.error) return parsed;
    const all = await readAll();
    if (all.some((item) => item.username === parsed.user.username)) return { error: '這個帳號已經存在。' };
    const now = new Date().toISOString();
    const record = {
      id: newId(),
      username: parsed.user.username,
      name: parsed.user.name,
      email: parsed.user.email,
      role: parsed.user.role,
      active: parsed.user.active,
      passwordHash: await hashPassword(parsed.user.password),
      createdAt: now,
      updatedAt: now,
    };
    all.push(record);
    await writeAll(all);
    return { user: toPublic(record) };
  });
}

export function updateUser(id, input, actor) {
  return withLock(async () => {
    const parsed = validateUser(input, { creating: false });
    if (parsed.error) return parsed;
    const all = await readAll();
    const record = all.find((item) => item.id === id);
    if (!record) return { error: '找不到這位使用者。' };
    if (all.some((item) => item.username === parsed.user.username && item.id !== id)) {
      return { error: '這個帳號已經存在。' };
    }
    const guard = userChangeError({
      actor,
      target: toPublic(record),
      next: parsed.user,
      users: all.map(toPublic),
    });
    if (guard) return { error: guard };
    record.username = parsed.user.username;
    record.name = parsed.user.name;
    record.email = parsed.user.email;
    record.role = parsed.user.role;
    record.active = parsed.user.active;
    if (parsed.user.password) record.passwordHash = await hashPassword(parsed.user.password);
    record.updatedAt = new Date().toISOString();
    await writeAll(all);
    return { user: toPublic(record) };
  });
}

export function deleteUser(id, actor) {
  return withLock(async () => {
    const all = await readAll();
    const record = all.find((item) => item.id === id);
    if (!record) return { error: '找不到這位使用者。' };
    const guard = userChangeError({
      actor,
      target: toPublic(record),
      users: all.map(toPublic),
      deleting: true,
    });
    if (guard) return { error: guard };
    await writeAll(all.filter((item) => item.id !== id));
    return { ok: true };
  });
}
