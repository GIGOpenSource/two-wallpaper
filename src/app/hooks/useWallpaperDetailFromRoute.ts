import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router';
import { getWallpaperDetail } from '../../api/wallpaper';
import { mapRecordToWallpaper } from '../utils/wallpaperApiMap';
import type { Wallpaper } from '../types';
import type { WallpaperNotFoundReason } from '../components/WallpaperNotFoundView';

type WallpaperDetailApiResponse = {
  code?: number;
  message?: string;
  data?: Record<string, unknown> | Record<string, unknown>[] | null;
};

function parseNotFoundReason(data: unknown): WallpaperNotFoundReason {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'not_found';
  const reason = (data as { reason?: unknown }).reason;
  if (reason === 'unpublished') return 'unpublished';
  return 'not_found';
}

/**
 * 从路由参数获取壁纸 ID 并加载壁纸详情
 * 自动处理数据映射、加载状态和错误状态
 */
export function useWallpaperDetailFromRoute() {
  const { id } = useParams();

  // 使用 ref 记录上一次加载的 ID，防止重复请求
  const lastLoadedIdRef = useRef<string | null>(null);
  // 使用 ref 标记是否正在请求中，防止并发请求
  const isFetchingRef = useRef(false);

  const [wallpaper, setWallpaper] = useState<Wallpaper | null>(null);
  /** 首帧 true，避免未跑 effect 时误判「未找到」 */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  /** 详情接口 body.code === 404 时的原因：not_found / unpublished */
  const [notFoundReason, setNotFoundReason] = useState<WallpaperNotFoundReason>(null);

  // 初始加载和路由变化时加载
  useEffect(() => {
    if (!id) {
      console.log('️ 壁纸 ID 为空，跳过加载');
      setLoading(false);
      setError(true);
      setNotFoundReason('not_found');
      return;
    }

    // 如果已经加载过相同的 ID，且没有正在请求，跳过
    if (lastLoadedIdRef.current === id && !isFetchingRef.current) {
      console.log('⏭️ 已加载过该壁纸详情，跳过重复请求');
      return;
    }

    // 如果正在请求中，跳过
    if (isFetchingRef.current) {
      console.log(' 正在请求中，跳过重复请求');
      return;
    }

    console.log(' 开始加载壁纸详情, ID:', id);

    let cancelled = false;
    setLoading(true);
    setError(false);
    setNotFoundReason(null);
    setWallpaper(null);
    isFetchingRef.current = true; // 标记开始请求

    const loadWallpaperDetail = async () => {
      try {
        console.log('📡 发起 API 请求获取壁纸详情:', id);
        const response = (await getWallpaperDetail(id)) as WallpaperDetailApiResponse;

        if (cancelled) {
          console.log('⚠️ 请求已被取消');
          return;
        }

        console.log('📥 API 响应:', response);

        // 协议：HTTP 多为 200，以 body.code 为准
        if (response?.code === 404) {
          console.log('📭 壁纸不可用:', response?.data);
          setWallpaper(null);
          setError(true);
          setNotFoundReason(parseNotFoundReason(response.data));
          lastLoadedIdRef.current = id;
          return;
        }

        // 响应格式: { code: 200, data: {...}, message: "success" }
        const wallpaperData = response?.data ?? response;
        console.log(' 提取的壁纸数据:', wallpaperData);

        const extracted = Array.isArray(wallpaperData)
          ? wallpaperData[0]
          : wallpaperData;

        console.log('🔍 映射前的数据:', extracted);

        const mapped = mapRecordToWallpaper(extracted as Record<string, unknown>);
        console.log('✅ 映射后的壁纸对象:', mapped);

        // 放宽验证条件:只要有 id 就接受数据,imageUrl 可以为空(可能是纯数据记录)
        if (mapped && mapped.id && mapped.id !== '0') {
          console.log('✅ 壁纸数据有效，更新状态');
          setWallpaper(mapped);
          setError(false);
          setNotFoundReason(null);
          lastLoadedIdRef.current = id; // 记录已加载的 ID
        } else {
          console.error('❌ 无效的壁纸数据:', {
            mapped,
            extracted,
            wallpaperData,
          });
          setError(true);
          setNotFoundReason('not_found');
        }
      } catch (err) {
        console.error('❌ 加载壁纸详情失败:', err);
        if (!cancelled) {
          setError(true);
          // HTTP 非 2xx（含网关 HTML 404）统一按不存在处理，避免走进崩溃页
          setNotFoundReason('not_found');
        }
      } finally {
        if (!cancelled) {
          console.log('🏁 加载完成，设置 loading = false');
          setLoading(false);
          isFetchingRef.current = false; // 标记请求结束
        }
      }
    };

    loadWallpaperDetail();

    return () => {
      console.log('🧹 组件卸载，取消请求');
      cancelled = true;
      isFetchingRef.current = false; // 重置请求标记，允许下次请求
    };
  }, [id]); // 只依赖 id

  /**
   * 刷新壁纸数据（用于下载、收藏等操作后更新统计数据）
   * 调用 /api/wallpapers/wallpaper 接口获取最新数据
   * 只更新统计数据，不显示 loading 状态
   */
  const refresh = useCallback(async () => {
    if (!id) return;

    try {
      console.log('🔄 刷新壁纸详情数据:', id);
      const response = (await getWallpaperDetail(id)) as WallpaperDetailApiResponse;

      if (response?.code === 404) {
        setWallpaper(null);
        setError(true);
        setNotFoundReason(parseNotFoundReason(response.data));
        return;
      }

      const wallpaperData = response?.data ?? response;
      const extracted = Array.isArray(wallpaperData)
        ? wallpaperData[0]
        : wallpaperData;

      const newWallpaper = mapRecordToWallpaper(extracted as Record<string, unknown>);

      if (newWallpaper && newWallpaper.id && newWallpaper.id !== '0') {
        console.log('✅ 刷新成功，更新壁纸数据');
        setWallpaper(newWallpaper);
        setError(false);
        setNotFoundReason(null);
      }
    } catch (err) {
      console.error('刷新壁纸详情失败:', err);
    }
  }, [id]);

  return { wallpaper, loading, error, notFoundReason, refresh };
}
