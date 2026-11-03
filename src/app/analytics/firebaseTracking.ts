import { logEvent } from 'firebase/analytics';
import { analytics } from '../utils/firebase';
import { getDeviceType } from '../utils/device';
import {
  getSeoTrafficEventParams,
  initSeoTrafficAttribution,
  patchSeoWeekFromDetail,
} from './seoTrafficAttribution';

function withCommonParams(extra: Record<string, string | number | undefined | null> = {}) {
  const cleaned: Record<string, string | number> = {
    ...getSeoTrafficEventParams(),
    device_type: getDeviceType(),
    userId: (() => {
      try {
        return localStorage.getItem('user_id') || '';
      } catch {
        return '';
      }
    })(),
  };

  for (const [key, value] of Object.entries(extra)) {
    if (value === undefined || value === null) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

function safeLogEvent(eventName: string, params: Record<string, string | number>) {
  try {
    if (!analytics) return;
    logEvent(analytics, eventName, params);
  } catch (err) {
    console.error(`[firebase] logEvent ${eventName} failed:`, err);
  }
}

/** 应用启动时初始化会话落地归因 */
export function initFirebaseSeoTracking() {
  initSeoTrafficAttribution();
}

/**
 * 详情页手动 PV（Firebase 等价于 sendPV），附带 SEO 来源 7 参。
 * 每个 wallpaperId 在同一会话内只报一次，避免 StrictMode/重渲染重复。
 */
const detailPvSent = new Set<string>();

export function sendDetailPagePV(
  wallpaperId: string | number,
  options?: { seoWeek?: string | null },
) {
  const id = String(wallpaperId);
  if (!id || detailPvSent.has(id)) return;

  if (options?.seoWeek) {
    patchSeoWeekFromDetail(options.seoWeek);
  }

  detailPvSent.add(id);
  safeLogEvent(
    'page_view',
    withCommonParams({
      page_title: 'detail',
      wallpaper_id: id,
    }),
  );
}

/** 下载壁纸成功：带会话首次落地来源参数 + 壁纸 ID */
export function trackWallpaperDownload(wallpaperId: string | number) {
  const id = String(wallpaperId || '');
  safeLogEvent(
    'wallpaper_download',
    withCommonParams({
      wallpaper_id: id,
      value: id,
    }),
  );
}

/** 注册成功：带会话首次落地来源参数 + 用户 ID */
export function trackUserRegister(userId: string | number | null | undefined) {
  const id = userId === null || userId === undefined ? '' : String(userId);
  safeLogEvent(
    'user_register',
    withCommonParams({
      register_user_id: id,
      value: id,
    }),
  );
}
