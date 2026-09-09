import React, { useEffect } from 'react';
import Navbar from './Navbar';
import Hero from './Hero';
import ProductStats from './ProductStats';
import WhyDifferent from './WhyDifferent';
import HowItWorks from './HowItWorks';
import TryQuestion from './TryQuestion';
import PredictedGrade from './PredictedGrade';
import FreeResources from './FreeResources';
import FoundingStory from './FoundingStory';
import FAQ from './FAQ';
import Pricing from './Pricing';
import StudentGallery3D from './StudentGallery3D';
import Waitlist from './Waitlist';
import Footer from './Footer';
import MobileStickyCTA from './MobileStickyCTA';
import AuthModal from './AuthModal';

// On a fresh page load, a leftover section anchor (#signup, #pricing...)
// makes the page restore scroll deep into the content. Handle the initial
// hash exactly once per page load (module-level so StrictMode's double
// effect invocation can't smooth-scroll on the stale initial hash).
let handledInitialAnchor = false;

export default function LandingPage({ hash }) {
  useEffect(() => {
    if (!handledInitialAnchor) {
      handledInitialAnchor = true;
      if (hash && hash.length > 1 && document.getElementById(hash.slice(1))) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        window.scrollTo(0, 0);
      }
      return;
    }
    if (hash && hash.startsWith('#') && hash.length > 1) {
      const id = hash.slice(1);
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    }
  }, [hash]);

  const onStart = () => { window.location.hash = '#signup'; };

  const authOpen = hash === '#signup' || hash === '#login';
  const closeAuth = () => {
    if (window.location.hash === '#signup' || window.location.hash === '#login') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      // Nudge listeners that rely on the hashchange event.
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  return (
    <div className="section-bg">
      <Navbar onStart={onStart} />
      <Hero />
      <StudentGallery3D />
      <ProductStats />
      <FoundingStory />
      <PredictedGrade />
      <WhyDifferent />
      <HowItWorks />
      <FreeResources />
      <Pricing />
      <TryQuestion />
      <FAQ />
      {/* Pre-launch build: one consistent ask — the waitlist (keeps the #signup anchor for all Start Free / Log In links) */}
      <Waitlist id="signup" />
      <Footer />
      <MobileStickyCTA />
      <AuthModal open={authOpen} initialTab={hash === '#login' ? 'login' : 'signup'} onClose={closeAuth} />
    </div>
  );
}
