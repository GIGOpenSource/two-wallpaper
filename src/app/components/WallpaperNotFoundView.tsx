import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { ImageOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { BottomNav } from './BottomNav';
import { DesktopSidebar, useSidebar } from './DesktopSidebar';
import { useView } from '../contexts/ViewContext';

export type WallpaperNotFoundReason = 'not_found' | 'unpublished' | null;

type WallpaperNotFoundViewProps = {
  reason?: WallpaperNotFoundReason;
};

/**
 * 详情接口 body.code === 404 时展示：壁纸不存在 / 不可用。
 * 不走进依赖 errors.pageNotFoundTitle 的路由崩溃页。
 */
export function WallpaperNotFoundView({ reason = null }: WallpaperNotFoundViewProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { viewMode } = useView();
  const isUnpublished = reason === 'unpublished';

  const title = isUnpublished
    ? t.wallpaperDetail.wallpaperUnavailableTitle
    : t.wallpaperDetail.wallpaperNotFoundTitle;
  const description = isUnpublished
    ? t.wallpaperDetail.wallpaperUnavailable
    : t.wallpaperDetail.wallpaperNotFound;

  const content = (
    <div className="text-center px-4 max-w-md mx-auto">
      <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-muted flex items-center justify-center">
        <ImageOff size={28} className="text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold text-foreground mb-2">{title}</h1>
      <p className="text-muted-foreground mb-8">{description}</p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-6 py-2.5 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
        >
          {t.common.back}
        </button>
        <Link
          to="/"
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {t.errors.goHome}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      {viewMode === 'desktop' ? (
        <DesktopWallpaperNotFoundLayout>{content}</DesktopWallpaperNotFoundLayout>
      ) : (
        <div className="min-h-screen flex flex-col max-w-md mx-auto bg-background">
          <div className="flex-1 flex items-center justify-center py-16">{content}</div>
          <BottomNav />
        </div>
      )}
    </>
  );
}

function DesktopWallpaperNotFoundLayout({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />
      <div
        className={`flex-1 transition-all duration-300 flex items-center justify-center ${
          isCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
