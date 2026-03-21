import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Dashboard from './src/admin/Dashboard';
import AdminChat from './src/admin/AdminChat';
import PrivacyPolicy from './PrivacyPolicy';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const path = window.location.pathname.toLowerCase();
const isDashboard = path === '/admin';
const isPrivacyPolicy = path === '/politica-de-privacidad';
const isChat = path.startsWith('/admin/chat');

let initialPhone = null;
if (isChat) {
  const urlParams = new URLSearchParams(window.location.search);
  initialPhone = urlParams.get('phone');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isPrivacyPolicy ? <PrivacyPolicy /> : 
      isChat ? <AdminChat initialPhone={initialPhone} /> :
        isDashboard ? <Dashboard /> : <App />}
  </React.StrictMode>
);
