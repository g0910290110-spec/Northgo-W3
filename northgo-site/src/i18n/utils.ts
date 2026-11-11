import en from './en.json';
import zhTw from './zh-tw.json';
import ja from './ja.json';
import vi from './vi.json';

export const LANGS = ['en', 'zh-tw', 'ja', 'vi'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

export const HTML_LANG: Record<Lang, string> = {
  en: 'en',
  'zh-tw': 'zh-Hant-TW',
  ja: 'ja',
  vi: 'vi',
};

export const OG_LOCALE: Record<Lang, string> = {
  en: 'en_US',
  'zh-tw': 'zh_TW',
  ja: 'ja_JP',
  vi: 'vi_VN',
};

export const LANG_LABEL: Record<Lang, string> = {
  en: 'English',
  'zh-tw': '繁體中文',
  ja: '日本語',
  vi: 'Tiếng Việt',
};

export type Dict = typeof en;

const DICTS: Record<Lang, Dict> = { en, 'zh-tw': zhTw, ja, vi };

export function useT(lang: Lang): Dict {
  return DICTS[lang];
}

export function getLang(param: string | undefined): Lang {
  return (LANGS as readonly string[]).includes(param ?? '') ? (param as Lang) : DEFAULT_LANG;
}

/** Route param for `[...lang]`: the default language has no URL prefix. */
export function langParam(lang: Lang): string | undefined {
  return lang === DEFAULT_LANG ? undefined : lang;
}

export function langPaths() {
  return LANGS.map((lang) => ({ params: { lang: langParam(lang) } }));
}

/** Deploy sub-path without trailing slash, e.g. `''` or `/Northgo-W3`. */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Root-relative public asset URL, e.g. `asset('/favicon.svg')`. */
export function asset(path: string): string {
  return `${BASE}${path}`;
}

/** `path` is language-neutral, e.g. `/`, `/about`, `/contact#offices`. Output always has a trailing slash. */
export function localePath(lang: Lang, path = '/'): string {
  const [, pathname, suffix] = path.match(/^([^?#]*)(.*)$/)!;
  const withSlash = pathname.endsWith('/') ? pathname : `${pathname}/`;
  const prefix = lang === DEFAULT_LANG ? '' : `/${lang}`;
  return `${BASE}${prefix}${withSlash}${suffix}`;
}

export const SERVICE_SLUGS = [
  'freight-logistics',
  'project-logistics',
  'warehouse-logistics',
  'shipping-agency',
] as const;
export type ServiceSlug = (typeof SERVICE_SLUGS)[number];

export const LEGAL_SLUGS = ['privacy-policy', 'terms', 'cookie-policy', 'disclaimer'] as const;

export function formatDate(lang: Lang, date: Date): string {
  return new Intl.DateTimeFormat(HTML_LANG[lang], { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}
