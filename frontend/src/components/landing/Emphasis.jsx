import React, { useRef } from 'react';
import { useInView } from 'framer-motion';

/*
 * Draws attention to a short phrase the first time it scrolls into view.
 *   variant="highlight" — a straight marker sweep behind the words
 *   variant="underline" — a straight 2px underline that slides in
 *   variant="circle"    — a rounded outline around a short phrase
 * Reduced-motion users see the finished mark with no animation.
 */
export default function Emphasis({ children, variant = 'highlight', amber = false, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const on = inView ? 'em-on' : '';
  if (variant === 'underline') return <span ref={ref} className={`em-underline ${on} ${className}`}>{children}</span>;
  if (variant === 'circle') return <span ref={ref} className={`em-circle ${on} ${className}`}>{children}</span>;
  return <span ref={ref} className={`em-highlight ${amber ? 'em-amber' : ''} ${on} ${className}`}>{children}</span>;
}
