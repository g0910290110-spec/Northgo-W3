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

function layout({ title, body, user }) {
  const account = user
    ? `<div class="account"><span>${esc(user)}</span><form method="post" action="/admin/logout"><button type="submit">登出</button></form></div>`
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
    .bar { width:min(1100px, calc(100% - 2rem)); margin:0 auto; min-height:64px; display:flex; align-items:center; justify-content:space-between; gap:1rem; }
    .brand { color:#fff; font-weight:700; letter-spacing:.04em; }
    .brand span { color:#00e5e5; }
    .account { display:flex; align-items:center; gap:.75rem; }
    .account button, button, .btn { font:inherit; border:0; border-radius:999px; background:var(--blue); color:#fff; padding:.55rem 1rem; cursor:pointer; }
    .account button { background:transparent; border:1px solid rgba(255,255,255,.4); }
    main { width:min(1100px, calc(100% - 2rem)); margin:2rem auto 3rem; }
    h1 { color:var(--navy); font-size:1.7rem; margin:0 0 .4rem; }
    .muted { color:var(--muted); margin:0 0 1.25rem; }
    .card { background:#fff; border:1px solid var(--line); border-radius:14px; box-shadow:0 10px 30px rgba(11,37,69,.06); }
    .login { max-width:420px; margin:8vh auto; padding:2rem; }
    label { display:block; font-weight:650; margin:.9rem 0 .35rem; }
    input, select, textarea { width:100%; font:inherit; padding:.7rem .8rem; border:1px solid #cbd5e1; border-radius:10px; }
    textarea { min-height:7rem; resize:vertical; }
    .error { background:#fef2f2; color:#991b1b; padding:.7rem .9rem; border-radius:10px; }
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
    .badge { display:inline-block; border-radius:999px; padding:.1rem .55rem; font-size:.8rem; font-weight:700; }
    .badge.new { background:#dbeafe; color:#1e3a8a; }
    .badge.reviewing { background:#fef3c7; color:#92400e; }
    .badge.quoted { background:#d1fae5; color:#065f46; }
    .badge.closed { background:#e5e7eb; color:#374151; }
    .split { display:grid; grid-template-columns:1.3fr .8fr; gap:1rem; align-items:start; }
    dl { display:grid; grid-template-columns:8rem 1fr; gap:.55rem 1rem; margin:0; }
    dt { color:var(--muted); }
    dd { margin:0; white-space:pre-wrap; }
    .actions { display:flex; gap:.6rem; align-items:center; margin-top:1rem; }
    .danger { background:#fff; color:var(--hq); border:1px solid #fecaca; }
    .back { display:inline-block; margin-bottom:.8rem; }
    .toolbar { display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; flex-wrap:wrap; }
    .toolbar a.btn { text-decoration:none; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 1rem; padding:1.25rem 1.4rem; }
    .form-grid .full { grid-column:1 / -1; }
    .snippet { display:block; max-width:28rem; color:#1f2937; white-space:pre-wrap; }
    td .muted { display:block; }
    .row-actions { display:flex; gap:.45rem; align-items:center; }
    .row-actions form { margin:0; }
    .row-actions .danger { padding:.28rem .7rem; }
    @media (max-width:800px) { .split, dl, .form-grid { grid-template-columns:1fr; } .form-grid .full { grid-column:auto; } table { display:block; overflow-x:auto; } }
  </style>
</head>
<body>
  <header><div class="bar"><a class="brand" href="/admin/">North<span>go</span> 後台</a>${account}</div></header>
  <main>${body}</main>
</body>
</html>`;
}

export function loginPage({ error, locked }) {
  const message = locked
    ? '<p class="error">嘗試次數過多，請 15 分鐘後再登入。</p>'
    : error
      ? '<p class="error">帳號或密碼不正確。</p>'
      : '';
  return layout({
    title: '登入 | Northgo 後台',
    body: `<form class="card login" method="post" action="/admin/login">
      <h1>後台登入</h1>
      <p class="muted">管理前台送來的詢價內容。</p>
      ${message}
      <label for="username">帳號</label>
      <input id="username" name="username" autocomplete="username" required />
      <label for="password">密碼</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <div class="actions"><button type="submit">登入</button></div>
    </form>`,
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
