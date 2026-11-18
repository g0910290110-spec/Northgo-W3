const SERVICES = new Set(['sea', 'air', 'land', 'customs', 'project', 'warehouse', 'agency', 'other']);
const STATUSES = new Set(['new', 'reviewing', 'quoted', 'closed']);

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

export { SERVICES, STATUSES };
