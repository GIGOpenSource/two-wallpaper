import { Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../locales/translations';
import { useTheme } from '../contexts/ThemeContext';

const languageOptions: { code: Language; name: string; flag: string }[] = [
  // { code: 'zh-CN', name: '简体中文', flag: 'CN' },
  { code: 'en', name: 'English', flag: 'EN' },
  { code: 'ja', name: '日本語', flag: 'JP' },
  { code: 'ko', name: '한국어', flag: 'KR' },
  { code: 'es', name: 'Español', flag: 'ES' },
  { code: 'fr', name: 'Français', flag: 'FR' },
  { code: 'pt', name: 'Português', flag: 'PT' },
  { code: 'id', name: 'Bahasa Indonesia', flag: 'ID' },
];

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languageOptions.find((lang) => lang.code === language);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={menuRef} className="fixed top-4 right-32 z-50">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-card border-2 border-border rounded-full shadow-lg hover:shadow-xl transition-shadow"
        title="Change language"
      >
        <span className="text-sm font-semibold">{currentLanguage?.flag}</span>
        <Languages size={18} className="text-foreground" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-14 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden min-w-[220px] dark:bg-slate-900 dark:border-slate-700"
          >
            {languageOptions.map((lang) => (
              <motion.button
                key={lang.code}
                whileHover={{ x: 4 }}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                  language === lang.code 
                    ? isDarkMode ? 'bg-slate-700' : 'bg-gradient-to-r from-blue-50 to-blue-100' 
                    : isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`text-sm font-bold w-8 text-center ${language === lang.code ? (isDarkMode ? 'text-white' : 'text-blue-700') : (isDarkMode ? 'text-gray-300' : 'text-gray-800')}`}>
                  {lang.flag}
                </span>
                <span
                  className={`text-sm ${
                    language === lang.code ? (isDarkMode ? 'text-white font-semibold' : 'text-blue-700 font-semibold') : (isDarkMode ? 'text-gray-200 font-medium' : 'text-gray-700 font-medium')
                  }`}
                >
                  {lang.name}
                </span>
                {language === lang.code && (
                  <motion.div
                    layoutId="activeLanguage"
                    className={`ml-auto w-2.5 h-2.5 rounded-full ${isDarkMode ? 'bg-white' : 'bg-blue-600'}`}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}