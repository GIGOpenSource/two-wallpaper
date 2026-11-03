import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { BottomNav } from '../components/BottomNav';
import { PullToRefresh } from '../components/PullToRefresh';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { WallpaperGrid } from '../components/WallpaperGrid';
import { UploadWallpaperGrid } from '../components/UploadWallpaperGrid';
import { mockWallpapers } from '../mockData';
import { useMyUploads } from '../hooks/useMyUploads';
import { useMyCollections } from '../hooks/useMyCollections';
import { useUserProfile } from '../hooks/useUserProfile';
import { useFollowingList, useFollowersList } from '../hooks/useFollowingList';
import { getAuthToken } from '../../api/request';
import {
  Settings,
  Upload,
  Image as ImageIcon,
  Heart,
  Award,
  TrendingUp,
  Share2,
  Trash2,
  Users,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { App, Modal } from 'antd';
import { deleteWallpaper, toggleFollowUser, getUserProfile } from '../../api/wallpaper';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

// 用户数据类型
interface FollowUser {
  id: number | string;
  username: string;
  nickname?: string;
  avatar_url?: string;
  avatar?: string;
  is_following?: boolean;
  upload_count?: number;
  follower_count?: number;
}

type TabType = 'uploaded' | 'favorites' | 'following' | 'followers';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  const { message } = App.useApp();
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const otherId = searchParams.get('other_id');
  
  const [activeTab, setActiveTab] = useState<TabType>('uploaded');
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [followingActionId, setFollowingActionId] = useState<number | string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // 壁纸筛选：'phone' | 'pc'，默认为当前设备类型（移动端默认手机）
  const [wallpaperFilter, setWallpaperFilter] = useState<'phone' | 'pc'>('phone');

  // 获取当前登录用户的ID
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        const response = await getUserProfile();
        const profile = (response?.data || response) as Record<string, unknown>;
        if (profile && typeof profile === 'object') {
          const id = profile.id || profile.customer_id;
          if (id && (typeof id === 'number' || typeof id === 'string')) {
            setCurrentUserId(id);
          }
        }
      } catch (err) {
        console.error('获取当前用户ID失败:', err);
      }
    };
    
    fetchCurrentUserId();
  }, []);

  // 判断是否是查看其他用户的页面
  // 严格判断：只有明确传入了otherId且与当前用户ID不同时，才是查看他人主页
  const isOtherUser = !!otherId && String(otherId) !== String(currentUserId);

  // 控制返回按钮的显示：只要URL中存在other_id查询参数，就显示返回按钮
  // 这与isOtherUser逻辑分离，避免逻辑混淆
  const shouldShowReturnButton = !!otherId;

  // 获取用户信息（如果是其他用户，传递 otherId）
  const { profile, loading: profileLoading, refresh: refreshProfile } = useUserProfile(otherId || undefined);
  
  // 根据筛选条件传入对应的platform参数（默认为手机）
  const platformParam = wallpaperFilter === 'phone' ? 'PHONE' : 'PC';
  
  // 始终调用 Hook，避免条件调用违反 React Hooks 规则
  const myCollectionsResult = useMyCollections(platformParam);
  // 查看他人主页时，传入 customerId 参数获取该用户的上传列表
  const myUploadsResult = useMyUploads(platformParam, isOtherUser ? otherId : undefined);

  // 查看他人主页时，不显示自己的收藏数据，但显示他人的上传数据
  const { 
    wallpapers: favoriteWallpapers, 
    loading: favoritesLoading, 
    loadingMore: favoritesLoadingMore,
    error: favoritesError,
    hasMore: favoritesHasMore,
    loadMore: favoritesLoadMore,
    refresh: refreshFavorites
  } = isOtherUser ? { 
    wallpapers: [], 
    loading: false, 
    loadingMore: false,
    error: null,
    hasMore: false,
    loadMore: () => {},
    refresh: () => {}
  } : myCollectionsResult;

  // 无论是否查看他人主页，都使用 myUploadsResult 的数据
  const { 
    wallpapers: uploadedWallpapers, 
    loading: uploadsLoading, 
    loadingMore: uploadsLoadingMore,
    error: uploadsError,
    hasMore: uploadsHasMore,
    loadMore: uploadsLoadMore,
    refresh: refreshUploads
  } = myUploadsResult;

  // 获取关注列表
  const {
    users: followingUsers = [],
    loading: followingLoading,
    loadingMore: followingLoadingMore,
    error: followingError,
    hasMore: followingHasMore,
    loadMore: followingLoadMore,
    refresh: refreshFollowing
  } = useFollowingList();

  // 获取粉丝列表
  const {
    users: followersUsers = [],
    loading: followersLoading,
    loadingMore: followersLoadingMore,
    error: followersError,
    hasMore: followersHasMore,
    loadMore: followersLoadMore,
    refresh: refreshFollowers
  } = useFollowersList();

  // 根据当前Tab显示对应的数据（其他用户只显示上传）
  const displayLoading = activeTab === 'uploaded' ? uploadsLoading : favoritesLoading;
  const displayLoadingMore = activeTab === 'uploaded' ? uploadsLoadingMore : favoritesLoadingMore;
  const displayError = activeTab === 'uploaded' ? uploadsError : favoritesError;

  // 调试日志
  useEffect(() => {
    console.log('=== ProfilePage 调试 ===');
    console.log('followingUsers:', followingUsers);
    console.log('followingUsers 长度:', followingUsers.length);
    console.log('followersUsers:', followersUsers);
    console.log('followersUsers 长度:', followersUsers.length);
    console.log('activeTab:', activeTab);
    console.log('followingLoading:', followingLoading);
    console.log('followersLoading:', followersLoading);
    console.log('======================');
  }, [followingUsers, followersUsers, activeTab]);

  // 每次切换到关注或粉丝Tab时，重新请求数据
  useEffect(() => {
    if (activeTab === 'following') {
      refreshFollowing();
    } else if (activeTab === 'followers') {
      refreshFollowers();
    }
  }, [activeTab, refreshFollowing, refreshFollowers]);

  // 当壁纸筛选条件改变时，刷新上传和收藏列表
  useEffect(() => {
    if (!isOtherUser) {
      myUploadsResult.refresh?.();
      myCollectionsResult.refresh?.();
    } else {
      // 查看他人主页时，只刷新上传列表
      myUploadsResult.refresh?.();
    }
  }, [wallpaperFilter, isOtherUser]);

  // 未登录状态 - 查看自己主页时直接跳转登录页
  useEffect(() => {
    const token = getAuthToken();
    const isViewingOwnProfile = !otherId; // 没有 otherId 表示查看自己的主页
    
    // 如果是查看自己的主页且未登录，直接跳转登录页
    if (isViewingOwnProfile && !token && !profileLoading) {
      // message.warning('请先登录后再访问');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 500);
    }
  }, [profileLoading, otherId, navigate, message]);

  // 下拉刷新
  const handleRefresh = async () => {
    return new Promise<void>((resolve) => {
      // 刷新用户信息
      refreshProfile();
      
      if (isOtherUser) {
        // 查看他人主页时，只刷新上传列表
        refreshUploads();
      } else {
        // 查看自己主页时，根据当前tab刷新对应数据
        switch (activeTab) {
          case 'uploaded':
            refreshUploads();
            break;
          case 'favorites':
            refreshFavorites();
            break;
          case 'following':
            refreshFollowing();
            break;
          case 'followers':
            refreshFollowers();
            break;
        }
      }
      
      setTimeout(resolve, 500);
    });
  };

  const { refreshing, pullDistance, isPulling, threshold } = usePullToRefresh(
    containerRef,
    handleRefresh,
    { threshold: 70, maxDistance: 120 }
  );

  // 删除壁纸
  const handleDeleteWallpaper = async (id: number | string) => {
    Modal.confirm({
      title: t.profile.confirmDelete,
      content: t.profile.deleteWallpaperConfirm,
      okText: t.profile.confirmDeleteText,
      okType: 'danger',
      cancelText: t.profile.cancelText,
      onOk: async () => {
        setDeletingId(id);
        try {
          await deleteWallpaper(id);
          message.success(t.profile.deleteSuccess);
          // 刷新列表
          refreshUploads();
        } catch (err) {
          console.error('删除失败:', err);
          message.error(t.profile.deleteFailed);
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  // 关注/取消关注用户
  const handleToggleFollow = async (userId: number | string, currentIsFollowing: boolean) => {
    console.log(' [handleToggleFollow] 被调用');
    console.log('👤 userId:', userId, '类型:', typeof userId);
    console.log('👤 currentIsFollowing:', currentIsFollowing);
    
    setFollowingActionId(userId);
    try {
      console.log('📡 准备调用 toggleFollowUser，参数:', userId);
      await toggleFollowUser(userId);
      // 乐观更新UI
      message.success(currentIsFollowing ? t.profile.unfollowSuccess : t.profile.followSuccess);
      // 刷新列表
      if (activeTab === 'following') {
        refreshFollowing();
      } else if (activeTab === 'followers') {
        refreshFollowers();
      }
    } catch (err) {
      console.error('关注操作失败:', err);
      message.error(t.profile.followFailed);
    } finally {
      setFollowingActionId(null);
    }
  };

  // 未登录状态或加载中的渲染逻辑
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
         <div className="text-muted-foreground">
            <p>{t.common.loading}</p>
          </div>
      </div>
    );
  }

  return (
    <>
      <PullToRefresh
        pullDistance={pullDistance}
        threshold={threshold}
        refreshing={refreshing}
        isPulling={isPulling}
        className="max-w-md mx-auto"
      >
        <div ref={containerRef} className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="relative bg-gradient-to-br from-blue-600 to-purple-600 text-white dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 dark:text-gray-100 safe-area-pt">
        {/* 返回按钮 - 只要有other_id参数就显示 */}
        {shouldShowReturnButton && (
          <button
            onClick={() => navigate(-1)}
            className="absolute top-[calc(max(env(safe-area-inset-top),var(--status-bar-height,0px))+1.5rem)] left-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors z-10 dark:bg-white/10 dark:hover:bg-white/20"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {/* 设置按钮 - 右上角 */}
        {!shouldShowReturnButton && (
          <button
            onClick={() => navigate('/settings')}
            className="absolute top-[calc(max(env(safe-area-inset-top),var(--status-bar-height,0px))+1.5rem)] right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors z-10 dark:bg-white/10 dark:hover:bg-white/20"
          >
            <Settings size={20} />
          </button>
        )}
        
        <div className={`px-4 ${shouldShowReturnButton ? 'pt-20' : 'pt-8'} pb-10`}>
          <div className="flex items-start gap-4 mb-8">
            <div className="w-20 h-20 bg-card/20 backdrop-blur-sm rounded-full overflow-hidden border-4 border-white/30">
              <ImageWithFallback
                src={profile.avatar_url || profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.nickname || profile.username || 'UN')}`}
                alt={profile.nickname || profile.username}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{profile.nickname || profile.username}</h1>
              <div className="flex items-center gap-3 text-sm text-white/90">
                <span>{t.profile.level} {profile.level || 0}</span>
                {/* <span>•</span>
                <span>{profile.points || 0} {t.profile.points}</span> */}
              </div>
            </div>
            {/* 根据是否是其他用户显示关注/取消关注按钮 */}
            {isOtherUser && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  console.log(' [ProfilePage] 点击关注/取消关注按钮');
                  console.log('👤 profile:', profile);
                  console.log('👤 profile.id:', profile?.id, '类型:', typeof profile?.id);
                  console.log(' profile.customer_id:', profile?.customer_id, '类型:', typeof profile?.customer_id);
                  
                  // 优先使用 id，如果不存在则使用 customer_id
                  const userId = profile?.id || profile?.customer_id;
                  console.log('👤 最终使用的 userId:', userId);
                  
                  if (!userId) {
                    console.error('❌ 错误: 无法获取用户ID！');
                    message.error('操作失败：用户ID不存在');
                    return;
                  }
                  
                  if (followingActionId) return;
                  setFollowingActionId(userId as number | string);
                  try {
                    console.log(' 准备调用 toggleFollowUser，参数:', userId);
                    await toggleFollowUser(userId as number | string);
                    // 乐观更新
                    message.success((profile as any).is_following ? t.profile.unfollowSuccess : t.profile.followSuccess);
                    // 刷新用户信息
                    refreshProfile();
                  } catch (err) {
                    console.error('关注操作失败:', err);
                    message.error(t.profile.followFailed);
                  } finally {
                    setFollowingActionId(null);
                  }
                }}
                disabled={followingActionId === (profile?.id || profile?.customer_id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors ${
                  (profile as any).is_following
                    ? 'bg-white/20 text-white hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20'
                    : 'bg-white text-blue-600 hover:bg-white/90 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700'
                }`}
              >
                {followingActionId === (profile?.id || profile?.customer_id) 
                  ? t.common.loading 
                  : (profile as any).is_following 
                  ? t.profile.unfollow 
                  : t.profile.follow}
              </button>
            )}
          </div>

          {/* 统计卡片 - 查看其他用户时显示所有4个 */}
          <div className="px-0 pt-2">
            <div className="space-y-4">
              {/* 第一行：已上传和收藏 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center dark:bg-white/5">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ImageIcon size={18} />
                    <span className="text-2xl font-bold">{profile.upload_count ?? profile.uploadedCount ?? 0}</span>
                  </div>
                  <p className="text-xs text-white/80 dark:text-gray-300">{t.profile.uploaded}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center dark:bg-white/5">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Heart size={18} />
                    <span className="text-2xl font-bold">{profile.collection_count ?? profile.favoritesCount ?? 0}</span>
                  </div>
                  <p className="text-xs text-white/80 dark:text-gray-300">{t.profile.favorites}</p>
                </div>
              </div>
              {/* 第二行：关注和粉丝 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center dark:bg-white/5">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users size={18} />
                    <span className="text-2xl font-bold">{profile.following_count ?? 0}</span>
                  </div>
                  <p className="text-xs text-white/80 dark:text-gray-300">{t.profile.following}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center dark:bg-white/5">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users size={18} />
                    <span className="text-2xl font-bold">{profile.follower_count ?? 0}</span>
                  </div>
                  <p className="text-xs text-white/80 dark:text-gray-300">{t.profile.followers}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 上传按钮 - 只有自己的页面才显示 */}
      {!isOtherUser && (
        <div className="px-4 mt-4 mb-6">
          <Link
            to="/upload"
            className={`profile-upload-btn flex items-center justify-center gap-2 w-full py-3.5 rounded-3xl no-underline font-semibold [&_svg]:shrink-0 transition-colors ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-500 text-black hover:bg-blue-400'}`}
          >
            <Upload size={20} />
            <span>{t.profile.uploadWallpaper}</span>
          </Link>
        </div>
      )}

      {/* Tabs - 只有自己的页面才显示Tab栏 */}
      {!isOtherUser && (
        <>
          <div className="bg-card border-b border-border sticky top-0 z-40">
            <div className="flex">
              <button
                onClick={() => setActiveTab('uploaded')}
                className="flex-1 relative py-4 font-semibold transition-colors"
              >
                <span className={activeTab === 'uploaded' ? 'text-blue-600' : 'text-muted-foreground'}>
                  {t.profile.uploaded}
                </span>
                {activeTab === 'uploaded' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className="flex-1 relative py-4 font-semibold transition-colors"
              >
                <span className={activeTab === 'favorites' ? 'text-blue-600' : 'text-muted-foreground'}>
                  {t.profile.favorites}
                </span>
                {activeTab === 'favorites' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className="flex-1 relative py-4 font-semibold transition-colors"
              >
                <span className={activeTab === 'following' ? 'text-blue-600' : 'text-muted-foreground'}>
                  {t.profile.following}
                </span>
                {activeTab === 'following' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('followers')}
                className="flex-1 relative py-4 font-semibold transition-colors"
              >
                <span className={activeTab === 'followers' ? 'text-blue-600' : 'text-muted-foreground'}>
                  {t.profile.followers}
                </span>
                {activeTab === 'followers' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  />
                )}
              </button>
            </div>
          </div>

          {/* 壁纸筛选按钮 - 只在上传和收藏Tab显示 */}
          {(activeTab === 'uploaded' || activeTab === 'favorites') && (
            <div className="px-4 py-3 flex gap-2 overflow-x-auto bg-card border-b border-border">
              <button
                onClick={() => setWallpaperFilter('phone')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${wallpaperFilter === 'phone'
                    ? 'bg-blue-600 text-white'
                    : 'bg-muted text-foreground hover:bg-muted'
                  }`}
              >
                {t.profile.phoneWallpaper}
              </button>
              <button
                onClick={() => setWallpaperFilter('pc')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${wallpaperFilter === 'pc'
                    ? 'bg-blue-600 text-white'
                    : 'bg-muted text-foreground hover:bg-muted'
                  }`}
              >
                 {t.profile.pcWallpaper}
              </button>
            </div>
          )}
        </>
      )}

      {/* 查看他人主页时的壁纸筛选按钮 */}
      {isOtherUser && (
        <>
          <div className="px-4 py-3 bg-card border-b border-border">
            <h2 className="text-lg font-bold text-foreground">{t.profile.uploaded}</h2>
          </div>
          <div className="px-4 py-3 flex gap-2 overflow-x-auto bg-card border-b border-border sticky z-40" style={{ top: 'max(env(safe-area-inset-top), var(--status-bar-height, 0px))' }}>
            <button
              onClick={() => setWallpaperFilter('phone')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${wallpaperFilter === 'phone'
                  ? 'bg-blue-600 text-white'
                  : 'bg-muted text-foreground hover:bg-muted'
                }`}
            >
              {t.profile.phoneWallpaper}
            </button>
            <button
              onClick={() => setWallpaperFilter('pc')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${wallpaperFilter === 'pc'
                  ? 'bg-blue-600 text-white'
                  : 'bg-muted text-foreground hover:bg-muted'
                }`}
            >
              {t.profile.pcWallpaper}
            </button>
          </div>
        </>
      )}

      {/* Content */}
      <div className="py-4">
        {/* 查看其他用户时，只显示上传列表 */}
        {isOtherUser ? (
          // 其他用户的上传列表
          <>
            {uploadsLoading ? (
              <div className="px-4 py-16 text-center">
                <div className="text-muted-foreground">{t.common.loading}</div>
              </div>
            ) : uploadsError ? (
              <div className="px-4 py-16 text-center">
                <div className="text-red-500">{t.profile.loadFailedRetry}</div>
              </div>
            ) : uploadedWallpapers.length > 0 ? (
              <div className="px-4">
                <WallpaperGrid 
                  wallpapers={uploadedWallpapers} 
                  platform={wallpaperFilter === 'phone' ? 'PHONE' : 'PC'}
                />
              </div>
            ) : (
              // 空状态 - 没有上传的壁纸
              <div className="px-4 py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <ImageIcon size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t.profile.noUploadsYet}
                </h3>
              </div>
            )}
          </>
        ) : activeTab === 'following' ? (
          // 关注列表
          <>
            {followingLoading ? (
              <div className="px-4 py-16 text-center">
                <div className="text-muted-foreground">{t.common.loading}</div>
              </div>
            ) : followingError ? (
              <div className="px-4 py-16 text-center">
                <div className="text-red-500">{t.profile.loadFailedRetry}</div>
              </div>
            ) : followingUsers.length > 0 ? (
              <div className="divide-y">
                {followingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-card px-4 py-3 flex items-center gap-3 hover:bg-background transition-colors cursor-pointer"
                    onClick={() => navigate(`/profile/${user.id}?other_id=${user.id}`)}
                  >
                    {/* 头像 */}
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0 ring-2 ring-gray-100 hover:ring-blue-300 transition-all"
                    >
                      <ImageWithFallback
                        src={user.avatar_url || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent((user.nickname || user.username || 'UN') as string)}`}
                        alt={user.nickname || user.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* 用户信息 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate text-base hover:text-blue-600 transition-colors">
                        {user.nickname || user.username}
                      </h3>
                    </div>
                    
                    {/* 操作按钮 - 阻止事件冒泡 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFollow(user.id, true);
                      }}
                      disabled={followingActionId === user.id}
                      className="px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-all active:scale-95 bg-muted text-foreground hover:bg-muted"
                    >
                      {followingActionId === user.id
                        ? t.common.loading
                        : t.profile.unfollow}
                    </button>
                  </div>
                ))}
                {/* 加载更多 */}
                {followingHasMore && (
                  <div className="px-4 py-6 text-center">
                    <button
                      onClick={followingLoadMore}
                      disabled={followingLoadingMore}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                    >
                      {followingLoadingMore ? t.common.loading : t.profile.loadMoreText}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <Users size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t.profile.noFollowingYet}
                </h3>
                <p className="text-muted-foreground">
                  {t.profile.startFollowing}
                </p>
              </div>
            )}
          </>
        ) : activeTab === 'followers' ? (
          // 粉丝列表
          <>
            {followersLoading ? (
              <div className="px-4 py-16 text-center">
                <div className="text-muted-foreground">{t.common.loading}</div>
              </div>
            ) : followersError ? (
              <div className="px-4 py-16 text-center">
                <div className="text-red-500">{t.profile.loadFailedRetry}</div>
              </div>
            ) : followersUsers.length > 0 ? (
              <div className="divide-y">
                {followersUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-card px-4 py-3 flex items-center gap-3 hover:bg-background transition-colors cursor-pointer"
                    onClick={() => navigate(`/profile/${user.id}?other_id=${user.id}`)}
                  >
                    {/* 头像 */}
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0 ring-2 ring-gray-100 hover:ring-blue-300 transition-all"
                    >
                      <ImageWithFallback
                        src={user.avatar_url || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent((user.nickname || user.username || 'UN') as string)}`}
                        alt={user.nickname || user.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* 用户信息 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate text-base hover:text-blue-600 transition-colors">
                        {user.nickname || user.username}
                      </h3>
                    </div>
                    
                    {/* 操作按钮 - 阻止事件冒泡 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFollow(user.id, user.is_followed || false);
                      }}
                      disabled={followingActionId === user.id}
                      className={`px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-all active:scale-95 ${
                        user.is_followed
                          ? 'bg-muted text-foreground hover:bg-muted'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {followingActionId === user.id
                        ? t.common.loading
                        : user.is_followed
                        ? t.profile.mutualFollow
                        : t.profile.followBack}
                    </button>
                  </div>
                ))}
                {/* 加载更多 */}
                {followersHasMore && (
                  <div className="px-4 py-6 text-center">
                    <button
                      onClick={followersLoadMore}
                      disabled={followersLoadingMore}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                    >
                      {followersLoadingMore ? t.common.loading : t.profile.loadMoreText}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <Users size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t.profile.noFollowersYet}
                </h3>
                <p className="text-muted-foreground">
                  {t.profile.startFollowing}
                </p>
              </div>
            )}
          </>
        ) : activeTab === 'uploaded' ? (
          // 上传列表
          <>
            {uploadsLoading ? (
              <div className="px-4 py-16 text-center">
                <div className="text-muted-foreground">{t.common.loading}</div>
              </div>
            ) : uploadsError ? (
              <div className="px-4 py-16 text-center">
                <div className="text-red-500">{t.profile.loadFailedRetry}</div>
              </div>
            ) : uploadedWallpapers.length > 0 ? (
              <>
                <UploadWallpaperGrid 
                  wallpapers={uploadedWallpapers} 
                  platform={wallpaperFilter === 'phone' ? 'PHONE' : 'PC'}
                  onDelete={(id) => handleDeleteWallpaper(id)}
                  deletingId={deletingId}
                  showAuditStatus={!isOtherUser}
                />
                {/* 加载更多 */}
                {uploadsHasMore && (
                  <div className="px-4 py-6 text-center">
                    <button
                      onClick={uploadsLoadMore}
                      disabled={uploadsLoadingMore}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                    >
                      {uploadsLoadingMore ? t.common.loading : t.profile.loadMoreText}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="px-4 py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <ImageIcon size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t.profile.noUploadsYet}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {t.profile.uploadFirstWallpaper}
                </p>
              </div>
            )}
          </>
        ) : (
          // 收藏列表
          <>
            {favoritesLoading ? (
              <div className="px-4 py-16 text-center">
                <div className="text-muted-foreground">{t.common.loading}</div>
              </div>
            ) : favoritesError ? (
              <div className="px-4 py-16 text-center">
                <div className="text-red-500">{t.profile.loadFailedRetry}</div>
              </div>
            ) : favoriteWallpapers.length > 0 ? (
              <>
                <WallpaperGrid 
                  wallpapers={favoriteWallpapers} 
                  platform={wallpaperFilter === 'phone' ? 'PHONE' : 'PC'}
                />
                {/* 加载更多 */}
                {favoritesHasMore && (
                  <div className="px-4 py-6 text-center">
                    <button
                      onClick={favoritesLoadMore}
                      disabled={favoritesLoadingMore}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                    >
                      {favoritesLoadingMore ? t.common.loading : t.profile.loadMoreText}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="px-4 py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <Heart size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t.profile.noFavoritesYet}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {t.profile.startFavoriting}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      </div>
    </PullToRefresh>
    <BottomNav />
    </>
  );
}