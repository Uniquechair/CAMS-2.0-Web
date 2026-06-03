import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';

import Navbar from '../../../Component/Navbar/navbar';
import Footer from '../../../Component/Footer/footer';
import Sarawak_Map from '../../../Component/Sarawak Map/Map';
import Back_To_Top_Button from '../../../Component/Back_To_Top_Button/Back_To_Top_Button';
import TawkMessenger from '../../../Component/TawkMessenger/TawkMessenger';
import { AuthProvider } from '../../../Component/AuthContext/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { FaStar, FaCalendarAlt, FaSearch } from 'react-icons/fa';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { IoLocationSharp } from 'react-icons/io5';
import { HiUsers } from 'react-icons/hi2';
import { CiCalendarDate } from 'react-icons/ci';

import ImageSlider from '../../../Component/ImageSlider/ImageSlider';
import { fetchProduct } from '../../../../Api/api';

import './Home.css';


const StatItem = ({ end, label, suffix = '', isFloat = false }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [value, setValue] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!isInView) return;

    let startTimestamp = null;
    const duration = 1500;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;

      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 4);

      setValue(easeOut * end);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setIsFinished(true);
      }
    };

    window.requestAnimationFrame(step);
  }, [isInView, end]);

  return (
    <motion.div
      ref={ref}
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0 },
      }}
      className="flex flex-col items-center justify-center p-8 bg-white/40 backdrop-blur-xl border border-[#E8E1D9] shadow-[0_8px_30px_rgba(73,56,41,0.04)] rounded-3xl hover:-translate-y-2 transition-transform duration-500 relative overflow-hidden group"
    >
      <div className="font-serif text-5xl md:text-6xl text-[#493829] font-bold mb-3 flex items-center relative z-10">
        {isFloat ? value.toFixed(1) : Math.round(value)}
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: isFinished ? 1 : 0,
            scale: isFinished ? 1 : 0.8,
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-[#C4956A] ml-1"
        >
          {suffix}
        </motion.span>
      </div>

      <div className="text-[10px] md:text-xs font-bold text-[#7A6555] uppercase tracking-widest text-center relative z-10">
        {label}
      </div>

      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0 pointer-events-none" />
    </motion.div>
  );
};

/* =========================
 Avatar
   ========================= */

const Avatar = ({ src, name }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return src ? (
    <img
      src={src}
      alt={name}
      className="w-10 h-10 rounded-full object-cover shadow-sm border border-[#E8E1D9]"
    />
  ) : (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C4956A] to-[#8C6645] text-white flex items-center justify-center font-bold font-sans shadow-sm border border-[#E8E1D9]">
      {initial}
    </div>
  );
};

/* =========================
    Dual-Month Home Calendar
   ========================= */

const DualMonthCalendar = ({
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  minDate,
  onClear,
  selecting,
  setSelecting
}) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  // hoverDate drives the live range preview before checkOut is confirmed
  const [hoverDate, setHoverDate] = useState('');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();
  const getDateStr = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const todayStr = today.toISOString().split('T')[0];

  // Derive the "preview end" — either confirmed checkOut or hovered date
  const previewEnd = checkIn && !checkOut ? hoverDate : checkOut;

  // Second month is always the month after the first
  const month2 = viewMonth === 11 ? 0 : viewMonth + 1;
  const year2  = viewMonth === 11 ? viewYear + 1 : viewYear;

  const prevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (dateStr) => {
    if (minDate && dateStr < minDate) return;

    if (selecting === 'checkin') {
      onCheckInChange(dateStr);
      onCheckOutChange('');
      setHoverDate('');
      setSelecting('checkout'); // Automatically switch to selecting checkout
      return;
    }

    if (selecting === 'checkout') {
       if (dateStr <= checkIn) {
          // If they select an earlier date, make it the new checkin
          onCheckInChange(dateStr);
          onCheckOutChange('');
          setHoverDate('');
       } else {
         // Valid checkout
          onCheckOutChange(dateStr);
          setHoverDate('');
          setSelecting('done');
       }
    }
  };

  const handleDayHover = (dateStr) => {
    // Only show preview when checkIn is set but checkOut isn't
    if (checkIn && !checkOut) {
      setHoverDate(dateStr);
    }
  };

  const handleMouseLeaveGrid = () => {
    setHoverDate('');
  };


  const renderMonth = (y, m) => {
    const count = daysInMonth(y, m);
    const start = firstDayOfMonth(y, m);
    const cells = [];

    // Empty leading cells
    for (let i = 0; i < start; i++) {
      cells.push(<div key={`e-${i}`} className="hdc-empty" />);
    }

    for (let d = 1; d <= count; d++) {
      const dateStr = getDateStr(y, m, d);
      const isDisabled = (minDate && dateStr < minDate) || (checkIn && !checkOut && dateStr < checkIn);
      const isCheckIn  = dateStr === checkIn;
      const isCheckOut = dateStr === checkOut;
      const isToday    = dateStr === todayStr;

      // Range highlight: between checkIn and previewEnd
      const rangeStart = checkIn;
      const rangeEnd   = previewEnd && previewEnd > checkIn ? previewEnd : null;
      const isInRange  = rangeStart && rangeEnd && dateStr > rangeStart && dateStr < rangeEnd;
      const isRangeStart = isCheckIn && rangeEnd;
      const isRangeEnd   = dateStr === rangeEnd && rangeStart;

      let cls = 'hdc-day';
      if (isDisabled)   cls += ' hdc-disabled';
      if (isCheckIn)    cls += ' hdc-checkin';
      if (isCheckOut)   cls += ' hdc-checkout';
      if (isInRange)    cls += ' hdc-in-range';
      if (isRangeStart) cls += ' hdc-range-start';
      if (isRangeEnd)   cls += ' hdc-range-end';
      if (isToday && !isCheckIn && !isCheckOut) cls += ' hdc-today';

      cells.push(
        <button
          key={d}
          type="button"
          disabled={isDisabled}
          className={cls}
          onClick={() => !isDisabled && handleDayClick(dateStr)}
          onMouseEnter={() => handleDayHover(dateStr)}
        >
          {d}
        </button>
      );
    }

    return cells;
  };

  return (
    <div className="home-dual-calendar-popup" onClick={e => e.stopPropagation()}>

      <div className="hdc-topbar">
        <div className="hdc-pills">
          <div className={`hdc-pill ${selecting === 'checkin' ? 'hdc-pill-active' : ''}`} onClick={() => setSelecting('checkin')}>
            <span className="hdc-pill-label">Check-in</span>
            <span className="hdc-pill-value">
              {checkIn
                ? new Date(`${checkIn}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </span>
          </div>
          <div className="hdc-pill-arrow">→</div>
          <div className={`hdc-pill ${selecting === 'checkout' ? 'hdc-pill-active' : ''}`} onClick={() => setSelecting('checkout')}>
            <span className="hdc-pill-label">Check-out</span>
            <span className="hdc-pill-value">
              {checkOut
                ? new Date(`${checkOut}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </span>
          </div>
        </div>
        {(checkIn || checkOut) && (
          <button type="button" className="hdc-clear" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      {/* ── Prompt message ── */}
      <div className="hdc-prompt">
        {selecting === 'checkin' && 'Select your check-in date'}
        {selecting === 'checkout' && 'Now select your check-out date'}
        {selecting === 'done' && (() => {
          const a = new Date(`${checkIn}T00:00:00`);
          const b = new Date(`${checkOut}T00:00:00`);
          const nights = Math.round((b - a) / 86400000);
          return `${nights} night${nights !== 1 ? 's' : ''} selected`;
        })()}
      </div>

      {/* ── Month navigation ── */}
      <div className="hdc-nav">
        <button type="button" className="hdc-nav-btn" onClick={prevMonth}>
          <IoIosArrowBack size={13} />
        </button>
        <div className="hdc-nav-months">
          <span>{months[viewMonth]} {viewYear}</span>
          <span>{months[month2]} {year2}</span>
        </div>
        <button type="button" className="hdc-nav-btn" onClick={nextMonth}>
          <IoIosArrowForward size={13} />
        </button>
      </div>

      {/* ── Two-month grid ── */}
      <div className="hdc-months" onMouseLeave={handleMouseLeaveGrid}>
        {[{ y: viewYear, m: viewMonth }, { y: year2, m: month2 }].map(({ y, m }) => (
          <div key={`${y}-${m}`} className="hdc-month">
            <div className="hdc-month-days-header">
              {days.map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="hdc-month-grid">
              {renderMonth(y, m)}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

/* =========================
   SCROLL-TRIGGERED STACKED CARD
   ========================= */

const StackCard = ({ children, scrollProgress }) => {
  const scale = useTransform(scrollProgress, [0, 0.15], [0.96, 1]);
  const borderRadius = useTransform(scrollProgress, [0, 0.15], [48, 24]);

  return (
    <motion.div
      style={{ scale, borderRadius }}
      className="w-full origin-top"
    >
      {children}
    </motion.div>
  );
};

const HOME_IMAGES = {
  hero: 'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2FWaterFront.jpeg?alt=media&token=0b18d4a9-94cc-4c61-83af-b2e8e0df434f',
  adBanner: 'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2FAdBanner.jpg?alt=media&token=9cbc3782-85b6-4eee-8a2c-023fa51587be',
  appScreenshot: 'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2FAppScreenshot.jpg?alt=media&token=34dfbb3e-64cf-4708-980a-98959a4e9158',
  bako: 'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2FBako.jpg?alt=media&token=82314035-f4db-4c2a-b2d2-d77383c53bfa',
  mulu: 'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2FMulu.jpg?alt=media&token=7557d777-e3fc-4560-9358-0c4323fa33e6',
  damai: 'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2FDamai.jpg?alt=media&token=c9d41171-ba0b-4f7e-8ae5-0181953ae220',
  semenggoh: 'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2FSemenggoh.jpg?alt=media&token=b02614ab-051b-4757-9d67-7470b084d74f',

};
const APK_DOWNLOAD_LINK =
  'https://drive.google.com/uc?export=download&id=1mvTd_KcM7pjNnsinumVGCtG9f-pPwRvE';


  
/* =========================
   PHONE MOCKUP — 3D Hover Tilt
   ========================= */

const PhoneMockup = () => {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: -6 });
  const [isHovered, setIsHovered] = useState(false);
  const phoneRef = useRef(null);

  const handleMouseMove = (e) => {
    const el = phoneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ rotateX: -dy * 14, rotateY: dx * 14 - 4 });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: -6 });
  };

  return (
    <motion.div
      ref={phoneRef}
      initial={{ scale: 1.1, y: 60, opacity: 0 }}
      whileInView={{ scale: 1, y: 0, opacity: 1 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: '900px',
      }}
      className="w-full md:w-auto flex justify-center relative cursor-pointer"
    >
      <motion.div
        animate={{
          rotateX: tilt.rotateX,
          rotateY: tilt.rotateY,
          scale: isHovered ? 1.06 : 1,
          y: isHovered ? -8 : 0,
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="relative z-10"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <motion.div
          animate={{
            opacity: isHovered ? 1 : 0.4,
            scaleX: isHovered ? 1.15 : 0.85,
          }}
          transition={{ duration: 0.4 }}
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[200px] h-[40px] bg-[#C4956A]/30 blur-2xl rounded-full"
        />

        <div
          className="w-[260px] h-[550px] bg-[#1a1a1a] rounded-[2.5rem] p-2.5 border-[4px] border-[#333]/80"
          style={{
            boxShadow: isHovered
              ? '0 40px 70px rgba(196,149,106,0.22), 0 10px 30px rgba(0,0,0,0.7)'
              : '0 30px 60px rgba(0,0,0,0.6)',
            transition: 'box-shadow 0.4s ease',
          }}
        >
          <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-6 bg-[#1a1a1a] rounded-b-xl w-32 mx-auto z-20" />

           <img
                src={HOME_IMAGES.appScreenshot}
                alt="CAMS App Mockup"
                className="w-full h-full object-cover relative z-10"
                loading="lazy"
                decoding="async"
              />

            <div className="absolute inset-0 bg-[#F5F0E8] flex items-center justify-center p-4 text-center z-0">
              <p className="text-[#493829] text-xs font-bold uppercase tracking-widest">
                App Screenshot
              </p>
            </div>

            <motion.div
              animate={{
                opacity: isHovered ? 0.12 : 0.04,
                x: tilt.rotateY * 2,
                y: tilt.rotateX * -2,
              }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-30 pointer-events-none rounded-[2rem]"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, transparent 60%)',
              }}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* =========================
   HOME PAGE
   ========================= */
const getImageSrc = (image) => {
  if (!image) return '';

  const cleanImage = String(image).trim();

  if (cleanImage.startsWith('http://') || cleanImage.startsWith('https://')) {
    return cleanImage;
  }

  if (cleanImage.startsWith('data:image')) {
    return cleanImage;
  }

  return `data:image/jpeg;base64,${cleanImage}`;
};

const getSafePropertyImages = (property) => {
  const images = property?.propertyimage;

  if (Array.isArray(images)) {
    return images
      .filter(Boolean)
      .map(getImageSrc);
  }

  if (typeof images === 'string' && images.trim()) {
    const cleanValue = images.trim();

    try {
      const parsed = JSON.parse(cleanValue);

      if (Array.isArray(parsed)) {
        return parsed
          .filter(Boolean)
          .map(getImageSrc);
      }
    } catch (error) {
      return cleanValue
        .split(',')
        .map((img) => img.trim())
        .filter(Boolean)
        .map(getImageSrc);
    }

    return [getImageSrc(cleanValue)];
  }

  return [];
};


const Home = () => {
  const navigate = useNavigate();
const [showApkPopup, setShowApkPopup] = useState(false);
const appSectionRef = useRef(null);
const apkPopupRef = useRef(null);
const handleOpenApkPopup = () => {
  setShowApkPopup(false);

  appSectionRef.current?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });

  setTimeout(() => {
    setShowApkPopup(true);

    setTimeout(() => {
      apkPopupRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 100);
  }, 500);
};
    useEffect(() => {
    const preloadImages = [
      HOME_IMAGES.hero,
      HOME_IMAGES.adBanner,
      HOME_IMAGES.bako,
      HOME_IMAGES.mulu,
      HOME_IMAGES.damai,
      HOME_IMAGES.semenggoh,
      HOME_IMAGES.appScreenshot,
    ];

    preloadImages.forEach((src, index) => {
      if (!src) return;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;

      if (index === 0) {
        link.fetchPriority = 'high';
      }

      document.head.appendChild(link);
    });

    return () => {
      document
        .querySelectorAll('link[rel="preload"][as="image"]')
        .forEach((link) => {
          if (preloadImages.includes(link.href)) {
            link.remove();
          }
        });
    };
  }, []);

  const clusters = [
    'Kuching', 'Miri', 'Sibu', 'Bintulu', 'Limbang', 'Sarikei', 'Sri Aman',
    'Kapit', 'Mukah', 'Betong', 'Samarahan', 'Serian', 'Lundu', 'Lawas',
    'Marudi', 'Simunjan', 'Tatau', 'Belaga', 'Debak', 'Kabong', 'Pusa',
    'Sebuyau', 'Saratok', 'Selangau', 'Tebedu',
  ];

  const [selectedCluster, setSelectedCluster] = useState('');
  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    adults: 1,
    children: 0,
  });

  const [activeTab, setActiveTab] = useState(null);
  // Add a state to track which part of the date range is actively being selected
  const [calendarSelecting, setCalendarSelecting] = useState('checkin');
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 480 : false
  );

  const searchShellRef = useRef(null);
  const locationRef = useRef(null);
  const checkinRef = useRef(null);
  const checkoutRef = useRef(null);
  const guestsRef = useRef(null);

  const { data: fetchedProperties = [], isLoading: isPropertiesLoading } = useQuery({
    queryKey: ['homeFeaturedProperties'],
    queryFn: fetchProduct,
  });

  const safeFetchedProperties = Array.isArray(fetchedProperties)
    ? fetchedProperties
    : fetchedProperties.data || fetchedProperties.properties || [];

  const featuredProperties = safeFetchedProperties
    .filter((property) => property.propertystatus === 'Available')
    .sort((a, b) => {
      const ratingA = parseFloat(a.rating || 0);
      const ratingB = parseFloat(b.rating || 0);

      if (ratingB !== ratingA) return ratingB - ratingA;
      return b.propertyid - a.propertyid;
    })
    .slice(0, 4);

  const formatDisplayDate = (dateValue) => {
    if (!dateValue) return '';
    const [year, month, day] = dateValue.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleInputChange = (name, value) => {
    setBookingData((prev) => {
      const updatedData = { ...prev, [name]: value };

      if (name === 'checkIn' && prev.checkOut && value >= prev.checkOut) {
        updatedData.checkOut = '';
      }
      return updatedData;
    });
  };

  // Watch for the 'done' state to move to the guests tab
  useEffect(() => {
     if (calendarSelecting === 'done') {
        setTimeout(() => setActiveTab('guests'), 250);
     }
  }, [calendarSelecting]);


  const clearDates = (e) => {
    if (e) e.stopPropagation();

    setBookingData((prev) => ({
      ...prev,
      checkIn: '',
      checkOut: '',
    }));

    setCalendarSelecting('checkin');
  };

  const handleHomeSearch = (e) => {
    if (e) e.stopPropagation();

    navigate('/product', {
      state: {
        filterRegion: selectedCluster,
        searchDates: {
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          adults: bookingData.adults,
          children: bookingData.children,
        },
      },
    });
  };

  const handleViewDetails = (property) => {
    navigate(`/product/${property.propertyid}`, {
      state: {
        propertyDetails: property,
        searchDates: {
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          adults: bookingData.adults,
          children: bookingData.children,
        },
        filterRegion: selectedCluster || property.clustername || '',
      },
    });
  };

  const goToRooms = () => {
    handleHomeSearch();
  };

  const handleTabClick = (tab) => {
    if (tab === 'checkin') {
      setCalendarSelecting('checkin');
    } else if (tab === 'checkout') {
      setCalendarSelecting('checkout');
      // If clicking checkout tab directly but no checkin, force them to do checkin first
      if(!bookingData.checkIn) tab = 'checkin';
    }
    setActiveTab((currentTab) => (currentTab === tab ? null : tab));
  };

  const getPanelStyle = () => {
    if (!activeTab) return {};

    let ref;

    switch (activeTab) {
      case 'location':
        ref = locationRef.current;
        break;
      case 'checkin':
      case 'checkout':
        // CRITICAL FIX: Anchor the dual calendar strictly to the check-in ref.
        // This stops the calendar from jumping across the screen when seamlessly switching to check-out!
        ref = checkinRef.current;
        break;
      case 'guests':
        ref = guestsRef.current;
        break;
      default:
        return {};
    }

    if (!ref) return {};

    const isDualCalendar = activeTab === 'checkin' || activeTab === 'checkout';
    const width = isMobile ? '92%' : isDualCalendar ? 680 : Math.max(280, ref.offsetWidth);
    const leftValue = isMobile ? '50%' : `${ref.offsetLeft}px`;

    return {
      position: 'absolute',
      top: 'calc(100% + 14px)',
      left: activeTab === 'guests' && !isMobile ? 'auto' : leftValue,
      right: activeTab === 'guests' && !isMobile ? '92px' : 'auto',
      transform: isMobile ? 'translateX(-50%)' : 'none',
      width,
      zIndex: 9999,
      background: '#ffffff',
      border: '1px solid #E8E1D9',
      borderRadius: '22px',
      boxShadow: '0 18px 45px rgba(73, 56, 41, 0.18)',
      padding: isDualCalendar ? '0' : '18px',
    };
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 480);
    };

    const handleClickOutside = (event) => {
      if (
        activeTab &&
        searchShellRef.current &&
        !searchShellRef.current.contains(event.target)
      ) {
        setActiveTab(null);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeTab]);

  const ClusterSelector = ({ selectedCluster, setSelectedCluster, closeTab }) => {
    return (
      <div style={{ marginTop: '10px' }}>
        <div
          className="home-destination-scroll"
          onWheel={(e) => {
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
          }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '12px',
            maxHeight: '280px',
            overflowY: 'auto',
            paddingRight: '8px',
            overscrollBehavior: 'contain',
            touchAction: 'none',
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCluster('');
              if (closeTab) closeTab();
            }}
            style={{
              padding: '10px 8px',
              borderRadius: '8px',
              border: !selectedCluster ? '2px solid #C4956A' : '1px solid #e2e8f0',
              backgroundColor: !selectedCluster ? '#fff7ed' : '#fff',
              cursor: 'pointer',
              textAlign: 'center',
              fontWeight: !selectedCluster ? 'bold' : '500',
              color: !selectedCluster ? '#C4956A' : '#4a5568',
              transition: 'all 0.2s',
              fontSize: '13px',
            }}
          >
            All Areas
          </div>

          {clusters.map((cluster) => (
            <div
              key={cluster}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCluster(cluster);
                if (closeTab) closeTab();
              }}
              style={{
                padding: '10px 8px',
                borderRadius: '8px',
                border:
                  selectedCluster === cluster
                    ? '2px solid #C4956A'
                    : '1px solid #e2e8f0',
                backgroundColor: selectedCluster === cluster ? '#fff7ed' : '#fff',
                cursor: 'pointer',
                textAlign: 'center',
                fontWeight: selectedCluster === cluster ? 'bold' : '500',
                color: selectedCluster === cluster ? '#C4956A' : '#4a5568',
                transition: 'all 0.2s',
                fontSize: '13px',
              }}
            >
              {cluster}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHomeSearchPanel = () => {
    if (!activeTab) return null;

    return (
      <div
        className={`home-expanded-panel ${activeTab}-panel`}
        style={getPanelStyle()}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => {
          e.stopPropagation();
        }}
        onTouchMove={(e) => {
          e.stopPropagation();
        }}
      >
        {activeTab === 'location' && (
          <div>
            <h3 style={{ marginBottom: '10px', color: '#493829', fontWeight: 700 }}>
              Popular destinations
            </h3>

            <ClusterSelector
              selectedCluster={selectedCluster}
              setSelectedCluster={setSelectedCluster}
              closeTab={() => setActiveTab(null)}
            />
          </div>
        )}

        {(activeTab === 'checkin' || activeTab === 'checkout') && (
          <DualMonthCalendar
            checkIn={bookingData.checkIn}
            checkOut={bookingData.checkOut}
            minDate={new Date().toISOString().split('T')[0]}
            onCheckInChange={(value) => handleInputChange('checkIn', value)}
            onCheckOutChange={(value) => handleInputChange('checkOut', value)}
            onClear={clearDates}
            selecting={calendarSelecting}
            setSelecting={setCalendarSelecting}
          />
        )}

        {activeTab === 'guests' && (
          <div>
            <h3 style={{ marginBottom: '14px', color: '#493829', fontWeight: 700 }}>
              Who&apos;s coming?
            </h3>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid #E8E1D9',
              }}
            >
              <div>
                <p style={{ fontWeight: 700, color: '#493829', margin: 0 }}>Adults</p>
                <p style={{ fontSize: '12px', color: '#7A6555', margin: 0 }}>Ages 13+</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() =>
                    setBookingData((prev) => ({
                      ...prev,
                      adults: Math.max(1, prev.adults - 1),
                    }))
                  }
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid #C4956A',
                    color: '#C4956A',
                    background: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  -
                </button>

                <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 700 }}>
                  {bookingData.adults}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setBookingData((prev) => ({
                      ...prev,
                      adults: prev.adults + 1,
                    }))
                  }
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid #C4956A',
                    color: '#C4956A',
                    background: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
              }}
            >
              <div>
                <p style={{ fontWeight: 700, color: '#493829', margin: 0 }}>Children</p>
                <p style={{ fontSize: '12px', color: '#7A6555', margin: 0 }}>Ages 2-12</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() =>
                    setBookingData((prev) => ({
                      ...prev,
                      children: Math.max(0, prev.children - 1),
                    }))
                  }
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid #C4956A',
                    color: '#C4956A',
                    background: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  -
                </button>

                <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 700 }}>
                  {bookingData.children}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setBookingData((prev) => ({
                      ...prev,
                      children: prev.children + 1,
                    }))
                  }
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid #C4956A',
                    color: '#C4956A',
                    background: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const [mousePos, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let animationFrameId;

    const handleMouseMove = (e) => {
      animationFrameId = requestAnimationFrame(() => {
        setMousePosition({ x: e.clientX, y: e.clientY });
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const { scrollYProgress } = useScroll();

  const stackRef = useRef(null);
  const { scrollYProgress: stackProgress } = useScroll({
    target: stackRef,
    offset: ['start end', 'start start'],
  });

  const heroY = useTransform(scrollYProgress, [0, 0.5], ['0%', '30%']);
  const adParallaxY = useTransform(scrollYProgress, [0.2, 0.6], ['-20%', '0%']);

  const adData = {
    title: 'Sarawak Rainforest World Music Festival',
    subtitle: 'Experience the rhythm of the jungle. Get your early bird tickets now.',
    cta: 'Book Tickets',
    img: HOME_IMAGES.adBanner,
    link: 'https://rwmf.net/',
  };

  const bentoDestinations = [
    {
      name: 'Bako National Park',
      tag: 'Wildlife & Rainforest',
      size: 'big',
      img: HOME_IMAGES.bako,
    },
    {
      name: 'Gunung Mulu',
      tag: 'UNESCO Heritage',
      size: 'wide',
      img: HOME_IMAGES.mulu,
    },
    {
      name: 'Damai Beach',
      tag: 'Coastal Escape',
      size: '',
      img: HOME_IMAGES.damai,
    },
    {
      name: 'Semenggoh',
      tag: 'Orangutan Sanctuary',
      size: '',
      img: HOME_IMAGES.semenggoh,
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Jenkins',
      avatar: null,
      location: 'UK',
      text: 'Booking through CAMS was seamless. The homestay in Kuching gave us an incredible, authentic Sarawak experience!',
    },
    {
      name: 'Ahmad Fazil',
      avatar: null,
      location: 'KL',
      text: 'The interactive map made planning our road trip so easy. Highly recommend the properties in Mulu.',
    },
    {
      name: 'Elena Rossi',
      avatar: null,
      location: 'Italy',
      text: 'Beautiful platform with amazing customer support. Our stay at the longhouse was unforgettable.',
    },
  ];

  const loopedTestimonials = [...testimonials, ...testimonials, ...testimonials];
  const heroWords = 'YOUR STORY BEGINS IN SARAWAK.'.split(' ');

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const slideUpItem = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
  <AuthProvider>
    <>
      <Navbar />

      <div className="relative font-sans bg-[#1a140f] selection:bg-[#C4956A] selection:text-white Home_Container_Main">
        <div
          className="custom-cursor hidden md:block"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
          }}
        />

          {/* HERO SECTION */}
          <section className="fixed top-0 left-0 h-screen w-full overflow-hidden z-0 flex">
            <motion.div
              style={{
                y: heroY,
              }}
              className="absolute inset-0 w-full h-full origin-bottom"
            >
            <motion.img
              initial={{ scale: 1 }}
              animate={{ scale: 1.08 }}
              transition={{ duration: 8, ease: 'easeOut' }}
              src={HOME_IMAGES.hero}
              alt="Sarawak Hero"
              className="w-full h-full object-cover opacity-70"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#1a140f] via-transparent to-black/40" />
          </motion.div>

          <div className="relative z-10 flex flex-col justify-end h-full px-6 md:px-16 w-full max-w-7xl mx-auto pb-16 md:pb-24">
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 },
                },
              }}
              className="home-hero-title"
            >
              {heroWords.map((word, index) => (
                <motion.span
                  key={`${word}-${index}`}
                  variants={slideUpItem}
                className={`home-hero-word ${
  word === 'SARAWAK.' ? 'home-hero-word-accent' : ''
}`}
                >
                  {word}
                </motion.span>
              ))}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="home-hero-subtitle"
            >
              Explore the land of hornbills, ancient caves, and living traditions. Find
              your perfect homestay today.
            </motion.p>

            <motion.a
              href="#explore"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="home-hero-button hoverable"
            >
              Find a Stay
            </motion.a>
          </div>
        </section>

       <main
  id="explore"
  ref={stackRef}
  className="relative z-10 w-full mt-[100vh] bg-[#F5F0E8] rounded-t-[3rem] shadow-[0_-30px_70px_rgba(26,20,15,0.45)] flex flex-col items-center pb-0 home-stacked-main"
>
          <StackCard scrollProgress={stackProgress}>
          <section className="home-map-section w-full relative flex flex-col items-center rounded-t-[3rem]">
            <div
              ref={searchShellRef}
              className="absolute top-8 left-1/2 -translate-x-1/2 z-30 home-search-shell"
            >
              <div className="flex w-full md:w-auto flex-1">
                <div
                  ref={locationRef}
                  className={`home-search-field hoverable cursor-pointer ${activeTab === 'location' ? 'active' : ''}`}
                  onClick={() => handleTabClick('location')}
                >
                  <label className="block text-[10px] font-bold uppercase text-[#7A6555] tracking-widest">
                    Where
                  </label>

                  <div className="w-full text-sm outline-none text-[#2C2016] bg-transparent mt-1 font-medium cursor-pointer flex items-center gap-2">
                    <IoLocationSharp />
                    <span>{selectedCluster || 'Search destinations'}</span>
                  </div>
                </div>

                <div
                  ref={checkinRef}
                  className={`home-search-field hoverable cursor-pointer ${activeTab === 'checkin' ? 'active' : ''}`}
                  onClick={() => handleTabClick('checkin')}
                >
                  <label className="block text-[10px] font-bold uppercase text-[#7A6555] tracking-widest">
                    Check in
                  </label>

                  <div className="w-full text-sm outline-none text-[#2C2016] bg-transparent mt-1 font-medium cursor-pointer flex items-center gap-2">
                    <CiCalendarDate />
                    <span>{bookingData.checkIn ? formatDisplayDate(bookingData.checkIn) : 'dd/mm/yyyy'}</span>
                  </div>
                </div>

                <div
                  ref={checkoutRef}
                  className={`home-search-field hoverable cursor-pointer ${activeTab === 'checkout' ? 'active' : ''}`}
                  onClick={() => handleTabClick('checkout')}
                >
                  <label className="block text-[10px] font-bold uppercase text-[#7A6555] tracking-widest">
                    Check out
                  </label>

                  <div className="w-full text-sm outline-none text-[#2C2016] bg-transparent mt-1 font-medium cursor-pointer flex items-center gap-2">
                    <CiCalendarDate />
                    <span>{bookingData.checkOut ? formatDisplayDate(bookingData.checkOut) : 'dd/mm/yyyy'}</span>
                  </div>
                </div>

                <div
                  ref={guestsRef}
                  className={`home-search-field hoverable cursor-pointer ${activeTab === 'guests' ? 'active' : ''}`}
                  onClick={() => handleTabClick('guests')}
                >
                  <label className="block text-[10px] font-bold uppercase text-[#7A6555] tracking-widest">
                    Who
                  </label>

                  <div className="w-full text-sm outline-none text-[#2C2016] bg-transparent mt-1 font-medium cursor-pointer flex items-center gap-2">
                    <HiUsers />
                    <span>
                      {bookingData.adults} adults, {bookingData.children} children
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleHomeSearch}
                className="home-search-button hoverable"
                aria-label="Search rooms"
              >
                <FaSearch />
              </button>

              {renderHomeSearchPanel()}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12 mt-24 w-full max-w-7xl mx-auto"
            >
              <span className="inline-block text-[#C4956A] text-xs font-bold uppercase tracking-widest mb-3 bg-white/60 backdrop-blur-sm border border-[#E8E1D9] px-4 py-1.5 rounded-full shadow-sm">
                Explore by Region
              </span>

              <h2 className="font-serif text-4xl md:text-5xl font-semibold text-[#493829]">
                Find your perfect stay
              </h2>
            </motion.div>

            <div className="home-map-wrap">
              <Sarawak_Map setWhereQuery={setSelectedCluster} />
            </div>
          </section>
          </StackCard>

          {/* AD BANNER */}
          <section
            className="w-full h-[500px] relative flex items-center justify-center cursor-pointer overflow-hidden group hoverable"
            onClick={() => {
              window.open(adData.link, '_blank', 'noopener,noreferrer');
            }}
          >
            <motion.div
              style={{
                y: adParallaxY,
                backgroundImage: `url(${adData.img})`,
              }}
              className="absolute top-0 left-0 w-full h-[130%] bg-cover bg-center transition-transform duration-[1.5s] group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

            <div className="relative z-10 flex flex-col justify-center h-full px-6 md:px-16 w-full max-w-7xl mx-auto">
              <span className="text-[#C4956A] font-bold uppercase tracking-widest text-xs mb-4 inline-block px-4 py-1 border border-[#C4956A] rounded-full w-fit bg-black/20 backdrop-blur-sm">
                Featured Event
              </span>

              <h2 className="font-serif text-4xl md:text-6xl text-white font-bold leading-tight max-w-3xl mb-6">
                {adData.title}
              </h2>

              <p className="text-lg md:text-xl text-white/80 font-light max-w-xl mb-10">
                {adData.subtitle}
              </p>

              <button
                type="button"
                className="bg-white text-black px-8 py-3 rounded-full font-bold uppercase tracking-wide w-fit hoverable"
              >
                {adData.cta}
              </button>
            </div>
          </section>

          {/* AVAILABLE PROPERTIES */}
          <section className="home-content-section w-full py-32 px-6 bg-white border-b border-[#E8E1D9]">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-end mb-12">
                <div>
                  <h2 className="font-serif text-3xl md:text-4xl text-[#493829] font-semibold mb-2">
                    Available Properties
                  </h2>
                  <div className="h-[2px] w-16 bg-[#C4956A] mb-4" />
                  <p className="text-[#7A6555] text-base md:text-lg">
                    Highly rated stays across Sarawak.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={goToRooms}
                  className="hidden md:flex border border-[#C4956A] text-[#C4956A] px-6 py-2 rounded-full text-sm font-semibold items-center gap-2 hoverable hover:bg-[#C4956A] hover:text-white transition-colors"
                >
                  View All <span className="text-lg">→</span>
                </button>
              </div>

              {isPropertiesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E8E1D9]"
                    >
                      <div className="h-56 bg-gray-200 animate-pulse" />
                      <div className="p-6">
                        <div className="h-5 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2 mb-6" />
                        <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : featuredProperties.length > 0 ? (
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-100px' }}
                  variants={staggerContainer}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                  {featuredProperties.map((property) => (
                    <motion.div
                      key={property.propertyid}
                      variants={slideUpItem}
                      onClick={() => handleViewDetails(property)}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer border border-[#E8E1D9] hoverable"
                    >
                      <div className="h-56 overflow-hidden relative">
                       {getSafePropertyImages(property).length > 0 ? (
  <ImageSlider
    images={getSafePropertyImages(property)}
    onClick={(e) => e.stopPropagation()}
  />
) : (
  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
    No images available
  </div>
)}
                      </div>

                      <div className="p-6">
                        <div className="flex justify-between items-start mb-2 gap-3">
                          <h3 className="font-semibold text-lg text-[#2C2016] truncate pr-2">
                            {property.propertyaddress || 'Unnamed Property'}
                          </h3>

                          <span className="flex items-center text-sm font-bold text-[#493829] shrink-0">
                            {property.rating ? (
                              <>
                                {Number.isInteger(property.rating)
                                  ? property.rating.toFixed(1)
                                  : Number(property.rating).toFixed(2).replace(/\.?0+$/, '')}
                                <FaStar className="text-[#C4956A] ml-1" />
                              </>
                            ) : (
                              <span className="text-gray-400 font-normal italic text-xs">
                                No reviews
                              </span>
                            )}
                          </span>
                        </div>

                        <p className="text-sm text-[#7A6555] mb-6">
                          {property.clustername || 'Sarawak'}
                        </p>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(property);
                          }}
                          className="w-full border border-[#C4956A] text-[#C4956A] rounded-xl py-3 text-sm font-semibold transition-colors hoverable group-hover:bg-[#C4956A] group-hover:text-white"
                        >
                          Select dates for price
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-12 bg-[#F8F4EF] rounded-2xl border border-[#E8E1D9]">
                  <p className="text-[#7A6555] font-medium">No available properties found.</p>
                </div>
              )}
            </div>
          </section>

          {/* BENTO DESTINATIONS */}
          <section className="curated-section">
            <div className="curated-inner">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                variants={staggerContainer}
                className="curated-header"
              >
                <motion.div variants={slideUpItem}>
                  <h2 className="curated-title">
                    Curated
                    <br />
                    Experiences.
                  </h2>
                  <div className="h-[2px] w-24 bg-[#C4956A]" />
                </motion.div>

                <motion.button
                  type="button"
                  variants={slideUpItem}
                  onClick={() => {
                    window.open(
                      'https://www.sarawaktourism.com/web/home/index/',
                      '_blank',
                      'noopener,noreferrer'
                    );
                  }}
                  className="curated-button hoverable"
                >
                  Discover Attractions
                  <span className="text-xl transform group-hover:translate-x-2 transition-transform">
                    →
                  </span>
                </motion.button>
              </motion.div>

              <div className="curated-grid">
                {bentoDestinations.map((dest, index) => (
                  <motion.div
                    key={`${dest.name}-${index}`}
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.15,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`curated-card hoverable ${dest.size}`}
                  >
                   <img
                      src={dest.img}
                      alt={dest.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                      decoding="async"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#2C2016]/90 via-black/20 to-transparent opacity-0 group-hover:opacity-90 transition-opacity duration-500" />

                    <div className="curated-card-content">
                      <span className="text-[#C4956A] text-xs font-bold uppercase tracking-widest mb-2 block">
                        {dest.tag}
                      </span>
                      <h3 className="font-serif text-2xl md:text-3xl text-white font-semibold">
                        {dest.name}
                      </h3>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* TESTIMONIALS & STATS */}
          <section className="w-full bg-[#F5F0E8] py-32 border-b border-[#E8E1D9] overflow-hidden relative">
            <div
              className="absolute inset-0 opacity-[0.15] pointer-events-none z-0"
              style={{
                backgroundImage: 'radial-gradient(#493829 1.5px, transparent 1.5px)',
                backgroundSize: '24px 24px',
              }}
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={staggerContainer}
              className="max-w-7xl mx-auto px-6 mb-16 flex flex-col items-center relative z-10"
            >
              <motion.span
                variants={slideUpItem}
                className="text-[#C4956A] text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4 inline-block bg-white/80 backdrop-blur-sm border border-[#E8E1D9] shadow-sm"
              >
                Community & Trust
              </motion.span>

              <motion.h2
                variants={slideUpItem}
                className="font-serif text-4xl md:text-5xl text-[#493829] font-bold text-center mb-6"
              >
                Stories from our guests
              </motion.h2>

              <motion.div
                variants={slideUpItem}
                className="h-[2px] w-16 bg-[#C4956A] mb-8"
              />

              <motion.div
                variants={staggerContainer}
                className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl mt-8"
              >
                <StatItem end={500} label="Happy Guests" suffix="+" />
                <StatItem end={12} label="Regions Covered" />
                <StatItem end={4.9} label="Avg Rating" suffix="★" isFloat />
                <StatItem end={3} label="Years Running" suffix="+" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
              className="marquee-container hoverable relative z-10 mt-12"
            >
              <div className="marquee-content">
                {loopedTestimonials.map((review, index) => (
                  <div
                    key={`${review.name}-${index}`}
                    className="bg-white p-8 rounded-3xl shadow-sm border border-[#E8E1D9] w-[380px] shrink-0 cursor-default transition-shadow hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex text-[#C4956A] mb-5 text-sm">★★★★★</div>
                      <p className="text-[#493829] italic mb-6 leading-relaxed text-sm md:text-base">
                        "{review.text}"
                      </p>
                    </div>

                    <div className="flex items-center gap-4 mt-auto pt-4 border-t border-gray-100">
                      <Avatar src={review.avatar} name={review.name} />

                      <div>
                        <h4 className="font-semibold text-[#2C2016] text-sm">
                          {review.name}
                        </h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
                          {review.location}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* APP SECTION */}
<section
  ref={appSectionRef}
  className="w-full min-h-[700px] py-24 relative overflow-hidden flex items-center bg-[#251D16]"
>            {/* Extremely subtle motif */}
            <div
              className="absolute inset-0 opacity-[0.02] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Softer, more dispersed glow */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C4956A]/5 blur-[150px] rounded-full pointer-events-none"
            />

            {/* Centered layout container */}
            <div className="relative z-10 max-w-5xl mx-auto px-6 w-full flex flex-col md:flex-row items-center justify-center gap-16 lg:gap-24">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
                variants={staggerContainer}
                className="w-full md:w-1/2 text-left flex flex-col items-start"
              >
                <motion.h2
                  variants={slideUpItem}
                  className="font-serif text-5xl md:text-7xl text-white font-semibold leading-tight mb-6"
                >
                  Sarawak,
                  <br />
                  in your pocket.
                </motion.h2>

                <motion.p
                  variants={slideUpItem}
                  className="font-sans text-white/80 text-lg leading-relaxed mb-10 max-w-md"
                >
                  Manage your homestay bookings, receive instant notifications, and chat
                  with property owners directly from your pocket.
                </motion.p>

               <motion.button
  type="button"
  variants={slideUpItem}
  onClick={handleOpenApkPopup}
  className="google-play-btn hoverable"
>
                <svg
                  viewBox="0 0 24 24"
                  width="28"
                  height="28"
                  fill="currentColor"
                >
<path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
        </svg>

                <div className="text-left">
                  <div className="text-[10px] leading-none uppercase tracking-wider font-semibold google-play-label">
                    Download as
                  </div>
                  <div className="text-[17px] font-bold leading-tight tracking-wide font-sans">
                    APK
                  </div>
                </div>
              </motion.button>
              </motion.div>

              {showApkPopup && (
  <div className="apk-popup-overlay" onClick={() => setShowApkPopup(false)}>
    <motion.div
  ref={apkPopupRef}
  className="apk-popup-card"
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="apk-popup-close"
        onClick={() => setShowApkPopup(false)}
      >
        ×
      </button>

      <div className="apk-popup-icon">
        <svg
          viewBox="0 0 24 24"
          width="34"
          height="34"
          fill="currentColor"
        >
<path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
        </svg>
      </div>

      <h3>Download CAMS Mobile App</h3>

      <p>
        Install the Android APK to manage bookings, receive notifications,
        and contact property owners from your phone.
      </p>

      <div className="apk-popup-note">
        Android may ask you to allow installation from your browser.
      </div>

      <div className="apk-popup-actions">
        <a
  href={APK_DOWNLOAD_LINK}
  target="_blank"
  rel="noopener noreferrer"
  className="apk-download-btn"
  onClick={() => setShowApkPopup(false)}
>
  Download APK
</a>

        <button
          type="button"
          className="apk-copy-btn"
          onClick={() => {
            navigator.clipboard.writeText(APK_DOWNLOAD_LINK);
            alert('APK link copied!');
          }}
        >
          Copy Link
        </button>
      </div>
    </motion.div>
  </div>
)}


              <PhoneMockup />
            </div>
          </section>

          <div className="w-full bg-[#1a140f] z-50 relative">
            <Footer />
          </div>
        </main>

        <Back_To_Top_Button />
        <TawkMessenger />
      </div>
    </>
  </AuthProvider>
);
};

export default Home;