import { editorPage, listPage, loginPage, notFoundPage, userFormPage, usersPage } from '../server/render.mjs';
import { clip, STATUSES, validateInquiry } from '../server/validate.mjs';
import { authenticate, createUser, deleteUser, getUser, listUsers, updateUser } from './users.js';
import { images as adminImages } from './media.js';

const SESSION_MS = 8 * 60 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map();

function fromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    service: row.service,
    origin: row.origin,
    destination: row.destination,
    cargo: row.cargo,
    readyDate: row.ready_date,
    company: row.company,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    language: row.language,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `inq_${Date.now().toString(36)}${hex}`;
}

async function listInquiries(db) {
  const { results } = await db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC').all();
  return (results ?? []).map(fromRow);
}

async function getInquiry(db, id) {
  const row = await db.prepare('SELECT * FROM inquiries WHERE id = ?').bind(id).first();
  return fromRow(row);
}

async function addInquiry(db, fields, extra = {}) {
  const now = new Date().toISOString();
  const inquiry = {
    id: newId(),
    ...fields,
    status: STATUSES.has(extra.status) ? extra.status : 'new',
    note: typeof extra.note === 'string' ? clip(extra.note, 4000) : '',
    createdAt: now,
    updatedAt: now,
  };
  await db
    .prepare(
      `INSERT INTO inquiries (
        id, service, origin, destination, cargo, ready_date, company, name, email, phone,
        message, language, status, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      inquiry.id,
      inquiry.service,
      inquiry.origin,
      inquiry.destination,
      inquiry.cargo,
      inquiry.readyDate,
      inquiry.company,
      inquiry.name,
      inquiry.email,
      inquiry.phone,
      inquiry.message,
      inquiry.language,
      inquiry.status,
      inquiry.note,
      inquiry.createdAt,
      inquiry.updatedAt,
    )
    .run();
  return inquiry;
}

async function updateInquiry(db, id, input) {
  const existing = await getInquiry(db, id);
  if (!existing) return { error: '找不到這筆詢問。' };
  const result = validateInquiry({ ...input, consent: 'on' });
  if (result.error || !result.inquiry) return { error: result.error || '內容無效。' };
  const inquiry = {
    ...result.inquiry,
    id,
    status: STATUSES.has(input.status) ? input.status : existing.status,
    note: clip(input.note, 4000),
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await db
    .prepare(
      `UPDATE inquiries SET
        service = ?, origin = ?, destination = ?, cargo = ?, ready_date = ?, company = ?,
        name = ?, email = ?, phone = ?, message = ?, language = ?, status = ?, note = ?, updated_at = ?
      WHERE id = ?`,
    )
    .bind(
      inquiry.service,
      inquiry.origin,
      inquiry.destination,
      inquiry.cargo,
      inquiry.readyDate,
      inquiry.company,
      inquiry.name,
      inquiry.email,
      inquiry.phone,
      inquiry.message,
      inquiry.language,
      inquiry.status,
      inquiry.note,
      inquiry.updatedAt,
      inquiry.id,
    )
    .run();
  return { inquiry };
}

async function deleteInquiry(db, id) {
  const result = await db.prepare('DELETE FROM inquiries WHERE id = ?').bind(id).run();
  return (result.meta?.changes ?? 0) > 0;
}

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

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function signaturesMatch(left, right) {
  const a = base64UrlToBytes(left);
  const b = base64UrlToBytes(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a[index] ^ b[index];
  return diff === 0;
}

async function createSession(env, user) {
  const csrfBytes = crypto.getRandomValues(new Uint8Array(18));
  const payload = bytesToBase64Url(
    new TextEncoder().encode(
      JSON.stringify({ user, csrf: bytesToBase64Url(csrfBytes), exp: Date.now() + SESSION_MS }),
    ),
  );
  const signature = await hmac(env.SESSION_SECRET, payload);
  return { token: `${payload}.${signature}`, csrf: bytesToBase64Url(csrfBytes), user };
}

async function readSession(env, token) {
  if (!token || !env.SESSION_SECRET) return null;
  try {
    const [payload, signature] = String(token).split('.');
    if (!payload || !signature) return null;
    const expected = await hmac(env.SESSION_SECRET, payload);
    if (!signaturesMatch(signature, expected)) return null;
    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    if (!session?.csrf || !session.user || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

function cookieHeader(request, token) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `ng_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}${secure}`;
}

function clearCookieHeader() {
  return 'ng_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0';
}

function cookies(request) {
  const out = {};
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || 'unknown';
}

function tooManyAttempts(ip) {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.start > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    attempts.set(ip, { start: now, count: 1 });
    return;
  }
  entry.count += 1;
}

function clearFailures(ip) {
  attempts.delete(ip);
}

async function passwordsMatch(left, right) {
  const digest = async (value) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const a = await digest(String(left ?? ''));
  const b = await digest(String(right ?? ''));
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a[index] ^ b[index];
  return diff === 0;
}

function allowedOrigins(env) {
  return new Set(
    String(env.ADMIN_ORIGINS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function withCors(request, response, env) {
  const origin = request.headers.get('Origin');
  if (!origin || !allowedOrigins(env).has(origin)) return response;
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function html(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers },
  });
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers },
  });
}

function redirect(location, headers = {}) {
  return new Response(null, { status: 303, headers: { Location: location, ...headers } });
}

async function parseBody(request) {
  const raw = await request.text();
  if (raw.length > 32_000) {
    const error = new Error('payload too large');
    error.status = 413;
    throw error;
  }
  const type = request.headers.get('Content-Type') || '';
  if (type.includes('application/json')) return raw ? JSON.parse(raw) : {};
  return Object.fromEntries(new URLSearchParams(raw));
}

function blankInquiry() {
  return {
    service: 'sea', status: 'new', origin: '', destination: '', cargo: '', readyDate: '',
    company: '', name: '', email: '', phone: '', message: '', note: '', language: 'zh-tw',
  };
}

function inquiryFromInput(input) {
  return {
    ...blankInquiry(),
    service: input.service || 'sea',
    status: input.status || 'new',
    origin: input.origin || '',
    destination: input.destination || '',
    cargo: input.cargo || '',
    readyDate: input.ready_date || '',
    company: input.company || '',
    name: input.name || '',
    email: input.email || '',
    phone: input.phone || '',
    message: input.message || '',
    note: input.note || '',
    language: input.language || 'zh-tw',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (request.method === 'GET' && path.startsWith('/admin/assets/')) {
        const name = path.slice('/admin/assets/'.length);
        const data = adminImages[name];
        if (!data) return json({ ok: false, error: '找不到這個檔案。' }, 404);
        const binary = Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
        return new Response(binary, {
          headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' },
        });
      }

      if (request.method === 'OPTIONS' && path === '/api/inquiries') {
        return withCors(request, new Response(null, { status: 204 }), env);
      }

      if (request.method === 'POST' && path === '/api/inquiries') {
        let input;
        try {
          input = await parseBody(request);
        } catch {
          return withCors(request, json({ ok: false, error: '無法讀取表單內容。' }, 400), env);
        }
        const result = validateInquiry(input);
        if (result.ignored) return withCors(request, json({ ok: true }), env);
        if (result.error) return withCors(request, json({ ok: false, error: result.error }, 400), env);
        const inquiry = await addInquiry(env.DB, result.inquiry);
        return withCors(request, json({ ok: true, id: inquiry.id }, 201), env);
      }

      if (request.method === 'GET' && (path === '/' || path === '/admin/login')) {
        if (path === '/') return redirect('/admin/login');
        const session = await readSession(env, cookies(request).ng_session);
        if (session) return redirect('/admin/');
        return html(loginPage({ error: url.searchParams.get('error') === '1', locked: url.searchParams.get('locked') === '1' }));
      }

      if (request.method === 'POST' && path === '/admin/login') {
        const ip = clientIp(request);
        if (tooManyAttempts(ip)) return redirect('/admin/login?locked=1');
        if (!env.SESSION_SECRET) return html(loginPage({ error: true, locked: false }), 500);
        const input = await parseBody(request);
        let account = null;
        try {
          account = await authenticate(env, input.username, input.password);
        } catch (error) {
          if (!/no such table/i.test(String(error?.message || error))) throw error;
          if (!env.ADMIN_USER || !env.ADMIN_PASSWORD) return html(loginPage({ error: true, locked: false }), 500);
          const userOk = await passwordsMatch(input.username, env.ADMIN_USER);
          const passOk = await passwordsMatch(input.password, env.ADMIN_PASSWORD);
          account = userOk && passOk
            ? { id: '', username: env.ADMIN_USER, name: env.ADMIN_USER, role: 'admin' }
            : null;
        }
        if (!account) {
          recordFailure(ip);
          return redirect('/admin/login?error=1');
        }
        clearFailures(ip);
        const session = await createSession(env, account);
        return redirect('/admin/', { 'Set-Cookie': cookieHeader(request, session.token) });
      }

      if (request.method === 'POST' && path === '/admin/logout') {
        return redirect('/admin/login', { 'Set-Cookie': clearCookieHeader() });
      }

      if (!path.startsWith('/admin')) return json({ ok: false, error: '找不到這個路徑。' }, 404);

      const session = await readSession(env, cookies(request).ng_session);
      if (!session) return redirect('/admin/login');

      if (request.method === 'GET' && (path === '/admin/inquiries' || path === '/admin/inquiry')) return redirect('/admin/');
      if (request.method === 'GET' && path === '/admin/user') return redirect('/admin/users');

      const inquiryMatch = path.match(/^\/admin\/inquiries\/([A-Za-z0-9_]+)$/);
      const deleteMatch = path.match(/^\/admin\/inquiries\/([A-Za-z0-9_]+)\/delete$/);

      if (request.method === 'GET' && path === '/admin') {
        const status = url.searchParams.get('status') || '';
        const q = (url.searchParams.get('q') || '').trim().toLowerCase();
        const all = await listInquiries(env.DB);
        const counts = { all: all.length, new: all.filter((item) => item.status === 'new').length };
        const inquiries = all.filter((item) => {
          if (status && item.status !== status) return false;
          if (!q) return true;
          return [item.company, item.name, item.email, item.origin, item.destination, item.cargo, item.message]
            .join('\n')
            .toLowerCase()
            .includes(q);
        });
        return html(listPage({
          inquiries, status, q, counts, notice: url.searchParams.get('notice'), user: session.user, csrf: session.csrf,
        }));
      }

      if (request.method === 'GET' && path === '/admin/inquiries/new') {
        return html(editorPage({ inquiry: blankInquiry(), user: session.user, csrf: session.csrf }));
      }

      if (request.method === 'POST' && path === '/admin/inquiries') {
        const input = await parseBody(request);
        if (input.csrf !== session.csrf) return html(loginPage({ error: true, locked: false }), 403);
        const result = validateInquiry({ ...input, consent: 'on' });
        if (result.error || !result.inquiry) {
          return html(editorPage({
            inquiry: inquiryFromInput(input), user: session.user, csrf: session.csrf, error: result.error || '內容無效。',
          }), 400);
        }
        const inquiry = await addInquiry(env.DB, result.inquiry, { status: input.status, note: String(input.note ?? '') });
        return redirect(`/admin/inquiries/${inquiry.id}?saved=1`);
      }

      if (request.method === 'GET' && inquiryMatch && inquiryMatch[1] !== 'new') {
        const inquiry = await getInquiry(env.DB, inquiryMatch[1]);
        if (!inquiry) return html(notFoundPage({ user: session.user, message: '找不到這筆客戶詢問。' }), 404);
        return html(editorPage({
          inquiry, user: session.user, csrf: session.csrf, saved: url.searchParams.get('saved') === '1',
        }));
      }

      if (request.method === 'POST' && inquiryMatch && inquiryMatch[1] !== 'new') {
        const input = await parseBody(request);
        if (input.csrf !== session.csrf) return html(loginPage({ error: true, locked: false }), 403);
        const result = await updateInquiry(env.DB, inquiryMatch[1], input);
        if (result.error) {
          return html(editorPage({
            inquiry: { ...inquiryFromInput(input), id: inquiryMatch[1] },
            user: session.user,
            csrf: session.csrf,
            error: result.error,
          }), 400);
        }
        return redirect(`/admin/inquiries/${inquiryMatch[1]}?saved=1`);
      }

      if (request.method === 'POST' && deleteMatch) {
        const input = await parseBody(request);
        if (input.csrf !== session.csrf) return html(loginPage({ error: true, locked: false }), 403);
        await deleteInquiry(env.DB, deleteMatch[1]);
        return redirect('/admin/?notice=deleted');
      }

      if (path === '/admin/users' || path.startsWith('/admin/users/')) {
        const role = typeof session.user === 'string' ? 'admin' : session.user?.role;
        if (role !== 'admin') return redirect('/admin/?notice=forbidden');

        const userMatch = path.match(/^\/admin\/users\/([A-Za-z0-9_.-]+)$/);
        const userDeleteMatch = path.match(/^\/admin\/users\/([A-Za-z0-9_.-]+)\/delete$/);
        const userFromInput = (input, id) => ({
          id,
          username: input.username || '',
          name: input.name || '',
          email: input.email || '',
          role: input.role || 'editor',
          active: input.active !== '0',
        });

        if (request.method === 'GET' && path === '/admin/users') {
          const requested = url.searchParams.get('view') || '';
          const view = ['admin', 'editor', 'inactive'].includes(requested) ? requested : '';
          const q = (url.searchParams.get('q') || '').trim().toLowerCase();
          const all = await listUsers(env);
          const searched = all.filter((item) => {
            if (!q) return true;
            return [item.name, item.username, item.email].join('\n').toLowerCase().includes(q);
          });
          const users = searched.filter((item) => {
            if (view === 'admin' || view === 'editor') return item.role === view;
            if (view === 'inactive') return !item.active;
            return true;
          });
          return html(usersPage({
            users,
            total: all.length,
            enabled: all.filter((item) => item.active).length,
            activeAdmins: all.filter((item) => item.active && item.role === 'admin').length,
            activeEditors: all.filter((item) => item.active && item.role === 'editor').length,
            counts: {
              all: searched.length,
              admin: searched.filter((item) => item.role === 'admin').length,
              editor: searched.filter((item) => item.role === 'editor').length,
              inactive: searched.filter((item) => !item.active).length,
            },
            view,
            q,
            notice: url.searchParams.get('notice'),
            user: session.user,
            csrf: session.csrf,
          }));
        }

        if (request.method === 'GET' && path === '/admin/users/new') {
          return html(userFormPage({
            account: { name: '', username: '', email: '', role: 'editor', active: true },
            user: session.user,
            csrf: session.csrf,
          }));
        }

        if (request.method === 'POST' && path === '/admin/users') {
          const input = await parseBody(request);
          if (input.csrf !== session.csrf) return html(loginPage({ error: true, locked: false }), 403);
          const result = await createUser(env, input);
          if (result.error || !result.user) {
            return html(userFormPage({
              account: userFromInput(input),
              user: session.user,
              csrf: session.csrf,
              error: result.error || '內容無效。',
            }), 400);
          }
          return redirect(`/admin/users/${result.user.id}?saved=1`);
        }

        if (request.method === 'GET' && userMatch && userMatch[1] !== 'new') {
          let account = await getUser(env, userMatch[1]);
          if (!account) {
            const named = (await listUsers(env)).find((item) => item.username === userMatch[1].toLowerCase());
            if (named) return redirect(`/admin/users/${named.id}`);
          }
          if (!account) return html(notFoundPage({ user: session.user, message: '找不到這位使用者。' }), 404);
          return html(userFormPage({
            account,
            user: session.user,
            csrf: session.csrf,
            saved: url.searchParams.get('saved') === '1',
          }));
        }

        if (request.method === 'POST' && userMatch && userMatch[1] !== 'new') {
          const input = await parseBody(request);
          if (input.csrf !== session.csrf) return html(loginPage({ error: true, locked: false }), 403);
          const result = await updateUser(env, userMatch[1], input, session.user);
          if (result.error || !result.user) {
            return html(userFormPage({
              account: userFromInput(input, userMatch[1]),
              user: session.user,
              csrf: session.csrf,
              error: result.error || '內容無效。',
            }), 400);
          }
          if (result.user.id && result.user.id === session.user?.id) {
            const next = await createSession(env, result.user);
            return redirect(`/admin/users/${result.user.id}?saved=1`, { 'Set-Cookie': cookieHeader(request, next.token) });
          }
          return redirect(`/admin/users/${result.user.id}?saved=1`);
        }

        if (request.method === 'POST' && userDeleteMatch) {
          const input = await parseBody(request);
          if (input.csrf !== session.csrf) return html(loginPage({ error: true, locked: false }), 403);
          const result = await deleteUser(env, userDeleteMatch[1], session.user);
          if (result.error) {
            const account = await getUser(env, userDeleteMatch[1]);
            if (!account) return html(`<p>${result.error}</p>`, 400);
            return html(userFormPage({ account, user: session.user, csrf: session.csrf, error: result.error }), 400);
          }
          return redirect('/admin/users?notice=user_deleted');
        }
      }

      return html(notFoundPage({ user: session?.user }), 404);
    } catch (error) {
      console.error(error);
      const status = error?.status || 500;
      if (path.startsWith('/api/')) return withCors(request, json({ ok: false, error: '伺服器暫時無法處理這個要求。' }, status), env);
      return html('<p>伺服器暫時無法處理這個要求。</p>', status);
    }
  },
};
