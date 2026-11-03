import React, { useState } from 'react';
import { App } from 'antd';
import { Link, useNavigate, useLocation } from 'react-router';
import { Mail, Lock, UserPlus, Eye, EyeOff, Info, ArrowLeft } from 'lucide-react';
import { ApiError } from '../../api/request';
import { extractApiUserId, registerUser } from '../../api/auth';
import { BottomNav } from '../components/BottomNav';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { trackUserRegister } from '../analytics/firebaseTracking';

export default function RegisterPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 控制返回按钮显示：如果浏览器历史记录深度大于1或者来自特定页面，则显示返回按钮
  const shouldShowReturnButton = window.history.length > 1 || location.state?.from;

  const handleGoBack = () => {
    // 如果有来源页面，则返回来源页面；否则返回上一页
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !confirmPassword) {
      message.warning(t.register.fillAllFields);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      message.warning(t.login.invalidEmail);
      return;
    }

    // 密码正则校验：最少8位，必须包含字母和数字
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    console.log(password, 'papap')
    console.log(passwordRegex.test(password), 'passwordRegex.test(password)')
    if (!passwordRegex.test(password)) {
      message.error(t.register.passwordRequirement);
      return;
    }

    if (password !== confirmPassword) {
      message.error(t.register.passwordMismatch);
      return;
    }

    setSubmitting(true);
    try {
      const response = await registerUser({
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
      });

      // 检查响应中的code字段（业务状态码）
      const responseData = response as any;
      if (responseData && responseData.code !== undefined && responseData.code !== 200) {
        // 业务失败：提取错误信息
        const errorMessage = responseData.message || t.register.registerFailed;
        message.error(errorMessage);
        return;
      }

      // 注册成功：上报 Firebase user_register（带会话首次落地来源）
      trackUserRegister(extractApiUserId(response));
      message.success(t.register.registerSuccess);
      navigate('/login');
    } catch (error) {
      // 处理HTTP错误（非2xx状态码）
      if (error instanceof ApiError) {
        const responseData = error.data as any;

        // 优先从响应的data中提取详细错误信息
        if (responseData && responseData.data && typeof responseData.data === 'object') {
          // 尝试从data对象中提取第一个错误信息
          const errorDetails = responseData.data;
          const firstKey = Object.keys(errorDetails)[0];
          if (firstKey && Array.isArray(errorDetails[firstKey]) && errorDetails[firstKey].length > 0) {
            message.error(errorDetails[firstKey][0]);
            return;
          } else if (firstKey && typeof errorDetails[firstKey] === 'string') {
            message.error(errorDetails[firstKey]);
            return;
          }
        }

        // 使用message字段
        if (error.message && error.message !== 'Request failed') {
          message.error(error.message);
        } else {
          message.error(t.register.registerFailed);
        }
      } else {
        message.error(t.register.registerFailed);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 max-w-md mx-auto relative">
      {/* 返回按钮 */}
      {shouldShowReturnButton && (
        <button
          onClick={handleGoBack}
          className="fixed top-[calc(max(env(safe-area-inset-top),var(--status-bar-height,0px))+1.5rem)] left-4 z-50 bg-card/10 backdrop-blur-sm border  rounded-full p-2 hover:bg-card/30 transition-colors shadow-md"
          aria-label={t.common.back}
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
      )}

      {/* 顶部装饰区域 */}
      <div className="relative overflow-hidden" style={{ backgroundColor: theme === 'dark' ? '#0a1628' : undefined, background: theme !== 'dark' ? 'linear-gradient(to bottom right, #2563eb, #9333ea, #ec4899)' : undefined }}>
        {/* 装饰圆圈 */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-card/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-card/10 rounded-full blur-3xl"></div>

        <div className="relative px-6 pt-[calc(max(env(safe-area-inset-top),var(--status-bar-height,0px))+3rem)] pb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-white text-center mb-2"
          >
            {t.register.createAccount}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/80 text-center text-sm"
          >
            {t.register.registerToUpload}
          </motion.p>
        </div>
      </div>

      {/* 表单区域 */}
      <main className="px-6 relative z-10 pb-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-3xl bg-card p-6 shadow-xl border border-border -mt-8"
        >
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {/* 邮箱输入 */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                {t.register.emailAddress}
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.register.emailPlaceholder}
                  className="w-full pl-11 pr-4 h-12 rounded-xl border-2 border-border bg-background outline-none text-foreground placeholder:text-muted-foreground text-sm transition-all focus:border-blue-500 focus:bg-card focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* 密码输入 */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                {t.register.setPassword}
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.register.passwordPlaceholder}
                  className="w-full pl-11 pr-12 h-12 rounded-xl border-2 border-border bg-background outline-none text-foreground placeholder:text-muted-foreground text-sm transition-all focus:border-blue-500 focus:bg-card focus:ring-2 focus:ring-blue-100"
                />
                {!/Edge|Edg/i.test(navigator.userAgent) && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                )}
              </div>
              <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground bg-background p-3 rounded-lg">
                <Info size={14} className="mt-0.5 shrink-0 text-blue-500" />
                <span>{t.register.passwordHint}</span>
              </p>
            </div>

            {/* 确认密码输入 */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                {t.register.confirmPassword}
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.register.confirmPasswordPlaceholder}
                  className="w-full pl-11 pr-12 h-12 rounded-xl border-2 border-border bg-background outline-none text-foreground placeholder:text-muted-foreground text-sm transition-all focus:border-blue-500 focus:bg-card focus:ring-2 focus:ring-blue-100"
                />
                {!/Edge|Edg/i.test(navigator.userAgent) && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                )}
              </div>
            </div>

            {/* 注册按钮 */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={submitting}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: theme === 'dark' ? '#2563eb' : 'linear-gradient(to right, #2563eb, #9333ea)' }}
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <UserPlus size={18} />
                  {t.register.registerButton}
                </>
              )}
            </motion.button>
          </form>

          {/* 登录链接 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t.register.hasAccount}
              <Link to="/login" className="ml-1 font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                {t.register.loginNow}
              </Link>
            </p>
          </div>
        </motion.div>

        {/* 底部提示 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center text-xs text-muted-foreground"
        >
          {t.register.termsAgreement}
        </motion.p>
      </main>

      <BottomNav />
    </div>
  );
}