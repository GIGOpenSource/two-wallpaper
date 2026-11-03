import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { App } from 'antd';
import { ArrowLeft, Camera, User, Save } from 'lucide-react';
import { DesktopSidebar, useSidebar } from '../components/DesktopSidebar';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { updateUserProfile, uploadAvatar } from '../../api/wallpaper';
import { motion } from 'motion/react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export default function DesktopEditProfilePage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  const { isCollapsed } = useSidebar();
  const { profile, refresh } = useUserProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<0 | 1 | 2>(0);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || profile.username || '');
      setGender((profile.gender as 0 | 1 | 2) || 0);
      setAvatarUrl(profile.avatar_url || profile.avatar || '');
    }
  }, [profile]);

  // 处理头像上传
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      message.error(t.editProfile.selectImageFile);
      return;
    }

    // 验证文件大小（限制5MB）
    if (file.size > 5 * 1024 * 1024) {
      message.error(t.editProfile.imageSizeExceeded);
      return;
    }

    setUploadingAvatar(true);
    try {
      const response: any = await uploadAvatar({
        file_name: file.name,
        type: 'img',
        file,
      });

      // 假设返回数据包含图片URL
      const imageUrl = response.data?.url || response.data?.file_url || response.url;
      if (imageUrl) {
        setAvatarUrl(imageUrl);
        message.success(t.editProfile.avatarUploadSuccess);
      } else {
        message.error(t.editProfile.avatarUploadNoUrl);
      }
    } catch (error) {
      console.error('上传头像失败:', error);
      message.error(t.editProfile.avatarUploadFailed);
    } finally {
      setUploadingAvatar(false);
      // 清空file input，允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      message.warning(t.editProfile.nicknameRequired);
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile({
        nickname: nickname.trim(),
        gender,
        avatar_url: avatarUrl.trim() || undefined,
      });
      
      message.success(t.editProfile.saveSuccess);
      // 刷新用户信息
      await refresh();
      // 返回上一页
      setTimeout(() => {
        navigate(-1);
      }, 500);
    } catch (error) {
      console.error('更新个人信息失败:', error);
      message.error(t.editProfile.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const genderOptions = [
    { value: 0, label: t.editProfile.genderUnknown },
    { value: 1, label: t.editProfile.genderMale },
    { value: 2, label: t.editProfile.genderFemale },
  ];

  if (!profile) {
    return (
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar />
        <div className={`flex-1 transition-all duration-300 flex items-center justify-center ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />
      
      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="px-8 py-6 flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ArrowLeft size={24} className="text-foreground" />
            </button>
            <h1 className="text-2xl font-bold text-foreground">{t.editProfile.title}</h1>
          </div>
        </header>

        {/* Content */}
        <div className="px-8 py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Avatar Section */}
            <div className="bg-card rounded-2xl p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-6">{t.editProfile.avatar}</h3>
              <div className="flex items-start gap-8">
                <div className="relative">
                  <div className="w-32 h-32 bg-muted rounded-full overflow-hidden ring-4 ring-gray-100">
                    <ImageWithFallback
                      src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(nickname || 'UN')}`}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                    className="absolute bottom-2 right-2 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {uploadingAvatar ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera size={20} className="text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-medium text-foreground mb-2">{t.editProfile.avatarUploadHint}</p>
                  <p className="text-sm text-muted-foreground">
                    💡 {t.editProfile.avatarFormatHint}
                  </p>
                </div>
              </div>
            </div>

            {/* Nickname Section */}
            <div className="bg-card rounded-2xl p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <User size={20} />
                {t.editProfile.nickname}
              </h3>
              <div>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t.editProfile.nicknamePlaceholder}
                  maxLength={20}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-muted-foreground">{t.editProfile.nicknameHint}</p>
                  <p className="text-sm text-muted-foreground">{nickname.length}/20</p>
                </div>
              </div>
            </div>

            {/* Gender Section */}
            <div className="bg-card rounded-2xl p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-6">{t.editProfile.gender}</h3>
              <div className="grid grid-cols-3 gap-4">
                {genderOptions.map((option) => (
                    <motion.button
                      key={option.value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setGender(option.value as 0 | 1 | 2)}
                      className={`py-4 px-6 rounded-xl border-2 font-medium transition-all ${
                        gender === option.value
                          ? isDarkMode ? 'border-blue-500 bg-slate-700 text-white' : 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-border text-foreground hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </motion.button>
                  ))}
              </div>
            </div>

            {/* Info Card */}
            <div className={`rounded-2xl p-6 border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-900'}`}>{t.editProfile.tipTitle}</h4>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-blue-800'}`}>
                    {t.editProfile.tipContent}
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pb-8">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors flex items-center gap-3 shadow-lg"
              >
                <Save size={20} />
                <span>{saving ? t.editProfile.saving : t.editProfile.save}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
