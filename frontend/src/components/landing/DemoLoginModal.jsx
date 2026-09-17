import React, { useEffect, useRef, useState } from 'react';
import { X, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';

// Credentials required to access the interactive demo. Kept purely
// client-side because the demo itself is a local in-browser experience —
// this gate exists to keep the demo hidden from public visitors, not to
// protect any real secrets. Change here if the shared password changes.
const DEMO_USERNAME = 'admin123';
const DEMO_PASSWORD = 'admin123';

/**
 * Modal shown when the visitor clicks "Try Demo" from the landing. If the
 * shared demo credentials match, we call startDemo() and jump into the
 * dashboard. Anything else surfaces an error toast.
 */
export default function DemoLoginModal({ open, onClose }) {
  const { startDemo } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const usernameRef = useRef(null);

  // Reset form + autofocus each time the modal opens; also lock body scroll
  // and support the Escape shortcut for a keyboard-friendly experience.
  useEffect(() => {
    if (!open) return undefined;
    setUsername('');
    setPassword('');
    setShowPw(false);
    setBusy(false);
    setTimeout(() => usernameRef.current?.focus(), 30);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const submit = (e) => {
    e?.preventDefault();
    if (busy) return;
    const u = (username || '').trim();
    const p = password || '';
    if (!u || !p) {
      toast.error('Enter both a username and password.');
      return;
    }
    setBusy(true);
    // Slight delay so the button spinner is visible — feels less abrupt.
    setTimeout(() => {
      if (u === DEMO_USERNAME && p === DEMO_PASSWORD) {
        startDemo();
        toast.success('Welcome to the demo.');
        onClose();
        window.location.hash = '#dashboard';
        window.location.hash = '#dashboard';
      } else {
        setBusy(false);
        toast.error('Incorrect username or password.');
      }
    }, 260);
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-login-title"
      data-testid="demo-login-modal"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-[380px] rounded-2xl bg-white border border-slate-200 shadow-2xl p-6">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 id="demo-login-title" className="text-[20px] font-semibold tracking-tight text-slate-900">
          Sign in to try the demo
        </h2>
        <p className="text-[13.5px] text-slate-500 mt-1.5 leading-relaxed">
          The interactive demo is currently gated. Enter the shared credentials
          your team provided to explore the dashboard.
        </p>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3" data-testid="demo-login-form">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500">Username</span>
            <input
              ref={usernameRef}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="demo-login-username"
              className="input-base"
              placeholder="username"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500">Password</span>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="demo-login-password"
                className="input-base pr-14 w-full"
                placeholder="password"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                tabIndex={-1}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          <button
            type="submit"
            disabled={busy}
            data-testid="demo-login-submit"
            className="btn-violet mt-2 py-3 rounded-lg text-[14px] font-medium disabled:opacity-60"
          >
            {busy ? 'Signing in\u2026' : 'Enter demo'}
          </button>
        </form>
      </div>
        </div>
      </div>
    </div>
  );
}
