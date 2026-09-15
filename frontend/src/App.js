import React, { useEffect, useState } from 'react';
import './App.css';
import { AppProvider, useApp } from './context/AppContext';
import LandingPage from './components/landing/LandingPage';
import ResourcesPage from './components/landing/ResourcesPage';
import PrivacyPage from './components/landing/PrivacyPage';
import AppShell from './components/app/AppShell';
import SharedProgress from './components/app/SharedProgress';
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

  // Teacher / parent view of a student's progress — public by token.
  if (hash.startsWith('#shared')) {
    const token = (hash.split('?')[1] || '').split('&').map((p) => p.split('=')).find(([k]) => k === 'token')?.[1] || '';
    return <SharedProgress token={token} />;
  }

  // Privacy policy — always available, no auth needed.
  if (hash.startsWith('#privacy')) {
    return <PrivacyPage />;
  }

  // The landing page is always the front door: with no route in the URL
  // (or a landing anchor), show it even when a session exists — the navbar
  // then offers "Open app". App routes (#dashboard, #courses, …) open the app.
  const landingAnchor = hash === '' || hash === '#' || LANDING_ANCHORS.has(hash.replace(/\?.*$/, ''));
  if (state.user && !landingAnchor) {
    return <AppShell hash={hash} />;
  }
  return <LandingPage hash={hash} />;
}

const LANDING_ANCHORS = new Set(['#top', '#features', '#story', '#how', '#pricing', '#try', '#faq', '#vision', '#signup', '#login']);

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
