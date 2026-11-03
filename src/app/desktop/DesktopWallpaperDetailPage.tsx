import { App } from 'antd';
import { useState,useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { DesktopSidebar, useSidebar } from '../components/DesktopSidebar';
import { DesktopWallpaperGrid } from '../components/DesktopWallpaperGrid';
import { currentUser } from '../mockData';
import { trackAndRunDetailShare } from '../analytics/detailPageShareTrack';
import { umengclick } from '../analytics/aplusTracking';
import { sendDetailPagePV, trackWallpaperDownload } from '../analytics/firebaseTracking';
import { patchSeoWeekFromDetail } from '../analytics/seoTrafficAttribution';
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
import { Helmet } from 'react-helmet-async';
import {
  Download,
  Heart,
  Share2,
  Eye,
  Calendar,
  User,
  ChevronLeft,
  MessageCircle,
  Bookmark,
  ExternalLink,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function DesktopWallpaperDetailPage() {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const { isCollapsed } = useSidebar();
  const { id } = useParams();
  const navigate = useNavigate();
  const { wallpaper, loading, error, notFoundReason, refresh } = useWallpaperDetailFromRoute();
  const { relatedWallpapers, loadingRelated } = useGuessYouLikeRelated(id);
  const { comments, total: commentTotal } = useWallpaperComments(id || '');
  const { profile: currentProfile } = useUserProfile();
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
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
  
  // 获取壁纸详情SEO数据 - 只在 id 存在且 seoData 为空时请求
  useEffect(() => {
    if (!id || seoData) return; // 如果已经有SEO数据，不再请求
    
    console.log(' [DesktopWallpaperDetailPage] 请求壁纸SEO数据, wallpaper_id:', id);
    
    getWallpaperSeoTdk(id)
      .then((response) => {
        console.log('✅ [DesktopWallpaperDetailPage] SEO数据返回:', response);
        // 协议：code=404 时不要当成功 TDK
        if ((response as { code?: number })?.code === 404) return;
        const seoItem = response.data;
        if (seoItem) {
          setSeoData({
            title: seoItem.seo_title,
            description: seoItem.seo_description,
            keywords: seoItem.seo_keywords,
          });
          const seoWeek =
            typeof (seoItem as { seo_week?: unknown }).seo_week === 'string'
              ? (seoItem as { seo_week: string }).seo_week
              : undefined;
          patchSeoWeekFromDetail(seoWeek);
        }
      })
      .catch((err) => {
        console.error(' [DesktopWallpaperDetailPage] 获取SEO数据失败:', err);
      });
  }, [id, seoData]); // 依赖 seoData 来防止重复请求

  // 详情页手动 PV（Firebase），附带会话首次落地归因参数
  useEffect(() => {
    if (!wallpaper?.id) return;
    sendDetailPagePV(wallpaper.id);
  }, [wallpaper?.id]);
  
  // 判断是否是自己的壁纸
  const isOwnWallpaper = useMemo(() => {
    if (!wallpaper?.uploader || !currentProfile) return false;
    return String(wallpaper.uploader.id) === String(currentProfile.id);
  }, [wallpaper?.uploader?.id, currentProfile?.id]);

  useEffect(() => {
    console.log("wallpaper", wallpaper);
    if (wallpaper && wallpaper.is_collected !== undefined) {
      setIsLiked(wallpaper.is_collected);
    }
  }, [wallpaper]); 
  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar />
        <div className={`flex-1 transition-all duration-300 flex items-center justify-center ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
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
        trackWallpaperDownload(wallpaper.id);
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

    console.log("开始收藏");
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
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar />

        <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
          {/* Header */}
          <header className="bg-card border-b border-border sticky top-0 z-30">
            <div className="px-8 py-4">
              <div className="flex items-center gap-4 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    umengclick('detail_back');
                    navigate(-1);
                  }}
                  className="w-10 h-10 flex items-center justify-center hover:bg-muted rounded-full transition-colors"
                >
                  <ChevronLeft size={24} className="text-foreground" />
                </button>
                <h1 className="text-xl font-bold text-foreground flex-1">{wallpaper.title}</h1>
                <button
                  onClick={() => setIsFavorited(!isFavorited)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${isFavorited
                    ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                    : 'bg-muted text-gray-600 hover:bg-muted'
                  }`}
                >
                  {/* <Bookmark size={20} className={isFavorited ? 'fill-yellow-600' : ''} */}
                  {/* <span className="font-medium">
                  {isFavorited ? t.wallpaperDetail.saved : t.wallpaperDetail.save}
                </span> */}
                </button>
              </div>
              {/* {wallpaper.description && (
              <p className="text-sm text-gray-600 ml-14">{wallpaper.description}</p>
            )} */}
          </div>
        </header>

        <div className="px-6 md:px-10 py-8">
          <div className="max-w-[1800px] mx-auto">
            <div className="grid grid-cols-3 gap-8">
              {/* Main Content - Left Column */}
              <div className="col-span-2 space-y-6">
                {/* Description - 描述文字放在图片上方 */}
                {wallpaper.description && (
                  <div className="bg-card rounded-2xl p-6 shadow-sm">
                    <p className="text-sm text-muted-foreground leading-relaxed">{wallpaper.description}</p>
                  </div>
                )}

                {/* Wallpaper Image */}
                <div className="bg-[#101828] dark:bg-[#0f1f36] rounded-2xl overflow-hidden shadow-lg">
                  <div 
                    className="relative aspect-video bg-[#101828] dark:bg-[#0f1f36] cursor-pointer"
                    onClick={() => setShowPreview(true)}
                  >
                    <ImageWithFallback
                      src={wallpaper.imageUrl}
                      alt={wallpaper.title}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                {/* Comments Section */}
                <div className="bg-card rounded-2xl p-6 shadow-sm">
                  <CommentSection wallpaperId={id || ''} />
                </div>

                {(loadingRelated || relatedWallpapers.length > 0) && (
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-6">
                      {t.wallpaperDetail.relatedWallpapers}
                    </h3>
                    {loadingRelated ? (
                      <p className="py-8 text-center text-muted-foreground">{t.common.loading}</p>
                    ) : (
                      <DesktopWallpaperGrid wallpapers={relatedWallpapers} columns={3} />
                    )}
                  </div>
                )}
              </div>

              {/* Sidebar - Right Column */}
              <div className="space-y-6 pr-1">
                {/* Action Buttons */}
                <div className="bg-card rounded-2xl p-6 shadow-sm space-y-3">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:pointer-events-none"
                  >
                    <Download size={20} />
                    {downloading ? t.common.loading : t.wallpaperDetail.download}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCollect}
                    className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${isLiked
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-muted text-foreground hover:bg-muted'
                      }`}
                  >
                    <Heart size={20} className={isLiked ? 'fill-red-600' : ''} />
                    {isLiked ? t.wallpaperDetail.liked : t.wallpaperDetail.like}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleShare}
                    className="w-full bg-muted text-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                  >
                    <Share2 size={20} />
                    {t.wallpaperDetail.share}
                  </motion.button>
                </div>

                {/* Stats */}
                <div className="bg-card rounded-2xl p-6 shadow-sm">
                  <h4 className="font-semibold text-foreground mb-4">{t.wallpaperDetail.statistics}</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Eye size={18} />
                        <span>{t.wallpaperDetail.views}</span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {formatNumber(wallpaper.views)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Download size={18} />
                        <span>{t.wallpaperDetail.downloads}</span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {formatNumber(localDownloads ?? wallpaper.downloads)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Heart size={18} />
                        <span>{t.wallpaperDetail.likes}</span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {formatNumber(localLikes ?? wallpaper.likes)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="bg-card rounded-2xl p-6 shadow-sm">
                  <h4 className="font-semibold text-foreground mb-4">{t.wallpaperDetail.details}</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t.wallpaperDetail.resolution}</span>
                      <span className="font-medium text-foreground">{wallpaper.resolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t.wallpaperDetail.aspectRatio}</span>
                      <span className="font-medium text-foreground">{wallpaper.aspectRatio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t.wallpaperDetail.uploadDate}</span>
                      <span className="font-medium text-foreground">
                        {new Date(wallpaper.uploadDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Uploader - 只在有uploader时显示 */}
                {wallpaper.uploader ? (
                  <div className="bg-card rounded-2xl p-6 shadow-sm">
                    <h4 className="font-semibold text-foreground mb-4">{t.wallpaperDetail.uploader}</h4>
                    <button
                      onClick={() => {
                        // 如果是自己的壁纸，跳转到自己的主页；否则跳转到其他用户页面
                        if (isOwnWallpaper) {
                          navigate('/profile');
                        } else {
                          navigate(`/profile/${wallpaper.uploader?.id}?other_id=${wallpaper.uploader?.id}`);
                        }
                      }}
                      className="flex items-center gap-3 hover:bg-background p-3 rounded-lg transition-colors w-full text-left"
                    >
                      {wallpaper.uploader.avatar ? (
                        <ImageWithFallback
                          src={wallpaper.uploader.avatar}
                          alt={wallpaper.uploader.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                          <User size={20} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{wallpaper.uploader.username}</p>
                        <p className="text-sm text-muted-foreground">
                          {t.wallpaperDetail.level} {wallpaper.uploader.level} 
                          {/* •{' '}
                          {wallpaper.uploader.points} {t.wallpaperDetail.points} */}
                        </p>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="bg-card rounded-2xl p-6 shadow-sm">
                    <h4 className="font-semibold text-foreground mb-4">{t.wallpaperDetail.uploader}</h4>
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        <User size={20} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-muted-foreground">{t.wallpaperDetail.systemUpload}</p>
                        <p className="text-sm text-muted-foreground">{t.wallpaperDetail.uploadBySystem}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div className="bg-card rounded-2xl p-6 shadow-sm">
                  <h4 className="font-semibold text-foreground mb-4">{t.wallpaperDetail.tagsHeading}</h4>
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
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm rounded-lg transition-colors"
                      >
                        #{tag.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Share Modal */}
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-2xl z-50 p-8 w-full max-w-md"
            >
              <h3 className="text-xl font-bold text-foreground mb-6">{t.wallpaperDetail.shareWallpaper}</h3>
              <div className="grid grid-cols-5 gap-2 sm:gap-4 mb-6">
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
                      console.log(`Sharing wallpaper ${wallpaper}`);
                      const shareUrl = `${PUBLIC_SITE_ORIGIN}/wallpaper/${id}`;
                      await trackAndRunDetailShare(key, shareUrl, () =>
                        message.success(t.wallpaperDetail.linkCopied),
                        wallpaper.imageUrl,
                        wallpaper.title,
                      );
                      setShowShareSheet(false);
                    }}
                  >
                    <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center hover:bg-muted transition-colors">
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
                className="w-full py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted transition-colors"
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
            trackWallpaperDownload(wallpaper.id);
          }
        }}
      />

      {/* Fullscreen Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 overflow-hidden"
          style={{ zIndex: 100 }}
          onClick={() => setShowPreview(false)}
        >
          <div className="relative">
            <ImageWithFallback
              src={wallpaper.imageUrl}
              alt={wallpaper.title}
              className="max-w-full max-h-[calc(100vh-2rem)] object-contain"
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
