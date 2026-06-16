import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PrivacyPolicy from './PrivacyPolicy';
import './src/i18n/i18n';

// Lazy load para componentes que no son de la Home (mejora el bundle inicial)
const Dashboard = React.lazy(() => import('./src/admin/Dashboard'));
const AdminChat = React.lazy(() => import('./src/admin/AdminChat'));
const CRMProjects = React.lazy(() => import('./src/admin/CRMProjects'));
const ClientPortal = React.lazy(() => import('./src/components/ClientPortal'));
const PortalLogin = React.lazy(() => import('./src/components/PortalLogin'));

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const path = window.location.pathname.toLowerCase();
const isDashboard = path === '/admin';
const isPrivacyPolicy = path === '/politica-de-privacidad';
const isChat = path.startsWith('/admin/chat');
const isPortfolio = path === '/portfolio';
const isPortal = path === '/portal';
const isPortalLogin = path === '/portal/login';
const isCrm = path === '/admin/crm';

let initialPhone = null;
if (isChat) {
  const urlParams = new URLSearchParams(window.location.search);
  initialPhone = urlParams.get('phone');
}

const isPortfolioLink = path.startsWith('/portfolio/');
const portfolioId = isPortfolioLink ? path.split('/')[2] : null;

// Si la URL es /portfolio o un link directo a un proyecto, scrolleamos al ancla
if (isPortfolio || isPortfolioLink) {
  // Para enlaces específicos, guardamos el ID para que App.tsx lo lea
  if (portfolioId) {
    window.sessionStorage.setItem('open_project_id', portfolioId);
  }
  
  // Limpiamos la URL visualmente para mantenerla prolija pero con el ancla
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

const LoadingScreen = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-nexo-lime border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isPrivacyPolicy ? <PrivacyPolicy /> : 
      isChat ? <Suspense fallback={<LoadingScreen />}><AdminChat initialPhone={initialPhone} /></Suspense> :
        isDashboard ? <Suspense fallback={<LoadingScreen />}><Dashboard /></Suspense> : 
          isPortal ? <Suspense fallback={<LoadingScreen />}><ClientPortal /></Suspense> :
            isPortalLogin ? <Suspense fallback={<LoadingScreen />}><PortalLogin /></Suspense> :
              isCrm ? <Suspense fallback={<LoadingScreen />}><CRMProjects /></Suspense> : <App />}
  </React.StrictMode>
);
