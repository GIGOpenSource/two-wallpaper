import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { DesktopSidebar, useSidebar } from '../components/DesktopSidebar';
import { DesktopWallpaperGrid } from '../components/DesktopWallpaperGrid';
import { Settings, Upload, Image as ImageIcon, Heart, Award, Users, UserCheck, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useView } from '../contexts/ViewContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { useMyCollections } from '../hooks/useMyCollections';
import { useMyUploads } from '../hooks/useMyUploads';
import { useFollowingList, useFollowersList } from '../hooks/useFollowingList';
import { getAuthToken } from '../../api/request';
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

export default function DesktopProfilePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isCollapsed } = useSidebar();
  const { message } = App.useApp();
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const otherId = searchParams.get('other_id');

  const [activeTab, setActiveTab] = useState<TabType>('uploaded');
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [followingActionId, setFollowingActionId] = useState<number | string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | string | null>(null);
  // 壁纸筛选：'phone' | 'pc'，默认为当前设备类型
  const { viewMode } = useView();
  const defaultFilter = viewMode === 'mobile' ? 'phone' : 'pc';
  const [wallpaperFilter, setWallpaperFilter] = useState<'phone' | 'pc'>(defaultFilter);

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

  const { profile, loading: profileLoading, error: profileError, refresh: refreshProfile } = useUserProfile(otherId || undefined);
  
  // 根据筛选条件传入对应的platform参数（默认为当前设备类型）
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
    hasMore: favoritesHasMore,
    loadMore: favoritesLoadMore,
    error: favoritesError
  } = isOtherUser ? {
    wallpapers: [],
    loading: false,
    loadingMore: false,
    hasMore: false,
    loadMore: () => { },
    error: null
  } : myCollectionsResult;

  // 无论是否查看他人主页，都使用 myUploadsResult 的数据
  const {
    wallpapers: uploadedWallpapers,
    loading: uploadsLoading,
    loadingMore: uploadsLoadingMore,
    hasMore: uploadsHasMore,
    loadMore: uploadsLoadMore,
    error: uploadsError,
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
    setFollowingActionId(userId);
    try {
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

  // 加载中状态
  if (profileLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (profileError) {
    return (
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-red-500 text-center">
            <p>{profileError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              {t.common.retry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 未登录状态 - 查看自己主页时显示加载状态
  if (!profile && !otherId) {
    return (
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-muted-foreground">
            <p>{t.common.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  // 未登录状态
  if (!profile) {
    return (
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-muted-foreground">
            <p>{t.common.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />

      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Header */}
        <header className="bg-gradient-to-br from-blue-600 to-purple-600 text-white dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 dark:text-gray-100">
          <div className="px-8 py-12">
            <div className="max-w-7xl mx-auto">
              {/* 返回按钮 - 只要有other_id参数就显示 */}
              {shouldShowReturnButton && (
                <button
                  onClick={() => navigate(-1)}
                  className="mb-6 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors dark:bg-white/10 dark:hover:bg-white/20"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {/* 用户信息区 */}
              <div className="flex items-start mb-8">
                <div className="flex items-center gap-6 flex-1">
                  <div className="w-20 h-20 bg-card rounded-full overflow-hidden shadow-lg">
                    <ImageWithFallback
                      src={profile.avatar_url || profile.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.nickname || profile.username || 'UN')}
                      alt={profile.nickname || profile.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">{profile.nickname || profile.username}</h1>
                    <div className="flex items-center gap-3 text-white/90 mb-3">
                      <span>{t.profile.level} {profile.level || 0}</span>
                      {/* <span>•</span>
                      <span>{profile.points || 0} {t.profile.points}</span> */}
                    </div>
                    {/* 根据是否是其他用户显示不同按钮 */}
                    {isOtherUser ? (
                      <button
                        onClick={async () => {
                          console.log(' [DesktopProfilePage] 点击关注/取消关注按钮');
                          console.log('👤 otherId:', otherId, '类型:', typeof otherId);
                          console.log('👤 profile.id:', profile?.id, '类型:', typeof profile?.id);

                          if (followingActionId) return;

                          // 使用路由参数中的 otherId 作为 following_id
                          const targetUserId = otherId || profile?.id;
                          console.log('🎯 目标用户ID (following_id):', targetUserId);

                          setFollowingActionId(targetUserId!);
                          try {
                            console.log('📡 准备调用 toggleFollowUser，参数:', targetUserId);
                            await toggleFollowUser(targetUserId!);
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
                        disabled={followingActionId === profile.id}
                        className={`px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors ${(profile as any).is_following
                            ? 'bg-white/20 text-white hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20'
                            : 'bg-white text-blue-600 hover:bg-white/90 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700'
                          }`}
                      >
                        {followingActionId === profile.id
                          ? t.common.loading
                          : (profile as any).is_following
                            ? t.profile.unfollow
                            : t.profile.follow}
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('/upload')}
                        className="bg-card text-blue-600 py-2 px-5 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-card/90 transition-colors shadow-lg dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
                      >
                        <Upload size={16} />
                        <span>{t.profile.uploadWallpaper}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 统计卡片 - 查看其他用户时也显示所有4个 */}
              <div className="grid grid-cols-4 gap-6 max-w-4xl">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center dark:bg-white/5">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <ImageIcon size={24} className="opacity-80" />
                    <div className="text-3xl font-bold">{profile.upload_count ?? profile.uploadedCount ?? 0}</div>
                  </div>
                  <div className="text-white/80 text-sm dark:text-gray-300">{t.profile.uploaded}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center dark:bg-white/5">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Heart size={24} className="opacity-80" />
                    <div className="text-3xl font-bold">{profile.collection_count ?? profile.favoritesCount ?? 0}</div>
                  </div>
                  <div className="text-white/80 text-sm dark:text-gray-300">{t.profile.favorites}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center dark:bg-white/5">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users size={24} className="opacity-80" />
                    <div className="text-3xl font-bold">{profile.following_count ?? 0}</div>
                  </div>
                  <div className="text-white/80 text-sm dark:text-gray-300">{t.profile.following}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center dark:bg-white/5">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users size={24} className="opacity-80" />
                    <div className="text-3xl font-bold">{profile.follower_count ?? 0}</div>
                  </div>
                  <div className="text-white/80 text-sm dark:text-gray-300">{t.profile.followers}</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="px-8 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Badges */}
            <section className="bg-card rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-foreground mb-6">{t.profile.achievementBadges}</h2>
              {profile.badges && profile.badges.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {profile.badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200"
                    >
                      <div className="text-4xl mb-3">{badge.icon}</div>
                      <h3 className="font-bold text-foreground mb-2">{badge.name}</h3>
                      <p className="text-sm text-gray-600">{badge.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>{t.profile.noBadgesYet}</p>
                </div>
              )}
            </section>

            {/* Tabs and Content */}
            <section>
              {/* Tabs - 只有自己的页面才显示Tab栏 */}
              {!isOtherUser && (
                <>
                  <div className="flex gap-6 border-b border-border mb-6">
                    <button
                      onClick={() => setActiveTab('uploaded')}
                      className="relative pb-4 font-semibold transition-colors"
                    >
                      <span className={activeTab === 'uploaded' ? 'text-blue-600' : 'text-muted-foreground'}>
                        {t.profile.uploaded}
                      </span>
                      {activeTab === 'uploaded' && (
                        <motion.div
                          layoutId="desktopActiveTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                        />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('favorites')}
                      className="relative pb-4 font-semibold transition-colors"
                    >
                      <span className={activeTab === 'favorites' ? 'text-blue-600' : 'text-muted-foreground'}>
                        {t.profile.favorites}
                      </span>
                      {activeTab === 'favorites' && (
                        <motion.div
                          layoutId="desktopActiveTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                        />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('following')}
                      className="relative pb-4 font-semibold transition-colors"
                    >
                      <span className={activeTab === 'following' ? 'text-blue-600' : 'text-muted-foreground'}>
                        {t.profile.following}
                      </span>
                      {activeTab === 'following' && (
                        <motion.div
                          layoutId="desktopActiveTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                        />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('followers')}
                      className="relative pb-4 font-semibold transition-colors"
                    >
                      <span className={activeTab === 'followers' ? 'text-blue-600' : 'text-muted-foreground'}>
                        {t.profile.followers}
                      </span>
                      {activeTab === 'followers' && (
                        <motion.div
                          layoutId="desktopActiveTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                        />
                      )}
                    </button>
                  </div>

                  {/* 壁纸筛选按钮 - 只在上传和收藏Tab显示 */}
                  {(activeTab === 'uploaded' || activeTab === 'favorites') && (
                    <div className="flex gap-3 mb-6">
                      <button
                        onClick={() => setWallpaperFilter('phone')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${wallpaperFilter === 'phone'
                            ? 'bg-blue-600 text-white'
                            : 'bg-muted text-foreground hover:bg-muted'
                          }`}
                      >
                        {t.profile.phoneWallpaper}
                      </button>
                      <button
                        onClick={() => setWallpaperFilter('pc')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${wallpaperFilter === 'pc'
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
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-foreground">{t.profile.uploaded}</h2>
                  </div>
                  <div className="flex gap-3 mb-6">
                    <button
                      onClick={() => setWallpaperFilter('phone')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${wallpaperFilter === 'phone'
                          ? 'bg-blue-600 text-white'
                          : 'bg-muted text-foreground hover:bg-muted'
                        }`}
                    >
                      {t.profile.phoneWallpaper}
                    </button>
                    <button
                      onClick={() => setWallpaperFilter('pc')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${wallpaperFilter === 'pc'
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
              {isOtherUser ? (
                // 查看其他用户时，只显示上传列表
                <>
                  {uploadsLoading ? (
                    <div className="py-16 text-center">
                      <p className="text-muted-foreground">{t.common.loading}</p>
                    </div>
                  ) : uploadsError ? (
                    <div className="py-16 text-center">
                      <p className="text-red-500">{t.profile.loadFailedRetry}</p>
                    </div>
                  ) : uploadedWallpapers.length > 0 ? (
                    <DesktopWallpaperGrid 
                      wallpapers={uploadedWallpapers} 
                      platform={wallpaperFilter === 'phone' ? 'PHONE' : 'PC'}
                      showAuditStatus={!isOtherUser}
                    />
                  ) : (
                    // 空状态 - 没有上传的壁纸
                    <div className="py-16 text-center">
                      <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                        <ImageIcon size={40} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-2xl font-semibold text-foreground mb-3">
                        {t.profile.noUploadsYet}
                      </h3>
                    </div>
                  )}
                </>
              ) : activeTab === 'following' ? (
                // 关注列表
                <>
                  {followingLoading ? (
                    <div className="py-16 text-center">
                      <p className="text-muted-foreground">{t.common.loading}</p>
                    </div>
                  ) : followingError ? (
                    <div className="py-16 text-center">
                      <p className="text-red-500">{t.profile.loadFailedRetry}</p>
                    </div>
                  ) : followingUsers.length > 0 ? (
                    <div className="divide-y  bg-card rounded-xl shadow-sm">
                      {followingUsers.map((user) => (
                        <div
                          key={user.id}
                          className="px-6 py-4 flex items-center gap-4 hover:bg-background transition-colors cursor-pointer"
                          onClick={() => navigate(`/profile/${user.id}?other_id=${user.id}`)}
                        >
                          {/* 头像 */}
                          <div
                            className="w-14 h-14 rounded-full overflow-hidden bg-muted flex-shrink-0 ring-2 ring-gray-100 hover:ring-blue-300 transition-all"
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
                            className="px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-all active:scale-95 bg-muted text-foreground hover:bg-muted"
                          >
                            {followingActionId === user.id
                              ? t.common.loading
                              : t.profile.unfollow}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                        <Users size={40} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-2xl font-semibold text-foreground mb-3">
                        {t.profile.noFollowingYet}
                      </h3>
                      <p className="text-muted-foreground">
                        {t.profile.startFollowing}
                      </p>
                    </div>
                  )}
                  {/* 加载更多 */}
                  {followingHasMore && followingUsers.length > 0 && (
                    <div className="py-8 text-center">
                      {/* <button
                        onClick={followingLoadMore}
                        disabled={followingLoadingMore}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
                      >
                        {followingLoadingMore ? t.common.loading : t.profile.loadMoreText}
                      </button> */}
                    </div>
                  )}
                </>
              ) : activeTab === 'followers' ? (
                // 粉丝列表
                <>
                  {followersLoading ? (
                    <div className="py-16 text-center">
                      <p className="text-muted-foreground">{t.common.loading}</p>
                    </div>
                  ) : followersError ? (
                    <div className="py-16 text-center">
                      <p className="text-red-500">{t.profile.loadFailedRetry}</p>
                    </div>
                  ) : followersUsers.length > 0 ? (
                    <div className="divide-y  bg-card rounded-xl shadow-sm">
                      {followersUsers.map((user) => (
                        <div
                          key={user.id}
                          className="px-6 py-4 flex items-center gap-4 hover:bg-background transition-colors cursor-pointer"
                          onClick={() => navigate(`/profile/${user.id}?other_id=${user.id}`)}
                        >
                          {/* 头像 */}
                          <div
                            className="w-14 h-14 rounded-full overflow-hidden bg-muted flex-shrink-0 ring-2 ring-gray-100 hover:ring-blue-300 transition-all"
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
                            className={`px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-all active:scale-95 ${user.is_followed
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
                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                        <Users size={40} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-2xl font-semibold text-foreground mb-3">
                        {t.profile.noFollowersYet}
                      </h3>
                      <p className="text-muted-foreground">
                        {t.profile.startFollowing}
                      </p>
                    </div>
                  )}
                  {/* 加载更多 */}
                  {followersHasMore && followersUsers.length > 0 && (
                    <div className="py-8 text-center">
                      {/* <button
                        onClick={followersLoadMore}
                        disabled={followersLoadingMore}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
                      >
                        {followersLoadingMore ? t.common.loading : t.profile.loadMoreText}
                      </button> */}
                    </div>
                  )}
                </>
              ) : activeTab === 'favorites' ? (
                // 收藏列表 - 使用真实数据
                <>
                  {favoritesLoading ? (
                    <div className="py-16 text-center">
                      <p className="text-muted-foreground">{t.common.loading}</p>
                    </div>
                  ) : favoritesError ? (
                    <div className="py-16 text-center">
                      <p className="text-red-500">{t.profile.loadFailedRetry}</p>
                    </div>
                  ) : favoriteWallpapers.length > 0 ? (
                    <>
                      <DesktopWallpaperGrid 
                        wallpapers={favoriteWallpapers} 
                        platform={wallpaperFilter === 'phone' ? 'PHONE' : 'PC'}
                      />

                      {/* 加载更多 */}
                      {favoritesHasMore && (
                        <div className="py-8 text-center">
                          <button
                            onClick={favoritesLoadMore}
                            disabled={favoritesLoadingMore}
                            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
                          >
                            {favoritesLoadingMore ? t.common.loading : t.profile.loadMoreText}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-16 text-center">
                      <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                        <Heart size={40} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-2xl font-semibold text-foreground mb-3">
                        {t.profile.noFavoritesYet}
                      </h3>
                      <p className="text-muted-foreground mb-8">
                        {t.profile.startFavoriting}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                // 上传列表 - 使用真实数据
                <>
                  {uploadsLoading ? (
                    <div className="py-16 text-center">
                      <p className="text-muted-foreground">{t.common.loading}</p>
                    </div>
                  ) : uploadsError ? (
                    <div className="py-16 text-center">
                      <p className="text-red-500">{t.profile.loadFailedRetry}</p>
                    </div>
                  ) : uploadedWallpapers.length > 0 ? (
                    <>
                      <DesktopWallpaperGrid
                        wallpapers={uploadedWallpapers}
                        platform={wallpaperFilter === 'phone' ? 'PHONE' : 'PC'}
                        onDelete={(id) => handleDeleteWallpaper(id)}
                        deletingId={deletingId}
                        showAuditStatus={!isOtherUser}
                      />
                      {/* 加载更多 */}
                      {uploadsHasMore && (
                        <div className="py-8 text-center">
                          <button
                            onClick={uploadsLoadMore}
                            disabled={uploadsLoadingMore}
                            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
                          >
                            {uploadsLoadingMore ? t.common.loading : t.profile.loadMoreText}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-16 text-center">
                      <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                        <ImageIcon size={40} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-2xl font-semibold text-foreground mb-3">
                        {t.profile.noUploadsYet}
                      </h3>
                      <p className="text-muted-foreground mb-8">
                        {t.profile.uploadFirstWallpaper}
                      </p>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}