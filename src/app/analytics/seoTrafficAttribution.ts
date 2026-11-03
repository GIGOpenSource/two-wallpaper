import { getCurrentLanguage } from '../../api/request';

const SESSION_KEY = 'seo_traffic_attribution';
const VISITOR_KEY = 'mw_visitor_id';

export type TrafficSource = 'organic' | 'direct' | 'referral' | 'social';
export type SearchEngine = 'google' | 'bing' | 'yandex' | 'duckduckgo' | 'other' | '';
export type LandingPageType = 'detail' | 'category' | 'home' | 'tag' | 'search' | 'other';
export type PageLang = 'id' | 'en';

/** 会话首次落地归因参数（session 内只记一次） */
export type SeoTrafficParams = {
  traffic_source: TrafficSource;
  search_engine: SearchEngine;
  landing_page_type: LandingPageType;
  landing_wallpaper_id: string;
  page_lang: PageLang;
  is_new_visitor: 0 | 1;
  seo_week: string;
};

const SEARCH_ENGINE_HOSTS: Array<{ engine: Exclude<SearchEngine, '' | 'other'>; hosts: string[] }> = [
  { engine: 'google', hosts: ['google.'] },
  { engine: 'bing', hosts: ['bing.com', 'cn.bing.com'] },
  { engine: 'yandex', hosts: ['yandex.', 'ya.ru'] },
  { engine: 'duckduckgo', hosts: ['duckduckgo.com'] },
];

const SOCIAL_HOSTS = [
  'facebook.com',
  'fb.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  't.co',
  'linkedin.com',
  'tiktok.com',
  'pinterest.com',
  'reddit.com',
  'whatsapp.com',
  'telegram.org',
  't.me',
  'weibo.com',
  'vk.com',
];

function safeSessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeLocalGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

/** 是否新访客：本地尚无访客标识则为 1，并写入标识 */
function resolveIsNewVisitor(): 0 | 1 {
  const existing = safeLocalGet(VISITOR_KEY);
  if (existing) return 0;
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  safeLocalSet(VISITOR_KEY, id);
  return 1;
}

function getHost(referrer: string): string {
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function matchSearchEngine(host: string): SearchEngine {
  for (const item of SEARCH_ENGINE_HOSTS) {
    if (item.hosts.some((h) => host.includes(h))) return item.engine;
  }
  // 其它常见搜索引擎归 other
  if (
    host.includes('yahoo.') ||
    host.includes('baidu.') ||
    host.includes('ecosia.') ||
    host.includes('ask.com') ||
    host.includes('aol.com')
  ) {
    return 'other';
  }
  return '';
}

function isSocialHost(host: string): boolean {
  return SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

function resolveTrafficFromReferrer(referrer: string): {
  traffic_source: TrafficSource;
  search_engine: SearchEngine;
} {
  if (!referrer) {
    return { traffic_source: 'direct', search_engine: '' };
  }

  const host = getHost(referrer);
  if (!host) {
    return { traffic_source: 'direct', search_engine: '' };
  }

  // 同站跳转不算外部来源
  if (typeof window !== 'undefined' && host === window.location.hostname.toLowerCase()) {
    return { traffic_source: 'direct', search_engine: '' };
  }

  const searchEngine = matchSearchEngine(host);
  if (searchEngine) {
    return { traffic_source: 'organic', search_engine: searchEngine };
  }

  if (isSocialHost(host)) {
    return { traffic_source: 'social', search_engine: '' };
  }

  return { traffic_source: 'referral', search_engine: '' };
}

function resolveLandingPageType(pathname: string): LandingPageType {
  if (pathname === '/' || pathname === '') return 'home';
  if (/^\/wallpaper\/[^/]+/.test(pathname)) return 'detail';
  if (/^\/tag\/[^/]+/.test(pathname)) return 'tag';
  if (pathname === '/tags' || pathname.startsWith('/tags/')) return 'category';
  if (pathname.startsWith('/search')) return 'search';
  return 'other';
}

function resolveLandingWallpaperId(pathname: string): string {
  const match = pathname.match(/^\/wallpaper\/([^/]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : '';
}

function resolvePageLang(): PageLang {
  const lang = getCurrentLanguage();
  if (lang === 'id' || lang.startsWith('id')) return 'id';
  // HTML lang / 其它语言统一按 SEO 英文口径
  if (typeof document !== 'undefined') {
    const htmlLang = (document.documentElement.lang || '').toLowerCase();
    if (htmlLang === 'id' || htmlLang.startsWith('id')) return 'id';
  }
  return 'en';
}

/** ISO 周次，如 2024-W44 */
export function getIsoWeekString(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // ISO: Thursday in current week decides the year
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const week = String(weekNo).padStart(2, '0');
  return `${d.getUTCFullYear()}-W${week}`;
}

function resolveSeoWeek(landingPageType: LandingPageType): string {
  if (typeof window !== 'undefined') {
    const fromQuery = new URLSearchParams(window.location.search).get('seo_week');
    if (fromQuery && fromQuery.trim()) return fromQuery.trim();
  }
  // 仅详情落地记投放周次；非 SEO/非详情页为空
  if (landingPageType === 'detail') {
    return getIsoWeekString();
  }
  return '';
}

function buildAttribution(): SeoTrafficParams {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const referrer = typeof document !== 'undefined' ? document.referrer || '' : '';
  const { traffic_source, search_engine } = resolveTrafficFromReferrer(referrer);
  const landing_page_type = resolveLandingPageType(pathname);
  const landing_wallpaper_id =
    landing_page_type === 'detail' ? resolveLandingWallpaperId(pathname) : '';

  return {
    traffic_source,
    search_engine: traffic_source === 'organic' ? search_engine || 'other' : '',
    landing_page_type,
    landing_wallpaper_id,
    page_lang: resolvePageLang(),
    is_new_visitor: resolveIsNewVisitor(),
    seo_week: resolveSeoWeek(landing_page_type),
  };
}

/** 读取会话归因；若尚未初始化则按当前页作为首次落地写入 */
export function getSeoTrafficParams(): SeoTrafficParams {
  const cached = safeSessionGet(SESSION_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as SeoTrafficParams;
    } catch {
      // fall through to rebuild
    }
  }
  const params = buildAttribution();
  safeSessionSet(SESSION_KEY, JSON.stringify(params));
  return params;
}

/** 应用启动时调用，确保以首屏作为落地页 */
export function initSeoTrafficAttribution(): SeoTrafficParams {
  return getSeoTrafficParams();
}

/**
 * 详情页拿到 SEO 数据后可回填 seo_week（若接口有该字段）。
 * 仅当会话落地为详情且当前 seo_week 为空或来自默认周次时更新。
 */
export function patchSeoWeekFromDetail(seoWeek?: string | null): void {
  if (!seoWeek || !String(seoWeek).trim()) return;
  const params = getSeoTrafficParams();
  if (params.landing_page_type !== 'detail') return;
  params.seo_week = String(seoWeek).trim();
  safeSessionSet(SESSION_KEY, JSON.stringify(params));
}

/** 供 Firebase 事件直接展开的扁平参数 */
export function getSeoTrafficEventParams(): Record<string, string | number> {
  const p = getSeoTrafficParams();
  return {
    traffic_source: p.traffic_source,
    search_engine: p.search_engine,
    landing_page_type: p.landing_page_type,
    landing_wallpaper_id: p.landing_wallpaper_id,
    page_lang: p.page_lang,
    is_new_visitor: p.is_new_visitor,
    seo_week: p.seo_week,
  };
}
