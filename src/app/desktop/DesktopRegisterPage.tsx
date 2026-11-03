import React, { useState } from 'react';
import { App } from 'antd';
import { Link, useNavigate } from 'react-router';
import { Mail, Lock, UserPlus, Info, Eye, EyeOff } from 'lucide-react';
import { ApiError } from '../../api/request';
import { extractApiUserId, registerUser } from '../../api/auth';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { trackUserRegister } from '../analytics/firebaseTracking';

export default function DesktopRegisterPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <div className="min-h-screen bg-background">
      <header className="text-white" style={{ backgroundColor: theme === 'dark' ? '#0a1628' : undefined, background: theme !== 'dark' ? 'linear-gradient(to bottom right, #2563eb, #9333ea)' : undefined }}>
        <div className="max-w-lg mx-auto px-5 pt-10 pb-12">
          <h1 className="text-3xl font-bold">{t.register.createAccount}</h1>
          <p className="mt-2 text-white/85">{t.register.registerToUpload}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 -mt-7 pb-10">
        <div className="rounded-3xl bg-card p-6 shadow-sm border border-border">
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">{t.register.emailAddress}</span>
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3">
                <Mail size={18} className="text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.register.emailPlaceholder}
                  className="h-12 w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">{t.register.setPassword}</span>
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3">
                <Lock size={18} className="text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.register.passwordPlaceholder}
                  className="h-12 w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                />
                {!/Edge|Edg/i.test(navigator.userAgent) && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded-full hover:bg-muted transition-colors"
                  >
                    {showPassword ? <Eye size={18} className="text-muted-foreground" /> : <EyeOff size={18} className="text-muted-foreground" />}
                  </button>
                )}
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>{t.register.passwordHint}</span>
              </p>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">{t.register.confirmPassword}</span>
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3">
                <Lock size={18} className="text-muted-foreground" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.register.confirmPasswordPlaceholder}
                  className="h-12 w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                />
                {!/Edge|Edg/i.test(navigator.userAgent) && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="p-1 rounded-full hover:bg-muted transition-colors"
                  >
                    {showConfirmPassword ? <Eye size={18} className="text-muted-foreground" /> : <EyeOff size={18} className="text-muted-foreground" />}
                  </button>
                )}
              </div>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-white disabled:opacity-60"
            >
              <UserPlus size={18} />
              {submitting ? t.common.loading : t.register.registerButton}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-600">
            {t.register.hasAccount}
            <Link to="/login" className="ml-1 font-medium text-blue-600">
              {t.register.loginNow}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}