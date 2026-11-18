import pkg from '../package.json' with { type: 'json' };

export const APP_VERSION = pkg.version;

export const SERVICE_LABELS = {
  sea: '海運',
  air: '空運',
  land: '陸運',
  customs: '報關',
  project: '專案貨物',
  warehouse: '倉儲',
  agency: '船務代理',
  other: '其他',
};

export const STATUS_LABELS = {
  new: '新詢問',
  reviewing: '處理中',
  quoted: '已報價',
  closed: '已結案',
};

const LANG_LABELS = { en: 'English', 'zh-tw': '繁體中文', ja: '日本語', vi: 'Tiếng Việt' };

export const ROLE_LABELS = {
  admin: '管理員',
  editor: '編輯',
};

function accountOf(user) {
  if (!user) return null;
  if (typeof user === 'string') return { id: '', username: user, name: user, role: 'admin' };
  return user;
}

function isAdmin(user) {
  const account = accountOf(user);
  return account?.role === 'admin';
}

const LOGIN_IMAGE = '/admin/assets/admin-login-harbor.jpg';
const TEAM_IMAGE = '/admin/assets/admin-team.jpg';

function initial(name) {
  const chars = Array.from(String(name || '').trim());
  return chars[0] || '?';
}

function tone(seed) {
  let hash = 0;
  for (const char of String(seed || '')) hash = (hash * 33 + (char.codePointAt(0) || 0)) >>> 0;
  return hash % 6;
}

function avatar(name, seed) {
  return `<span class="avatar tone-${tone(seed)}" aria-hidden="true">${esc(initial(name))}</span>`;
}

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatWhen(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('zh-Hant-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function layout({ title, body, user, nav, screen }) {
  const account = accountOf(user);
  const current = nav || 'inquiries';
  const menu = account
    ? `<nav class="nav" aria-label="後台">
        <a href="/admin/"${current === 'inquiries' ? ' class="on" aria-current="page"' : ''}>客戶詢問</a>
        ${isAdmin(account) ? `<a href="/admin/users"${current === 'users' ? ' class="on" aria-current="page"' : ''}>使用者</a>` : ''}
      </nav>`
    : '';
  const accountBar = account
    ? `<div class="account">${avatar(account.name, account.username)}<span class="who"><strong>${esc(account.name)}</strong><small>${esc(ROLE_LABELS[account.role] || account.role)}</small></span><form method="post" action="/admin/logout"><button type="submit">登出</button></form></div>`
    : '';
  return `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${esc(title)}</title>
  <style>
    :root { --navy:#0b2545; --blue:#1d4ed8; --line:#e2e8f0; --muted:#5b6472; --bg:#f5f8fc; --hq:#dc2626; }
    * { box-sizing: border-box; }
    body { margin:0; font:16px/1.55 "Segoe UI","Noto Sans TC","Microsoft JhengHei",sans-serif; color:#1f2937; background:var(--bg); }
    a { color:var(--blue); text-decoration:none; }
    a:hover { text-decoration:underline; }
    header { background:var(--navy); color:#dbe5f3; }
    .bar { width:min(1100px, calc(100% - 2rem)); margin:0 auto; min-height:64px; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; padding:.4rem 0; }
    .brand-wrap { display:flex; align-items:center; gap:1.25rem; flex-wrap:wrap; }
    .brand { color:#fff; font-weight:700; letter-spacing:.04em; }
    .brand span { color:#00e5e5; }
    .ver { color:#94a3b8; font-size:.78rem; letter-spacing:.04em; }
    .login .ver { margin:1.1rem 0 0; text-align:center; }
    .nav { display:flex; gap:.25rem; }
    .nav a { color:#dbe5f3; border-radius:999px; padding:.35rem .8rem; }
    .nav a.on, .nav a:hover { background:rgba(255,255,255,.12); color:#fff; text-decoration:none; }
    .account { display:flex; align-items:center; gap:.75rem; }
    .avatar { width:42px; height:42px; border-radius:50%; display:grid; place-items:center; color:#fff; font-weight:750; flex:none; }
    .account .avatar { width:36px; height:36px; }
    .tone-0 { background:#0b2545; } .tone-1 { background:#0f766e; } .tone-2 { background:#1d4ed8; }
    .tone-3 { background:#6d28d9; } .tone-4 { background:#b45309; } .tone-5 { background:#0e7490; }
    body.gate { background:#07182c; }
    body.gate header { display:none; }
    body.gate main { width:min(1040px, calc(100% - 2rem)); margin:6vh auto; }
    .login-shell { display:grid; grid-template-columns:1.15fr .85fr; min-height:560px; border-radius:20px; overflow:hidden; background:#fff; box-shadow:0 24px 60px rgba(0,0,0,.28); }
    .login-visual { position:relative; min-height:240px; background:#07182c; }
    .login-visual img, .people-hero img, .profile-aside img { width:100%; height:100%; object-fit:cover; display:block; }
    .login-visual::after { content:""; position:absolute; inset:0; background:linear-gradient(to top, rgba(7,24,44,.84), rgba(7,24,44,.08) 58%); }
    .login-caption { position:absolute; left:1.4rem; right:1.4rem; bottom:1.4rem; z-index:1; color:#fff; }
    .login-caption strong { display:block; font-size:1.55rem; line-height:1.25; margin-bottom:.35rem; }
    .login-caption p { margin:0; color:#dbe5f3; }
    .login-shell .login { margin:0; max-width:none; border:0; border-radius:0; box-shadow:none; display:flex; flex-direction:column; justify-content:center; }
    .who { display:flex; flex-direction:column; line-height:1.2; text-align:right; }
    .who strong { color:#fff; font-weight:650; }
    .who small { color:#94a3b8; }
    .account button, button, .btn { font:inherit; border:0; border-radius:999px; background:var(--blue); color:#fff; padding:.55rem 1rem; cursor:pointer; }
    .account button { background:transparent; border:1px solid rgba(255,255,255,.4); }
    main { width:min(1100px, calc(100% - 2rem)); margin:2rem auto 3rem; }
    h1 { color:var(--navy); font-size:1.7rem; margin:0 0 .4rem; }
    .muted { color:var(--muted); margin:0 0 1.25rem; }
    .card { background:#fff; border:1px solid var(--line); border-radius:14px; box-shadow:0 10px 30px rgba(11,37,69,.06); overflow-x:auto; }
    .login { max-width:420px; margin:8vh auto; padding:2rem; }
    label { display:block; font-weight:650; margin:.9rem 0 .35rem; }
    input, select, textarea { width:100%; font:inherit; padding:.7rem .8rem; border:1px solid #cbd5e1; border-radius:10px; }
    textarea { min-height:7rem; resize:vertical; }
    .error { background:#fef2f2; color:#991b1b; padding:.7rem .9rem; border-radius:10px; margin-bottom:1rem; }
    code { font-family: ui-monospace, Consolas, monospace; font-size: .92em; }
    .ok { background:#ecfdf5; color:#065f46; padding:.7rem .9rem; border-radius:10px; margin-bottom:1rem; }
    .filters { display:flex; flex-wrap:wrap; gap:.5rem; margin:1rem 0; }
    .filters a, .chip { border:1px solid var(--line); background:#fff; color:var(--navy); border-radius:999px; padding:.35rem .8rem; }
    .filters a.on { background:var(--navy); color:#fff; text-decoration:none; }
    .search { display:flex; gap:.5rem; margin-bottom:1rem; }
    .search input { max-width:22rem; }
    table { width:100%; border-collapse:collapse; }
    th, td { text-align:left; padding:.8rem .9rem; border-bottom:1px solid var(--line); vertical-align:top; }
    th { font-size:.8rem; letter-spacing:.04em; color:var(--muted); }
    tr:hover td { background:#f8fbff; }
    .badge { display:inline-block; border-radius:999px; padding:.1rem .55rem; font-size:.8rem; font-weight:700; white-space:nowrap; }
    .badge.new { background:#dbeafe; color:#1e3a8a; }
    .badge.reviewing { background:#fef3c7; color:#92400e; }
    .badge.quoted { background:#d1fae5; color:#065f46; }
    .badge.closed, .badge.off { background:#e5e7eb; color:#374151; }
    .badge.admin { background:#ede9fe; color:#5b21b6; }
    .badge.editor { background:#e0f2fe; color:#075985; }
    .badge.you { background:#f1f5f9; color:#334155; margin-left:.35rem; }
    .hint { color:var(--muted); font-weight:400; font-size:.9rem; margin:.3rem 0 0; }
    tr.is-off td { color:#6b7280; }
    button.ghost { background:#fff; color:var(--navy); border:1px solid #cbd5e1; padding:.35rem .75rem; }
    button:disabled, .is-disabled { opacity:.45; cursor:not-allowed; }
    .split { display:grid; grid-template-columns:1.3fr .8fr; gap:1rem; align-items:start; }
    dl { display:grid; grid-template-columns:8rem 1fr; gap:.55rem 1rem; margin:0; }
    dt { color:var(--muted); }
    dd { margin:0; white-space:pre-wrap; }
    .actions { display:flex; gap:.6rem; align-items:center; margin-top:1rem; }
    .danger { background:#fff; color:var(--hq); border:1px solid #fecaca; }
    .back { display:inline-block; margin-bottom:.8rem; }
    .toolbar { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; flex-wrap:wrap; }
    .toolbar > div { min-width:0; flex:1 1 18rem; }
    .toolbar .btn { flex:none; }
    .toolbar a.btn { text-decoration:none; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 1rem; padding:1.25rem 1.4rem; }
    .form-grid .full { grid-column:1 / -1; }
    .snippet { display:block; max-width:28rem; color:#1f2937; white-space:pre-wrap; }
    td .muted { display:block; margin:0; }
    .row-actions { display:flex; gap:.7rem; align-items:center; white-space:nowrap; }
    .people-hero { display:grid; grid-template-columns:240px 1fr auto; gap:1rem; align-items:center; background:#fff; border:1px solid var(--line); border-radius:16px; overflow:hidden; margin-bottom:1rem; }
    .people-hero img { height:148px; }
    .people-hero .copy { padding:.2rem 0; }
    .people-hero h1, .people-hero .muted { margin-bottom:0; }
    .people-hero .btn { justify-self:start; margin-right:1rem; }
    .people { display:grid; gap:.75rem; }
    .person { display:grid; grid-template-columns:auto 1fr auto; gap:.9rem; align-items:center; background:#fff; border:1px solid var(--line); border-radius:14px; padding:.9rem 1rem; }
    .person.is-off { opacity:.68; }
    .person h2 { margin:0 0 .25rem; font-size:1.05rem; color:var(--navy); display:flex; align-items:center; gap:.4rem; }
    .person h2 a { color:inherit; }
    .meta { display:flex; flex-wrap:wrap; gap:.35rem .7rem; align-items:center; margin:0; color:var(--muted); }
    .person .hint { margin:.25rem 0 0; }
    .empty { display:grid; grid-template-columns:180px 1fr; gap:1rem; align-items:center; padding:1rem; }
    .empty img { width:180px; height:110px; object-fit:cover; border-radius:10px; }
    .editor-split { display:grid; grid-template-columns:280px 1fr; gap:1rem; align-items:start; }
    .profile-aside { overflow:hidden; }
    .profile-aside img { height:132px; }
    .profile-body { padding:1rem 1.1rem 1.2rem; }
    .profile-body .avatar { width:64px; height:64px; font-size:1.5rem; margin-top:-32px; border:3px solid #fff; }
    .profile-body h2 { margin:.5rem 0 .3rem; color:var(--navy); font-size:1.15rem; }
    .profile-body p { margin:0; color:var(--muted); }
    a.btn.ghost, button.ghost { background:#fff; color:var(--navy); border:1px solid #cbd5e1; text-decoration:none; }
    .row-actions form { margin:0; }
    .row-actions .danger { padding:.28rem .7rem; }
    @media (max-width:800px) {
      .split, dl, .form-grid, .login-shell, .people-hero, .editor-split, .empty { grid-template-columns:1fr; }
      .form-grid .full { grid-column:auto; }
      .people-hero img, .empty img { height:140px; width:100%; }
      .people-hero .btn { margin:0 1rem 1rem; justify-self:start; }
      .person { grid-template-columns:auto 1fr; }
      .person .row-actions { grid-column:1 / -1; }
    }
  </style>
</head>
<body class="${screen === 'login' ? 'gate' : ''}">
  <header><div class="bar"><div class="brand-wrap"><a class="brand" href="/admin/">North<span>go</span> 後台</a><span class="ver">v${esc(APP_VERSION)}</span>${menu}</div>${accountBar}</div></header>
  <main>${body}</main>
</body>
</html>`;
}

export function notFoundPage({ user, message }) {
  const account = accountOf(user);
  return layout({
    title: '找不到頁面 | Northgo 後台',
    user,
    body: `<h1>找不到這個頁面</h1>
      <p class="muted">${esc(message || '這個網址沒有對應的後台頁面。')}</p>
      <div class="actions">
        <a class="btn" href="/admin/">回客戶詢問</a>
        ${isAdmin(account) ? '<a class="btn ghost" href="/admin/users">回使用者</a>' : ''}
      </div>`,
  });
}

export function loginPage({ error, locked }) {
  const message = locked
    ? '<p class="error">嘗試次數過多，請 15 分鐘後再登入。</p>'
    : error
      ? '<p class="error">帳號或密碼不正確。</p>'
      : '';
  return layout({
    title: '登入 | Northgo 後台',
    screen: 'login',
    body: `<div class="login-shell">
      <aside class="login-visual">
        <img src="${LOGIN_IMAGE}" alt="夜間的貨櫃港口" />
        <div class="login-caption">
          <strong>多位同事，同一套後台</strong>
          <p>管理員維護帳號，編輯處理客戶詢問。每人各自登入，可以同時在線。</p>
        </div>
      </aside>
      <form class="card login" method="post" action="/admin/login">
        <h1>後台登入</h1>
        <p class="muted">使用你的帳號進入。停用中的帳號無法登入。</p>
        ${message}
        <label for="username">帳號</label>
        <input id="username" name="username" autocomplete="username" required />
        <label for="password">密碼</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required />
        <div class="actions"><button type="submit">登入</button></div>
        <p class="ver">版本 v${esc(APP_VERSION)}</p>
      </form>
    </div>`,
  });
}

function statusLink(status, current, q) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (q) params.set('q', q);
  const href = `/admin/${params.size ? `?${params}` : ''}`;
  const on = current === status ? ' class="on"' : '';
  const label = status ? STATUS_LABELS[status] : '全部';
  return `<a href="${href}"${on}>${label}</a>`;
}

const NOTICES = {
  saved: '已儲存這筆客戶詢問。',
  deleted: '已刪除這筆客戶詢問。',
  created: '已新增這筆客戶詢問。',
  forbidden: '沒有權限管理使用者。',
  user_created: '已新增使用者。',
  user_saved: '已儲存使用者。',
  user_deleted: '已刪除使用者。',
};

export function listPage({ inquiries, status, q, counts, notice, user, csrf }) {
  const rows = inquiries.length
    ? inquiries
        .map(
          (item) => `<tr>
        <td><a href="/admin/inquiries/${esc(item.id)}">${esc(formatWhen(item.createdAt))}</a></td>
        <td><a href="/admin/inquiries/${esc(item.id)}">${esc(item.company)}</a><span class="muted">${esc(item.name)} · ${esc(item.email)}</span></td>
        <td>${esc(item.origin)} → ${esc(item.destination)}<span class="muted">${esc(SERVICE_LABELS[item.service] || item.service)}</span></td>
        <td><span class="snippet">${esc(item.cargo)}</span>${item.message ? `<span class="muted">${esc(item.message)}</span>` : ''}</td>
        <td><span class="badge ${esc(item.status)}">${esc(STATUS_LABELS[item.status] || item.status)}</span></td>
        <td class="row-actions">
          <a href="/admin/inquiries/${esc(item.id)}">編輯</a>
          <form method="post" action="/admin/inquiries/${esc(item.id)}/delete" onsubmit="return confirm('確定刪除這筆客戶詢問？')">
            <input type="hidden" name="csrf" value="${esc(csrf)}" />
            <button class="danger" type="submit">刪除</button>
          </form>
        </td>
      </tr>`,
        )
        .join('')
    : `<tr><td colspan="6">目前沒有符合的客戶詢問。請從網站聯絡頁送出，或在後台新增。</td></tr>`;
  const banner = NOTICES[notice] ? `<p class="ok">${NOTICES[notice]}</p>` : '';
  return layout({
    title: '客戶詢問 | Northgo 後台',
    user,
    body: `${banner}
      <div class="toolbar">
        <div>
          <h1>客戶詢問</h1>
          <p class="muted">共 ${counts.all} 筆，新詢問 ${counts.new} 筆。前台送出的內容會出現在這裡。</p>
        </div>
        <a class="btn" href="/admin/inquiries/new">新增詢問</a>
      </div>
      <form class="search" method="get" action="/admin/">
        ${status ? `<input type="hidden" name="status" value="${esc(status)}" />` : ''}
        <input name="q" value="${esc(q)}" placeholder="搜尋公司、姓名、航線或貨物" />
        <button type="submit">搜尋</button>
      </form>
      <nav class="filters">
        ${statusLink('', status, q)}
        ${Object.keys(STATUS_LABELS).map((key) => statusLink(key, status, q)).join('')}
      </nav>
      <div class="card"><table>
        <thead><tr><th>收到時間</th><th>客戶</th><th>航線</th><th>詢問內容</th><th>狀態</th><th>操作</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`,
  });
}

function optionTags(entries, selected) {
  return entries.map(([value, label]) => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`).join('');
}

export function editorPage({ inquiry, user, csrf, error, saved }) {
  const isNew = !inquiry.id;
  const action = isNew ? '/admin/inquiries' : `/admin/inquiries/${esc(inquiry.id)}`;
  const banner = error ? `<p class="error">${esc(error)}</p>` : saved ? '<p class="ok">已儲存。以下是這筆詢問的內容。</p>' : '';
  return layout({
    title: `${isNew ? '新增詢問' : inquiry.company} | 客戶詢問`,
    user,
    body: `<a class="back" href="/admin/">← 返回客戶詢問</a>
      <h1>${isNew ? '新增客戶詢問' : esc(inquiry.company)}</h1>
      <p class="muted">${isNew ? '手動建立一筆詢問。前台表單送出後也會出現在列表。' : `${esc(inquiry.name)} · ${esc(formatWhen(inquiry.createdAt))} 收到 · ${esc(LANG_LABELS[inquiry.language] || inquiry.language)}`}</p>
      ${banner}
      <form class="card form-grid" method="post" action="${action}">
        <input type="hidden" name="csrf" value="${esc(csrf)}" />
        <input type="hidden" name="language" value="${esc(inquiry.language || 'zh-tw')}" />
        <div>
          <label for="service">服務類型</label>
          <select id="service" name="service" required>${optionTags(Object.entries(SERVICE_LABELS), inquiry.service || 'sea')}</select>
        </div>
        <div>
          <label for="status">處理狀態</label>
          <select id="status" name="status">${optionTags(Object.entries(STATUS_LABELS), inquiry.status || 'new')}</select>
        </div>
        <div>
          <label for="origin">起運地</label>
          <input id="origin" name="origin" required value="${esc(inquiry.origin)}" />
        </div>
        <div>
          <label for="destination">目的地</label>
          <input id="destination" name="destination" required value="${esc(inquiry.destination)}" />
        </div>
        <div class="full">
          <label for="cargo">貨物說明</label>
          <textarea id="cargo" name="cargo" required>${esc(inquiry.cargo)}</textarea>
        </div>
        <div>
          <label for="ready_date">可出貨日期</label>
          <input id="ready_date" name="ready_date" type="date" value="${esc(inquiry.readyDate)}" />
        </div>
        <div>
          <label for="company">公司名稱</label>
          <input id="company" name="company" required value="${esc(inquiry.company)}" />
        </div>
        <div>
          <label for="name">姓名</label>
          <input id="name" name="name" required value="${esc(inquiry.name)}" />
        </div>
        <div>
          <label for="email">電子郵件</label>
          <input id="email" name="email" type="email" required value="${esc(inquiry.email)}" />
        </div>
        <div>
          <label for="phone">電話</label>
          <input id="phone" name="phone" value="${esc(inquiry.phone)}" />
        </div>
        <div class="full">
          <label for="message">其他說明</label>
          <textarea id="message" name="message">${esc(inquiry.message)}</textarea>
        </div>
        <div class="full">
          <label for="note">內部備註</label>
          <textarea id="note" name="note">${esc(inquiry.note)}</textarea>
        </div>
        <div class="full actions">
          <button type="submit">${isNew ? '建立' : '儲存修改'}</button>
        </div>
      </form>
      ${isNew ? '' : `<form method="post" action="/admin/inquiries/${esc(inquiry.id)}/delete" onsubmit="return confirm('確定刪除這筆客戶詢問？')">
        <input type="hidden" name="csrf" value="${esc(csrf)}" />
        <div class="actions"><button class="danger" type="submit">刪除</button></div>
      </form>`}`,
  });
}

function confirmCall(message) {
  return `return confirm(${esc(JSON.stringify(message))})`;
}

function userViewLink(view, current, q, label) {
  const params = new URLSearchParams();
  if (view) params.set('view', view);
  if (q) params.set('q', q);
  const href = `/admin/users${params.size ? `?${params}` : ''}`;
  const on = current === view ? ' class="on"' : '';
  return `<a href="${href}"${on}>${label}</a>`;
}

function personCard(item, session, csrf) {
  const self = item.id === session?.id;
  const remove = self
    ? '<span class="hint">目前帳號</span>'
    : `<form method="post" action="/admin/users/${esc(item.id)}/delete" onsubmit="${confirmCall(`確定刪除「${item.name}」？此帳號將無法再登入。`)}">
        <input type="hidden" name="csrf" value="${esc(csrf)}" />
        <button class="danger" type="submit">刪除</button>
      </form>`;
  return `<article class="person${item.active ? '' : ' is-off'}">
    ${avatar(item.name, item.username || item.name)}
    <div>
      <h2><a href="/admin/users/${esc(item.id)}">${esc(item.name)}</a>${self ? '<span class="badge you">你</span>' : ''}</h2>
      <p class="meta">
        <span>${esc(item.username)}</span>
        <span>${esc(item.email || '未填電子郵件')}</span>
        <span class="badge ${esc(item.role)}">${esc(ROLE_LABELS[item.role] || item.role)}</span>
        <span class="badge ${item.active ? 'quoted' : 'off'}">${item.active ? '啟用' : '停用'}</span>
      </p>
      <p class="hint">更新於 ${esc(formatWhen(item.updatedAt))}</p>
    </div>
    <div class="row-actions"><a class="btn ghost" href="/admin/users/${esc(item.id)}">編輯</a>${remove}</div>
  </article>`;
}

export function usersPage({ users, total, enabled, activeAdmins, activeEditors, counts, view, q, notice, user, csrf }) {
  const session = accountOf(user);
  const cards = users.length
    ? `<div class="people">${users.map((item) => personCard(item, session, csrf)).join('')}</div>`
    : `<div class="card empty">
        <img src="${TEAM_IMAGE}" alt="" />
        <p>${q || view ? '沒有符合的同事。換個關鍵字或篩選看看。' : '還沒有其他同事。新增帳號後，就可以一起管理後台。'}</p>
      </div>`;
  const banner = NOTICES[notice] ? `<p class="ok">${NOTICES[notice]}</p>` : '';
  return layout({
    title: '使用者 | Northgo 後台',
    user,
    nav: 'users',
    body: `${banner}
      <section class="people-hero">
        <img src="${TEAM_IMAGE}" alt="同事一起看航線圖" />
        <div class="copy">
          <h1>使用者</h1>
          <p class="muted">共 ${total} 位，啟用 ${enabled} 位。其中管理員 ${activeAdmins} 位、編輯 ${activeEditors} 位，可以同時登入。</p>
        </div>
        <a class="btn" href="/admin/users/new">新增使用者</a>
      </section>
      <form class="search" method="get" action="/admin/users">
        ${view ? `<input type="hidden" name="view" value="${esc(view)}" />` : ''}
        <input name="q" value="${esc(q)}" placeholder="搜尋名稱、帳號或電子郵件" aria-label="搜尋使用者" />
        <button type="submit">搜尋</button>
      </form>
      <nav class="filters" aria-label="篩選使用者">
        ${userViewLink('', view, q, `全部 ${counts.all}`)}
        ${userViewLink('admin', view, q, `管理員 ${counts.admin}`)}
        ${userViewLink('editor', view, q, `編輯 ${counts.editor}`)}
        ${userViewLink('inactive', view, q, `已停用 ${counts.inactive}`)}
      </nav>
      ${cards}`,
  });
}

export function userFormPage({ account, user, csrf, error, saved }) {
  const isNew = !account.id;
  const session = accountOf(user);
  const self = !isNew && account.id === session?.id;
  const action = isNew ? '/admin/users' : `/admin/users/${esc(account.id)}`;
  const banner = error
    ? `<p class="error">${esc(error)}</p>`
    : saved
      ? '<p class="ok">已儲存。密碼欄位留空就不會變更。</p>'
      : '';
  const roleField = self
    ? `<div class="full">
        <input type="hidden" name="role" value="admin" />
        <input type="hidden" name="active" value="1" />
        <p class="hint">這是你目前登入的帳號。角色與啟用狀態需由其他管理員調整，避免把自己鎖在外面。</p>
      </div>`
    : `<div>
        <label for="role">角色</label>
        <select id="role" name="role">${optionTags(Object.entries(ROLE_LABELS), account.role || 'editor')}</select>
        <p class="hint">管理員可以管理使用者。編輯只能處理客戶詢問。</p>
      </div>
      <div>
        <label for="active">狀態</label>
        <select id="active" name="active">
          <option value="1"${account.active !== false ? ' selected' : ''}>啟用</option>
          <option value="0"${account.active === false ? ' selected' : ''}>停用</option>
        </select>
        <p class="hint">停用後無法登入，資料仍會保留。</p>
      </div>`;
  return layout({
    title: `${isNew ? '新增使用者' : account.name} | 使用者`,
    user,
    nav: 'users',
    body: `<a class="back" href="/admin/users">← 返回使用者</a>
      <h1>${isNew ? '新增使用者' : esc(account.name)}</h1>
      <p class="muted">${isNew ? '建立一位可以同時登入的同事。' : `${esc(ROLE_LABELS[account.role] || account.role)} · ${account.active === false ? '停用' : '啟用'} · ${esc(formatWhen(account.updatedAt))} 更新`}</p>
      ${banner}
      <div class="editor-split">
      <aside class="card profile-aside">
        <img src="${TEAM_IMAGE}" alt="" />
        <div class="profile-body">
          ${avatar(account.name || '新', account.username || account.name || 'new')}
          <h2>${isNew ? '邀請同事' : esc(account.name)}</h2>
          <p>${self ? '這是你目前的帳號。顯示名稱、帳號和密碼可以自己改。' : '管理員可以管理所有帳號。編輯只能處理客戶詢問，不能進使用者頁。'}</p>
        </div>
      </aside>
      <form class="card form-grid" method="post" action="${action}" onsubmit="return checkUserForm(this)">
        <input type="hidden" name="csrf" value="${esc(csrf)}" />
        <div>
          <label for="name">顯示名稱</label>
          <input id="name" name="name" required maxlength="80" value="${esc(account.name)}" autocomplete="name" />
        </div>
        <div>
          <label for="username">帳號</label>
          <input id="username" name="username" required minlength="3" maxlength="32" spellcheck="false" autocapitalize="none" value="${esc(account.username)}" autocomplete="off" />
          <p class="hint">登入時不分大小寫。3–32 字，以英數開頭。</p>
        </div>
        <div class="full">
          <label for="email">電子郵件</label>
          <input id="email" name="email" type="email" maxlength="160" value="${esc(account.email)}" autocomplete="email" />
          <p class="hint">選填，用來辨識聯絡窗口，不會用來登入。</p>
        </div>
        ${roleField}
        <div>
          <label for="password">${isNew ? '密碼' : '新密碼'}</label>
          <input id="password" name="password" type="password" data-secret minlength="${isNew ? '8' : '0'}" maxlength="200" autocomplete="new-password" ${isNew ? 'required' : ''} />
          <p class="hint">${isNew ? '至少 8 個字元。' : '留空表示不變更密碼。若要更換，至少 8 個字元。'}</p>
        </div>
        <div>
          <label for="password_confirm">確認密碼</label>
          <input id="password_confirm" name="password_confirm" type="password" data-secret minlength="${isNew ? '8' : '0'}" maxlength="200" autocomplete="new-password" ${isNew ? 'required' : ''} />
          <div class="actions"><button class="ghost" type="button" data-toggle-password>顯示密碼</button></div>
        </div>
        <div class="full actions">
          <button type="submit">${isNew ? '建立' : '儲存修改'}</button>
        </div>
      </form>
      </div>
      ${isNew || self ? '' : `<form method="post" action="/admin/users/${esc(account.id)}/delete" onsubmit="${confirmCall(`確定刪除「${account.name}」？此帳號將無法再登入。`)}">
        <input type="hidden" name="csrf" value="${esc(csrf)}" />
        <div class="actions"><button class="danger" type="submit">刪除使用者</button></div>
      </form>`}
      <script>
        function checkUserForm(form) {
          if (form.password.value !== form.password_confirm.value) {
            alert('兩次輸入的密碼不一致。');
            form.password_confirm.focus();
            return false;
          }
          return true;
        }
        document.querySelector('[data-toggle-password]')?.addEventListener('click', (event) => {
          const button = event.currentTarget;
          const show = document.querySelector('[data-secret]')?.type === 'password';
          for (const input of document.querySelectorAll('[data-secret]')) input.type = show ? 'text' : 'password';
          button.textContent = show ? '隱藏密碼' : '顯示密碼';
        });
      </script>`,
  });
}
