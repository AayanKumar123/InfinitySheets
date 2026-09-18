import React, { useEffect, useState } from 'react';
import { HeartHandshake, X } from 'lucide-react';

// A gentle ad-blocker nudge. It never actually blocks the app — if an ad
// blocker is detected we ask the student to consider turning it off because
// ads keep InfinitySheets free, and give them a small "continue anyway" out.
// Once they dismiss it we remember that and don't ask again.
const ACK_KEY = 'infinitysheets_adblock_ack';

// Bait-element detection: ad blockers hide elements whose class names look like
// ad slots. We drop one off-screen, then check whether it was hidden/removed.
function detectAdblock() {
  return new Promise((resolve) => {
    try {
      const bait = document.createElement('div');
      bait.className = 'adsbox ad-banner ads pub_300x250 pub_300x250m text-ad textAd text_ad text_ads text-ads';
      bait.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;';
      bait.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bait);
      // Give an extension a tick to act on it.
      setTimeout(() => {
        const blocked = bait.offsetParent === null || bait.offsetHeight === 0 || bait.clientHeight === 0
          || window.getComputedStyle(bait).display === 'none';
        try { bait.remove(); } catch (_) { /* noop */ }
        resolve(blocked);
      }, 150);
    } catch (_) {
      resolve(false);
    }
  });
}

export default function AdblockNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let acked = false;
    try { acked = localStorage.getItem(ACK_KEY) === '1'; } catch (_) { /* ignore */ }
    if (acked) return;
    let alive = true;
    detectAdblock().then((blocked) => { if (alive && blocked) setShow(true); });
    return () => { alive = false; };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(ACK_KEY, '1'); } catch (_) { /* ignore */ }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" data-testid="adblock-notice">
      <div className="w-full max-w-[420px] rounded-2xl bg-[color:var(--color-card)] border border-[color:var(--color-border)] shadow-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center mx-auto mb-4">
          <HeartHandshake className="w-6 h-6" />
        </div>
        <h2 className="text-[17px] font-semibold text-slate-900">Ad blocker detected</h2>
        <p className="text-[13.5px] text-slate-500 mt-2 leading-snug">
          InfinitySheets is free for students, and ads are how we keep it that way.
          It would really help if you turned your ad blocker off for this site — we only
          ever run light, student-appropriate ads.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-violet w-full py-2.5 rounded-lg text-[14px] font-semibold"
            data-testid="adblock-reload"
          >
            I&apos;ve turned it off — reload
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="text-[12px] text-slate-500 hover:text-slate-700 inline-flex items-center justify-center gap-1"
            data-testid="adblock-continue"
          >
            <X className="w-3.5 h-3.5" /> Continue without disabling
          </button>
        </div>
      </div>
    </div>
  );
}
