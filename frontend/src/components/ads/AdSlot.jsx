import React, { useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';

/**
 * Reserved advertising space. Renders a labelled placeholder until an ad
 * network is wired in; each placement has a stable `slot` id so the network's
 * unit id can be mapped to it in one place (AD_UNITS below).
 *
 *   slot      — placement id, e.g. 'dashboard-bottom'
 *   size      — 'banner' (728×90-ish, full width) | 'rect' (300×250) | 'compact'
 *   className — extra layout classes
 */

// Placement → ad-network unit id. Fill these in when the network is set up;
// a slot with no unit keeps showing the placeholder.
export const AD_UNITS = {
  'landing-lower': null,
  'dashboard-bottom': null,
  'worksheet-builder': null,
  'worksheet-result': null,
  'worksheet-download': null,
  'progress-bottom': null,
  'history-between-groups': null,
};

export const AD_MESSAGE = 'By viewing this ad, you’re helping us make better learning resources accessible to more students.';

const SIZE = {
  banner: 'min-h-[90px] sm:min-h-[100px]',
  rect: 'min-h-[250px] max-w-[336px]',
  compact: 'min-h-[60px]',
};

export default function AdSlot({ slot, size = 'banner', className = '', label = 'Advertisement' }) {
  const ref = useRef(null);
  const unit = AD_UNITS[slot];

  // Hook for the ad network: when a unit id exists, request the ad into
  // this element. (e.g. AdSense: push to window.adsbygoogle.) Until then the
  // placeholder below is what renders.
  useEffect(() => {
    if (!unit || !ref.current) return;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) { /* network not loaded */ }
  }, [unit]);

  return (
    <aside className={`w-full ${className}`} data-testid={`ad-${slot}`} data-ad-slot={slot} aria-label={label}>
      <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-400 mb-1 flex items-center justify-between">
        <span>{label}</span>
      </div>
      <div ref={ref} className={`w-full ${SIZE[size] || SIZE.banner} rounded-xl border border-dashed border-[color:var(--color-border)] bg-slate-50/60 flex items-center justify-center overflow-hidden`}>
        {unit ? (
          <ins className="adsbygoogle block w-full h-full" data-ad-slot={unit} data-ad-format="auto" data-full-width-responsive="true" />
        ) : (
          <span className="text-[12px] text-slate-400 select-none">Ad space</span>
        )}
      </div>
      <p className="mt-1.5 text-[11.5px] text-slate-500 flex items-start gap-1.5">
        <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
        <span>{AD_MESSAGE}</span>
      </p>
    </aside>
  );
}
