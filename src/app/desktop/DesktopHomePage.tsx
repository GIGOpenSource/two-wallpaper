import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { SearchBar } from '../components/SearchBar';
import { DesktopWallpaperGrid } from '../components/DesktopWallpaperGrid';
import { EditorsPickWallpaperLink } from '../components/EditorsPickWallpaperLink';
import { DesktopSidebar, useSidebar } from '../components/DesktopSidebar';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { formatNumber } from '../utils/format';
import { useHomePopularWallpapers } from '../hooks/useHomePopularWallpapers';
import { useHomeFeaturedWallpapers } from '../hooks/useHomeFeaturedWallpapers';
import { wallpaperListCoverUrl } from '../utils/wallpaperApiMap';
import { Helmet } from 'react-helmet-async';
import { getSeoTdk } from '../../api/wallpaper';

import { analytics } from '../utils/firebase';
import { logEvent } from 'firebase/analytics';
import { getDeviceType } from '../utils/device';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export default function DesktopHomePage() {
  const { t } = useLanguage();
  const location = useLocation();
  const isTrendingRoute = location.pathname === '/trending';
  const showEditorsBanner = !isTrendingRoute;
  const [seoData, setSeoData] = useState<{ title?: string; description?: string; keywords?: string } | null>(null);
  const { isCollapsed } = useSidebar();

  // 获取SEO数据 - 使用当前页面URL
  useEffect(() => {
    const currentUrl = `${window.location.origin}${window.location.pathname}`;
    const pageType = isTrendingRoute ? 'trending' : 'home';

    console.log(` [DesktopHomePage] 请求${pageType}页面SEO数据, URL:`, currentUrl);

    getSeoTdk(currentUrl)
      .then((response) => {
        console.log('✅ [DesktopHomePage] SEO数据返回:', response);
        const seoItem = response.data?.results?.[0]; // 根据API响应结构调整
        if (seoItem) {
          setSeoData({
            title: seoItem.title,
            description: seoItem.description,
            keywords: seoItem.keywords,
          });
        } else {
          // 如果API没有返回数据，使用默认值
          setSeoData({
            title: isTrendingRoute
              ? 'Trending Wallpapers - HD Wallpaper Downloads'
              : 'Home - Discover Beautiful Wallpapers',
            description: isTrendingRoute
              ? 'Browse the most popular trending HD wallpapers, free downloads'
              : 'Discover curated beautiful HD wallpapers, personalize your desktop',
            keywords: isTrendingRoute
              ? 'trending wallpapers, popular wallpapers, HD wallpapers'
              : 'wallpaper, HD wallpaper, desktop wallpaper, curated wallpapers'
          });
        }
      })
      .catch((err) => {
        console.error(`❌ [DesktopHomePage] 获取${isTrendingRoute ? 'trending' : 'home'}页面SEO数据失败:`, err);
        // 出错时使用默认值
        setSeoData({
          title: isTrendingRoute
            ? 'Trending Wallpapers - HD Wallpaper Downloads'
            : 'Home - Discover Beautiful Wallpapers',
          description: isTrendingRoute
            ? 'Browse the most popular trending HD wallpapers, free downloads'
            : 'Discover curated beautiful HD wallpapers, personalize your desktop',
          keywords: isTrendingRoute
            ? 'trending wallpapers, popular wallpapers, HD wallpapers'
            : 'wallpaper, HD wallpaper, desktop wallpaper, curated wallpapers'
        });
      });
    logEvent(analytics, 'home', {
      page_title: 'home',
      userId: localStorage.getItem('user_id') || '',
      device_type: getDeviceType()
    });

  }, [isTrendingRoute]);
  const {
    wallpapers: popularWallpapers,
    loading: popularLoading,
    loadingMore: popularLoadingMore,
    error: popularError,
    hasMore: popularHasMore,
    sentinelRef: popularSentinelRef,
  } = useHomePopularWallpapers({ enabled: true, isHotRoute: isTrendingRoute });

  // 使用真实 API 获取精选壁纸
  const {
    wallpapers: featuredWallpapers,
    loading: featuredLoading,
    error: featuredError,
  } = useHomeFeaturedWallpapers();

  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showEditorsBanner || featuredWallpapers.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredWallpapers.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [showEditorsBanner, featuredWallpapers.length]);

  useEffect(() => {
    if (!showEditorsBanner || !carouselRef.current || featuredWallpapers.length === 0) return;
    carouselRef.current.scrollTo({
      left: currentSlide * carouselRef.current.offsetWidth,
      behavior: 'smooth',
    });
  }, [currentSlide, showEditorsBanner, featuredWallpapers.length]);

  const handlePrev = () => {
    if (featuredWallpapers.length === 0) return;
    setCurrentSlide((prev) => (prev - 1 + featuredWallpapers.length) % featuredWallpapers.length);
  };

  const handleNext = () => {
    if (featuredWallpapers.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % featuredWallpapers.length);
  };

  return (
    <>
      <Helmet>
        {/* Prioritize API-returned SEO data, fallback to default data */}
        <title>{seoData?.title || (isTrendingRoute ? 'Trending Wallpapers - HD Wallpaper Downloads' : 'Home - Discover Beautiful Wallpapers')}</title>
        <meta
          name="description"
          content={seoData?.description || (isTrendingRoute ? 'Browse the most popular trending HD wallpapers, free downloads' : 'Discover curated beautiful HD wallpapers, personalize your desktop')}
        />
        <meta name="keywords" content={seoData?.keywords || (isTrendingRoute ? 'trending wallpapers, popular wallpapers, HD wallpapers' : 'wallpaper, HD wallpaper, desktop wallpaper, curated wallpapers')} />
        <meta property="og:title" content={seoData?.title || (isTrendingRoute ? 'Trending Wallpapers' : 'Discover Beautiful Wallpapers')} />
        <meta property="og:description" content={seoData?.description || 'Massive collection of HD wallpapers waiting for you to discover'} />
        <link rel="canonical" href={`${window.location.origin}/${isTrendingRoute ? 'trending' : ''}`} />
      </Helmet>
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar />

        <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
          {/* Header */}
          <header className="bg-card border-b border-border sticky top-0 z-30">
            <div className="px-8 py-6">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-2xl font-bold text-foreground">{t.home.discoverWallpapers}</h2>
                </div>
                <div className="max-w-2xl">
                  <SearchBar />
                </div>
              </div>
            </div>
          </header>

          <div className="px-8 py-8">
            <div className="max-w-7xl mx-auto space-y-12">
              {showEditorsBanner ? (
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles size={24} className="text-yellow-500" />
                    <h2 className="text-2xl font-bold text-foreground">{t.home.editorsPicks}</h2>
                  </div>

                  <div className="relative">
                    <div
                      ref={carouselRef}
                      className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide rounded-2xl"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {featuredLoading ? (
                        <div className="w-full h-96 flex items-center justify-center text-muted-foreground">
                          {t.common.loading}
                        </div>
                      ) : featuredError || featuredWallpapers.length === 0 ? (
                        <div className="w-full h-96 flex items-center justify-center text-muted-foreground">
                          {t.searchPage.noWallpapersFound}
                        </div>
                      ) : (
                        featuredWallpapers.map((wallpaper) => (
                          <EditorsPickWallpaperLink
                            key={wallpaper.id}
                            wallpaper={wallpaper}
                            className="flex-shrink-0 w-full snap-center"
                          >
                            <div className="relative aspect-[21/9] overflow-hidden">
                              <ImageWithFallback
                                src={wallpaper.imageUrl}
                                alt={wallpaper.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                                <div className="absolute bottom-0 left-0 right-0 p-8">
                                  <div className="max-w-3xl">
                                    <h3 className="text-white text-3xl font-bold mb-3">
                                      {wallpaper.title}
                                    </h3>
                                    {wallpaper.description && (
                                      <p className="text-white/90 text-lg mb-4 line-clamp-2">
                                        {wallpaper.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </EditorsPickWallpaperLink>
                        ))
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handlePrev}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-card/50 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl hover:bg-card/90 transition-all"
                    >
                      <ChevronLeft size={28} className="text-foreground/60 hover:text-foreground transition-colors" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-card/50 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl hover:bg-card/90 transition-all"
                    >
                      <ChevronRight size={28} className="text-foreground/60 hover:text-foreground transition-colors" />
                    </button>

                    {!featuredLoading && !featuredError && featuredWallpapers.length > 0 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                        {featuredWallpapers.map((_, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setCurrentSlide(index)}
                            className="relative"
                          >
                            <div
                              className={`h-2 rounded-full transition-all ${index === currentSlide
                                  ? 'bg-card w-8'
                                  : 'bg-card/50 w-2 hover:bg-card/70'
                                }`}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              ) : null}

              {/* Popular Wallpapers */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">
                    {isTrendingRoute ? t.home.hotWallpapers : t.home.popularWallpapers}
                  </h2>
                  <Link
                    to="/search"
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    {t.common.viewAll}
                    <ChevronRight size={20} />
                  </Link>
                </div>
                {popularLoading ? (
                  <p className="py-12 text-center text-muted-foreground">{t.common.loading}</p>
                ) : popularError || popularWallpapers.length === 0 ? (
                  <p className="py-12 text-center text-muted-foreground">{t.searchPage.noWallpapersFound}</p>
                ) : (
                  <>
                    <DesktopWallpaperGrid
                      wallpapers={popularWallpapers}
                      columns={4}
                      listNavBase={{ platform: 'PC', media_live: false }}
                    />
                    {popularHasMore ? (
                      <div ref={popularSentinelRef} className="h-1 w-full shrink-0" aria-hidden />
                    ) : null}
                    {popularLoadingMore ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">{t.common.loading}</p>
                    ) : null}
                  </>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
