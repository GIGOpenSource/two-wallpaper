import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Eye, Download, Heart, Trash2, X } from 'lucide-react';
import { Wallpaper } from '../types';
import type { WallpaperListNavBase } from '../types/wallpaperListNav';
import { WALLPAPER_LIST_NAV_KEY } from '../types/wallpaperListNav';
import { useWallpaperListCardTracking } from '../hooks/useWallpaperListCardTracking';
import { wallpaperListCoverUrl } from '../utils/wallpaperApiMap';
import { useLanguage } from '../contexts/LanguageContext';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface DesktopWallpaperGridProps {
  wallpapers: Wallpaper[];
  columns?: number;
  listNavBase?: WallpaperListNavBase;
  /** 列表点击、桌面悬停埋点（不含列表曝光） */
  trackListEvents?: boolean;
  /** 删除壁纸回调（可选，仅在需要删除功能时传入） */
  onDelete?: (id: number | string) => void;
  /** 正在删除的壁纸ID */
  deletingId?: number | string | null;
  /** 平台类型：用于决定图片宽高比 */
  platform?: 'PHONE' | 'PC';
  /** 是否显示审核状态 */
  showAuditStatus?: boolean;
}

export function DesktopWallpaperGrid({
  wallpapers,
  columns = 4,
  listNavBase,
  trackListEvents = true,
  onDelete,
  deletingId,
  platform = 'PC', // 默认电脑端
  showAuditStatus = false,
}: DesktopWallpaperGridProps) {
  // 使用 grid 布局，固定为最多4列
  const gridClass = `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-4`;

  return (
    <div className={gridClass}>
      {wallpapers.map((wallpaper, index) => (
        <div key={wallpaper.id} className="break-inside-avoid">
          <DesktopWallpaperCard
            wallpaper={wallpaper}
            index={index}
            listNavBase={listNavBase}
            trackListEvents={trackListEvents}
            onDelete={onDelete}
            isDeleting={deletingId === wallpaper.id}
            platform={platform}
            showAuditStatus={showAuditStatus}
          />
        </div>
      ))}
    </div>
  );
}

function DesktopWallpaperCard({
  wallpaper,
  index,
  listNavBase,
  trackListEvents,
  onDelete,
  isDeleting,
  platform = 'PC', // 默认电脑端
  showAuditStatus = true,
}: {
  wallpaper: Wallpaper;
  index: number;
  listNavBase?: WallpaperListNavBase;
  trackListEvents: boolean;
  onDelete?: (id: number | string) => void;
  isDeleting: boolean;
  platform?: 'PHONE' | 'PC';
  showAuditStatus?: boolean;
}) {
  const { rootRef, onClickTrack, onHoverTrack } = useWallpaperListCardTracking(
    wallpaper.id,
    trackListEvents,
  );
  const { t } = useLanguage();
  const navigate = useNavigate();
  const listState =
    listNavBase != null
      ? { [WALLPAPER_LIST_NAV_KEY]: { ...listNavBase, listItemPosition: index + 1 } }
      : undefined;

  const [showRejectModal, setShowRejectModal] = useState(false);

  // 根据平台决定宽高比：手机9:16，电脑16:9
  const aspectRatio = platform === 'PHONE' ? 'aspect-[3/4]' : 'aspect-[16/9]';

  const isRejected = wallpaper.audit_status === 'rejected';
  const isPending = wallpaper.audit_status === 'pending';
  const shouldBlockClick = isRejected || isPending;

  const handleCardClick = (e: React.MouseEvent) => {
    if (isRejected) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      onClickTrack?.(e);
    }
  };

  const handleRejectedClick = () => {
    setShowRejectModal(true);
  };

  return (
    <>
      {shouldBlockClick ? (
        <div className="relative">
          {/* 删除按钮 - 仅当传入 onDelete 时显示 */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(wallpaper.id);
              }}
              disabled={isDeleting}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
            </button>
          )}

          <div 
            className={`relative ${aspectRatio} rounded-xl overflow-hidden bg-muted group shadow-md cursor-not-allowed`}
            onClick={handleRejectedClick}
          >
            <ImageWithFallback
              src={wallpaperListCoverUrl(wallpaper)}
              alt={wallpaper.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* Resolution badge - 当有删除按钮时移到左边 */}
            <div className={`absolute top-3 ${onDelete ? 'left-3' : 'right-3'} bg-black/70 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg font-medium`}>
              {wallpaper.resolution}
            </div>

            {/* 审核状态 - 右下角 */}
            {showAuditStatus && wallpaper.audit_status && (
              <div className={`absolute bottom-3 right-3 text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                isRejected ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'
              }`}>
                {isRejected ? t.audit.rejected : t.audit.pending}
              </div>
            )}
          </div>

          {/* 审核状态弹窗 */}
          {showRejectModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={() => setShowRejectModal(false)}
            >
              <div
                className="bg-card rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-bold ${isRejected ? 'text-red-500' : 'text-green-500'}`}>
                    {isRejected ? t.audit.rejectedTitle : t.audit.pendingTitle}
                  </h3>
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                {isRejected ? (
                  <>
                    <p className="text-muted-foreground mb-4">
                      {t.audit.rejectedReason}
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                      <p className="text-red-700 whitespace-pre-wrap">
                        {wallpaper.audit_remark || t.audit.noRejectReason}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowRejectModal(false);
                          sessionStorage.setItem('reuploadWallpaper', JSON.stringify(wallpaper));
                          navigate('/upload');
                        }}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                      >
                        {t.audit.reupload}
                      </button>
                      <button
                        onClick={() => setShowRejectModal(false)}
                        className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                      >
                        {t.audit.gotIt}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-6">
                      {t.audit.pendingMessage}
                    </p>
                    <button
                      onClick={() => setShowRejectModal(false)}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                    >
                      {t.audit.gotIt}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <motion.div
          ref={rootRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          whileHover={{ y: -4 }}
          onMouseEnter={onHoverTrack}
          className="relative"
        >
          {/* 删除按钮 - 仅当传入 onDelete 时显示 */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(wallpaper.id);
              }}
              disabled={isDeleting}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
            </button>
          )}

          <Link
            to={`/wallpaper/${wallpaper.id}`}
            state={listState}
            className="block"
            onClick={onClickTrack}
          >
            <div className={`relative ${aspectRatio} rounded-xl overflow-hidden bg-muted group shadow-md hover:shadow-xl transition-shadow`}>
              <ImageWithFallback
                src={wallpaperListCoverUrl(wallpaper)}
                alt={wallpaper.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-semibold mb-2 line-clamp-2">
                    {wallpaper.title}
                  </h3>
                  <div className="flex items-center gap-4 text-white/90 text-sm">
                    <div className="flex items-center gap-1">
                      <Eye size={16} />
                      <span>{formatNumber(wallpaper.views)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download size={16} />
                      <span>{formatNumber(wallpaper.downloads)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart size={16} />
                      <span>{formatNumber(wallpaper.likes)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resolution badge - 当有删除按钮时移到左边 */}
              <div className={`absolute top-3 ${onDelete ? 'left-3' : 'right-3'} bg-black/70 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg font-medium`}>
                {wallpaper.resolution}
              </div>

              {/* 审核状态 - 右下角 */}
              {showAuditStatus && wallpaper.audit_status && (
                <div className={`absolute bottom-3 right-3 text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                  wallpaper.audit_status === 'pending'
                    ? 'bg-green-500/90 text-white'
                    : wallpaper.audit_status === 'approved'
                      ? 'bg-blue-500/90 text-white'
                      : 'bg-red-500/90 text-white'
                }`}>
                  {wallpaper.audit_status === 'pending' ? '待审核' : wallpaper.audit_status === 'approved' ? '已通过' : '已拒绝'}
                </div>
              )}
            </div>
          </Link>
        </motion.div>
      )}
    </>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}