import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './app/App';
import './app/analytics/aplusRouterSubscription';
import './app/analytics/pageLifecycle';
import { initFirebaseSeoTracking } from './app/analytics/firebaseTracking';
import './styles/index.css';
// 必须在 Capacitor 初始化前导入，以便保存原生 fetch 引用
import './api/nativeFetch';

// 会话首次落地归因（自然搜索 / 新访客等），供详情 PV、下载、注册共用
initFirebaseSeoTracking();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);