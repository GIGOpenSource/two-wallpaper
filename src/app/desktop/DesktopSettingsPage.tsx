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
  Smartphone,
  Monitor,
  ArrowLeft,
  Globe,
  Sun,
  Moon,
  Heart,
  MessageCircle,
  Reply,
  UserPlus,
  UserX,
} from 'lucide-react';
import { DesktopSidebar, useSidebar } from '../components/DesktopSidebar';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { setAuthToken, getAuthToken } from '../../api/request';
import { logoutUser, deleteAccount } from '../../api/auth';
import { useUnreadCount } from '../hooks/useUnreadCount';
import { motion } from 'motion/react';

export default function DesktopSettingsPage() {
  const { modal } = App.useApp();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { isCollapsed } = useSidebar();
  const { isDarkMode, setTheme } = useTheme();
  const { profile } = useUserProfile();
  const { settings: notificationSettings, loading: settingsLoading, updateSetting } = useNotificationSettings();
  const { clear: clearUnreadCount } = useUnreadCount();
  
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

  return (
    <div className="min-h-screen bg-background flex">
      <DesktopSidebar />
      
      <div className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-30">
          <div className="px-8 py-6">
            <div className="max-w-4xl mx-auto flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <ArrowLeft size={24} className="text-foreground" />
              </button>
              <h1 className="text-3xl font-bold text-foreground">{t.profile.settings}</h1>
            </div>
          </div>
        </header>

        <div className="px-8 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Account Settings */}
            <section className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">{t.settings.accountSettings}</h2>
              </div>
              <div className="divide-y divide-border">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate('/profile/edit')}
                  className="px-6 py-4 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <User size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{t.settings.profileSettings}</h3>
                      <p className="text-sm text-muted-foreground">{t.settings.profileSettingsDesc}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground" />
                </motion.div>
                
                <div 
                  onClick={() => window.open('https://www.markwallpapers.com/agreement/MarkWallpapers%20Privacy%20Policy.html', '_blank')}
                  className="px-6 py-4 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <Shield size={24} className="text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{t.settings.privacyPolicy}</h3>
                      <p className="text-sm text-muted-foreground">{t.settings.privacyPolicy}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground" />
                </div>
                
                <div 
                  onClick={() => navigate('/site-info/privacy')}
                  className="px-6 py-4 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Shield size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{t.settings.privacySecurity}</h3>
                      <p className="text-sm text-muted-foreground">{t.settings.privacySecurityDesc}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground" />
                </div>
              </div>
            </section>

            {/* Appearance */}
            <section className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">{t.settings.appearance}</h2>
              </div>
              <div className="divide-y divide-border">
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-100 rounded-xl">
                      {isDarkMode ? (
                        <Moon size={24} className="text-yellow-600" />
                      ) : (
                        <Sun size={24} className="text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {isDarkMode ? t.settings.darkMode : t.settings.lightMode}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isDarkMode ? t.settings.themeDarkEnabled : t.settings.themeLightEnabled}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      isDarkMode ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <motion.div
                      layout
                      className="absolute top-0.5 w-6 h-6 bg-card rounded-full shadow-md"
                      animate={{ left: isDarkMode ? '30px' : '2px' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              </div>
            </section>

            {/* Language */}
            <section className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">{t.settings.language}</h2>
              </div>
              <div className="px-6 py-6">
                <div className="grid grid-cols-3 gap-3">
                  {languageOptions.map((lang) => (
                    <motion.button
                      key={lang.code}
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setLanguage(lang.code as any)}
                      className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 transition-all duration-200 ${
                        language === lang.code
                          ? isDarkMode ? 'border-blue-500 bg-slate-700 shadow-md' : 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-md'
                          : 'border-border hover:border-blue-300 hover:bg-background'
                      }`}
                    >
                      <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {lang.flag}
                      </span>
                      <span
                        className={`font-semibold ${
                          language === lang.code ? (isDarkMode ? 'text-white' : 'text-blue-700') : 'text-foreground'
                        }`}
                      >
                        {lang.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </section>

            {/* Notifications */}
            <section className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">{t.settings.notifications}</h2>
              </div>
              <div className="divide-y divide-border">
                {[
                  { 
                    key: 'enable_like_notification' as const, 
                    label: t.settings.notificationLikes, 
                    description: t.settings.notificationLikesDesc,
                    icon: Heart,
                    iconColor: 'text-red-600',
                    iconBg: 'bg-red-100',
                  },
                  { 
                    key: 'enable_comment_notification' as const, 
                    label: t.settings.notificationComments, 
                    description: t.settings.notificationCommentsDesc,
                    icon: MessageCircle,
                    iconColor: 'text-blue-600',
                    iconBg: 'bg-blue-100',
                  },
                  // { 
                  //   key: 'enable_reply_notification' as const, 
                  //   label: t.settings.notificationReplies, 
                  //   description: t.settings.notificationRepliesDesc,
                  //   icon: Reply,
                  //   iconColor: 'text-green-600',
                  //   iconBg: 'bg-green-100',
                  // },
                  { 
                    key: 'enable_follow_notification' as const, 
                    label: t.settings.notificationFollows, 
                    description: t.settings.notificationFollowsDesc,
                    icon: UserPlus,
                    iconColor: 'text-purple-600',
                    iconBg: 'bg-purple-100',
                  },
                ].map((item) => (
                  <div key={item.key} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 ${item.iconBg} rounded-xl`}>
                        <item.icon size={24} className={item.iconColor} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{item.label}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateSetting(item.key, !notificationSettings?.[item.key])}
                      disabled={settingsLoading}
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        notificationSettings?.[item.key] ? 'bg-blue-600' : 'bg-gray-300'
                      } ${settingsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <motion.div
                        layout
                        className="absolute top-0.5 w-6 h-6 bg-card rounded-full shadow-md"
                        animate={{ 
                          left: notificationSettings?.[item.key] ? '30px' : '2px' 
                        }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* About */}
            <section className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">{t.settings.about}</h2>
              </div>
              <div className="divide-y divide-border">
                <div 
                  onClick={() => navigate('/site-info/help')}
                  className="px-6 py-4 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-xl">
                      <HelpCircle size={24} className="text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{t.settings.helpSupport}</h3>
                      <p className="text-sm text-muted-foreground">{t.settings.helpSupportDesc}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground" />
                </div>
                
                <div 
                  onClick={() => navigate('/site-info/about')}
                  className="px-6 py-4 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-xl">
                      <Palette size={24} className="text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{t.settings.aboutApp}</h3>
                      <p className="text-sm text-muted-foreground">{t.settings.aboutAppDesc}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground" />
                </div>
              </div>
            </section>

            {/* Danger Zone */}
            <section className="bg-card rounded-2xl border-2 border-destructive/30 overflow-hidden">
              <div className="px-6 py-4 border-b border-destructive/30">
                <h2 className="text-xl font-bold text-destructive">{t.settings.dangerZone}</h2>
              </div>
              <div className="px-6 py-4 space-y-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-6 py-3 bg-destructive/10 border-2 border-destructive/30 text-destructive rounded-xl font-semibold hover:bg-destructive/20 transition-colors"
                >
                  <LogOut size={20} />
                  <span>{t.settings.logOut}</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeleteAccount}
                  className="flex items-center gap-3 px-6 py-3 bg-red-500/10 border-2 border-red-500/40 text-red-500 rounded-xl font-semibold hover:bg-red-500/20 transition-colors"
                >
                  <UserX size={20} />
                  <span>{t.settings.deleteAccount}</span>
                </motion.button>
              </div>
            </section>

            {/* Version Info */}
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">{t.settings.appVersion}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.settings.copyright}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
