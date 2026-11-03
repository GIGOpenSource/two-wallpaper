import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { App } from 'antd';
import { ArrowLeft, Camera, User, Save } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { updateUserProfile, uploadAvatar } from '../../api/wallpaper';
import { motion } from 'motion/react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export default function EditProfilePage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 safe-area-pt">
        <div className="px-4 py-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">{t.editProfile.title}</h1>
        </div>
      </header>

      {/* Content */}
      <div className="py-6 space-y-6">
        {/* Avatar Section */}
        <div className="bg-card px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{t.editProfile.avatar}</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 bg-muted rounded-full overflow-hidden">
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
                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {uploadingAvatar ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera size={16} className="text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground">{t.editProfile.avatarUploadHint}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.editProfile.avatarFormatHint}</p>
            </div>
          </div>
        </div>

        {/* Nickname Section */}
        <div className="bg-card px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <User size={18} />
              {t.editProfile.nickname}
            </h3>
          </div>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t.editProfile.nicknamePlaceholder}
            maxLength={20}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-muted-foreground mt-2">{nickname.length}/20</p>
        </div>

        {/* Gender Section */}
        <div className="bg-card px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{t.editProfile.gender}</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {genderOptions.map((option) => (
              <motion.button
                key={option.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => setGender(option.value as 0 | 1 | 2)}
                className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
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

        {/* Info */}
        <div className="px-4">
          <div className={`rounded-lg p-4 border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-200'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-blue-800'}`}>
              💡 {t.editProfile.tipContent}
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="px-4 pb-8">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <Save size={20} />
            <span>{saving ? t.editProfile.saving : t.editProfile.save}</span>
          </motion.button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
