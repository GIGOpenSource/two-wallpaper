import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { App, Modal } from 'antd';
import {
  User,
  Shield,
  Palette,
  Bell,
  Info,
  HelpCircle,
  LogOut,
  ChevronRight,
  ArrowLeft,
  Sun,
  Moon,
  Heart,
  MessageCircle,
  Reply,
  UserPlus,
  Globe,
  UserX,
} from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { setAuthToken, getAuthToken } from '../../api/request';
import { logoutUser, deleteAccount } from '../../api/auth';
import { useUnreadCount } from '../hooks/useUnreadCount';
import { motion, AnimatePresence } from 'motion/react';

export default function SettingsPage() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .dark-modal .ant-modal-content {
        background-color: #0f1f36 !important;
        border-color: #1e3a5f !important;
      }
      .dark-modal .ant-modal-header {
        background-color: #0f1f36 !important;
        border-bottom-color: #1e3a5f !important;
      }
      .dark-modal .ant-modal-title {
        color: #e8eef5 !important;
      }
      .dark-modal .ant-modal-close-icon {
        color: #e8eef5 !important;
      }
      .dark-modal .ant-modal-body {
        background-color: #0f1f36 !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const { modal } = App.useApp();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { isDarkMode, setTheme } = useTheme();
  const { profile } = useUserProfile();
  const { settings: notificationSettings, loading: settingsLoading, updateSetting } = useNotificationSettings();
  const { clear: clearUnreadCount } = useUnreadCount();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  
  // 检查是否登录
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);
  
  // 如果没有token，不渲染页面
  const token = getAuthToken();
  if (!token) {
    return null;
  }

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

  const handleLogout = async () => {
    modal.confirm({
      title: t.settings.logOut,
     content: t.settings.logOutConfirm,
      okText: t.common.confirm,
      cancelText: t.common.cancel,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          // 调用后端退出登录接口
          const res: any = await logoutUser();
           if(res.code == 200){
           setAuthToken('');
           // 清除未读计数
           clearUnreadCount();
           // 清除 user_id
           try {
             localStorage.removeItem('user_id');
           } catch (e) {
             console.error('清除 user_id 失败:', e);
           }
           navigate('/login', { replace: true });
         }
        } catch (err) {
          console.error('退出登录接口调用失败:', err);
          // 即使接口失败，也继续清除本地 token
        } finally {
          // 清除本地 token 和 user_id
          setAuthToken('');
          // 清除未读计数
          clearUnreadCount();
          try {
            localStorage.removeItem('user_id');
          } catch (e) {
            console.error('清除 user_id 失败:', e);
          }
          // 跳转到登录页（保持当前视图模式）
          navigate('/login', { replace: true });
        }
      },
    });
  };

  const handleDeleteAccount = async () => {
    modal.confirm({
      title: t.settings.deleteAccount,
      content: t.settings.deleteAccountConfirm,
      okText: t.common.confirm,
      cancelText: t.common.cancel,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const userId = localStorage.getItem('user_id');
          if (userId) {
            await deleteAccount(userId);
          }
          // 清除本地 token 和 user_id
          setAuthToken('');
          clearUnreadCount();
          try {
            localStorage.removeItem('user_id');
          } catch (e) {
            console.error('清除 user_id 失败:', e);
          }
          navigate('/login', { replace: true });
        } catch (err) {
          console.error('注销账号失败:', err);
        }
      },
    });
  };

  const settingsSections = [
    {
      title: t.settings.accountSettings,
      items: [
        {
          icon: User,
          label: t.settings.profileSettings,
          onClick: () => navigate('/profile/edit'),
          chevron: true,
        },
        {
          icon: Globe,
          label: t.settings.language,
          onClick: () => setShowLanguageModal(true),
          chevron: true,
          value: languageOptions.find(lang => lang.code === language)?.name || 'English',
        },
        {
          icon: isDarkMode ? Moon : Sun,
          label: isDarkMode ? t.settings.darkMode : t.settings.lightMode,
          toggle: true,
          value: isDarkMode,
          onChange: (val: boolean) => setTheme(val ? 'dark' : 'light'),
        },
      ],
    },
    {
      title: t.settings.notifications,
      items: [
        {
          icon: Heart,
          label: t.settings.notificationLikes,
          toggle: true,
          value: notificationSettings?.enable_like_notification ?? false,
          onChange: (val: boolean) => updateSetting('enable_like_notification', val),
          updating: settingsLoading || false,
        },
        {
          icon: MessageCircle,
          label: t.settings.notificationComments,
          toggle: true,
          value: notificationSettings?.enable_comment_notification ?? false,
          onChange: (val: boolean) => updateSetting('enable_comment_notification', val),
          updating: settingsLoading || false,
        },
        // {
        //   icon: Reply,
        //   label: t.settings.notificationReplies,
        //   toggle: true,
        //   value: notificationSettings?.enable_reply_notification ?? false,
        //   onChange: (val: boolean) => updateSetting('enable_reply_notification', val),
        //   updating: settingsLoading || false,
        // },
        {
          icon: UserPlus,
          label: t.settings.notificationFollows,
          toggle: true,
          value: notificationSettings?.enable_follow_notification ?? false,
          onChange: (val: boolean) => updateSetting('enable_follow_notification', val),
          updating: settingsLoading || false,
        },
      ],
    },
    {
      title: t.settings.about,
      items: [
        {
          icon: Shield,
          label: t.settings.privacyPolicy,
          onClick: () => window.open('https://www.markwallpapers.com/agreement/MarkWallpapers%20Privacy%20Policy.html', '_blank'),
          chevron: true,
        },
         {
          icon: Shield,
          label: t.settings.privacySecurity,
          onClick: () => navigate('/site-info/privacy'),
          chevron: true,
        },
        {
          icon: HelpCircle,
          label: t.settings.helpSupport,
          onClick: () => navigate('/site-info/help'),
          chevron: true,
        },
        {
          icon: Palette,
          label: t.settings.aboutApp,
          onClick: () => navigate('/site-info/about'),
          chevron: true,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 safe-area-pt">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">{t.profile.settings}</h1>
        </div>
      </header>

      {/* Settings Sections */}
      <div className="py-4 space-y-6">
        {settingsSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="bg-card">
            <div className="px-4 py-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {section.title}
              </h2>
            </div>
            <div className="divide-y divide-border">
              {section.items.map((item, itemIndex) => (
                <motion.div
                  key={itemIndex}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-4 flex items-center justify-between cursor-pointer hover:bg-muted transition-colors"
                  onClick={item.onClick}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <item.icon size={20} className="text-foreground" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{item.label}</span>
                      {item.value && typeof item.value === 'string' && (
                        <span className="text-sm text-muted-foreground">{item.value}</span>
                      )}
                    </div>
                  </div>
                  
                  {item.toggle && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!item.updating) {
                          item.onChange?.(!item.value);
                        }
                      }}
                      disabled={item.updating}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        item.value ? 'bg-blue-600' : 'bg-gray-300'
                      } ${item.updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <motion.div
                        layout
                        className="absolute top-0.5 w-5 h-5 bg-card rounded-full shadow-sm"
                        animate={{ left: item.value ? '26px' : '2px' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  )}
                  
                  {item.chevron && (
                    <ChevronRight size={20} className="text-muted-foreground" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <div className="px-4 space-y-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full bg-card border-2 border-destructive/30 text-destructive py-4 rounded-xl flex items-center justify-center gap-2 font-semibold hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={20} />
            <span>{t.settings.logOut}</span>
          </motion.button>

          {/* Delete Account Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleDeleteAccount}
            className="w-full bg-card border-2 border-red-500/40 text-red-500 py-4 rounded-xl flex items-center justify-center gap-2 font-semibold hover:bg-red-500/10 transition-colors"
          >
            <UserX size={20} />
            <span>{t.settings.deleteAccount}</span>
          </motion.button>
        </div>

        {/* Version Info */}
        <div className="px-4 text-center">
          <p className="text-sm text-muted-foreground">{t.settings.appVersion}</p>
          <p className="text-xs text-muted-foreground mt-1">{t.settings.copyright}</p>
        </div>
      </div>

      {/* Language Selection Modal */}
      <AnimatePresence>
        {showLanguageModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 z-50 ${isDarkMode ? 'bg-black/60' : 'bg-black/50'}`}
              onClick={() => setShowLanguageModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`fixed z-50 left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[280px] rounded-2xl shadow-xl border overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 max-h-[50vh] overflow-y-auto">
                {languageOptions.map((lang) => (
                  <motion.button
                    key={lang.code}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setLanguage(lang.code as 'zh-CN' | 'en' | 'ja' | 'ko' | 'es' | 'fr' | 'pt' | 'id');
                      setShowLanguageModal(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all ${
                      language === lang.code
                        ? isDarkMode ? 'bg-blue-600' : 'bg-blue-100'
                        : isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold w-8 ${isDarkMode ? (language === lang.code ? 'text-white' : 'text-gray-300') : (language === lang.code ? 'text-blue-700' : 'text-gray-800')}`}>
                        {lang.flag}
                      </span>
                      <span className={`text-sm ${language === lang.code ? (isDarkMode ? 'text-white font-semibold' : 'text-blue-700 font-semibold') : (isDarkMode ? 'text-gray-200 font-medium' : 'text-gray-700 font-medium')}`}>
                        {lang.name}
                      </span>
                    </div>
                    {language === lang.code && (
                      <motion.div
                        layoutId="activeLang"
                        className={`w-2.5 h-2.5 rounded-full ${isDarkMode ? 'bg-white' : 'bg-blue-600'}`}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
