import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import RefereePortal from './pages/RefereePortal';
import TemplateBuilder from './pages/TemplateBuilder';

const App: React.FC = () => {
  const [view, setView] = useState(() => {
    // Check path first
    const path = window.location.pathname;
    if (path.includes('/referee-portal') || path.includes('/consent')) return 'portal';
    if (path.includes('/template-builder')) return 'builder';

    // Check query params
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'authorize') return 'portal';

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
      else if (actionParam === 'authorize') newView = 'portal';
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
