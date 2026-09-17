import React from 'react';
import { Infinity, LogOut, PanelLeftClose } from 'lucide-react';

/**
 * Left navigation rail. Renders brand mark, nav items, and the bottom
 * demo / logout controls. All handlers are provided by the parent shell.
 * (Theme toggle lives in the top header — one entry point is enough.)
 *
 * `onClose` (optional) toggles the sidebar collapsed state in the shell —
 * a chevron button appears in the header when provided.
 */
export default function Sidebar({ nav, activeKey, onNavigate, onLogout, onClose }) {
  return (
    <aside className="border border-[color:var(--color-border)] flex flex-col bg-white relative overflow-hidden rounded-2xl shadow-sm h-full">
      <div className="relative px-5 pt-5 pb-6 flex items-center gap-2 shrink-0">
        <span className="w-9 h-9 rounded-xl bg-[color:var(--color-primary)] flex items-center justify-center" data-testid="brand-mark">
          <Infinity className="w-6 h-6 text-white" strokeWidth={2.6} />
        </span>
        <div className="leading-tight min-w-0 flex-1">
          <div className="font-semibold text-[14.5px] tracking-tight">InfinitySheets</div>
          <div className="text-[10px] text-slate-500">Adaptive study</div>
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
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-slate-500'}`} strokeWidth={2} />
              <span className="flex-1">{n.label}</span>
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
