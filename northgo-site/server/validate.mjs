const SERVICES = new Set(['sea', 'air', 'land', 'customs', 'project', 'warehouse', 'agency', 'other']);
const STATUSES = new Set(['new', 'reviewing', 'quoted', 'closed']);
const ROLES = new Set(['admin', 'editor']);

export function clip(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 160;
}

export function validateInquiry(input) {
  if (clip(input['company-website'], 200)) return { ignored: true };

  const inquiry = {
    service: clip(input.service, 40),
    origin: clip(input.origin, 120),
    destination: clip(input.destination, 120),
    cargo: clip(input.cargo, 4000),
    readyDate: clip(input.ready_date, 10),
    company: clip(input.company, 120),
    name: clip(input.name, 120),
    email: clip(input.email, 160).toLowerCase(),
    phone: clip(input.phone, 40),
    message: clip(input.message, 4000),
    language: clip(input.language, 12) || 'en',
    consent: input.consent === 'on' || input.consent === 'true' || input.consent === true,
  };

  if (!SERVICES.has(inquiry.service)) return { error: '請選擇有效的服務類型。' };
  if (!inquiry.origin || !inquiry.destination || !inquiry.cargo) return { error: '起運地、目的地與貨物說明為必填。' };
  if (!inquiry.company || !inquiry.name) return { error: '公司名稱與姓名為必填。' };
  if (!isEmail(inquiry.email)) return { error: '請填寫有效的電子郵件。' };
  if (!inquiry.consent) return { error: '需要同意隱私權政策才能送出。' };
  if (inquiry.readyDate && !/^\d{4}-\d{2}-\d{2}$/.test(inquiry.readyDate)) inquiry.readyDate = '';

  return { inquiry };
}

export function validateUser(input, { creating = false } = {}) {
  const username = clip(input.username, 32).toLowerCase();
  const name = clip(input.name, 80);
  const email = clip(input.email, 160).toLowerCase();
  const role = clip(input.role, 20);
  const password = String(input.password ?? '');
  const confirm = String(input.password_confirm ?? '');
  const active = !(input.active === '0' || input.active === 'false' || input.active === false);

  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
    return { error: '帳號需為 3–32 字，以英數開頭，只能使用小寫英數、點、底線或連字號。' };
  }
  if (!name) return { error: '請填寫顯示名稱。' };
  if (email && !isEmail(email)) return { error: '請填寫有效的電子郵件，或留空。' };
  if (!ROLES.has(role)) return { error: '請選擇有效的角色。' };
  if ((creating || password || confirm) && password.length < 8) return { error: '密碼至少 8 個字元。' };
  if (password.length > 200) return { error: '密碼過長。' };
  if (password !== confirm) return { error: '兩次輸入的密碼不一致。' };

  return { user: { username, name, email, role, active, password } };
}

export function userChangeError({ actor, target, next, users, deleting = false }) {
  const self = actor?.id
    ? actor.id === target.id
    : actor?.username === target.username || actor === target.username;
  const otherAdmins = users.filter((item) => item.id !== target.id && item.role === 'admin' && item.active);

  if (deleting) {
    if (self) return '不能刪除目前登入的帳號。';
    if (target.role === 'admin' && target.active && otherAdmins.length === 0) return '至少要保留一位啟用中的管理員。';
    return '';
  }

  if (self && next.role !== 'admin') return '不能變更自己的角色。請由其他管理員調整。';
  if (self && !next.active) return '不能停用目前登入的帳號。';
  const keepsAdmin = next.role === 'admin' && next.active;
  if (target.role === 'admin' && target.active && !keepsAdmin && otherAdmins.length === 0) {
    return '至少要保留一位啟用中的管理員。';
  }
  return '';
}

export { SERVICES, STATUSES, ROLES };
