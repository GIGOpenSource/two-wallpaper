import { Link } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { useLanguage } from '../contexts/LanguageContext';

export default function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Helmet>
        <title>{t.errors.pageNotFoundTitle} · {t.errors.pageNotFound}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-foreground/15 mb-2 select-none">
          {t.errors.pageNotFoundTitle}
        </p>
        <h1 className="text-2xl font-semibold text-foreground mb-8">
          {t.errors.pageNotFound}
        </h1>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {t.errors.goHome}
        </Link>
      </div>
    </div>
  );
}
