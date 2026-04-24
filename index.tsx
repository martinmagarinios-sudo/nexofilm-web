import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Dashboard from './src/admin/Dashboard';
import AdminChat from './src/admin/AdminChat';
import PrivacyPolicy from './PrivacyPolicy';
import './src/i18n/i18n';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const path = window.location.pathname.toLowerCase();
const isDashboard = path === '/admin';
const isPrivacyPolicy = path === '/politica-de-privacidad';
const isChat = path.startsWith('/admin/chat');
const isPortfolio = path === '/portfolio';

let initialPhone = null;
if (isChat) {
  const urlParams = new URLSearchParams(window.location.search);
  initialPhone = urlParams.get('phone');
}

// Si la URL es /portfolio, scrolleamos al ancla una vez que React haya montado el componente
if (isPortfolio) {
  window.history.replaceState(null, '', '/#portfolio');
  const tryScroll = (attempts = 0) => {
    const el = document.getElementById('portfolio');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (attempts < 20) {
      setTimeout(() => tryScroll(attempts + 1), 150);
    }
  };
  setTimeout(() => tryScroll(), 300);
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isPrivacyPolicy ? <PrivacyPolicy /> : 
      isChat ? <AdminChat initialPhone={initialPhone} /> :
        isDashboard ? <Dashboard /> : <App />}
  </React.StrictMode>
);
