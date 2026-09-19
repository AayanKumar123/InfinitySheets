import React from 'react';
import { Infinity, LogOut, PanelLeftClose, Lock } from 'lucide-react';

/**
 * Left navigation rail. Renders brand mark, nav items, and the bottom
 * demo / logout controls. All handlers are provided by the parent shell.
 * (Theme toggle lives in the top header — one entry point is enough.)
 *
 * `onClose` (optional) toggles the sidebar collapsed state in the shell —
 * a chevron button appears in the header when provided.
 */
export default function Sidebar({ nav, activeKey, onNavigate, onLogout, onClose, plus = false }) {
  return (
    <aside className="border border-[color:var(--color-border)] flex flex-col bg-white relative overflow-hidden rounded-2xl shadow-sm h-full">
      <div className="relative px-5 pt-5 pb-6 flex items-center gap-2 shrink-0">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${plus ? 'bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-[0_0_0_2px_rgba(139,92,246,0.25)]' : 'bg-[color:var(--color-primary)]'}`} data-testid="brand-mark">
          <Infinity className="w-6 h-6 text-white" strokeWidth={2.6} />
        </span>
        <div className="leading-tight min-w-0 flex-1">
          <div className="font-semibold text-[14.5px] tracking-tight inline-flex items-baseline gap-0.5">
            InfinitySheets
            {plus && <span className="text-[13px] font-extrabold bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent" data-testid="brand-plus">+</span>}
          </div>
          <div className={`text-[10px] ${plus ? 'text-violet-600 font-semibold' : 'text-slate-500'}`}>{plus ? 'InfinitySheets+ member' : 'Adaptive study'}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            data-testid="sidebar-close"
            aria-label="Collapse sidebar"
            className="shrink-0 w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        )}
      </div>
      <nav className="relative flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto" data-testid="sidebar-nav">
        {nav.map((n) => {
          const isActive = activeKey === n.key;
          const Icon = n.Icon;
          return (
            <button
              key={n.key}
              data-nav-key={n.key}
              data-testid={`nav-${n.key}`}
              onClick={() => onNavigate(n.key)}
              className={`sidebar-item text-left text-[13.5px] px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-slate-500'} ${n.locked ? 'opacity-60' : ''}`} strokeWidth={2} />
              <span className={`flex-1 ${n.locked ? 'text-slate-400' : ''}`}>{n.label}</span>
              {n.locked && <Lock className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
            </button>
          );
        })}
      </nav>
      <div className="relative px-3 pb-4 pt-4 border-t border-[color:var(--color-border)] flex flex-col gap-1">
        <button
          onClick={onLogout}
          data-testid="sidebar-logout"
          className="sidebar-item w-full text-left text-[13.5px] px-3 py-2 rounded-lg flex items-center gap-2.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
