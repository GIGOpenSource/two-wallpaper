import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';

interface MobileQuickActionsProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export const MobileQuickActions: React.FC<MobileQuickActionsProps> = ({
  externalOpen,
  onExternalOpenChange,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  const isOpen = externalOpen !== undefined ? externalOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onExternalOpenChange) {
      onExternalOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 12, y: 8 });
  const buttonRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage } = useLanguage();
  const { isDarkMode } = useTheme();

  // 判断是否在搜索页面
  const isSearchPage = location.pathname === '/search';
  
  // 判断是否在首页（兼容 HashRouter 模式）
  // 在 HashRouter 中，需要同时检查 pathname 和 hash
  const currentPath = location.hash.replace('#', '') || location.pathname;
  const isHomePage = 
    currentPath === '/' || 
    currentPath === '';
  
  // 判断是否是 trending 路由
  const isTrendingRoute = currentPath === '/trending';

  // 移动端搜索页面不显示语言切换按钮
  const shouldShowLanguageToggle = false;

  const languageOptions = [
    // { code: 'zh-CN', name: '简体中文', flag: 'CN' },
    { code: 'en', name: 'English', flag: 'EN' },
    { code: 'ja', name: '日本語', flag: 'JP' },
    { code: 'ko', name: '한국어', flag: 'KR' },
    { code: 'es', name: 'Español', flag: 'ES' },
    { code: 'fr', name: 'Français', flag: 'FR' },
    { code: 'pt', name: 'Português', flag: 'PT' },
    { code: 'id', name: 'Bahasa Indonesia', flag: 'ID' },
  ];

  const currentLanguage = languageOptions.find((lang) => lang.code === language);

  // 首页固定位置在右上角，考虑安全区域
  useEffect(() => {
    if (shouldShowLanguageToggle) {
      const safeAreaTop = parseInt(window.getComputedStyle(document.body).paddingTop) || 0;
      setPosition({ x: 12, y: safeAreaTop + 8 });
    }
  }, [shouldShowLanguageToggle]);

  // 如果不是首页或者是 /trending 路由，不渲染任何内容（必须在所有Hooks之后）
  if (!shouldShowLanguageToggle) {
    return null;
  }

  const savePosition = (pos: { x: number; y: number }) => {
    localStorage.setItem('mobileQuickActionsPosition', JSON.stringify(pos));
  };

  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    const distance = Math.sqrt(
      Math.pow(clientX - dragStartRef.current.x - position.x, 2) + 
      Math.pow(clientY - dragStartRef.current.y - position.y, 2)
    );
    
    if (distance > 5) {
      hasDraggedRef.current = true;
    }
    
    let newX = clientX - dragStartRef.current.x;
    let newY = clientY - dragStartRef.current.y;
    
    // 边界检测
    const maxX = window.innerWidth - 60;
    const maxY = window.innerHeight - 60;
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    setPosition({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    // 只在搜索页面保存拖拽位置
    if (isSearchPage) {
      savePosition(position);
    }
  };

  return (
    <div
      ref={buttonRef}
      className="fixed z-50"
      style={{
        right: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* 展开的菜单 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ duration: 0.2 }}
            className={`absolute ${
              isSearchPage ? 'top-12' : 'top-11'
            } right-0 rounded-2xl shadow-xl border overflow-hidden min-w-[220px] max-h-[70vh] ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-card border-border'}`}
          >
            {/* 语言切换部分 */}
            <div className="px-3 py-3">
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {languageOptions.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLanguage(lang.code as 'zh-CN' | 'en' | 'ja' | 'ko' | 'es' | 'fr' | 'pt' | 'id');
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      language === lang.code 
                        ? isDarkMode ? 'bg-slate-700' : 'bg-gradient-to-r from-blue-50 to-blue-100 shadow-sm' 
                        : isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-background'
                    }`}
                  >
                    <span className={`text-sm font-bold w-8 text-center ${isDarkMode ? (language === lang.code ? 'text-white' : 'text-gray-300') : (language === lang.code ? 'text-blue-700' : 'text-gray-800')}`}>
                      {lang.flag}
                    </span>
                    <span
                      className={`text-sm ${
                        language === lang.code ? (isDarkMode ? 'text-white font-semibold' : 'text-blue-700 font-semibold') : (isDarkMode ? 'text-gray-200 font-medium' : 'text-gray-600 font-medium')
                      }`}
                    >
                      {lang.name}
                    </span>
                    {language === lang.code && (
                      <motion.div
                        layoutId="activeLang"
                        className={`ml-auto w-2 h-2 rounded-full ${isDarkMode ? 'bg-white' : 'bg-blue-600'}`}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主按钮 - 固定在首页右上角 */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        className={`h-9 px-3 rounded-full shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all ${isDarkMode ? 'bg-slate-700 border border-slate-600 hover:bg-slate-600' : 'bg-card border border-gray-300 hover:bg-background'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          {currentLanguage?.flag || 'CN'}
        </span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className={`w-4 h-4 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}
        >
          <path d="m5 8 6 6" />
          <path d="m4 14 6-6 2-3" />
          <path d="M2 5h12" />
          <path d="M7 2h1" />
          <path d="m22 22-5-10-5 10" />
          <path d="M14 18h6" />
        </svg>
      </motion.button>
    </div>
  );
};
