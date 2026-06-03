import React, { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

// Import Components
import Navbar from '../../../Component/Navbar/navbar';
import Footer from '../../../Component/Footer/footer';
import Back_To_Top_Button from '../../../Component/Back_To_Top_Button/Back_To_Top_Button';
import TawkMessenger from '../../../Component/TawkMessenger/TawkMessenger';
import { AuthProvider } from '../../../Component/AuthContext/AuthContext';
import { useNavigate } from 'react-router-dom';
// Import CSS
import './About_Us.css';

// Import Icons
import { FaHotel, FaTruckPlane } from 'react-icons/fa6';
import { MdOutlineTravelExplore, MdDining, MdCardTravel, MdAttachMoney } from 'react-icons/md';
import { HiOutlineSearch, HiOutlineHome, HiOutlineGlobeAlt, HiOutlineHeart, HiOutlineShieldCheck, HiOutlineSparkles, HiOutlineCreditCard } from 'react-icons/hi';

// ─── DATA ─────────────────────────────────────────────────────────────────────

const services = [
  { icon: <FaHotel />, title: 'Scenic Accommodations', text: 'Relax in handpicked stays surrounded by Sarawak nature, culture, and warm hospitality.' },
  { icon: <MdOutlineTravelExplore />, title: 'Adventure Planning', text: 'Discover national parks, caves, rivers, beaches, and hidden cultural experiences.' },
  { icon: <MdDining />, title: 'Local Dining', text: 'Explore authentic Sarawak flavours, from traditional dishes to local food experiences.' },
  { icon: <FaTruckPlane />, title: 'Transfer Services', text: 'Plan smoother travel with convenient access to transport and nearby attractions.' },
  { icon: <MdCardTravel />, title: 'Tour Desk', text: 'Get recommendations and arrange meaningful activities based on your travel style.' },
  { icon: <MdAttachMoney />, title: 'Group Packages', text: 'Create comfortable travel plans for families, student groups, and community trips.' },
];

const features = [
  {
    icon: <HiOutlineSearch />,
    tag: 'For Travellers',
    title: 'Browse & book stays across Sarawak',
    body: 'From Kuching city apartments to jungle longhouses near Mulu — find, compare, and book authentic Sarawak homestays in one place. No more scattered listings, no more dead ends.',
    img: '/Waterfront.jpg',
    alt: 'Kuching waterfront stay',
  },
  {
    icon: <HiOutlineHome />,
    tag: 'For Homestay Owners',
    title: 'List your property with ease',
    body: 'Hello Sarawak gives local homestay owners a real digital presence — simple listing tools, booking management, and direct access to travellers from across Malaysia and beyond.',
    img: '/Longhouse.jpg',
    alt: 'Sarawak longhouse homestay',
  },
  {
    icon: <HiOutlineGlobeAlt />,
    tag: 'For Explorers',
    title: 'Discover local culture, food & experiences',
    body: "Sarawak's richness goes far beyond a bed for the night. We surface the laksa spots, the cultural villages, the wildlife sanctuaries — everything that makes a trip here unforgettable.",
    img: '/Culture.png',
    alt: 'Sarawak local culture',
  },
];

const destinations = [
  { label: 'Kuching & Waterfront', img: '/WaterFront.jpeg', tag: 'City stays' },
  { label: 'Gunung Mulu', img: '/Gunung.png', tag: 'Nature escapes' },
  { label: 'Bako National Park', img: '/Bako.jpg', tag: 'Wildlife' },
  { label: 'Sarawak Longhouses', img: '/Longhouse.jpg', tag: 'Kampung stays' },
  { label: 'Similajau', img: '/Similajau.jpg', tag: 'Coastal' },
  { label: 'Wind Cave', img: '/WindCave.png', tag: 'Adventure' },
];

const values = [
  { num: '01', icon: <HiOutlineHeart />, title: 'Local first, always', body: 'Every ringgit stays in Sarawak. We actively choose local partners, local hosts, and local experiences over chain alternatives.' },
  { num: '02', icon: <HiOutlineShieldCheck />, title: 'Honest curation', body: 'We are selective on purpose — because recommending somewhere we would not send our own family is not something we will ever do.' },
  { num: '03', icon: <HiOutlineSparkles />, title: 'Culture, not commodity', body: "Sarawak's diversity — its languages, traditions, food, and people — is the product. We exist to celebrate it, not flatten it into generic travel content." },
];

const marqueeItems = [
  'Authentic Stays', 'Sarawak Culture', 'Nature Escapes', 'Local Experiences',
  'Trusted Hospitality', 'Homestay Owners', 'Kuching to Miri', 'Discover Sarawak',
];

const filmstripImages = [
  { label: 'Bako National Park', img: '/Bako.jpg' },
  { label: 'Gunung Mulu', img: '/Gunung.png' },
  { label: 'Damai Beach', img: '/Damai.png' },
  { label: 'Sarawak Waterfront', img: '/WaterFront.jpeg' },
  { label: 'Wind Cave', img: '/WindCave.png' },
  { label: 'Similajau', img: '/Similajau.jpg' },
];

const stats = [
  { num: 'To be listed', label: 'Properties listed' },
  { num: '3', label: 'Regions covered' },
  { num: '2026', label: 'Launched in Kuching' },
  { num: '🌍', label: 'International vision' },
];

// ─── ANIMATION VARIANTS ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } },
};

const fadeLeft = {
  hidden: { opacity: 0, x: -44 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } },
};

const fadeRight = {
  hidden: { opacity: 0, x: 44 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.93 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.13 } },
};

const staggerFast = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const viewportOpts = { once: true, margin: '-80px' };

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const About_Us = () => {
  const navigate = useNavigate();

  const [mousePos, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);


  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '22%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => {
    let animationFrameId;
    const handleMouseMove = (e) => {
      animationFrameId = requestAnimationFrame(() => setMousePosition({ x: e.clientX, y: e.clientY }));
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => { window.removeEventListener('mousemove', handleMouseMove); cancelAnimationFrame(animationFrameId); };
  }, []);

  const duplicatedFilmstrip = [...filmstripImages, ...filmstripImages];
  const duplicatedMarquee = [...marqueeItems, ...marqueeItems];

  return (
    <div className="About_Us_Container_Main about-container">
      <AuthProvider>
        <div className="custom-cursor" style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }} />
        <Navbar />

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="about-hero-section" ref={heroRef}>
          <div className="about-grain-dark" />
          <motion.img src="/about_us.jpg" alt="Sarawak" className="about-hero-bg" style={{ y: heroY }} />
          <div className="about-hero-overlay" />
          <motion.div className="about-hero-content" initial="hidden" animate="visible" variants={stagger} style={{ opacity: heroOpacity }}>
            <motion.span variants={fadeUp} className="about-eyebrow">Hello Sarawak</motion.span>
            <motion.h1 variants={fadeUp}>
              <span>One land.</span><br />
              A thousand stays to discover.
            </motion.h1>
            <motion.p variants={fadeUp} className="about-hero-sub">
              Sarawak has incredible places to stay — most people just don't know where to look. We're changing that.
            </motion.p>
            <motion.div variants={fadeUp} className="about-hero-scroll-hint">
              <span className="about-hero-scroll-line" />
              Scroll to discover
            </motion.div>
          </motion.div>
          <div className="hero-vertical-text">ABOUT US</div>
          <h2 className="hero-outline-text">SARAWAK</h2>
        </section>

        {/* ── MARQUEE ──────────────────────────────────────────────────────── */}
        <section className="marquee-band">
          <div className="marquee-band-track">
            {duplicatedMarquee.map((item, i) => (
              <div className="marquee-band-item" key={`${item}-${i}`}>{item}<span className="marquee-band-star">✦</span></div>
            ))}
          </div>
        </section>

        {/* ── ABOUT / MISSION ──────────────────────────────────────────────── */}
        <section className="about-intro-section">
          <div className="about-grain-light" />
          <motion.div className="about-section-heading" initial="hidden" whileInView="visible" viewport={viewportOpts} variants={stagger}>
            <motion.span variants={fadeUp}>A Company With Passion</motion.span>
            <motion.h2 variants={fadeUp}>About Us</motion.h2>
            <motion.p variants={fadeUp}>
              We connect guests with meaningful Sarawak stays while supporting local
              accommodation operators and tourism experiences.
            </motion.p>
          </motion.div>

          <motion.div className="about-story-card" initial="hidden" whileInView="visible" viewport={viewportOpts} variants={stagger}>
            <motion.div variants={fadeLeft} className="about-story-image hoverable">
              <img src="/About_Us_2.jpg" alt="Sarawak hospitality" />
            </motion.div>
            <motion.div variants={fadeRight} className="about-story-content">
              <span className="about-small-label">Our Mission</span>
              <h3>Built for Sarawak.<br />Open to the world.</h3>
              <p>
                Hello Sarawak started with a simple question: why is it so hard to find a
                proper Sarawak homestay online? We built the answer — a dedicated platform
                that puts local hosts front and centre, and makes Sarawak's incredible
                diversity of stays discoverable by anyone, anywhere.
              </p>
              <p>
                From urban Kuching to rural longhouses, from beachside retreats to jungle
                escapes — we are building the most complete picture of Sarawak hospitality
                ever put online.
              </p>

              <motion.div className="about-stat-row" variants={staggerFast} initial="hidden" whileInView="visible" viewport={viewportOpts}>
                {stats.map((s) => (
                  <motion.div variants={scaleIn} className="about-stat-card" key={s.label}>
                    <div className="about-stat-num">{s.num}</div>
                    <div className="about-stat-label">{s.label}</div>
                  </motion.div>
                ))}
              </motion.div>

              <button
                type="button"
                className="about-primary-button hoverable"
                onClick={() => document.getElementById('about-features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See What We Built
              </button>
            </motion.div>
          </motion.div>
        </section>

        {/* ── FEATURE SHOWCASE ─────────────────────────────────────────────── */}
        <section className="about-features-section" id="about-features">
          <div className="about-grain-dark" />
          <motion.div className="about-section-heading" initial="hidden" whileInView="visible" viewport={viewportOpts} variants={stagger}>
            <motion.span variants={fadeUp}>What We Built</motion.span>
            <motion.h2 variants={fadeUp} className="about-dark-title">One platform.<br />Three problems solved.</motion.h2>
            <motion.p variants={fadeUp} className="about-dark-sub">
              Hello Sarawak is built around the real needs of travellers, homestay owners,
              and anyone who wants to go deeper into Sarawak's culture.
            </motion.p>
          </motion.div>

          <div className="about-features-list">
            {features.map((feature, i) => (
              <motion.div
                className={`about-feature-row${i % 2 !== 0 ? ' about-feature-row-reverse' : ''}`}
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOpts}
                variants={stagger}
              >
                <motion.div variants={i % 2 === 0 ? fadeLeft : fadeRight} className="about-feature-img hoverable">
                  <img src={feature.img} alt={feature.alt} />
                  <div className="about-feature-img-overlay" />
                </motion.div>
                <motion.div variants={i % 2 === 0 ? fadeRight : fadeLeft} className="about-feature-text">
                  <div className="about-feature-icon">{feature.icon}</div>
                  <span className="about-feature-tag">{feature.tag}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── SERVICES ─────────────────────────────────────────────────────── */}
        <section className="about-services-section" id="about-services">
          <div className="about-grain-light" />
          <motion.div className="about-section-heading" initial="hidden" whileInView="visible" viewport={viewportOpts} variants={stagger}>
            <motion.span variants={fadeUp}>What We Provide</motion.span>
            <motion.h2 variants={fadeUp}>Our Service</motion.h2>
            <motion.p variants={fadeUp}>
              A simple and supportive platform for accommodation, travel discovery, and
              local Sarawak experiences.
            </motion.p>
          </motion.div>
          <motion.div className="about-service-grid" initial="hidden" whileInView="visible" viewport={viewportOpts} variants={stagger}>
            {services.map((service, i) => (
              <motion.div variants={fadeUp} className="about-service-card hoverable" key={`${service.title}-${i}`}>
                <div className="about-service-icon">{service.icon}</div>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── DESTINATIONS ─────────────────────────────────────────────────── */}
        <section className="about-destinations-section">
          <div className="about-grain-dark" />
          <motion.div className="about-section-heading" initial="hidden" whileInView="visible" viewport={viewportOpts} variants={stagger}>
            <motion.span variants={fadeUp}>Explore Sarawak</motion.span>
            <motion.h2 variants={fadeUp} className="about-dark-title">From city to jungle<br />to the sea.</motion.h2>
            <motion.p variants={fadeUp} className="about-dark-sub">
              Sarawak is one of the most diverse places on earth. We cover all of it —
              urban Kuching, ancient rainforests, coastal retreats, and living cultural villages.
            </motion.p>
          </motion.div>
          <motion.div className="about-destinations-grid" initial="hidden" whileInView="visible" viewport={viewportOpts} variants={stagger}>
            {destinations.map((dest, i) => (
              <motion.div variants={scaleIn} className="about-destination-card hoverable" key={dest.label} style={{ transitionDelay: `${i * 0.06}s` }}>
                <img src={dest.img} alt={dest.label} className="about-destination-img" />
                <div className="about-destination-overlay">
                  <span className="about-destination-tag">{dest.tag}</span>
                  <h4>{dest.label}</h4>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── VALUES ───────────────────────────────────────────────────────── */}
        <section className="about-values-section">
          <div className="about-grain-light" />
          <motion.div className="about-section-heading" initial="hidden" whileInView="visible" viewport={viewportOpts} variants={stagger}>
            <motion.span variants={fadeUp}>What We Believe</motion.span>
            <motion.h2 variants={fadeUp}>Three things we'll<br />never compromise on</motion.h2>
          </motion.div>
          <motion.div className="about-values-grid" initial="hidden" whileInView="visible" viewport={viewportOpts} variants={stagger}>
            {values.map((v) => (
              <motion.div variants={scaleIn} className="about-value-card hoverable" key={v.num}>
                <div className="about-value-num">{v.num}</div>
                <div className="about-value-icon">{v.icon}</div>
                <h3>{v.title}</h3>
                <p>{v.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── FILMSTRIP ────────────────────────────────────────────────────── */}
        <section className="about-filmstrip-section">
          <motion.div className="about-section-heading dark-heading" initial="hidden" whileInView="visible" viewport={viewportOpts} variants={stagger}>
            <motion.span variants={fadeUp}>Moments Worth Remembering</motion.span>
            <motion.h2 variants={fadeUp}>Sarawak in every frame</motion.h2>
            <motion.p variants={fadeUp}>
              From coastal escapes to rainforest adventures, Sarawak brings every traveller
              closer to culture and nature.
            </motion.p>
          </motion.div>
          <div className="filmstrip-wrapper">
            <div className="filmstrip-track">
              {duplicatedFilmstrip.map((item, i) => (
                <div className="filmstrip-card hoverable" key={`${item.label}-${i}`}>
                  <div className="filmstrip-img-wrap">
                    <img src={item.img} alt={item.label} className="filmstrip-img" />
                    <div className="filmstrip-overlay"><span className="filmstrip-label">{item.label}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TEAM ─────────────────────────────────────────────────────────── */}
        <section className="about-team-section">
          <div className="about-grain-light" />
          <motion.div
            className="about-team-inner"
            initial="hidden"
            whileInView="visible"
            viewport={viewportOpts}
            variants={stagger}
          >
            {/* Group photo */}
            <motion.div variants={scaleIn} className="about-team-photo hoverable">
              <img src="/About_Us_3.jpeg" alt="The Hello Sarawak team" />
              <div className="about-team-photo-overlay" />
            </motion.div>

            {/* Text beside photo */}
            <motion.div variants={fadeRight} className="about-team-text">
              <span className="about-small-label">The People Behind It</span>
              <h2>A small team.<br />A big belief in Sarawak.</h2>
              <p>
                We’re a team of five who really love this state. Three of us are Kuching locals, and the other two fell in love with how breathtaking the city is when they got here.
                 It was frustrating that so many of Sarawak’s coolest spots were pretty much invisible on the internet, so we teamed up to build this site. We're a startup out of Kuching,
                and this is just step one for us.
              </p>

              <div className="about-team-names">
                {['Cyril Andrew', 'Ivy Lim', "Cheryl Ch'ng", 'Selina Chang', 'Joey Mok'].map((name) => (
                  <span className="about-team-name-pill" key={name}>{name}</span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="about-cta-section">
          <div className="about-grain-dark" />
          <div className="about-cta-glow" />
          <motion.div className="about-cta-content" initial="hidden" whileInView="visible" viewport={viewportOpts} variants={stagger}>
            <motion.span variants={fadeUp} className="about-eyebrow">Ready to explore?</motion.span>
            <motion.h2 variants={fadeUp}>Sarawak is waiting.<br /><span>Let's go.</span></motion.h2>
            <motion.p variants={fadeUp}>
              Whether you are planning your first visit or you are a homestay owner ready
              to reach the world — we would love to be part of your story.
            </motion.p>
            <motion.div variants={fadeUp} className="about-cta-buttons">
              <button
                type="button"
                className="about-primary-button hoverable"
                onClick={() => navigate('/product')}
              >
                Browse Stays
              </button>

              <button
                type="button"
                className="about-cta-outline-btn hoverable"
                onClick={() => navigate('/login')}
              >
                List Your Homestay
              </button>
            </motion.div>
          </motion.div>
        </section>

        <Back_To_Top_Button />
        <Footer />
        <TawkMessenger />
      </AuthProvider>
    </div>
  );
};

export default About_Us;