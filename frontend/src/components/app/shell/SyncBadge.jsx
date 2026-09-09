import React from 'react';
import { Cloud, CloudOff, Check, Loader2, MonitorSmartphone } from 'lucide-react';

/**
 * Small header indicator reassuring students their progress is safe.
 * - demo mode: local-only badge (nothing leaves the device)
 * - signed in: live cloud-sync status (saving / saved / error)
 */
export default function SyncBadge({ status, isDemo }) {
  let cfg;
  if (isDemo) {
    cfg = { icon: MonitorSmartphone, text: 'Demo · this device', cls: 'text-slate-500 bg-slate-100 border-slate-200', spin: false };
  } else if (status === 'saving') {
    cfg = { icon: Loader2, text: 'Saving…', cls: 'text-blue-600 bg-blue-50 border-blue-200', spin: true };
  } else if (status === 'error') {
    cfg = { icon: CloudOff, text: 'Sync issue', cls: 'text-amber-600 bg-amber-50 border-amber-200', spin: false };
  } else if (status === 'saved') {
    cfg = { icon: Check, text: 'Saved to your account', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200', spin: false };
  } else {
    cfg = { icon: Cloud, text: 'Synced', cls: 'text-slate-500 bg-slate-50 border-slate-200', spin: false };
  }
  const Icon = cfg.icon;
  return (
    <div
      data-testid="sync-badge"
      title={isDemo ? 'Demo progress stays on this device' : 'Your progress is saved to your account and synced across devices'}
      className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[12px] font-medium select-none transition-colors ${cfg.cls}`}
    >
      <Icon className={`w-3.5 h-3.5 ${cfg.spin ? 'animate-spin' : ''}`} />
      <span>{cfg.text}</span>
    </div>
  );
}
