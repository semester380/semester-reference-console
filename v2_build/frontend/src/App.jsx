import React, { useState, useEffect } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import PublicConsent from './PublicConsent';
import RefereePortal from './RefereePortal';

function StaffApp() {
  const [user, setUser] = useState(null);

  // Restore session from localStorage if desired, but for security strictness we might opt-out initially.
  // For a seamless "SaaS" feel, we should probably persist.
  useEffect(() => {
    const stored = localStorage.getItem('semester_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('semester_user');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('semester_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('semester_user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

function App() {
  const [route, setRoute] = useState('loading');

  useEffect(() => {
    // Simple Router based on Query Params
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const view = params.get('view');

    if (action === 'authorize') {
      setRoute('consent');
    } else if (view === 'portal') {
      setRoute('referee');
    } else {
      setRoute('staff');
    }
  }, []);

  if (route === 'consent') {
    return <PublicConsent />;
  }

  if (route === 'referee') {
    return <RefereePortal />;
  }

  // Default to Staff App (Login/Dashboard)
  return <StaffApp />;
}

export default App;
