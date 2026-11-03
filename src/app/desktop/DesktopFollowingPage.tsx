import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { App } from 'antd';
import { DesktopSidebar, useSidebar } from '../components/DesktopSidebar';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, UserPlus } from 'lucide-react';
import { useFollowingList } from '../hooks/useFollowingList';
import { toggleFollowUser } from '../../api/wallpaper';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export default function DesktopFollowingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { message } = App.useApp();
  const { isCollapsed } = useSidebar();
  const { users = [], loading, loadingMore, error, hasMore, loadMore, refresh } = useFollowingList();

  // 每次进入页面时重新请求数据
  useEffect(() => {
    refresh();
  }, [refresh]);

  // 处理取消关注
  const handleToggleFollow = async (userId: number | string) => {
    try {
      await toggleFollowUser(userId);
      // 显示成功提示
      message.success(t.profile.unfollowSuccess);
      // 刷新列表
      refresh();
    } catch (err) {
      console.error('操作失败:', err);
      message.error(t.profile.followFailed);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />

      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Header */}
        <header className="bg-card border-b border-border">
          <div className="px-8 py-6">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-3xl font-bold text-foreground">{t.profile.following}</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-8 py-8">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">{t.common.loading}</p>
              </div>
            ) : error ? (
              <div className="py-16 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                  onClick={refresh}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg"
                >
                  {t.common.retry}
                </button>
              </div>
            ) : users.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/profile/${user.id}?other_id=${user.id}`)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0 ring-2 ring-gray-100 hover:ring-blue-300 transition-all">
                        <ImageWithFallback
                          src={user.avatar_url || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nickname || user.username || 'UN')}`}
                          alt={user.nickname || user.username || 'User'}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate mb-1 hover:text-blue-600 transition-colors w-full text-left">
                          {user.nickname || user.username || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mb-3">
                          <span>{user.upload_count || 0} {t.profile.uploaded}</span>
                          <span>•</span>
                          <span>{user.follower_count || 0} {t.profile.followers}</span>
                        </div>

                        {/* Follow Button - Stop propagation to prevent card click */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFollow(user.id);
                          }}
                          className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-muted text-foreground hover:bg-gray-300"
                        >
                          {t.profile.unfollow}
                        </button>
                      </div>
                    </div>
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
                <p className="text-muted-foreground mb-8">
                  {t.profile.startFollowing}
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  <UserPlus size={20} />
                  <span>{t.home.discoverWallpapers}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
