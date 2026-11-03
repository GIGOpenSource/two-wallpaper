// 存储 navigate 函数的引用，用于在 request.ts 中跳转
let navigateFunction: ((path: string, options?: any) => void) | null = null;

import { nativeFetch, isCapacitorNative } from './nativeFetch';

// 从 localStorage 读取初始语言（如果有的话），否则默认为 'en'
const getInitialLanguage = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('app-language');
      return saved || 'en';
    } catch {
      return 'en';
    }
  }
  return 'en';
};

// 存储当前语言的引用，用于在请求头中添加 Accept-Language
let currentLanguage: string = getInitialLanguage();

export function setNavigateFunction(navigate: (path: string, options?: any) => void) {
  navigateFunction = navigate;
}

// 设置当前语言
export function setCurrentLanguage(lang: string) {
  currentLanguage = lang;
}

// 获取当前语言
export function getCurrentLanguage(): string {
  return currentLanguage;
}

// 语言代码映射（前端语言代码 -> HTTP Accept-Language 标准代码）
const languageCodeMap: Record<string, string> = {
  'zh-CN': 'zh-CN',
  'en': 'en',
  'ja': 'ja',
  'ko': 'ko',
  'es': 'es',
  'fr': 'fr',
  'pt': 'pt',
  'id': 'id',
};

/** 线上资源域名（拼接接口返回的相对图片地址等） */
export const API_ORIGIN = 'https://www.markwallpapers.com';

/**
 * 发起请求时的基址：开发环境为空，走当前页同源 + Vite proxy（避免 CORS）；生产为线上域名。
 */
const API_FETCH_BASE = import.meta.env.DEV ? '' : API_ORIGIN;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type QueryValue = string | number | boolean | null | undefined;

type RequestOptions = {
  method?: HttpMethod;
  params?: Record<string, QueryValue>;
  data?: unknown;
  headers?: Record<string, string>;
  token?: string;
  signal?: AbortSignal;
};

const TOKEN_STORAGE_KEY = 'token';
let memoryToken = '';

// token 变化时的监听器
type TokenChangeListener = (hasToken: boolean) => void;
let tokenChangeListeners: TokenChangeListener[] = [];

export function addTokenChangeListener(listener: TokenChangeListener) {
  tokenChangeListeners.push(listener);
  return () => {
    tokenChangeListeners = tokenChangeListeners.filter(l => l !== listener);
  };
}

function notifyTokenChange(hasToken: boolean) {
  tokenChangeListeners.forEach(listener => {
    try {
      listener(hasToken);
    } catch (e) {
      console.error('Token change listener error:', e);
    }
  });
}

const ANON_USER_KEY = 'aplus_anon_device_id';
function getOrCreateAnonUserId(): string {
  try {
    let id = localStorage.getItem(ANON_USER_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(ANON_USER_KEY, id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
}
export function getAuthToken(): string {
  if (memoryToken) return memoryToken;
  if (typeof window === 'undefined') return '';
  try {
    const local = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    const session = window.sessionStorage.getItem(TOKEN_STORAGE_KEY) || '';
    const token = (local || session).trim();
    if (token) {
      memoryToken = token;
      return token;
    }
    return '';
  } catch {
    return '';
  }
}

export function setAuthToken(token: string) {
  const normalized = token.trim();
  const hadToken = !!memoryToken;
  memoryToken = normalized;
  const hasToken = !!normalized;
  
  if (typeof window !== 'undefined') {
    try {
      if (normalized) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, normalized);
        window.sessionStorage.setItem(TOKEN_STORAGE_KEY, normalized);
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }
  
  // 通知监听器 token 状态变化
  if (hadToken !== hasToken) {
    notifyTokenChange(hasToken);
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function buildUrl(path: string, params?: Record<string, QueryValue>) {
  const base = path.startsWith('http') ? path : `${API_FETCH_BASE}${path}`;

  if (!params) return base;

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `${base}${base.includes('?') ? '&' : '?'}${query}` : base;
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', params, data, headers, token, signal } = options;
  const url = buildUrl(path, params);

  // 获取当前语言并映射为标准语言代码
  const lang = getCurrentLanguage();
  const acceptLanguage = languageCodeMap[lang] || lang;

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': acceptLanguage,
    ...headers,
    'unique-id':getOrCreateAnonUserId()
  };

  const init: RequestInit = {
    method,
    headers: requestHeaders,
    signal,
  };

  const finalToken = (token || getAuthToken()).trim();
  if (finalToken) {
    requestHeaders.token = finalToken;
    // requestHeaders.Token = finalToken;
    // requestHeaders.Authorization = `Bearer ${finalToken}`;
  }

  if (data !== undefined && data !== null) {
    console.log(' [request] 检测到 data 参数');
    console.log('🔍 data 类型:', typeof data);
    console.log('🔍 data 是否为 FormData:', data instanceof FormData);
    console.log('🔍 data 内容:', data);
    
    // 特殊处理 FormData：不要设置 Content-Type，让浏览器自动设置 boundary
    if (data instanceof FormData) {
      init.body = data;
      // 删除之前设置的 Content-Type，让浏览器自动处理
      delete requestHeaders['Content-Type'];
      console.log('📤 [request] FormData 请求:', { url, method });
    } else {
      // 普通 JSON 数据
      requestHeaders['Content-Type'] = 'application/json';
      init.body = JSON.stringify(data);
      console.log('📤 [request] JSON 请求:', { 
        url, 
        method, 
        body: init.body,
        parsedBody: data
      });
    }
  } else {
    console.log('⚠️ [request] data 参数为空:', { data, isUndefined: data === undefined, isNull: data === null });
  }

  // 在原生 Capacitor 环境下，FormData（文件上传）使用原生 fetch 绕过 CapacitorHttp
  // 因为 CapacitorHttp 对 multipart/form-data 支持不完善，会导致上传失败。
  const shouldUseNativeFetch =
    data instanceof FormData && isCapacitorNative();
  const fetchFn = shouldUseNativeFetch ? nativeFetch : fetch;

  const response = await fetchFn(url, init);
  const payload = await parseResponse(response);

  if (!response.ok) {
    // 处理401未授权错误，跳转到登录页
    if (response.status === 401) {
      // 清除token
      setAuthToken('');
      
      // 跳转到登录页（保持当前视图模式）
      if (navigateFunction && typeof window !== 'undefined') {
        // 避免重复跳转
        if (!window.location.pathname.includes('/login')) {
          navigateFunction('/login', { replace: true });
        }
      }
    }
    
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: unknown }).message || 'Request failed')
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export const http = {
  get: <T = unknown>(
    path: string,
    options?: Omit<RequestOptions, 'method' | 'data'>,
  ) => request<T>(path, { ...options, method: 'GET' }),
  post: <T = unknown>(
    path: string,
    data?: unknown,
    options?: Omit<RequestOptions, 'method' | 'data'>,
  ) => request<T>(path, { ...options, method: 'POST', data }),
  put: <T = unknown>(
    path: string,
    data?: unknown,
    options?: Omit<RequestOptions, 'method' | 'data'>,
  ) => request<T>(path, { ...options, method: 'PUT', data }),
  patch: <T = unknown>(
    path: string,
    data?: unknown,
    options?: Omit<RequestOptions, 'method' | 'data'>,
  ) => request<T>(path, { ...options, method: 'PATCH', data }),
  delete: <T = unknown>(
    path: string,
    options?: Omit<RequestOptions, 'method' | 'data'>,
  ) => request<T>(path, { ...options, method: 'DELETE' }),
};

/** @deprecated 请使用 API_ORIGIN；与历史代码兼容 */
export const API_BASE_URL = API_ORIGIN;
