import { App } from 'antd';
import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { BottomNav } from '../components/BottomNav';
import { WallpaperGrid } from '../components/WallpaperGrid';
import { currentUser } from '../mockData';
import { trackAndRunDetailShare } from '../analytics/detailPageShareTrack';
import { umengclick } from '../analytics/aplusTracking';
import { useLanguage } from '../contexts/LanguageContext';
import { useGuessYouLikeRelated } from '../hooks/useGuessYouLikeRelated';
import { useWallpaperDetailFromRoute } from '../hooks/useWallpaperDetailFromRoute';
import { useWallpaperComments } from '../hooks/useWallpaperComments';
import { useUserProfile } from '../hooks/useUserProfile';
import { tpl } from '../utils/format';
import { downloadWallpaperImage, openImageUrlInNewTab } from '../utils/downloadWallpaperImage';
import { PUBLIC_SITE_ORIGIN } from '../config/publicSite';
import { recordWallpaperDownload, recordWallpaperCollect, getWallpaperSeoTdk } from '../../api/wallpaper';
import { getAuthToken } from '../../api/request';
import { DownloadNoticeAlert } from '../components/DownloadNoticeAlert';
import CommentSection from '../components/CommentSection';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { WallpaperNotFoundView } from '../components/WallpaperNotFoundView';
import {
  Download,
  Heart,
  Share2,
  Eye,
  Calendar,
  Image as ImageIcon,
  User,
  ChevronLeft,
  MessageCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function WallpaperDetailPage() {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const { wallpaper, loading, error, notFoundReason, refresh } = useWallpaperDetailFromRoute();
  const { relatedWallpapers, loadingRelated } = useGuessYouLikeRelated(id);
  const { comments, total: commentTotal } = useWallpaperComments(id || '');
  const { profile: currentProfile } = useUserProfile();
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [localLikes, setLocalLikes] = useState<number | null>(null); // 本地管理的收藏数
  const [localDownloads, setLocalDownloads] = useState<number | null>(null); // 本地管理的下载数
  const [downloadNotice, setDownloadNotice] = useState<{
    open: boolean;
    message: string;
    pendingTabUrl?: string;
  }>({ open: false, message: '' });
  const [seoData, setSeoData] = useState<{ title?: string; description?: string; keywords?: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false); // 添加预览状态

  // 调试：组件挂载时打印信息
  useEffect(() => {
    console.log('🚀 [WallpaperDetailPage] 组件已挂载');
    console.log('🚀 [WallpaperDetailPage] 当前 id:', id);
    console.log('🚀 [WallpaperDetailPage] 当前 wallpaper:', wallpaper);
  }, []);

  // 初始化喜欢状态使用壁纸的is_collected字段
  const [isLiked, setIsLiked] = useState(!!wallpaper?.is_collected);

  // 当壁纸数据更新时，同步更新isLiked状态
  useEffect(() => {
    if (wallpaper && wallpaper.is_collected !== undefined) {
      setIsLiked(wallpaper.is_collected);
    }

  }, [wallpaper?.is_collected]);

  // 获取壁纸详情SEO数据 - 只在 id 存在且 seoData 为空时请求
  useEffect(() => {
    if (!id || seoData) return; // 如果已经有SEO数据，不再请求

    console.log('🔍 [WallpaperDetailPage] 请求壁纸SEO数据, wallpaper_id:', id);

    getWallpaperSeoTdk(id)
      .then((response) => {
        console.log('✅ [WallpaperDetailPage] SEO数据返回:', response);
        // 协议：code=404 时不要当成功 TDK
        if ((response as { code?: number })?.code === 404) return;
        const seoItem = response.data;
        if (seoItem) {
          setSeoData({
            title: seoItem.seo_title,
            description: seoItem.seo_description,
            keywords: seoItem.seo_keywords,
          });
        }
      })
      .catch((err) => {
        console.error('❌ [WallpaperDetailPage] 获取SEO数据失败:', err);
      });
  }, [id, seoData]); // 依赖 seoData 来防止重复请求

  // 判断是否是自己的壁纸
  const isOwnWallpaper = useMemo(() => {
    if (!wallpaper?.uploader || !currentProfile) return false;
    return String(wallpaper.uploader.id) === String(currentProfile.id);
  }, [wallpaper?.uploader?.id, currentProfile?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col max-w-md mx-auto bg-background">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!wallpaper || error) {
    return <WallpaperNotFoundView reason={notFoundReason} />;
  }

  const handleDownload = async () => {
    if (downloading || !wallpaper.imageUrl) return;
    umengclick('detail_download_click');
    setDownloading(true);
    umengclick('download_start');
    try {
      try {
        // 调用下载记录接口，获取最新的下载量
        const res = await recordWallpaperDownload(wallpaper.id) as {
          code: number;
          message: string;
          data: { download_count: number }
        };

        // 检查业务状态码并更新下载量
        if (res.code === 200 && res.data?.download_count !== undefined) {
          // 使用局部状态更新下载量
          setLocalDownloads(res.data.download_count);
        }
      } catch (err) {
        console.error('记录下载失败:', err);
        // 上报失败不影响实际下载流程
      }
      const result = await downloadWallpaperImage(wallpaper.imageUrl, wallpaper.title);
      if (result.status === 'failed') {
        umengclick('download_fail');
        setDownloadNotice({ open: true, message: t.wallpaperDetail.downloadFailed });
      } else if (result.status === 'blob') {
        umengclick('download_success');
      } else {
        setDownloadNotice({
          open: true,
          message: t.wallpaperDetail.downloadOpenInNewTab,
          pendingTabUrl: result.url,
        });
      }
    } catch {
      umengclick('download_fail');
      setDownloadNotice({ open: true, message: t.wallpaperDetail.downloadFailed });
    } finally {
      setDownloading(false);
    }
  };
  const handleCollect = async () => {
    // 检查是否登录
    const token = getAuthToken();
    if (!token) {
      // message.warning('请先登录后再收藏');
      setTimeout(() => {
        navigate('/login');
      }, 500);
      return;
    }

    try {
      // 调用收藏接口，返回格式: { code: 200, message: "...", data: { collected: boolean, collect_count: number } }
      const res = await recordWallpaperCollect(wallpaper.id) as {
        code: number;
        message: string;
        data: { collected: boolean; collect_count: number }
      };

      // 检查业务状态码
      if (res.code !== 200) {
        message.error(res.message || '操作失败，请重试');
        return;
      }

      // 更新收藏状态
      setIsLiked(res.data.collected);
      // 直接使用接口返回的 collect_count 更新收藏数，不调用详情接口
      setLocalLikes(res.data.collect_count);

      // 显示成功提示
      message.success(res.data.collected ? t.wallpaperDetail.collectSuccess : t.wallpaperDetail.collectCanceled);
    } catch (err) {
      console.error('收藏失败:', err);
      message.error(err.message);
    }
  };

  const handleShare = () => {
    umengclick('detail_share_click');
    setShowShareSheet(true);
  };

  return (
    <>
      <Helmet>
        {/* Use SEO data from API */}
        <title>{seoData?.title || wallpaper?.title || 'Wallpaper Detail'}</title>
        <meta
          name="description"
          content={seoData?.description || wallpaper?.description || 'Download high-quality HD wallpaper for free'}
        />
        <meta name="keywords" content={seoData?.keywords || 'wallpaper, HD wallpaper, desktop wallpaper'} />
        <meta property="og:title" content={seoData?.title || wallpaper?.title || 'HD Wallpaper'} />
        <meta property="og:description" content={seoData?.description || wallpaper?.description || 'High-quality wallpaper waiting for you to download'} />
        {wallpaper?.imageUrl && <meta property="og:image" content={wallpaper.imageUrl} />}
        <link rel="canonical" href={`${window.location.origin}/wallpaper/${wallpaper?.id}`} />
      </Helmet>
      <div className="min-h-screen bg-background dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 pb-20 safe-area-pb max-w-md mx-auto">
        {/* Header */}
        <header className="bg-gradient-to-b from-black/50 to-transparent safe-area-pt">
          <div className="flex p-4">
            <button
              type="button"
              onClick={() => {
                umengclick('detail_back');
                navigate(-1);
              }}
              className="w-10 h-10 bg-card/90 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <ChevronLeft size={24} className="text-foreground" />
            </button>
            <div className="font-bold ml-4 text-lg w-80 mt-2 text-gray-900 dark:text-white">{wallpaper.title}</div>
          </div>
        </header>

        {/* Wallpaper Image Container */}
        <div className="px-4">
          <div className="bg-card dark:bg-[#101727] dark:border dark:border-#1b3456 rounded-2xl overflow-hidden shadow-lg" onClick={() => setShowPreview(true)} >
            <div className="relative aspect-[3/4] bg-gray-900 dark:bg-[#101727]">
              <ImageWithFallback
                src={wallpaper.imageUrl}
                alt={wallpaper.title}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-card mt-4 rounded-t-3xl">
          <div className="px-4 py-4 border-b border-border">
            {wallpaper.description && (
              <p className="text-sm text-muted-foreground mb-3">{wallpaper.description}</p>
            )}
            {/* 上传者信息 - 只在有uploader时显示 */}
            {wallpaper.uploader && (
              <button
                onClick={() => {
                  // 如果是自己的壁纸，跳转到自己的主页；否则跳转到其他用户页面
                  if (isOwnWallpaper) {
                    navigate('/profile');
                  } else {
                    navigate(`/profile/${wallpaper.uploader?.id}?other_id=${wallpaper.uploader?.id}`);
                  }
                }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <User size={16} />
                <span className="text-sm">{wallpaper.uploader.username}</span>
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 px-4 py-4 border-b border-border">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-foreground mb-1">
                <Eye size={18} />
                <span className="text-lg font-semibold">{formatNumber(wallpaper.views)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.wallpaperDetail.views}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-foreground mb-1">
                <Download size={18} />
                <span className="text-lg font-semibold">{formatNumber(localDownloads ?? wallpaper.downloads)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.wallpaperDetail.downloads}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-foreground mb-1">
                <Heart size={18} />
                <span className="text-lg font-semibold">{formatNumber(localLikes ?? wallpaper.likes)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.wallpaperDetail.likes}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 pt-4 border-t border-border fixed bottom-0 left-0 right-0 bg-card z-50 safe-area-pb">
            <div className="flex gap-3 items-center w-full pb-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-full font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
            >
              <Download size={20} />
              {downloading ? t.common.loading : t.wallpaperDetail.download}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCollect}
              className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${isLiked
                ? 'bg-red-500/10 border-red-500 text-red-400'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground'
                }`}
            >
              <Heart size={20} className={isLiked ? 'fill-red-400' : ''} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className="w-12 h-12  border-2 border-border text-muted-foreground hover:text-foreground hover:border-foreground rounded-full flex items-center justify-center transition-colors"
            >
              <Share2 size={20} />
            </motion.button>
            </div>
          </div>

          {/* Wallpaper Details */}
          <div className="px-4 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">{t.wallpaperDetail.details}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t.wallpaperDetail.resolution}</span>
                <span className="text-foreground font-medium">{wallpaper.resolution}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t.wallpaperDetail.aspectRatio}</span>
                <span className="text-foreground font-medium">{wallpaper.aspectRatio}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t.wallpaperDetail.uploadDate}</span>
                <span className="text-foreground font-medium">
                  {new Date(wallpaper.uploadDate).toLocaleDateString()}
                </span>
              </div>
              {/* 上传者信息 - 只在有uploader时显示 */}
              {wallpaper.uploader && (
                <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                  <span className="text-muted-foreground">{t.wallpaperDetail.uploader || '上传者'}</span>
                  <div className="flex items-center gap-2">
                    {wallpaper.uploader.avatar && (
                      <ImageWithFallback
                        src={wallpaper.uploader.avatar}
                        alt={wallpaper.uploader.username}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    )}
                    <span className="text-foreground font-medium">{wallpaper.uploader.username}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="px-4 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">{t.wallpaperDetail.tagsHeading}</h3>
            <div className="flex flex-wrap gap-2">
              {wallpaper.tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/tag/${encodeURIComponent(tag.name)}`}
                  onClick={() => umengclick('filter_click_tag')}
                  state={{
                    tagMeta: {
                      name: tag.name,
                    },
                  }}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs rounded-full transition-colors"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Comments Section */}
          <div className="px-4 py-4 border-b border-border">
            <CommentSection wallpaperId={id || ''} />
          </div>

          {(loadingRelated || relatedWallpapers.length > 0) && (
            <div className="py-4">
              <div className="px-4 mb-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {t.wallpaperDetail.relatedWallpapers}
                </h3>
              </div>
              {loadingRelated ? (
                <p className="px-4 py-4 text-center text-sm text-muted-foreground">{t.common.loading}</p>
              ) : (
                <WallpaperGrid wallpapers={relatedWallpapers} />
              )}
            </div>
          )}
        </div>

        {/* Share Bottom Sheet */}
        <AnimatePresence>
          {showShareSheet && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowShareSheet(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 p-6 safe-area-pb"
              >
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  {t.wallpaperDetail.shareWallpaper}
                </h3>
                <div className="grid grid-cols-5 gap-2 sm:gap-4 mb-4">
                  {(
                    [
                      ['copy', t.wallpaperDetail.copyLink],
                      ['tw', t.wallpaperDetail.shareX],
                      ['fb', t.wallpaperDetail.shareFacebook],
                      ['wa', t.wallpaperDetail.shareWhatsApp],
                      ['pin', t.wallpaperDetail.sharePinterest],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className="flex flex-col items-center gap-2"
                      onClick={async () => {
                        const shareUrl = `${PUBLIC_SITE_ORIGIN}/wallpaper/${id}`;
                        await trackAndRunDetailShare(key, shareUrl, () =>
                          message.success(t.wallpaperDetail.linkCopied),
                          wallpaper.imageUrl,
                          wallpaper.title,
                        );
                        setShowShareSheet(false);
                      }}
                    >
                      <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center">
                        {key === 'copy' ? (
                          <Share2 size={24} className="text-gray-600 dark:text-white" />
                        ) : (
                          <span className="text-lg font-bold text-gray-600 dark:text-white">
                            {key === 'tw' ? 'X' : key === 'fb' ? 'F' : key === 'wa' ? 'W' : key === 'pin' ? 'P' : 'S'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-600 dark:text-white">{label}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowShareSheet(false)}
                  className="w-full py-3 bg-muted text-foreground rounded-full font-medium"
                >
                  {t.common.cancel}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <DownloadNoticeAlert
          open={downloadNotice.open}
          onOpenChange={(open) =>
            setDownloadNotice((s) => ({
              ...s,
              open,
              ...(open ? {} : { pendingTabUrl: undefined }),
            }))
          }
          title={t.common.tip}
          description={downloadNotice.message}
          actionLabel={t.common.gotIt}
          onConfirm={() => {
            const url = downloadNotice.pendingTabUrl;
            if (url) {
              openImageUrlInNewTab(url);
              umengclick('download_success');
            }
          }}
        />

        {/* Fullscreen Preview Modal */}
        {showPreview && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPreview(false)}
          >
            <div className="relative max-w-4xl max-h-full w-full flex items-center justify-center">
              <ImageWithFallback
                src={wallpaper.imageUrl}
                alt={wallpaper.title}
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()} // 防止点击图片时关闭预览
                referrerPolicy="no-referrer"
              />
              <button
                className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-all"
                onClick={() => setShowPreview(false)}
              >
                <X size={24} />
              </button>
            </div>
          </div>
        )}

        <BottomNav />
      </div>
    </>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}