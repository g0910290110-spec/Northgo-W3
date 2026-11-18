import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clip, SERVICES, STATUSES, validateInquiry } from './validate.mjs';

export { SERVICES, STATUSES, validateInquiry };

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
const filePath = path.join(dataDir, 'inquiries.json');

let queue = Promise.resolve();

function withLock(task) {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
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

async function writeAll(inquiries) {
  await mkdir(dataDir, { recursive: true });
  const temp = `${filePath}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(inquiries, null, 2));
  await rename(temp, filePath);
}

export function createInquiry(fields) {
  const now = new Date().toISOString();
  return {
    id: `inq_${Date.now().toString(36)}${randomBytes(3).toString('hex')}`,
    ...fields,
    status: 'new',
    note: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function listInquiries() {
  return withLock(async () => {
    const all = await readAll();
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

export function addInquiry(fields, extra = {}) {
  return withLock(async () => {
    const all = await readAll();
    const inquiry = createInquiry(fields);
    if (STATUSES.has(extra.status)) inquiry.status = extra.status;
    if (typeof extra.note === 'string') inquiry.note = clip(extra.note, 4000);
    all.push(inquiry);
    await writeAll(all);
    return inquiry;
  });
}

export function getInquiry(id) {
  return withLock(async () => (await readAll()).find((item) => item.id === id) ?? null);
}

export function updateInquiry(id, input) {
  return withLock(async () => {
    const all = await readAll();
    const inquiry = all.find((item) => item.id === id);
    if (!inquiry) return { error: '找不到這筆詢問。' };
    const result = validateInquiry({ ...input, consent: 'on' });
    if (result.error || !result.inquiry) return { error: result.error || '內容無效。' };
    const createdAt = inquiry.createdAt;
    Object.assign(inquiry, result.inquiry, { id, createdAt });
    inquiry.status = STATUSES.has(input.status) ? input.status : inquiry.status;
    inquiry.note = clip(input.note, 4000);
    inquiry.updatedAt = new Date().toISOString();
    await writeAll(all);
    return { inquiry };
  });
}

export function deleteInquiry(id) {
  return withLock(async () => {
    const all = await readAll();
    const next = all.filter((item) => item.id !== id);
    if (next.length === all.length) return false;
    await writeAll(next);
    return true;
  });
}
