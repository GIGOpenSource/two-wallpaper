import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface AppDownloadModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AppDownloadModal({ visible, onClose }: AppDownloadModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const googlePlayUrl = 'https://play.google.com/store/apps/details?id=com.gig.markwallpapers';
  const appStoreUrl = 'https://apps.apple.com/cn/app/Mark Wallpapers - HD/id6791515308';

  const qrCodeSize = 'square';

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={handleClose}
          >
            <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-black/60' : 'bg-black/50'}`} />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark'
                ? 'bg-[#0f1f36] border border-[#1e3a5f]'
                : 'bg-white border border-gray-200'
                }`}
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${theme === 'dark' ? 'bg-blue-600/20' : 'bg-blue-50'}`}>
                    <Smartphone size={24} className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {t.common.downloadAppTitle}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {t.common.downloadAppSubtitle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                    ? 'hover:bg-slate-700 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <a
                    href={googlePlayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all hover:scale-[1.02] ${theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700 hover:border-green-500/50'
                      : 'bg-gray-50 border-gray-200 hover:border-green-500/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-3 ${theme === 'dark' ? 'bg-green-600/20' : 'bg-green-100'}`}>
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-600" fill="currentColor">
                        <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                      </svg>
                    </div>
                    <span className={`text-sm font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {t.common.googlePlay}
                    </span>
                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-white shadow-inner">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(googlePlayUrl)}`}
                        alt={t.common.googlePlay}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className={`text-xs mt-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {t.common.scanToDownload}
                    </span>
                  </a>

                  <a
                    href={appStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all hover:scale-[1.02] ${theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700 hover:border-blue-500/50'
                      : 'bg-gray-50 border-gray-200 hover:border-blue-500/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-3 ${theme === 'dark' ? 'bg-blue-600/20' : 'bg-blue-100'}`}>
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="currentColor">
                        <path d="M18.71,19.5C17.88,20.74 16.54,21.5 14.97,21.5C13.41,21.5 12.07,20.75 11.24,19.5L7.24,12.5L11.24,5.5C12.07,4.26 13.41,3.5 14.97,3.5C16.54,3.5 17.88,4.26 18.71,5.5L22.71,12.5L18.71,19.5M6.58,5.5L2.58,12.5L6.58,19.5C7.41,20.74 8.75,21.5 10.32,21.5C11.13,21.5 11.9,21.25 12.54,20.78L16.54,13.78C16.85,13.28 17,12.73 17,12C17,11.27 16.85,10.72 16.54,10.22L12.54,3.22C11.9,2.75 11.13,2.5 10.32,2.5C8.75,2.5 7.41,3.26 6.58,5.5Z"/>
                      </svg>
                    </div>
                    <span className={`text-sm font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {t.common.appStore}
                    </span>
                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-white shadow-inner">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(appStoreUrl)}`}
                        alt={t.common.appStore}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className={`text-xs mt-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {t.common.scanToDownload}
                    </span>
                  </a>
                </div>

                <p className={`text-center text-xs mt-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  {t.common.scanTip}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
