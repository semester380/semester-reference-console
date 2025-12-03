import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import RefereePortal from './pages/RefereePortal';
import TemplateBuilder from './pages/TemplateBuilder';

const App: React.FC = () => {
  const [view, setView] = useState(() => {
    // Check path first (e.g., /referee-portal)
    const path = window.location.pathname;
    if (path.includes('/referee-portal')) return 'portal';
    if (path.includes('/template-builder')) return 'builder';

    // Fall back to query params
    const params = new URLSearchParams(window.location.search);
    return params.get('view') || 'dashboard';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');

      let newView = 'dashboard';
      if (path.includes('/referee-portal')) newView = 'portal';
      else if (path.includes('/template-builder')) newView = 'builder';
      else if (viewParam) newView = viewParam;

      setView(newView);
    };

    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  if (view === 'portal') {
    return <RefereePortal />;
  }

  if (view === 'builder') {
    return <TemplateBuilder />;
  }

  return <Dashboard />;
};

export default App;
