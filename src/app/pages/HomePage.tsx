import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { SearchBar } from '../components/SearchBar';
import { WallpaperGrid } from '../components/WallpaperGrid';
import { EditorsPickWallpaperLink } from '../components/EditorsPickWallpaperLink';
import { BottomNav } from '../components/BottomNav';
import { PullToRefresh } from '../components/PullToRefresh';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { ChevronLeft, ChevronRight, ChevronDown, Languages } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useView } from '../contexts/ViewContext';
import { useHomePopularWallpapers } from '../hooks/useHomePopularWallpapers';
import { useHomeFeaturedWallpapers } from '../hooks/useHomeFeaturedWallpapers';
import { wallpaperListCoverUrl } from '../utils/wallpaperApiMap';
import { getSeoTdk } from '../../api/wallpaper';
import { formatNumber } from '../utils/format';
import { Language } from '../locales/translations';
import { useTheme } from '../contexts/ThemeContext';

import { analytics } from '../utils/firebase';
import { logEvent } from 'firebase/analytics';
import { getDeviceType } from '../utils/device';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export default function HomePage() {
  const { t, language, setLanguage } = useLanguage();
  const { isDarkMode } = useTheme();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const languageOptions: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: 'English', flag: 'EN' },
    { code: 'ja', name: '日本語', flag: 'JP' },
    { code: 'ko', name: '한국어', flag: 'KR' },
    { code: 'es', name: 'Español', flag: 'ES' },
    { code: 'fr', name: 'Français', flag: 'FR' },
    { code: 'pt', name: 'Português', flag: 'PT' },
    { code: 'id', name: 'Bahasa Indonesia', flag: 'ID' },
  ];

  const currentLanguage = languageOptions.find((lang) => lang.code === language);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    }

    if (isLanguageMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isLanguageMenuOpen]);
  /** 与首页共用路由的「热门」页不展示编辑精选 Banner */
  const showEditorsBanner = location.pathname !== '/trending';
  const { viewMode } = useView();
  const popularListNavBase = {
    platform: (viewMode === 'mobile' ? 'PHONE' : 'PC') as 'PC' | 'PHONE',
    media_live: false,
  };
  const isTrendingRoute = location.pathname === '/trending';
  const [seoData, setSeoData] = useState<{ title?: string; description?: string; keywords?: string } | null>(null);

  // 获取SEO数据
  useEffect(() => {
    // 构建当前页面的完整URL
    const currentUrl = `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;

    console.log('🔍 [HomePage] 请求SEO数据:', currentUrl);

    getSeoTdk(currentUrl)
      .then((response) => {
        console.log('✅ [HomePage] SEO数据返回:', response);
        // 从 results 数组中获取第一条数据
        const seoItem = response.data?.results?.[0];
        if (seoItem) {
          setSeoData({
            title: seoItem.title,
            description: seoItem.description,
            keywords: seoItem.keywords,
          });
        }
      })
      .catch((err) => {
        console.error('❌ [HomePage] 获取SEO数据失败:', err);
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
    refresh: refreshPopular,
  } = useHomePopularWallpapers({ isHotRoute: isTrendingRoute });

  // 使用真实 API 获取精选壁纸
  const {
    wallpapers: featuredWallpapers,
    loading: featuredLoading,
    error: featuredError,
    refresh: refreshFeatured,
  } = useHomeFeaturedWallpapers();

  // 下拉刷新
  const handleRefresh = async () => {
    await Promise.all([
      new Promise<void>((resolve) => {
        refreshPopular();
        setTimeout(resolve, 500);
      }),
      new Promise<void>((resolve) => {
        refreshFeatured();
        setTimeout(resolve, 500);
      }),
    ]);
  };

  const { refreshing, pullDistance, isPulling, threshold } = usePullToRefresh(
    containerRef,
    handleRefresh,
    { threshold: 70, maxDistance: 120 }
  );

  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const programmaticScrollRef = useRef(false);
  const lastComputedIndexRef = useRef(-1);

  useEffect(() => {
    if (!showEditorsBanner || featuredWallpapers.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredWallpapers.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [showEditorsBanner, featuredWallpapers.length]);

  useEffect(() => {
    if (!showEditorsBanner || !carouselRef.current || featuredWallpapers.length === 0) return;
    programmaticScrollRef.current = true;
    carouselRef.current.scrollTo({
      left: currentSlide * carouselRef.current.offsetWidth,
      behavior: 'smooth',
    });
    // 平滑滚动完成后清除标志
    setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 350);
  }, [currentSlide, showEditorsBanner, featuredWallpapers.length]);

  // 手动滑动轮播图时，实时同步更新指示点
  useEffect(() => {
    if (!showEditorsBanner || !carouselRef.current || featuredWallpapers.length === 0) return;
    const container = carouselRef.current;

    const handleScroll = () => {
      // 跳过程序化滚动期间的事件
      if (programmaticScrollRef.current) return;

      const index = Math.round(container.scrollLeft / container.offsetWidth);
      if (index >= 0 && index < featuredWallpapers.length && index !== lastComputedIndexRef.current) {
        lastComputedIndexRef.current = index;
        setCurrentSlide(index);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [showEditorsBanner, featuredWallpapers.length]);

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
        <meta name="keywords" content={seoData?.keywords || (isTrendingRoute ? 'trending wallpapers, popular wallpapers, HD wallpapers' : 'wallpaper, HD wallpaper, mobile wallpaper, curated wallpapers')} />
        <meta property="og:title" content={seoData?.title || (isTrendingRoute ? 'Trending Wallpapers' : 'Discover Beautiful Wallpapers')} />
        <meta property="og:description" content={seoData?.description || 'Massive collection of HD wallpapers waiting for you to discover'} />
        <link rel="canonical" href={`${window.location.origin}/`} />
      </Helmet>
      <PullToRefresh
        pullDistance={pullDistance}
        threshold={threshold}
        refreshing={refreshing}
        isPulling={isPulling}
        className="max-w-md mx-auto"
      >
        <div ref={containerRef} className="min-h-screen bg-background pb-20">
          {/* Header */}
          <header className="bg-card border-b border-border sticky top-0 z-40 safe-area-pt">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-xl font-bold text-foreground">{t.home.title}</h1>
                <div ref={languageMenuRef} className="relative">
                  <button
                    onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-full hover:bg-muted transition-colors"
                    title="Change language"
                  >
                    <span className="text-sm font-semibold">{currentLanguage?.flag}</span>
                    <Languages size={16} className="text-foreground" />
                  </button>
                  {isLanguageMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 bg-background rounded-xl shadow-xl border border-border overflow-hidden min-w-[200px] z-50">
                      {languageOptions.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code);
                            setIsLanguageMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all ${language === lang.code
                              ? isDarkMode ? 'bg-slate-700' : 'bg-blue-50'
                              : isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'
                            }`}
                        >
                          <span className={`text-sm font-bold w-8 text-center ${language === lang.code ? (isDarkMode ? 'text-white' : 'text-blue-700') : (isDarkMode ? 'text-gray-300' : 'text-gray-800')}`}>
                            {lang.flag}
                          </span>
                          <span className={`text-sm ${language === lang.code ? (isDarkMode ? 'text-white font-semibold' : 'text-blue-700 font-semibold') : (isDarkMode ? 'text-gray-200' : 'text-gray-700')}`}>
                            {lang.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <SearchBar />
            </div>
          </header>

          {showEditorsBanner ? (
            <section className="bg-card py-4 mb-6">
              <div className="px-4 mb-3">
                <h2 className="text-lg font-semibold text-foreground">{t.home.editorsPicks}</h2>
              </div>

              {featuredLoading ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t.common.loading}</div>
              ) : featuredError || featuredWallpapers.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t.searchPage.noWallpapersFound}</div>
              ) : (
                <div className="relative">
                  <div
                    ref={carouselRef}
                    className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {featuredWallpapers.map((wallpaper) => (
                      <EditorsPickWallpaperLink
                        key={wallpaper.id}
                        wallpaper={wallpaper}
                        className="flex-shrink-0 w-full snap-center"
                      >
                        <div className="relative mx-4 aspect-[16/9] rounded-xl overflow-hidden">
                          <ImageWithFallback
                            src={wallpaper.imageUrl}
                            alt={wallpaper.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                              <h3 className="text-white text-lg font-semibold mb-1 truncate">
                                {wallpaper.title}
                              </h3>
                              {wallpaper.description && (
                                <p className="text-white/80 text-sm mb-2 line-clamp-2">
                                  {wallpaper.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </EditorsPickWallpaperLink>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handlePrev}
                    className="absolute left-6 top-2/5 -translate-y-1/2 w-10 h-10 bg-card/50 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-card/90 transition-all"
                  >
                    <ChevronLeft size={24} className="text-foreground/60 hover:text-foreground transition-colors" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="absolute right-6 top-2/5 -translate-y-1/2 w-10 h-10 bg-card/50 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-card/90 transition-all"
                  >
                    <ChevronRight size={24} className="text-foreground/60 hover:text-foreground transition-colors" />
                  </button>

                  <div className="flex items-center justify-center gap-2 mt-4">
                    {featuredWallpapers.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setCurrentSlide(index)}
                        className="relative"
                      >
                        <div
                          className={`w-2 h-2 rounded-full transition-all ${index === currentSlide ? 'bg-blue-600 w-6' : 'bg-gray-300'
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {/* Popular Wallpapers */}
          <section className="py-4">
            <div className="px-4 mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {isTrendingRoute ? t.home.hotWallpapers : t.home.popularWallpapers}
              </h2>
              <Link to="/search" className="text-sm text-blue-600 hover:text-blue-700">
                {t.common.viewAll}
              </Link>
            </div>
            {popularLoading ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t.common.loading}</p>
            ) : popularError || popularWallpapers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t.searchPage.noWallpapersFound}</p>
            ) : (
              <>
                <WallpaperGrid wallpapers={popularWallpapers} listNavBase={popularListNavBase} />
                {popularHasMore ? (
                  <div ref={popularSentinelRef} className="h-1 w-full shrink-0" aria-hidden />
                ) : null}
                {popularLoadingMore ? (
                  <p className="px-4 py-4 text-center text-xs text-muted-foreground">{t.common.loading}</p>
                ) : null}
              </>
            )}
          </section>

        </div>
      </PullToRefresh>
      <BottomNav />
    </>
  );
}