import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Import Components
import Navbar from '../../../Component/Navbar/navbar.jsx';
import Footer from '../../../Component/Footer/footer.jsx';
import Back_To_Top_Button from '../../../Component/Back_To_Top_Button/Back_To_Top_Button';
import { AuthProvider } from '../../../Component/AuthContext/AuthContext';

// Import CSS
import './about_sarawak.css';

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────
   FIREBASE IMAGE URLs
───────────────────────────────────────────── */
const FIREBASE = {
  Bako:      'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2FBako.jpg?alt=media&token=82314035-f4db-4c2a-b2d2-d77383c53bfa',
  Bird:      'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2FBird.jpg?alt=media&token=4cfc85b9-f78b-4f1a-b0a2-3fe0dba0bca0',
  Sarawak:   'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2Fsarawak.webp?alt=media&token=fefdd93d-0407-44ce-92d9-99dfaf5fd968',
  River:     'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2FWaterFront.jpeg?alt=media&token=0b18d4a9-94cc-4c61-83af-b2e8e0df434f',
  Brooke:    'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2FSC.jpg?alt=media&token=86365a4c-24a6-4f54-8fd7-34c3e2f7951a',
  Festival:  'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2Fpeople.jpg?alt=media&token=06ad8265-2ffd-4a67-957c-13045b2a7724',
  Canopy:    'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2FDamai.jpg?alt=media&token=c9d41171-ba0b-4f7e-8ae5-0181953ae220',
  Wildlife:  'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2FSemenggoh.jpg?alt=media&token=b02614ab-051b-4757-9d67-7470b084d74f',
  Caves:     'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2FMulu.jpg?alt=media&token=7557d777-e3fc-4560-9358-0c4323fa33e6',
  Crafts:    'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2Fexp3.jpg?alt=media&token=0c527af1-966d-4a3b-8b1f-eeb71e2d83cc',
  Food:      'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2Fexp4.jpg?alt=media&token=f0c27db9-385f-4ffa-b98d-5279ba50a36a',
  Gawai:     'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2Fexp5.jpg?alt=media&token=579a4c51-5e95-48d0-ac2f-1b7e9115f010',
  Longhouse: 'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2Fexp6.jpg?alt=media&token=088fe20b-aa73-4cea-ab1c-ec3c390fdc28',
  Kuching:   'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2FCat%20City.webp?alt=media&token=b090ddd7-1068-4e21-9f3e-2a9f881f5f4a',
  Mulu:      'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2FMulu.jpg?alt=media&token=7557d777-e3fc-4560-9358-0c4323fa33e6',
  Cta:       'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2Fsunset.webp?alt=media&token=fc358ced-4b95-4c1a-8f83-c3ef7b4b5eb4',
};

/* ─────────────────────────────────────────────
   SAFE IMAGE COMPONENT
───────────────────────────────────────────── */
const Img = ({ src, alt, className = '', style = {}, priority = false }) => (
  <img
    src={src}
    alt={alt}
    loading={priority ? 'eager' : 'lazy'}
    fetchPriority={priority ? 'high' : 'auto'}
    decoding="async"
    draggable="false"
    className={`w-full h-full object-cover ${className}`}
    style={{
      contentVisibility: 'auto',
      willChange: 'transform',
      backfaceVisibility: 'hidden',
      transform: 'translateZ(0)',
      ...style
    }}
    onError={(e) => {
      e.target.style.background =
        'linear-gradient(135deg, #3a2a1e 0%, #5a3e2b 100%)';
      e.target.style.display = 'block';
    }}
  />
);

/* ─────────────────────────────────────────────
   MAGNETIC LINK
───────────────────────────────────────────── */
const MagneticLink = ({ children, href, className }) => {
  const buttonRef = useRef(null);

  const handleMouseMove = (e) => {
    if (window.innerWidth < 768 || !buttonRef.current) return;
    const { clientX, clientY } = e;
    const { width, left, top, height } = buttonRef.current.getBoundingClientRect();
    const x = (clientX - (left + width / 2)) * 0.3;
    const y = (clientY - (top + height / 2)) * 0.3;
    gsap.to(buttonRef.current, { x, y, duration: 0.5, ease: 'power3.out' });
  };

  const handleMouseLeave = () => {
    if (!buttonRef.current) return;
    gsap.to(buttonRef.current, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.3)' });
  };

  return (
    <div className="inline-block p-4" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <a ref={buttonRef} href={href} className={className} style={{ display: 'inline-block' }}>
        {children}
      </a>
    </div>
  );
};

/* ─────────────────────────────────────────────
   DATA ARRAYS
───────────────────────────────────────────── */
const CULTURE_TABS = [
  {
    id: 'craftsmanship',
    label: 'Craftsmanship',
    number: '01',
    eyebrow: 'Pua Kumbu & Ink',
    heading: 'Artistry\nin Motion',
    body: 'The intricate weaving patterns of Pua Kumbu cloth carry ancestral stories passed down through generations of Iban women. Alongside them, the tattooing traditions of Iban warriors and the painstaking beadwork of the Kenyah and Kayan peoples form a living visual language — bold, purposeful, beautiful.',
    image: FIREBASE.Crafts,
  },
  {
    id: 'gastronomy',
    label: 'Gastronomy',
    number: '02',
    eyebrow: 'A Journey of Flavor',
    heading: 'The Table\nof Borneo',
    body: "From the world-famous Sarawak Laksa — a morning ritual of coconut-laced broth and sambal heat — to the wild jungle produce at Satok Weekend Market, the state's cultural diversity maps perfectly onto its flavour landscape. Kolo Mee, Midin fern stir-fry, and fresh jungle honey are just the beginning.",
    image: FIREBASE.Food,
  },
  {
    id: 'gawai',
    label: 'Gawai Festival',
    number: '03',
    eyebrow: 'The Harvest Celebration',
    heading: 'When the\nRice Sings',
    body: 'Every June, the Iban and Bidayuh communities mark the rice harvest with Gawai Dayak — three days of tuak rice wine, traditional dress adorned with feathers and silver, the resonant beat of the gong, and communal ngajat dancing that echoes from longhouse to longhouse across the state.',
    image: FIREBASE.Gawai,
  },
  {
    id: 'longhouse',
    label: 'The Longhouse',
    number: '04',
    eyebrow: 'Communal Architecture',
    heading: 'Under One\nRoof',
    body: 'The Sarawakian longhouse is not merely a building — it is an entire village elevated on stilts above the forest floor. The ruai (communal gallery) runs its full length, a shared space for ceremonies, gossip, and daily life. Some longhouses stretch the length of a football pitch and house over thirty families.',
    image: FIREBASE.Longhouse,
  },
];

const DESTINATIONS = [
  {
    id: 'kuching',
    number: '01',
    name: 'Kuching\nWaterfront',
    hook: 'Colonial heritage meets river light',
    detail:
      "Sarawak's capital balances a 19th-century colonial quarter with lively Chinese shophouses and a gleaming modern waterfront. Catch the sunset from the Astana — or a bowl of Laksa at a kedai kopi nearby.",
    tag: 'City & Heritage',
    image: FIREBASE.Kuching,
  },
  {
    id: 'mulu',
    number: '02',
    name: 'Gunung\nMulu',
    hook: 'Caves with their own weather systems',
    detail:
      'A UNESCO World Heritage site of staggering scale. The Deer Cave is large enough to hold several 747s. Every evening, millions of wrinkle-lipped bats spiral out in a living column that darkens the sky.',
    tag: 'UNESCO · Geology',
    image: FIREBASE.Mulu,
  },
  {
    id: 'bako',
    number: '03',
    name: 'Bako\nNational Park',
    hook: 'Closest wilderness to the city',
    detail:
      'Just 37 km from Kuching, Bako packs seven distinct vegetation zones into a single peninsula. At dusk, proboscis monkeys descend to the mangroves in full throat. The beach is entirely yours at dawn.',
    tag: 'Wildlife · Trekking',
    image: FIREBASE.Bako,
  },
];

const preloadImage = (src) => {
  if (!src) return;

  const img = new Image();
  img.src = src;
};

const preloadImages = (urls = []) => {
  urls.filter(Boolean).forEach((url) => preloadImage(url));
};

/* ─────────────────────────────────────────────
   DESTINATION CARD COMPONENT
───────────────────────────────────────────── */
const DestCard = ({ dest, index }) => {
  const cardRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      ref={cardRef}
      className="dest-card reveal-up relative flex-1 min-w-[280px] max-w-[400px] rounded-[2rem] overflow-hidden cursor-pointer"
      style={{ animationDelay: `${index * 0.15}s` }}
      onMouseEnter={() => {
        setHovered(true);
        gsap.to(cardRef.current, { y: -12, scale: 1.03, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
      }}
      onMouseLeave={() => {
        setHovered(false);
        gsap.to(cardRef.current, { y: 0, scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
      }}
    >
      <div className="relative h-[420px] overflow-hidden">
        <Img
          src={dest.image}
          alt={dest.name}
          className="absolute inset-0 w-full h-[115%] -top-[7.5%] transition-transform duration-700"
          style={{ transform: hovered ? 'scale(1.06)' : 'scale(1)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a07] via-[#0d0a07]/20 to-transparent" />
        <span className="absolute top-6 right-6 font-serif text-white/20 text-5xl font-bold leading-none select-none">
          {dest.number}
        </span>
        <span className="absolute top-6 left-6 text-[10px] font-bold uppercase tracking-[0.35em] text-[var(--accent-gold)] bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
          {dest.tag}
        </span>
      </div>
      <div className="bg-[#13100c] px-8 py-7">
        <h3 className="font-serif text-3xl text-white font-bold mb-2 leading-tight whitespace-pre-line">
          {dest.name}
        </h3>
        <p className="text-[var(--accent-gold)] text-xs font-bold uppercase tracking-[0.3em] mb-4">{dest.hook}</p>
        <p className="text-white/60 text-sm font-light leading-relaxed">{dest.detail}</p>
      </div>
      <div
        className="h-[3px] bg-[var(--accent-gold)] transition-transform duration-500 origin-left"
        style={{ transform: hovered ? 'scaleX(1)' : 'scaleX(0)' }}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const about_sarawak = () => {
  const mainRef       = useRef(null);
  const chapterRef    = useRef(null);
  const floatingRef   = useRef(null);           // ← ref for the floating index wrapper
  const [ctaMouseOffset, setCtaMouseOffset] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab]           = useState(0);
  const cultureImgRef  = useRef(null);
  const cultureTextRef = useRef(null);

  const images = {
    hero:     FIREBASE.Sarawak,
    history1: FIREBASE.River,
    history2: FIREBASE.Brooke,
    history3: FIREBASE.Festival,
    canopies: FIREBASE.Canopy,
    wildlife: FIREBASE.Wildlife,
    caves:    FIREBASE.Caves,
    cta:      FIREBASE.Cta,
  };

useEffect(() => {
  // Load important images early so sections do not lag when scrolling/clicking tabs
  preloadImages([
    FIREBASE.Sarawak,
    FIREBASE.River,
    FIREBASE.Brooke,
    FIREBASE.Festival,

    // Culture tab images
    FIREBASE.Crafts,
    FIREBASE.Food,
    FIREBASE.Gawai,
    FIREBASE.Longhouse,

    // Nature and destination images
    FIREBASE.Canopy,
    FIREBASE.Wildlife,
    FIREBASE.Caves,
    FIREBASE.Kuching,
    FIREBASE.Mulu,
    FIREBASE.Bako,
    FIREBASE.Cta,
  ]);
}, []);


  /* ── Tab switcher ── */
const switchTab = (index) => {
  if (index === activeTab) return;

  const img = cultureImgRef.current;
  const text = cultureTextRef.current;
  const nextImage = CULTURE_TABS[index]?.image;

  // Preload selected image first to avoid blank/lag when switching tab
 const loader = new Image();
loader.src = nextImage;

const runSwitchAnimation = () => {
    if (!img || !text) {
      setActiveTab(index);
      return;
    }

    gsap.to(img, {
      clipPath: 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)',
      duration: 0.28,
      ease: 'power2.in',
      onComplete: () => {
        setActiveTab(index);

        requestAnimationFrame(() => {
          gsap.fromTo(
            img,
            { clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)' },
            {
              clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
              duration: 0.38,
              ease: 'power2.out'
            }
          );
        });
      },
    });

    gsap.to(text, {
      opacity: 0,
      y: 14,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => {
        gsap.to(text, {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: 'power2.out'
        });
      },
    });
};

loader.onload = runSwitchAnimation;
loader.onerror = () => setActiveTab(index);

if (loader.complete) {
  runSwitchAnimation();
}
};
  const handleCtaMouseMove = (e) => {
    if (window.innerWidth < 768) return;
    const x = (e.clientX / window.innerWidth  - 0.5) * 30;
    const y = (e.clientY / window.innerHeight - 0.5) * 30;
    setCtaMouseOffset({ x, y });
  };

  /* ── GSAP Animations ── */
  useLayoutEffect(() => {
    if (window.innerWidth < 768) return;

    let ctx = gsap.context(() => {

      // Global scroll progress bar
      gsap.to('.scroll-progress-bar', {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { target: window, start: 'top top', end: 'bottom bottom', scrub: true },
      });

      // ── Floating chapter wayfinding ──
      // Show / update text as each section enters
      document.querySelectorAll('section[data-chapter]').forEach((sec) => {
        ScrollTrigger.create({
          trigger: sec,
          start: 'top 50%',
          end: 'bottom 50%',
          onEnter:     () => { if (chapterRef.current) chapterRef.current.innerText = sec.dataset.chapter; },
          onEnterBack: () => { if (chapterRef.current) chapterRef.current.innerText = sec.dataset.chapter; },
        });
      });

      // ── Hide floating index when the footer comes into view ──
      ScrollTrigger.create({
        trigger: 'footer',
        start: 'top 90%',          // footer's top edge reaches 90% of viewport height
        onEnter:     () => { if (floatingRef.current) gsap.to(floatingRef.current, { opacity: 0, duration: 0.3 }); },
        onLeaveBack: () => { if (floatingRef.current) gsap.to(floatingRef.current, { opacity: 1, duration: 0.3 }); },
      });

      // ── 1. HERO RECEDING CARD EFFECT ──
      gsap.to('.hero-inner-wrapper', {
        scale: 0.85,
        opacity: 0.3,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
          pin: true,
          pinSpacing: false,
        },
      });

      // ── 2. HISTORY HORIZONTAL SCROLL ──
      const historyTrack  = document.querySelector('.history-track');
      const historyPanels = gsap.utils.toArray('.history-panel');

      if (historyTrack && historyPanels.length) {
        const horizontalScroll = gsap.to(historyTrack, {
          xPercent: -((historyPanels.length - 1) / historyPanels.length) * 100,
          ease: 'none',
          scrollTrigger: {
            trigger: '.history-pin-container',
            start: 'top top',
            end: () => `+=${window.innerWidth * (historyPanels.length - 1)}`,
            scrub: 1,
            pin: true,
            anticipatePin: 1,
          },
        });

        historyPanels.forEach((panel, i) => {
          if (i === 0) return;

          const imgWrapper = panel.querySelector('.panel-img-wrapper');
          if (imgWrapper) {
            gsap.fromTo(
              imgWrapper,
              { clipPath: 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)' },
              {
                clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
                ease: 'none',
                scrollTrigger: {
                  trigger: panel,
                  containerAnimation: horizontalScroll,
                  start: 'left center',
                  end: 'left left',
                  scrub: true,
                },
              }
            );
          }

          const counter = panel.querySelector('.panel-counter');
          if (counter) {
            gsap.fromTo(
              counter,
              { innerText: 0 },
              {
                innerText: parseInt(counter.dataset.value),
                duration: 1.2,
                ease: 'power3.out',
                snap: { innerText: 1 },
                scrollTrigger: {
                  trigger: panel,
                  containerAnimation: horizontalScroll,
                  start: 'left center',
                  toggleActions: 'play none none reverse',
                },
              }
            );
          }
        });
      }

      // ── 3. PARALLAX & REVEALS ──
      gsap.utils.toArray('.culture-img-drift').forEach((el, i) => {
        gsap.to(el, {
          yPercent: i % 2 === 0 ? -5 : 5,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });

      let mm = gsap.matchMedia();
      mm.add('(min-width: 768px)', () => {
        gsap.to('.masonry-col-right', {
          yPercent: 15,
          ease: 'none',
          scrollTrigger: { trigger: '.nature-masonry-section', start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });

      gsap.utils.toArray('.reveal-up').forEach((elem) => {
        gsap.fromTo(elem, { opacity: 0, y: 50 }, {
          opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
          scrollTrigger: { trigger: elem, start: 'top 85%' },
        });
      });

    }, mainRef);

    return () => ctx.revert();
  }, []);

  /* ── Mouse cursor tracking ── */
  const [mousePos, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (window.innerWidth < 768) return;
    let raf;
    const onMove = (e) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setMousePosition({ x: e.clientX, y: e.clientY }));
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const tab = CULTURE_TABS[activeTab];

  return (
    <AuthProvider>
      <div ref={mainRef} className="sarawak-page-wrapper relative bg-[#0a0806]">
        <div className="editorial-noise" />
        <div className="scroll-progress-bar" />

        {/* Custom cursor (desktop only) */}
        <div
          className="custom-cursor hidden md:block"
          style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
        />

        {/* Floating chapter index — ref added so GSAP can hide it near footer */}
        <div ref={floatingRef} className="floating-index hidden md:block">
          <span ref={chapterRef} className="font-serif text-xs tracking-[0.4em] font-bold uppercase">
            01 / DISCOVER
          </span>
        </div>

        <Navbar />

        {/* ══════════════════════════════════════════
            01. HERO
        ══════════════════════════════════════════ */}
        <section
          data-chapter="01 / DISCOVER"
          className="hero-section w-full h-screen relative flex flex-col justify-center bg-black z-0"
        >
          <div className="hero-inner-wrapper absolute inset-0 w-full h-full rounded-[3rem] overflow-hidden">
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 w-full h-[120%]">
                <Img src={images.hero} alt="Sarawak" className="w-full h-full" priority />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-[#1a140f]/80 via-[#1a140f]/40 to-[#1a140f]/90" />
              <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] pointer-events-none" />
            </div>

            {/* Watermark text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center z-10 pointer-events-none">
              <h1 className="font-serif text-[12vw] text-white opacity-[0.04] font-bold whitespace-nowrap tracking-tighter">
                SARAWAK
              </h1>
            </div>

            <div className="relative z-20 text-center px-6 mt-16 flex flex-col items-center justify-center h-full">
              {/* Pill badge */}
              <div className="inline-block mb-6 px-6 py-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <p className="text-[var(--accent-gold)] text-xs md:text-sm font-bold uppercase tracking-[0.5em] drop-shadow-md">
                  The Soul of Borneo
                </p>
              </div>
              <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-white font-bold leading-tight tracking-tight drop-shadow-2xl">
                Discover Sarawak
              </h1>
            </div>

            {/* Bottom stats bar */}
            <div className="absolute bottom-24 left-0 w-full z-20 hidden md:block">
              <div className="max-w-5xl mx-auto grid grid-cols-3 gap-8 px-16 border-t border-white/20 pt-8">
                <div>
                  <p className="text-[var(--accent-gold)] text-[10px] uppercase tracking-widest mb-1 font-bold">Established</p>
                  <p className="text-white font-serif text-2xl font-bold drop-shadow-md">1841</p>
                </div>
                <div>
                  <p className="text-[var(--accent-gold)] text-[10px] uppercase tracking-widest mb-1 font-bold">Ecosystem</p>
                  <p className="text-white font-serif text-2xl font-bold drop-shadow-md">130M Yrs Old</p>
                </div>
                <div>
                  <p className="text-[var(--accent-gold)] text-[10px] uppercase tracking-widest mb-1 font-bold">Diversity</p>
                  <p className="text-white font-serif text-2xl font-bold drop-shadow-md">27+ Ethnic Groups</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            02. HISTORY — HORIZONTAL SCROLL
        ══════════════════════════════════════════ */}
        <section
          data-chapter="02 / HISTORY"
          className="history-pin-container w-full relative z-20 bg-[var(--bg-cream)] rounded-t-[4rem] shadow-[0_-40px_80px_rgba(0,0,0,0.5)]"
        >
          <div className="h-screen overflow-hidden rounded-t-[4rem]">
            <div className="history-track flex h-full" style={{ width: '300vw' }}>

              {/* PANEL 1 — Origins */}
              <div className="history-panel relative flex-shrink-0 w-screen h-full overflow-hidden bg-[var(--bg-cream)]">
                <div className="culture-pattern" />
                <div className="panel-img-wrapper absolute left-0 top-0 w-1/2 h-full overflow-hidden">
                  <Img src={images.history1} alt="Origins" className="absolute inset-0 w-[115%] h-full transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[var(--bg-cream)]" />
                </div>
                <div className="absolute right-0 top-0 w-full md:w-1/2 h-full flex flex-col justify-center px-10 md:px-20">
                  <div className="history-text-reveal max-w-md">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="panel-counter font-serif text-8xl font-bold text-[var(--accent-gold)] opacity-30 leading-none" data-value="1">1</span>
                      <div>
                        <span className="text-[var(--terracotta)] text-xs font-bold uppercase tracking-[0.4em] block mb-1">Origins</span>
                        <div className="w-10 h-px bg-[var(--terracotta)]" />
                      </div>
                    </div>
                    <h2 className="font-serif text-5xl md:text-6xl font-bold mb-6 text-[#2C2016] leading-tight">
                      Born from<br />the River
                    </h2>
                    <p className="text-lg font-light leading-relaxed text-[#2C2016]/75">
                      Long before modern borders were drawn, Sarawak was a realm of powerful riverine communities.
                      The winding rivers were the ancient highways, shaping traditions and daily lives for millennia.
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 md:bottom-12 flex items-center gap-3 z-50 opacity-70 drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]">
                  <span className="text-[#2C2016] text-[10px] font-bold uppercase tracking-[0.3em]">Scroll to Explore</span>
                  <svg className="scroll-hint-arrow-right" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C2016" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* PANEL 2 — White Rajahs */}
              <div className="history-panel relative flex-shrink-0 w-screen h-full overflow-hidden bg-[#EBE5DB]">
                <div className="culture-pattern" />
                <div className="panel-img-wrapper absolute right-0 top-0 w-1/2 h-full overflow-hidden">
                  <Img src={images.history2} alt="Colonial Era" className="absolute inset-0 w-[115%] h-full" style={{ left: '-15%' }} />
                  <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#EBE5DB]" />
                </div>
                <div className="absolute left-0 top-0 w-full md:w-1/2 h-full flex flex-col justify-center px-10 md:px-20">
                  <div className="history-text-reveal max-w-md">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="panel-counter font-serif text-8xl font-bold text-[var(--accent-gold)] opacity-30 leading-none" data-value="2">2</span>
                      <div>
                        <span className="text-[var(--terracotta)] text-xs font-bold uppercase tracking-[0.4em] block mb-1">The White Rajahs</span>
                        <div className="w-10 h-px bg-[var(--terracotta)]" />
                      </div>
                    </div>
                    <h2 className="font-serif text-5xl md:text-6xl font-bold mb-6 text-[#2C2016] leading-tight">
                      An Era of<br />Dynasty
                    </h2>
                    <p className="text-lg font-light leading-relaxed text-[#2C2016]/75">
                      In the 19th century, the Brooke family established a dynasty governing the territory for a century.
                      Their architectural footprint still stands in beautiful contrast alongside ancient indigenous structures.
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 md:bottom-12 flex items-center gap-3 z-50 opacity-70 drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]">
                  <span className="text-[#2C2016] text-[10px] font-bold uppercase tracking-[0.3em]">Scroll to Explore</span>
                  <svg className="scroll-hint-arrow-right" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C2016" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* PANEL 3 — Present Day */}
              <div className="history-panel relative flex-shrink-0 w-screen h-full overflow-hidden bg-[var(--bg-cream)]">
                <div className="culture-pattern" />
                <div className="panel-img-wrapper absolute left-0 top-0 w-1/2 h-full overflow-hidden">
                  <Img src={images.history3} alt="Festival" className="absolute inset-0 w-[115%] h-full" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[var(--bg-cream)]" />
                </div>
                <div className="absolute right-0 top-0 w-full md:w-1/2 h-full flex flex-col justify-center px-10 md:px-20">
                  <div className="history-text-reveal max-w-md">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="panel-counter font-serif text-8xl font-bold text-[var(--accent-gold)] opacity-30 leading-none" data-value="3">3</span>
                      <div>
                        <span className="text-[var(--terracotta)] text-xs font-bold uppercase tracking-[0.4em] block mb-1">Present Day</span>
                        <div className="w-10 h-px bg-[var(--terracotta)]" />
                      </div>
                    </div>
                    <h2 className="font-serif text-5xl md:text-6xl font-bold mb-6 text-[#2C2016] leading-tight">
                      A Living<br />Heritage
                    </h2>
                    <p className="text-lg font-light leading-relaxed text-[#2C2016]/75">
                      Today, Sarawak is not a museum; it is a breathing, vibrant tapestry. Over 27 ethnic groups carry
                      their ancestors' stories forward through rhythmic dances, beadwork, and world-renowned harvest festivals.
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 md:bottom-12 flex flex-col items-center gap-3 z-50 opacity-70 drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]">
                  <span className="text-[#2C2016] text-[10px] font-bold uppercase tracking-[0.3em]">Continue Journey</span>
                  <svg className="scroll-hint-arrow-down" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C2016" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12l7 7-7 7" />
                  </svg>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            03. CULTURE — TABBED
        ══════════════════════════════════════════ */}
        <section
          data-chapter="03 / CULTURE"
          className="culture-section w-full bg-[#1a140f] text-[var(--bg-cream)] relative z-30 rounded-t-[4rem] shadow-[0_-20px_50px_rgba(0,0,0,0.4)] -mt-10"
        >
          <div className="editorial-noise" />
          <div className="culture-pattern" />
          <div className="dayak-motif-bg" />
          <div className="warm-glow-overlay" />

          <div className="max-w-7xl mx-auto px-6 md:px-16 pt-28 pb-16 relative z-10">
            <div className="reveal-up">
              <p className="text-[var(--accent-gold)] text-xs font-bold uppercase tracking-[0.5em] mb-4">
                Crafts · Culinary · Ceremony · Community
              </p>
              <h2 className="font-serif text-5xl md:text-7xl font-bold">The Sarawak Soul</h2>
            </div>
          </div>

          <div className="culture-tabs-layout max-w-7xl mx-auto px-6 md:px-16 pb-32 relative z-10 flex flex-col md:flex-row gap-12 md:gap-0">
            {/* Tab navigation */}
            <div className="md:sticky md:top-32 md:self-start md:w-64 flex-shrink-0 flex flex-col gap-0">
              {CULTURE_TABS.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => switchTab(i)}
                  className={`culture-tab-btn group relative flex items-center gap-4 px-4 py-5 md:py-6 text-left transition-all ${
                    activeTab === i ? 'text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  <div className={`absolute left-0 top-0 w-[2px] h-full ${activeTab === i ? 'bg-[var(--accent-gold)]' : 'bg-white/10'}`} />
                  <span className="font-serif text-sm font-bold uppercase tracking-[0.2em] pl-6">{t.number}</span>
                  <span className="font-sans text-base font-medium">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 md:pl-16">
              <div className="flex flex-col md:flex-row gap-16 items-start">
                {/* Image panel */}
                <div
                  ref={cultureImgRef}
                  className="relative w-full md:w-[55%] h-[600px] rounded-[2rem] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.5)] flex-shrink-0"
                  style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
                >
                <Img
                    src={tab.image}
                    alt={tab.label}
                    priority
                    className="absolute inset-0 w-full h-[115%] -top-[7.5%] transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a140f]/60 to-transparent" />
                  <div className="absolute bottom-8 left-8">
                    <span className="text-[var(--accent-gold)] text-xs font-bold uppercase tracking-[0.4em] bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
                      {tab.eyebrow}
                    </span>
                  </div>
                </div>

                {/* Text panel */}
                <div ref={cultureTextRef} className="flex flex-col justify-center py-12">
                  <div className="w-12 h-[2px] bg-[var(--accent-gold)] mb-8" />
                  <h3 className="font-serif text-5xl font-bold mb-6 leading-tight whitespace-pre-line">{tab.heading}</h3>
                  <p className="text-white/65 font-light text-base leading-relaxed mb-10 max-w-sm">{tab.body}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            04. NATURE MASONRY
        ══════════════════════════════════════════ */}
        <section
          data-chapter="04 / WILDERNESS"
          className="nature-masonry-section w-full bg-[#1a140f] pt-32 pb-64 px-6 md:px-16 relative z-40 overflow-visible"
        >
          <div className="cinematic-orb-1" />
          <div className="cinematic-orb-2" />
          <div className="editorial-noise" />
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#1a140f] to-transparent pointer-events-none z-10" />

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="reveal-up grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center mb-24">
              <div className="md:col-span-7">
                <p className="text-[var(--accent-gold)] text-xs font-bold uppercase tracking-[0.5em] mb-4">
                  Rainforest · Caves · Wildlife
                </p>
                <h2 className="font-serif text-5xl md:text-7xl font-bold text-white leading-tight">The Wild Classroom</h2>
                <div className="w-16 h-px bg-[var(--accent-gold)]/50 mt-8" />
              </div>
              <div className="md:col-span-5">
                <p className="text-white/70 text-lg md:text-xl font-light leading-relaxed border-l border-white/10 pl-6 md:pl-8 py-2">
                  Step into a living laboratory that has evolved uninterrupted for 130 million years. Here, the sheer
                  scale of the jungle canopy and the depth of the ancient cave systems redefine your place in the world.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 relative">
              {/* Left column */}
              <div className="flex flex-col gap-24">
                <div className="reveal-up relative group">
                  <div className="absolute -left-6 top-12 font-serif text-[13rem] text-white opacity-[0.025] tracking-tighter pointer-events-none z-0 select-none leading-none">WILD</div>
                  <div className="relative h-[560px] rounded-[2rem] overflow-hidden shadow-2xl z-10">
                    <Img src={images.canopies} alt="Rainforest Canopy" className="transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                  </div>
                </div>
                <div className="reveal-up bg-[#1a140f]/60 backdrop-blur-md border border-white/[0.05] p-8 rounded-3xl relative z-20">
                  <span className="text-[var(--accent-gold)] text-xs font-bold uppercase tracking-[0.5em] mb-5 block">Geology</span>
                  <h3 className="font-serif text-5xl md:text-6xl text-white font-bold mb-6 leading-[1.05]">The Deep<br />Earth</h3>
                  <div className="w-10 h-px bg-[var(--accent-gold)]/60 mb-6" />
                  <p className="text-white/65 text-lg font-light leading-relaxed">
                    The colossal Deer Cave in Gunung Mulu National Park contains chambers so vast they possess their own weather systems.
                  </p>
                </div>
                <div className="reveal-up relative group">
                  <div className="absolute -left-6 top-12 font-serif text-[13rem] text-white opacity-[0.025] tracking-tighter pointer-events-none z-0 select-none leading-none">CAVES</div>
                  <div className="relative h-[460px] rounded-[2rem] overflow-hidden shadow-2xl z-10">
                    <Img src={images.caves} alt="Mulu Caves" className="transition-transform duration-700 group-hover:scale-105" />
                  </div>
                </div>
              </div>

              {/* Right column (offset) */}
              <div className="masonry-col-right flex flex-col gap-24 md:mt-48">
                <div className="reveal-up bg-[#1a140f]/60 backdrop-blur-md border border-white/[0.05] p-8 rounded-3xl relative z-20">
                  <span className="text-[var(--accent-gold)] text-xs font-bold uppercase tracking-[0.5em] mb-5 block">The Outdoors</span>
                  <h3 className="font-serif text-5xl md:text-6xl text-white font-bold mb-6 leading-[1.05]">Ancient<br />Canopies</h3>
                  <div className="w-10 h-px bg-[var(--accent-gold)]/60 mb-6" />
                  <p className="text-white/65 text-lg font-light leading-relaxed">
                    Step into rainforests older than the Amazon. Towering canopy walkways and winding river systems conceal immense biodiversity.
                  </p>
                </div>
                <div className="reveal-up relative group">
                  <div className="absolute -right-6 bottom-12 font-serif text-[13rem] text-white opacity-[0.025] tracking-tighter pointer-events-none z-0 select-none leading-none">FAUNA</div>
                  <div className="relative h-[660px] rounded-[2rem] overflow-hidden shadow-2xl z-10">
                    <Img src={images.wildlife} alt="Borneo Wildlife" className="transition-transform duration-700 group-hover:scale-105" />
                  </div>
                </div>
                <div className="reveal-up bg-[#1a140f]/60 backdrop-blur-md border border-white/[0.05] p-8 rounded-3xl relative z-20">
                  <span className="text-[var(--accent-gold)] text-xs font-bold uppercase tracking-[0.5em] mb-5 block">Endemic Species</span>
                  <h3 className="font-serif text-5xl md:text-6xl text-white font-bold mb-6 leading-[1.05]">Rare<br />Encounters</h3>
                  <div className="w-10 h-px bg-[var(--accent-gold)]/60 mb-6" />
                  <p className="text-white/65 text-lg font-light leading-relaxed">
                    The elusive Bornean orangutan, long-nosed proboscis monkeys, and the magnificent Rhinoceros Hornbill.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            05. DESTINATIONS CTA
        ══════════════════════════════════════════ */}
        <section
          data-chapter="05 / JOURNEY"
          className="w-full bg-[#0d0a07] relative z-50 py-32 px-6 md:px-16 overflow-hidden"
          onMouseMove={handleCtaMouseMove}
        >
          <div className="editorial-noise" />
          <div className="dayak-motif-bg" />

          <div
            className="absolute inset-0 z-0 opacity-15"
            style={{
              transform: `translate(${ctaMouseOffset.x * 0.3}px, ${ctaMouseOffset.y * 0.3}px) scale(1.1)`,
              transition: 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
            }}
          >
            <Img src={images.cta} alt="Sarawak Destination" className="w-full h-full object-cover" />
          </div>

          <div className="absolute inset-0 bg-gradient-to-b from-[#0d0a07]/60 via-transparent to-[#0d0a07] z-0" />
          <div className="warm-glow-overlay" />

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="reveal-up text-center mb-20">
              <p className="text-[var(--accent-gold)] text-xs font-bold uppercase tracking-[0.5em] mb-5">
                Three Places to Begin
              </p>
              <h2 className="font-serif text-5xl md:text-7xl text-white font-bold mb-6 leading-tight">
                Your Journey<br />Begins Here
              </h2>
            </div>

            <div className="flex flex-col md:flex-row gap-6 justify-center mb-20">
              {DESTINATIONS.map((dest, i) => (
                <DestCard key={dest.id} dest={dest} index={i} />
              ))}
            </div>

            <div className="reveal-up flex flex-col items-center gap-6">
              <MagneticLink href="/product" className="cta-homestay-btn">
                Find Your Homestay
              </MagneticLink>
            </div>
          </div>
        </section>

        <Back_To_Top_Button />
        <Footer />
      </div>
    </AuthProvider>
  );
};

export default about_sarawak;