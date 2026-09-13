import React, { useEffect, useState } from 'react';
import './App.css';
import { AppProvider, useApp } from './context/AppContext';
import LandingPage from './components/landing/LandingPage';
import ResourcesPage from './components/landing/ResourcesPage';
import PrivacyPage from './components/landing/PrivacyPage';
import AppShell from './components/app/AppShell';
import { Toaster } from './components/ui/sonner';

function Router() {
  const { state, loaded } = useApp();
  const [hash, setHash] = useState(window.location.hash || '');

  useEffect(() => {
    const onHash = () => {
      // A worksheet in exam mode owns the screen: ignore route changes until
      // it is submitted (Worksheets.jsx sets/clears the lock).
      const lock = window.__examLock;
      if (lock && window.location.hash !== lock.hash) {
        lock.onBlocked?.();
        window.location.hash = lock.hash;
        return;
      }
      setHash(window.location.hash || '');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (!loaded) return null;

  // Free resource directory:
  //   - anonymous users: standalone landing page (its own chrome)
  //   - logged-in users: rendered inside the AppShell so the sidebar
  //     remains visible (see AppShell's 'resources' route)
  if (!state.user && hash.startsWith('#resources')) {
    return <ResourcesPage />;
  }

  // Privacy policy — always available, no auth needed.
  if (hash.startsWith('#privacy')) {
    return <PrivacyPage />;
  }

  // If user is logged in, show the dashboard app
  if (state.user) {
    return <AppShell hash={hash} />;
  }
  return <LandingPage hash={hash} />;
}

function App() {
  return (
    <div className="App">
      <AppProvider>
        <Router />
        <Toaster position="top-right" />
      </AppProvider>
    </div>
  );
}

export default App;
