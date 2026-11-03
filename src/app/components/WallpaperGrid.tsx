import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Eye, Download, Heart } from 'lucide-react';
import { Wallpaper } from '../types';
import type { WallpaperListNavBase } from '../types/wallpaperListNav';
import { WALLPAPER_LIST_NAV_KEY } from '../types/wallpaperListNav';
import { useWallpaperListCardTracking } from '../hooks/useWallpaperListCardTracking';
import { wallpaperListCoverUrl } from '../utils/wallpaperApiMap';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface WallpaperGridProps {
  wallpapers: Wallpaper[];
  columns?: number;
  /** 从列表进详情时携带，与列表接口筛选一致；卡片会带上当前项序号（第 N 条） */
  listNavBase?: WallpaperListNavBase;
  /** 列表点击、桌面悬停埋点（不含列表曝光） */
  trackListEvents?: boolean;
  /** 平台类型：用于决定图片宽高比 */
  platform?: 'PHONE' | 'PC';
}

export function WallpaperGrid({
  wallpapers,
  columns = 2,
  listNavBase,
  trackListEvents = true,
  platform = 'PHONE', // 默认手机端
}: WallpaperGridProps) {
  return (
    <div
      className="grid gap-3 px-4"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
      }}
    >
      {wallpapers.map((wallpaper, index) => (
        <WallpaperCard
          key={wallpaper.id}
          wallpaper={wallpaper}
          index={index}
          listNavBase={listNavBase}
          trackListEvents={trackListEvents}
          platform={platform}
        />
      ))}
    </div>
  );
}

function WallpaperCard({
  wallpaper,
  index,
  listNavBase,
  trackListEvents,
  platform = 'PHONE', // 默认手机端
}: {
  wallpaper: Wallpaper;
  index: number;
  listNavBase?: WallpaperListNavBase;
  trackListEvents: boolean;
  platform?: 'PHONE' | 'PC';
}) {
  const { rootRef, onClickTrack, onHoverTrack } = useWallpaperListCardTracking(
    wallpaper.id,
    trackListEvents,
  );
  const listState =
    listNavBase != null
      ? { [WALLPAPER_LIST_NAV_KEY]: { ...listNavBase, listItemPosition: index + 1 } }
      : undefined;

  // 根据平台决定宽高比：手机9:16，电脑16:9
  const aspectRatio = platform === 'PHONE' ? 'aspect-[3/4]' : 'aspect-[16/9]';

  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onMouseEnter={onHoverTrack}
    >
      <Link
        to={`/wallpaper/${wallpaper.id}`}
        state={listState}
        className="block"
        onClick={onClickTrack}
      >
        <div className={`relative ${aspectRatio} rounded-lg overflow-hidden bg-muted group`}>
          <ImageWithFallback
            src={wallpaperListCoverUrl(wallpaper)}
            alt={wallpaper.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h3 className="text-white text-sm font-medium mb-2 line-clamp-1">
                {wallpaper.title}
              </h3>
              <div className="flex items-center gap-3 text-white/90 text-xs">
                <div className="flex items-center gap-1">
                  <Eye size={14} />
                  <span>{formatNumber(wallpaper.views)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Download size={14} />
                  <span>{formatNumber(wallpaper.downloads)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart size={14} />
                  <span>{formatNumber(wallpaper.likes)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resolution badge */}
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
            {wallpaper.resolution}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}