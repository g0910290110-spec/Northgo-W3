import { createServer } from 'node:http';
import {
  ADMIN_USER,
  clearCookieHeader,
  clearFailures,
  cookieHeader,
  createSession,
  destroySession,
  readSession,
  recordFailure,
  tooManyAttempts,
  usingDefaultPassword,
  verifyPassword,
} from './auth.mjs';
import { editorPage, listPage, loginPage } from './render.mjs';
import { addInquiry, deleteInquiry, getInquiry, listInquiries, updateInquiry, validateInquiry } from './store.mjs';

const port = Number(process.env.ADMIN_PORT || 8787);
const host = process.env.ADMIN_HOST || '127.0.0.1';
const allowedOrigins = new Set(
  (process.env.ADMIN_ORIGINS || 'http://localhost:4321,http://127.0.0.1:4321,https://g0910290110-spec.github.io')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

function clientIp(req) {
  return req.socket.remoteAddress || 'unknown';
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 32_000) {
        reject(Object.assign(new Error('payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function parseBody(req) {
  const raw = await readBody(req);
  const type = String(req.headers['content-type'] || '');
  if (type.includes('application/json')) {
    if (!raw) return {};
    return JSON.parse(raw);
  }
  return Object.fromEntries(new URLSearchParams(raw));
}

function send(res, status, body, headers = {}) {
  const payload = Buffer.from(body);
  res.writeHead(status, { 'Content-Length': payload.length, 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(payload);
}

function html(res, status, body, headers = {}) {
  send(res, status, body, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
}

function json(res, status, body, headers = {}) {
  send(res, status, JSON.stringify(body), { 'Content-Type': 'application/json; charset=utf-8', ...headers });
}

function redirect(res, location, headers = {}) {
  send(res, 303, '', { Location: location, ...headers });
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin || !allowedOrigins.has(origin)) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
}

function sessionFrom(req) {
  return readSession(cookies(req).ng_session);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    applyCors(req, res);

    if (req.method === 'OPTIONS' && path === '/api/inquiries') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'POST' && path === '/api/inquiries') {
      let input;
      try {
        input = await parseBody(req);
      } catch {
        json(res, 400, { ok: false, error: '無法讀取表單內容。' });
        return;
      }
      const result = validateInquiry(input);
      if (result.ignored) {
        json(res, 200, { ok: true });
        return;
      }
      if (result.error) {
        json(res, 400, { ok: false, error: result.error });
        return;
      }
      const inquiry = await addInquiry(result.inquiry);
      json(res, 201, { ok: true, id: inquiry.id });
      return;
    }

    if (req.method === 'GET' && path === '/admin/login') {
      if (sessionFrom(req)) {
        redirect(res, '/admin/');
        return;
      }
      html(res, 200, loginPage({ error: url.searchParams.get('error') === '1', locked: url.searchParams.get('locked') === '1' }));
      return;
    }

    if (req.method === 'POST' && path === '/admin/login') {
      const ip = clientIp(req);
      if (tooManyAttempts(ip)) {
        redirect(res, '/admin/login?locked=1');
        return;
      }
      const input = await parseBody(req);
      if (!(await verifyPassword(String(input.username || ''), String(input.password || '')))) {
        recordFailure(ip);
        redirect(res, '/admin/login?error=1');
        return;
      }
      clearFailures(ip);
      const session = createSession();
      redirect(res, '/admin/', { 'Set-Cookie': cookieHeader(session.token) });
      return;
    }

    if (req.method === 'POST' && path === '/admin/logout') {
      destroySession(cookies(req).ng_session);
      redirect(res, '/admin/login', { 'Set-Cookie': clearCookieHeader() });
      return;
    }

    if (!path.startsWith('/admin')) {
      json(res, 404, { ok: false, error: '找不到這個路徑。' });
      return;
    }

    const session = sessionFrom(req);
    if (!session) {
      redirect(res, '/admin/login');
      return;
    }

    const inquiryMatch = path.match(/^\/admin\/inquiries\/([A-Za-z0-9_]+)$/);
    const deleteMatch = path.match(/^\/admin\/inquiries\/([A-Za-z0-9_]+)\/delete$/);
    const blankInquiry = () => ({
      service: 'sea', status: 'new', origin: '', destination: '', cargo: '', readyDate: '',
      company: '', name: '', email: '', phone: '', message: '', note: '', language: 'zh-tw',
    });
    const inquiryFromInput = (input) => ({
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
    });

    if (req.method === 'GET' && path === '/admin') {
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      const all = await listInquiries();
      const counts = {
        all: all.length,
        new: all.filter((item) => item.status === 'new').length,
      };
      const inquiries = all.filter((item) => {
        if (status && item.status !== status) return false;
        if (!q) return true;
        return [item.company, item.name, item.email, item.origin, item.destination, item.cargo, item.message]
          .join('\n')
          .toLowerCase()
          .includes(q);
      });
      html(res, 200, listPage({ inquiries, status, q, counts, notice: url.searchParams.get('notice'), user: session.user, csrf: session.csrf }));
      return;
    }

    if (req.method === 'GET' && path === '/admin/inquiries/new') {
      html(res, 200, editorPage({ inquiry: blankInquiry(), user: session.user, csrf: session.csrf }));
      return;
    }

    if (req.method === 'POST' && path === '/admin/inquiries') {
      const input = await parseBody(req);
      if (input.csrf !== session.csrf) {
        html(res, 403, loginPage({ error: true, locked: false }));
        return;
      }
      const result = validateInquiry({ ...input, consent: 'on' });
      if (result.error || !result.inquiry) {
        html(res, 400, editorPage({ inquiry: inquiryFromInput(input), user: session.user, csrf: session.csrf, error: result.error || '內容無效。' }));
        return;
      }
      const inquiry = await addInquiry(result.inquiry, { status: input.status, note: String(input.note ?? '') });
      redirect(res, `/admin/inquiries/${inquiry.id}?saved=1`);
      return;
    }

    if (req.method === 'GET' && inquiryMatch && inquiryMatch[1] !== 'new') {
      const inquiry = await getInquiry(inquiryMatch[1]);
      if (!inquiry) {
        html(res, 404, '<p>找不到這筆客戶詢問。</p>');
        return;
      }
      html(res, 200, editorPage({ inquiry, user: session.user, csrf: session.csrf, saved: url.searchParams.get('saved') === '1' }));
      return;
    }

    if (req.method === 'POST' && inquiryMatch && inquiryMatch[1] !== 'new') {
      const input = await parseBody(req);
      if (input.csrf !== session.csrf) {
        html(res, 403, loginPage({ error: true, locked: false }));
        return;
      }
      const result = await updateInquiry(inquiryMatch[1], input);
      if (result.error) {
        html(res, 400, editorPage({
          inquiry: { ...inquiryFromInput(input), id: inquiryMatch[1] },
          user: session.user,
          csrf: session.csrf,
          error: result.error,
        }));
        return;
      }
      redirect(res, `/admin/inquiries/${inquiryMatch[1]}?saved=1`);
      return;
    }

    if (req.method === 'POST' && deleteMatch) {
      const input = await parseBody(req);
      if (input.csrf !== session.csrf) {
        html(res, 403, loginPage({ error: true, locked: false }));
        return;
      }
      await deleteInquiry(deleteMatch[1]);
      redirect(res, '/admin/?notice=deleted');
      return;
    }

    html(res, 404, '<p>找不到這個頁面。</p>');
  } catch (error) {
    console.error(error);
    json(res, 500, { ok: false, error: '伺服器暫時無法處理這個要求。' });
  }
});

server.listen(port, host, () => {
  console.log(`Northgo admin http://${host}:${port}/admin/`);
  if (usingDefaultPassword) {
    console.log(`Login ${ADMIN_USER} / northgo-admin`);
    console.log('Set ADMIN_USER and ADMIN_PASSWORD before sharing this server.');
  } else {
    console.log(`Login user ${ADMIN_USER}`);
  }
});
