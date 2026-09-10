import React from 'react';
import { Infinity } from 'lucide-react';
import { RESOURCE_TRACKS } from '../../data/resources';

const PRODUCT_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Pricing', href: '#pricing' },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-zinc-100">
      <div className="max-w-[1280px] mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2">
            <Infinity className="w-4 h-4 text-blue-600" strokeWidth={2.4} />
            <span className="text-[13.5px] font-semibold text-zinc-900">InfinitySheets</span>
          </div>
          <p className="mt-3 text-[12.5px] text-zinc-500 leading-relaxed max-w-[220px]">
            Endless exam-style practice, tuned to your weak spots. Free forever.
          </p>
        </div>
        <div>
          <div className="text-[11px] tracking-[0.14em] uppercase font-semibold text-zinc-400 mb-3">Product</div>
          <ul className="flex flex-col gap-2">
            {PRODUCT_LINKS.map((l) => (
              <li key={l.href}><a href={l.href} className="text-[13.5px] text-zinc-600 hover:text-zinc-900 transition-colors">{l.label}</a></li>
            ))}
            <li><a href="#signup" className="text-[13.5px] text-zinc-600 hover:text-zinc-900 transition-colors">Start free</a></li>
            <li><a href="#privacy" className="text-[13.5px] text-zinc-600 hover:text-zinc-900 transition-colors">Privacy</a></li>
          </ul>
        </div>
        <div className="col-span-2">
          <div className="text-[11px] tracking-[0.14em] uppercase font-semibold text-zinc-400 mb-3">Free resources by course</div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
            {RESOURCE_TRACKS.map((t) => (
              <li key={t.id}>
                <a href={`#resources?track=${t.id}`} className="text-[13.5px] text-zinc-600 hover:text-zinc-900 transition-colors">{t.short}</a>
              </li>
            ))}
            <li><a href="#resources" className="text-[13.5px] font-medium text-blue-600 hover:text-blue-700 transition-colors">All resources &rarr;</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-zinc-100">
        <p className="max-w-[1280px] mx-auto px-6 pt-5 text-[13px] text-zinc-600 text-center">
          Made with &#10084;&#65039; by Aayan S. Kumar and Angelo Jolwin.
        </p>
        <p className="max-w-[1280px] mx-auto px-6 pt-2 text-[12px] text-zinc-500 text-center">
          &copy; {new Date().getFullYear()} InfinitySheets. All rights reserved.
        </p>
        <p className="max-w-[1280px] mx-auto px-6 py-5 text-[11.5px] leading-relaxed text-zinc-400">
          None of the organizations, examination boards, course providers, or qualifications referenced on this
          website were involved in the creation of, and do not endorse, the resources developed by InfinitySheets.
          All trademarks and course names remain the property of their respective owners and are used solely for
          identification and compatibility purposes.
        </p>
      </div>
    </footer>
  );
}
