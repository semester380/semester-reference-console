import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import RefereePortal from './pages/RefereePortal';
import TemplateBuilder from './pages/TemplateBuilder';
import LoginPage from './pages/Login';

const ProtectedApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [view, setView] = useState(() => {
    // Check path first
    const path = window.location.pathname;
    if (path.includes('/referee-portal') || path.includes('/consent')) return 'portal';
    if (path.includes('/template-builder')) return 'builder';

    // Check query params
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'authorize' || params.get('action') === 'authorise') return 'portal';
    if (params.get('token')) return 'portal'; // Default to portal if token present

    return params.get('view') || 'dashboard';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      const actionParam = params.get('action');

      let newView = 'dashboard';
      if (path.includes('/referee-portal') || path.includes('/consent')) newView = 'portal';
      else if (path.includes('/template-builder')) newView = 'builder';
      else if (actionParam === 'authorize' || actionParam === 'authorise') newView = 'portal';
      else if (params.get('token')) newView = 'portal';
      else if (viewParam) newView = viewParam;

      setView(newView);
    };

    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Public Routes (Always accessible)
  if (view === 'portal') {
    return <RefereePortal />;
  }

  // Protected Routes (Require Auth)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (view === 'builder') {
    return <TemplateBuilder />;
  }

  return <Dashboard />;
};

const App: React.FC = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || (import.meta.env.DEV ? "mock-client-id" : "");

  if (!clientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-800 p-4">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Configuration Error</h2>
          <p>Google Client ID is missing. Please set VITE_GOOGLE_CLIENT_ID in your environment variables.</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <ProtectedApp />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
