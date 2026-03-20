import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Dashboard from './src/admin/Dashboard';

import PrivacyPolicy from './PrivacyPolicy';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const path = window.location.pathname.toLowerCase();
const isDashboard = path === '/admin';
const isPrivacyPolicy = path === '/politica-de-privacidad';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isPrivacyPolicy ? <PrivacyPolicy /> : (isDashboard ? <Dashboard /> : <App />)}
  </React.StrictMode>
);
