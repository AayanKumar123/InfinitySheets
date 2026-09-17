import React from 'react';
import { Moon, Sun, PanelLeftOpen, Search } from 'lucide-react';
import CreateWorksheetButton from '../CreateWorksheetButton';
import SyncBadge from './SyncBadge';

/**
 * Page header shown at the top of every dashboard page.
 * Displays the eyebrow exam track, the page title, and the primary
 * page-scoped action (currently only rendered on the dashboard route).
 * When the sidebar is collapsed, a chevron re-opener appears on the left.
 */
export default function TopHeader({ title, activeKey, isDark, courseCount, onToggleTheme, onNewWorksheet, sidebarOpen, onOpenSidebar, onOpenPalette, syncStatus }) {
  return (
    <header className="px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-2 flex items-start justify-between gap-3 border-b border-[color:var(--color-border)] bg-white" data-testid="top-header">
      <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
        {onOpenSidebar && (!sidebarOpen) && (
          <button
            onClick={onOpenSidebar}
            data-testid="header-open-sidebar"
            aria-label="Open sidebar"
            className="mt-1 w-10 h-10 shrink-0 rounded-lg border border-[color:var(--color-border)] bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-slate-900 truncate" data-testid="page-title">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onOpenPalette && (
          <button type="button" onClick={onOpenPalette} data-testid="header-search" title="Search (Ctrl+K)" className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-[color:var(--color-border)] text-[12px] text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors">
            <Search className="w-3.5 h-3.5" /> Search <kbd className="text-[10px] px-1 rounded bg-slate-100 border border-slate-200">⌘K</kbd>
          </button>
        )}
        <SyncBadge status={syncStatus} />
        <button
          onClick={onToggleTheme}
          className="w-10 h-10 rounded-lg border border-[color:var(--color-border)] bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"
          aria-label="Toggle theme"
          data-testid="header-theme-toggle"
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-blue-600" />}
        </button>
        {activeKey === 'dashboard' && (
          <CreateWorksheetButton
            onClick={onNewWorksheet}
            data-testid="header-new-worksheet"
            compact
          />
        )}
        {activeKey === 'courses' && (
          <div className="hidden sm:block text-[13px] text-slate-500" data-testid="header-course-count">
            {courseCount} course{courseCount === 1 ? '' : 's'}
          </div>
        )}
      </div>
    </header>
  );
}
