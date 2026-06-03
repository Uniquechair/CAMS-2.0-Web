import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

  import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
  import { useLocation, useNavigate } from 'react-router-dom';
  import { IoIosArrowBack, IoIosArrowForward, IoIosBed } from "react-icons/io";
  import { IoMdClose } from "react-icons/io";
  import { IoReturnUpBackOutline } from "react-icons/io5";
  import { GiWashingMachine, GiClothesline, GiDesert  } from "react-icons/gi";
  import { PiSecurityCamera } from "react-icons/pi";
  import { SiLightning } from "react-icons/si";
  import { TbPawFilled, TbPawOff } from "react-icons/tb";
  import { MdLandscape, MdOutlineKingBed, MdFireplace, MdSmokingRooms, MdOutlineLocalFireDepartment } from "react-icons/md"; 
  import { FaUser, FaMapMarkerAlt, FaWifi, FaDesktop, FaDumbbell, FaWater, FaSkiing, FaChargingStation, FaParking, FaStar, FaRegStar, FaSwimmingPool, FaTv, FaUtensils, FaSnowflake, FaSmokingBan, FaFireExtinguisher, FaFirstAid, FaShower, FaCoffee, FaUmbrellaBeach, FaBath, FaWind, FaBicycle, FaBabyCarriage, FaKey, FaBell, FaTree, FaCity, FaWalking, FaThumbsUp, FaThumbsDown, FaCarSide, FaExclamationCircle, FaCheck, FaImages, FaTrashAlt, FaCheckCircle, FaDoorOpen } from "react-icons/fa";
  import { FcGoogle } from "react-icons/fc";
  import { FaPaypal } from "react-icons/fa";

  import { AuthProvider } from '../../../Component/AuthContext/AuthContext';
 import Navbar from '../../../Component/Navbar/navbar';
import Toast from '../../../Component/Toast/Toast';
import Footer from '../../../Component/Footer/footer';
import Back_To_Top_Button from '../../../Component/Back_To_Top_Button/Back_To_Top_Button';
import './PropertyDetails.css';

  import {
    createReservation,
    requestBooking,
    getCoordinates,
    fetchUserData,
    checkDateOverlap,
    googleLogin,
    calculateBookingPrice,
    fetchCart,
    fetchProduct,
    getPropertyOwnerPayPalId,
    paymentSuccess,
    updateReservationStatus,
    fetchReservation,
    submitReview
  } from '../../../../Api/api';
  import { useGoogleLogin } from '@react-oauth/google';
  import { useQuery, useQueryClient } from '@tanstack/react-query';

  const facilities = [
    { name: "Wi-Fi", icon: <FaWifi className="facilities-icon"/> },
    { name: "Kitchen", icon: <FaUtensils className="facilities-icon"/> },
    { name: "Washer", icon: <GiWashingMachine className="facilities-icon"/> },
    { name: "Dryer", icon: <GiClothesline className="facilities-icon" /> },
    { name: "Air Conditioning", icon: <FaSnowflake className="facilities-icon"/> },
    { name: "Heating", icon: <FaWind className="facilities-icon"/> },
    { name: "Dedicated workspace", icon: <FaDesktop className="facilities-icon"/> },
    { name: "TV", icon: <FaTv className="facilities-icon"/> },
    { name: "Free Parking", icon: <FaParking className="facilities-icon"/> },
    { name: "Swimming Pool", icon: <FaSwimmingPool className="facilities-icon"/> },
    { name: "Bathtub", icon: <FaBath className="facilities-icon"/> },
    { name: "Shower", icon: <FaShower className="facilities-icon"/> },
    { name: "EV charger", icon: <FaChargingStation className="facilities-icon"/> },
    { name: "Baby Crib", icon: <FaBabyCarriage className="facilities-icon"/> },
    { name: "King bed", icon: <MdOutlineKingBed className="facilities-icon"/> },
    { name: "Gym", icon: <FaDumbbell className="facilities-icon"/> },
    { name: "Breakfast", icon: <FaCoffee className="facilities-icon"/> },
    { name: "Indoor fireplace", icon: <MdFireplace className="facilities-icon"/> },
    { name: "Smoking allowed", icon: <MdSmokingRooms className="facilities-icon"/> },
    { name: "No Smoking", icon: <FaSmokingBan className="facilities-icon"/> },
    { name: "City View", icon: <FaCity className="facilities-icon"/> },
    { name: "Garden", icon: <FaTree className="facilities-icon"/> },
    { name: "Bicycle Rental", icon: <FaBicycle className="facilities-icon"/> },
    { name: "Beachfront", icon: <FaUmbrellaBeach className="facilities-icon"/> },
    { name: "Waterfront", icon: <FaWater className="facilities-icon"/> },
    { name: "Countryside", icon: <MdLandscape className="facilities-icon"/> },
    { name: "Ski-in/ski-out", icon: <FaSkiing className="facilities-icon"/> },
    { name: "Desert", icon: <GiDesert className="facilities-icon"/> },
    { name: "Security Alarm", icon: <FaBell className="facilities-icon"/> },
    { name: "Fire Extinguisher", icon: <FaFireExtinguisher className="facilities-icon"/> },
    { name: "First Aid Kit", icon: <FaFirstAid className="facilities-icon"/> },
    { name: "Security Camera", icon: <PiSecurityCamera className="facilities-icon"/> },
    { name: "Instant booking", icon: <SiLightning className="facilities-icon"/> },
    { name: "Self check-in", icon: <FaKey className="facilities-icon"/> },
    { name: "Pets Allowed", icon: <TbPawFilled className="facilities-icon"/> },
    { name: "No Pets", icon: <TbPawOff className="facilities-icon"/> }
  ];

  // Helper to safely format image source
  const getSafeImageSrc = (imgStr) => {
      if (!imgStr) return '';
      if (imgStr.startsWith('http')) return imgStr;
      if (imgStr.startsWith('data:image')) return imgStr;
      return `data:image/jpeg;base64,${imgStr}`;
  };

  const getSafeImageArray = (images) => {
  if (Array.isArray(images)) {
    return images.filter(Boolean);
  }

  if (typeof images === 'string' && images.trim()) {
    try {
      const parsed = JSON.parse(images);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch (error) {
      return images.split(',').map((img) => img.trim()).filter(Boolean);
    }

    return [images];
  }

  return [];
};

  const getApiUrl = (path) => {
    const rawBase = (import.meta.env.VITE_API_URL || '').trim();

    // If VITE_API_URL is full URL, use it.
    if (rawBase.startsWith('http://') || rawBase.startsWith('https://')) {
      return `${rawBase.replace(/\/$/, '')}${path}`;
    }

    // If VITE_API_URL is like "/api", this still works on live domain.
    if (rawBase.startsWith('/')) {
      return `${window.location.origin}${rawBase}${path}`;
    }

    // Local development fallback.
    return `http://localhost:8080${path}`;
  };

  const authJsonFetch = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    return response;
  };

const fetchFullPropertyDetails = async (propertyid) => {
  const response = await authJsonFetch(
    getApiUrl(`/property/${encodeURIComponent(propertyid)}?t=${Date.now()}`),
    {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to fetch full property details');
  }

  return data.property || data;
};

  const RoomCardImageSlider = ({ images, fallbackImage, onImageClick, width = '100%', height = '200px' }) => {
      const [currentIndex, setCurrentIndex] = useState(0);
      const displayImages = images && images.length > 0 ? images : [fallbackImage];

      const nextSlide = (e) => {
          e.stopPropagation();
          if (currentIndex < displayImages.length - 1) {
              setCurrentIndex((prev) => prev + 1);
          }
      };

      const prevSlide = (e) => {
          e.stopPropagation();
          if (currentIndex > 0) {
              setCurrentIndex((prev) => prev - 1);
          }
      };

      return (
          <div style={{ position: 'relative', width: width, height: height, borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
              <img 
                  src={getSafeImageSrc(displayImages[currentIndex])} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                  alt="Room" 
                  onClick={(e) => { 
                      e.stopPropagation(); 
                      if (onImageClick) onImageClick(currentIndex, displayImages); 
                  }}
              />
              <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🔍 Click to view more
              </div>
              {displayImages.length > 1 && (
                  <>
                      {currentIndex > 0 && (
                          <button type="button" onClick={prevSlide} style={{ position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', padding: 0 }}>
                              <IoIosArrowBack size={14} color="#333"/>
                          </button>
                      )}
                      {currentIndex < displayImages.length - 1 && (
                          <button type="button" onClick={nextSlide} style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', padding: 0 }}>
                              <IoIosArrowForward size={14} color="#333"/>
                          </button>
                      )}
                      <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', pointerEvents: 'none' }}>
                          {currentIndex + 1}/{displayImages.length}
                      </div>
                  </>
              )}
          </div>
      );
  };

  // --- SYNCED FETCH FOR GLOBAL PRICING SETTINGS ---
  const fetchPricingSettings = async () => {
    try {
      const res = await authJsonFetch(getApiUrl('/pricing-settings'));

      if (res.ok) {
        const data = await res.json();

        return {
          sstRate:
            data.sstRate !== undefined
              ? parseFloat(data.sstRate)
              : data.sst_rate !== undefined
                ? parseFloat(data.sst_rate)
                : 0.08,

          depositRate:
            data.depositRate !== undefined
              ? parseFloat(data.depositRate)
              : data.deposit_rate !== undefined
                ? parseFloat(data.deposit_rate)
                : 0.10,
        };
      }
    } catch (error) {
      console.error("Failed to load global pricing settings:", error);
    }

    return { sstRate: 0.08, depositRate: 0.10 };
  };

const CustomCalendar = ({
  value,
  onChange,
  minDate,
  placeholder,
  label,
  disabled = false,
  alignRight = false,
  blackoutRanges = [],
  soldOutDates = [],
  defaultViewDate = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getInitialViewDate = () => {
    const dateToUse = value || defaultViewDate || minDate;

    if (dateToUse) {
      const safeDate = toSafeIsoDate(dateToUse);

      if (safeDate) {
        const d = new Date(`${safeDate}T00:00:00`);
        if (!Number.isNaN(d.getTime())) return d;
      }
    }

    return new Date();
  };

  const [viewYear, setViewYear] = useState(() => getInitialViewDate().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => getInitialViewDate().getMonth());

  const syncCalendarView = () => {
    const dateToUse = value || defaultViewDate || minDate;
    const safeDate = toSafeIsoDate(dateToUse);

    if (!safeDate) return;

    const d = new Date(`${safeDate}T00:00:00`);

    if (!Number.isNaN(d.getTime())) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  };
    const wrapperRef = useRef(null);

    useEffect(() => {
      const handleOutside = (e) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
      };
      if (isOpen) document.addEventListener('mousedown', handleOutside);
      return () => document.removeEventListener('mousedown', handleOutside);
    }, [isOpen]);

  useEffect(() => {
    syncCalendarView();
  }, [value, defaultViewDate, minDate]);

    const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const firstDay = (y, m) => new Date(y, m, 1).getDay();

    const prevMonth = (e) => {
      e.stopPropagation();
      setViewMonth(m => { if (m === 0) { setViewYear(y => y - 1); return 11; } return m - 1; });
    };

    const nextMonth = (e) => {
      e.stopPropagation();
      setViewMonth(m => { if (m === 11) { setViewYear(y => y + 1); return 0; } return m + 1; });
    };

    const handleDayClick = (day) => {
      const selected = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      onChange(selected);
      setIsOpen(false);
    };

    const getDateStr = (day) => `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isDayDisabled = (day) => minDate && getDateStr(day) < minDate;
    const isDaySelected = (day) => value && getDateStr(day) === value;
    const isToday = (day) => getDateStr(day) === new Date().toISOString().split('T')[0];
const isDayBlackout = (day) => {
  const dateStr = getDateStr(day);

  return (blackoutRanges || []).some((blackout) => {
    const start = blackout.start_date || blackout.startDate;
    const end = blackout.end_date || blackout.endDate || start;

    if (!start) return false;

    const normalizedStart = String(start).slice(0, 10);
    const normalizedEnd = String(end).slice(0, 10);

    return normalizedStart <= dateStr && normalizedEnd >= dateStr;
  });
};

  const isDaySoldOut = (day) => {
  const dateStr = getDateStr(day);

  return (soldOutDates || []).some((date) => {
    const normalizedDate = String(date).includes('T')
      ? String(date).split('T')[0]
      : String(date).slice(0, 10);

    return normalizedDate === dateStr;
  });
};

    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    const displayValue = value ? (() => { const [y,m,d] = value.split('-'); return `${d}/${m}/${y}`; })() : '';

    return (
      <div ref={wrapperRef} style={{ position: 'relative', flex: 1 }}>
  <div
    onClick={() => {
      if (disabled) return;

      setIsOpen((open) => {
        const nextOpen = !open;

        if (nextOpen) {
          syncCalendarView();
        }

        return nextOpen;
      });
    }}
    style={{ padding: '8px 10px', cursor: disabled ? 'default' : 'pointer' }}
  >
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#4a5568', textTransform: 'uppercase', marginBottom: '4px' }}>
            {label}
          </div>
          <div style={{ fontSize: '13px', color: displayValue ? '#333' : '#aaa' }}>
            {displayValue || placeholder}
          </div>
        </div>

        {isOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)',
            ...(alignRight ? { right: 0 } : { left: 0 }),
            zIndex: 9999, backgroundColor: '#fff',
            border: '1px solid #ddd', borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '14px', width: '272px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button type="button" onClick={prevMonth} style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center' }}>
                <IoIosArrowBack size={14} />
              </button>
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{MONTHS[viewMonth]} {viewYear}</span>
              <button type="button" onClick={nextMonth} style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center' }}>
                <IoIosArrowForward size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '6px' }}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', fontWeight: '700', padding: '3px 0' }}>{d}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {[...Array(firstDay(viewYear, viewMonth))].map((_, i) => <div key={`e${i}`} />)}
              {[...Array(daysInMonth(viewYear, viewMonth))].map((_, i) => {
             const day = i + 1;
              const blackoutDay = isDayBlackout(day);
              const soldOutDay = isDaySoldOut(day);
              const off = isDayDisabled(day) || blackoutDay || soldOutDay;
              const sel = isDaySelected(day);
              const tod = isToday(day);
                return (
                  <div
                    key={day}
                    onClick={() => !off && handleDayClick(day)}
                    style={{
                      textAlign: 'center', padding: '7px 2px', borderRadius: '6px',
                      fontSize: '13px', cursor: off ? 'not-allowed' : 'pointer',
                      backgroundColor: sel
                      ? '#2563eb'
                      : soldOutDay
                        ? '#e5e7eb'
                        : blackoutDay
                          ? '#fee2e2'
                          : tod
                            ? '#eff6ff'
                            : 'transparent',

                    color: off
                      ? '#9ca3af'
                      : sel
                        ? '#fff'
                        : blackoutDay
                          ? '#b91c1c'
                          : tod
                            ? '#2563eb'
                            : '#1e293b',

                    border: soldOutDay && !sel
                      ? '1px solid #d1d5db'
                      : blackoutDay && !sel
                        ? '1px solid #fca5a5'
                        : '1px solid transparent',
                      fontWeight: sel ? 'bold' : 'normal',
                      transition: 'background 0.1s',
                      userSelect: 'none'
                    }}
                  onMouseEnter={e => {
                    if (!off && !sel && !blackoutDay && !soldOutDay) {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!off && !sel) {
                      e.currentTarget.style.backgroundColor = soldOutDay
                        ? '#e5e7eb'
                        : blackoutDay
                          ? '#fee2e2'
                          : 'transparent';
                    }
                  }}
                                  
                                  >
                    {day}
                  </div>
                );
              })}
                   </div>

            <div
              style={{
                marginTop: '12px',
                padding: '10px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: '#475569',
                  fontWeight: '700',
                  marginBottom: '8px'
                }}
              >
                Date guide
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: '#64748b',
                    fontWeight: '600'
                  }}
                >
                  <span
                    style={{
                      width: '13px',
                      height: '13px',
                      borderRadius: '4px',
                      backgroundColor: '#e5e7eb',
                      border: '1px solid #d1d5db',
                      display: 'inline-block'
                    }}
                  />
                  Sold out
                </span>

                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: '#64748b',
                    fontWeight: '600'
                  }}
                >
                  <span
                    style={{
                      width: '13px',
                      height: '13px',
                      borderRadius: '4px',
                      backgroundColor: '#fee2e2',
                      border: '1px solid #fca5a5',
                      display: 'inline-block'
                    }}
                  />
                  Unavailable
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  const toSafeIsoDate = (value) => {
    if (!value) return '';

    const raw = String(value).trim();
    if (!raw) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    const slashMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return `${year}-${month}-${day}`;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '';

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const getLocalTodayIsoDate = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const addDaysToIsoDate = (value, daysToAdd = 1) => {
    const isoDate = toSafeIsoDate(value);

    if (!isoDate) {
      return getLocalTodayIsoDate();
    }

    const [year, month, day] = isoDate.split('-').map(Number);

    if (!year || !month || !day) {
      return getLocalTodayIsoDate();
    }

    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + daysToAdd);

    if (Number.isNaN(date.getTime())) {
      return getLocalTodayIsoDate();
    }

    const nextYear = date.getFullYear();
    const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
    const nextDay = String(date.getDate()).padStart(2, '0');

    return `${nextYear}-${nextMonth}-${nextDay}`;
  };
  const PropertyDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient(); 
    
    // --- INSTANT MEMORY CACHE ---
    const priceCache = useRef({}); 
    const allResCache = useRef(null);
    const cartResCache = useRef(null);
    
    const propertyId = location.state?.propertyId;
    const searchDates = location.state?.searchDates || {};
    const passedCheckIn = searchDates.checkIn || location.state?.checkInDate || '';
    const passedCheckOut = searchDates.checkOut || location.state?.checkOutDate || '';
    const passedAdults = parseInt(searchDates.adults) || 1;
    const passedChildren = parseInt(searchDates.children) || 0;
    const passedGuests = passedAdults + passedChildren;
    
    const passedFilterRegion = location.state?.filterRegion || '';
const passedPricingInfo =
  location.state?.pricingInfo ||
  location.state?.propertyDetails?.preCalculatedPrice ||
  null;

    const bookingCardRef = useRef(null);
  const [allReviews, setAllReviews] = useState([]); 
  const [reviewSort, setReviewSort] = useState('latest');
  const [isEligibleToReview, setIsEligibleToReview] = useState(false);
  const [reviewState, setReviewState] = useState('loading'); 
    const [existingReviewId, setExistingReviewId] = useState(null);
    const [latestCheckout, setLatestCheckout] = useState(null);
    const [reviewText, setReviewText] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    
    const [subRatings, setSubRatings] = useState({ location: 0, cleanliness: 0, value: 0, facilities: 0, service: 0 });
    const [hoverSubRatings, setHoverSubRatings] = useState({ location: 0, cleanliness: 0, value: 0, facilities: 0, service: 0 });

    const userId = localStorage.getItem('userid') || localStorage.getItem('userId');
    const usergroup = localStorage.getItem('usergroup');
    const username = localStorage.getItem('username');
    // --- FETCH ALL RATES ---
  const { data: pricingSettings, isLoading: isPricingLoading } = useQuery({
        queryKey: ["pricingSettings"],
        queryFn: fetchPricingSettings,
    });

    const globalSstRate = pricingSettings?.sstRate ?? 0.08;
    const globalDepositRate = pricingSettings?.depositRate ?? 0.10;
    
    const [propertyDetails, setPropertyDetails] = useState(location.state?.propertyDetails || null);
    const [loading, setLoading] = useState(!location.state?.propertyDetails);
    const [error, setError] = useState(null);
    // Check current login and host permission
const isLoggedInUser =
  localStorage.getItem('isLoggedIn') === 'true' &&
  !!userId &&
  !!username;

const isPropertyHost =
  isLoggedInUser &&
  propertyDetails?.username &&
  String(username).trim().toLowerCase() ===
    String(propertyDetails.username).trim().toLowerCase();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [fullscreenImages, setFullscreenImages] = useState([]);
  const [imageZoom, setImageZoom] = useState(1);

  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [expandedRoomDesc, setExpandedRoomDesc] = useState({});

    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastType, setToastType] = useState('');
    const toastTimerRef = useRef(null); 
    
    // Payment countdown timer state
  const [countdownTimer, setCountdownTimer] = useState(5);

    // 5-minute payment session timer
    const [paymentCountdown, setPaymentCountdown] = useState(300);
    const paymentTimerRef = useRef(null);
    const paymentExpiredRef = useRef(false);
    const currentReservationIdRef = useRef(null); // tracks the reservation being paid

    const displayToast = (type, message, isSticky = false) => {
        setToastType(type);
        setToastMessage(message);
        setShowToast(true);
        
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
            toastTimerRef.current = null;
        }
        
        if (!isSticky) {
            toastTimerRef.current = setTimeout(() => setShowToast(false), 5000);
        }
    };
    
    const [checkIn, setCheckIn] = useState(passedCheckIn);
    const [checkOut, setCheckOut] = useState(passedCheckOut);
    
    const maxPropertyGuests = parseInt(propertyDetails?.propertyguestpaxno) || 10;
    const [guests, setGuests] = useState(Math.min(passedGuests, maxPropertyGuests));

    const [totalNights, setTotalNights] = useState(0);
    const [showBookingForm, setShowBookingForm] = useState(false);
    
    const [bookingForm, setBookingForm] = useState({
      title: 'Mr.', firstName: '', lastName: '', email: '', phoneNumber: '', additionalRequests: ''
    });
    const [paymentFormError, setPaymentFormError] = useState('');
    const [showBookingBlockedModal, setShowBookingBlockedModal] = useState(false);
    const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
const [blockedBookingTitle, setBlockedBookingTitle] = useState('Booking Window Closed');
const [blockedBookingMessage, setBlockedBookingMessage] = useState('');
const [blockedBookingDetails, setBlockedBookingDetails] = useState(null);

    
    const [showDescriptionOverlay, setShowDescriptionOverlay] = useState(false);
    const [locationCoords, setLocationCoords] = useState({ lat: null, lng: null });
    const [isDateOverlapping, setIsDateOverlapping] = useState(false);
    
    const [isInstantPayment, setIsInstantPayment] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState('idle');
    const [paymentError, setPaymentError] = useState('');
    const [payPalClientId] = useState(import.meta.env.VITE_PAYPAL_CLIENT_ID || 'AZwIftz_uEFyQ-OCopoy7MXW8pk-JKgH4IeLTKkpDXF3GjnpeSQ4am5NZxFeT4spij_sgxIv8DETjzux');
    const [propertyOwnerPayPalId, setPropertyOwnerPayPalId] = useState(null);
    const paypalOptions = useMemo(() => ({
  "client-id": payPalClientId,
  currency: "MYR",
  intent: "capture",
  components: "buttons",
  "disable-funding": "credit,card"
}), [payPalClientId]);

const paypalButtonStyle = useMemo(() => ({
  layout: "vertical",
  color: "blue",
  shape: "rect",
  label: "pay"
}), []);
    const [propertyBlackouts, setPropertyBlackouts] = useState([]);

    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    const [authPromptMode, setAuthPromptMode] = useState('deposit');

    const [isSoldOut, setIsSoldOut] = useState(false);
    const [isBlackedOut, setIsBlackedOut] = useState(false);
    const [roomsLeft, setRoomsLeft] = useState(propertyDetails ? parseInt(propertyDetails.quantity) || 1 : null); 
    const [roomAvailabilityMap, setRoomAvailabilityMap] = useState({});
    const [propertySoldOutDates, setPropertySoldOutDates] = useState([]);
const [isLoadingPropertySoldOutDates, setIsLoadingPropertySoldOutDates] = useState(false);

    const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);

  const [nearbyPlaces, setNearbyPlaces] = useState({
    walkable: [],
    landmarks: []
  });

  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState('');

    const [bookingData, setBookingData] = useState({
      checkIn: checkIn, checkOut: checkOut, adults: passedAdults, children: passedChildren, selectedRoom: null 
    });

    const [showAllFacilities, setShowAllFacilities] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

   const [breakdownData, setBreakdownData] = useState(() => {
  if (!passedPricingInfo) return null;

  return {
    totalPrice: Number(
      passedPricingInfo.totalPrice ??
      passedPricingInfo.total_price ??
      passedPricingInfo.total ??
      0
    )
  };
});

const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);

const [usedBaseRate, setUsedBaseRate] = useState(() => {
  if (!passedPricingInfo) return 0;

  return Number(
    passedPricingInfo.originalBase ??
    passedPricingInfo.price ??
    0
  );
});

    let description = propertyDetails?.propertydescription || "";
    let rawSetup = propertyDetails?.room_details || propertyDetails?.roomsetup || "";

    if (description.includes("_ROOMDATA_")) {
        const parts = description.split("_ROOMDATA_");
        description = parts[0];
        rawSetup = parts[1];
    }

const categoryName = String(propertyDetails?.categoryname || '').trim();

const isHotel = ['Hotel', 'Resort', 'Inn', 'Hostel'].includes(categoryName);

const isHomestay = ['Homestay', 'Kampungstay', 'Lodge', 'Guesthouse', 'Apartment'].includes(categoryName);
    let availableRooms = [];
    let isJsonInventory = false;
    
    try {
        if (typeof rawSetup === 'object' && rawSetup !== null) {
            availableRooms = rawSetup;
            isJsonInventory = true;
        } else if (typeof rawSetup === 'string' && rawSetup.startsWith('[')) {
            availableRooms = JSON.parse(rawSetup);
            isJsonInventory = true;
        } else if (isHotel && propertyDetails?.propertybedtype) {
            const beds = propertyDetails.propertybedtype.split(',').map(s => s.trim()).filter(Boolean);
            availableRooms = beds.map((bed, idx) => ({
                id: `legacy-${idx}`, name: bed, bedType: bed, maxGuests: propertyDetails?.propertyguestpaxno || 1, description: "", price: propertyDetails?.normalrate, images: []
            }));
            isJsonInventory = true; 
        }
        if (isJsonInventory) availableRooms.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } catch (e) {
        console.error("Setup parsing failed", e);
    }

    const getStoredUserId = () => {
      return localStorage.getItem('userid') || localStorage.getItem('userId') || '';
    };

   const normalizeDateString = (value) => {
  if (!value) return '';
  const rawValue = value instanceof Date ? value.toISOString() : String(value);
  return rawValue.slice(0, 10);
};

    const formatDisplayDate = (value) => {
      const normalized = normalizeDateString(value);
      if (!normalized) return '';
      const [year, month, day] = normalized.split('-');
      if (!year || !month || !day) return normalized;
      return `${day}/${month}/${year}`;
    };
    
  const formatFriendlyDate = (dateValue) => {
  if (!dateValue) return '-';

  const date = dateValue instanceof Date
    ? dateValue
    : new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatFriendlyDateTime = (dateValue) => {
  if (!dateValue) return '-';

  const date = dateValue instanceof Date
    ? dateValue
    : new Date(dateValue);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

  const normalizeRoomNameForBlackout = (value = '') => {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  };

  const getSelectedRoomNameForBlackout = () => {
    if (!bookingData.selectedRoom) return '';

    return (
      bookingData.selectedRoom.baseRoomName ||
      bookingData.selectedRoom.roomName ||
      bookingData.selectedRoom.name ||
      ''
    );
  };

  const isWholePropertyBlackout = (blackout) => {
    const roomName = normalizeRoomNameForBlackout(
      blackout.room_name ||
      blackout.roomName ||
      ''
    );

    return !roomName || roomName === 'all rooms' || roomName === 'all room';
  };

  const isBlackoutForSelectedRoom = (blackout) => {
    const blackoutRoomName = normalizeRoomNameForBlackout(
      blackout.room_name ||
      blackout.roomName ||
      ''
    );

    // Empty / All Rooms means whole property blackout
  if (
    !blackoutRoomName ||
    blackoutRoomName === 'all rooms' ||
    blackoutRoomName === 'all room'
  ) {
    return true;
  }

    const selectedRoomName = normalizeRoomNameForBlackout(
      getSelectedRoomNameForBlackout()
    );

    // If user has not selected room, do not apply room-specific blackout yet
    if (!selectedRoomName) return false;

    return blackoutRoomName === selectedRoomName;
  };

  const getApplicableBlackouts = () => {
    return (propertyBlackouts || []).filter((blackout) => {
      if (blackout.is_active === false) return false;
      return isBlackoutForSelectedRoom(blackout);
    });
  };

  const getBlackoutMatchesForRange = (startDate, endDate) => {
    const normalizedStart = normalizeDateString(startDate);
    const normalizedEnd = normalizeDateString(endDate || startDate);

    if (!normalizedStart || !Array.isArray(propertyBlackouts)) return [];

    return getApplicableBlackouts().filter((blackout) => {
      const blackoutStart = normalizeDateString(
        blackout.start_date || blackout.startDate
      );

      const blackoutEnd = normalizeDateString(
        blackout.end_date ||
        blackout.endDate ||
        blackout.start_date ||
        blackout.startDate
      );

      if (!blackoutStart || !blackoutEnd) return false;

      // If only one date is being checked, use inclusive check
      if (!endDate || normalizedStart === normalizedEnd) {
        return blackoutStart <= normalizedStart && blackoutEnd >= normalizedStart;
      }

      // Booking checkout date is exclusive
      return !(blackoutEnd < normalizedStart || blackoutStart >= normalizedEnd);
    });
  };

    const normalizeReservationStatus = (status) => {
    const value = String(status || '')
      .toLowerCase()
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');

    if (value === 'partial paid' || value === 'partially paid' || value === 'partiallypaid') {
      return 'partially paid';
    }

    if (value === 'cancelled' || value === 'canceled') {
      return 'cancelled';
    }

    return value;
  };

  const shouldDeductRoomStock = (reservation) => {
    const status = normalizeReservationStatus(reservation?.reservationstatus);

    return status === 'paid' || status === 'partially paid';
  };



    const getSelectedRoomDisplayQuantity = () => {
      if (bookingData.selectedRoom) {
        const selectedQty = parseInt(bookingData.selectedRoom.quantity ?? bookingData.selectedRoom.qty, 10);
        if (!isNaN(selectedQty) && selectedQty > 0) return selectedQty;

        const matchedBaseRoom = availableRooms.find((room) => {
          const roomName = String(room?.name || '').trim();
          const selectedBaseName = String(bookingData.selectedRoom?.baseRoomName || bookingData.selectedRoom?.name || '').trim();
          return roomName && selectedBaseName && roomName === selectedBaseName;
        });

        const matchedQty = parseInt(matchedBaseRoom?.quantity ?? matchedBaseRoom?.qty, 10);
        if (!isNaN(matchedQty) && matchedQty > 0) return matchedQty;
      }

      const propertyQty = parseInt(propertyDetails?.quantity ?? propertyDetails?.propertyquantity, 10);
      return !isNaN(propertyQty) && propertyQty > 0 ? propertyQty : 1;
    };


  const uniquePropertyBlackouts = useMemo(() => {
    const seen = new Set();

    return (propertyBlackouts || []).filter((blackout) => {
      const startLabel = formatDisplayDate(blackout.start_date || blackout.startDate);
      const endLabel = formatDisplayDate(blackout.end_date || blackout.endDate);
      const key = `${startLabel}-${endLabel}`;

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }, [propertyBlackouts]);

  const selectedBlackoutRanges = useMemo(() => {
    const matches = getBlackoutMatchesForRange(
      bookingData.checkIn,
      bookingData.checkOut || bookingData.checkIn
    );

    const seen = new Set();

    return matches.filter((blackout) => {
      const start = normalizeDateString(blackout.start_date || blackout.startDate);
      const end = normalizeDateString(
        blackout.end_date ||
        blackout.endDate ||
        blackout.start_date ||
        blackout.startDate
      );

      const key = `${start}-${end}`;

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }, [
    bookingData.checkIn,
    bookingData.checkOut,
    bookingData.selectedRoom,
    propertyBlackouts
  ]);
    const displayedRoomsLeft = bookingData.selectedRoom && (!bookingData.checkIn || !bookingData.checkOut)
      ? getSelectedRoomDisplayQuantity()
      : roomsLeft;

    useEffect(() => {
      const fetchPropertyBlackouts = async () => {
        const propIdToCheck = parseInt(propertyDetails?.propertyid || propertyId, 10);
        if (!propIdToCheck) {
          setPropertyBlackouts([]);
          return;
        }

        try {
        setPaymentFormError('');
  const response = await authJsonFetch(getApiUrl('/blackouts'));
          if (!response.ok) throw new Error('Failed to fetch blackout dates');
          const data = await response.json();
          const blackouts = Array.isArray(data) ? data : [];
          const filtered = blackouts.filter((item) => parseInt(item.propertyid, 10) === propIdToCheck && item.is_active !== false);
          filtered.sort((a, b) => normalizeDateString(a.start_date || a.startDate).localeCompare(normalizeDateString(b.start_date || b.startDate)));
          setPropertyBlackouts(filtered);
        } catch (fetchBlackoutError) {
          console.error('Failed to load property blackout dates:', fetchBlackoutError);
          setPropertyBlackouts([]);
        }
      };

      fetchPropertyBlackouts();
    }, [propertyDetails, propertyId]);

    useEffect(() => {
      if (!bookingData.checkIn && !bookingData.checkOut) {
        setIsBlackedOut(false);
        return;
      }

      setIsBlackedOut(selectedBlackoutRanges.length > 0);
    }, [bookingData.checkIn, bookingData.checkOut, selectedBlackoutRanges]);

    useEffect(() => {
     if (propertyDetails?.propertyimage) {
  setFullscreenImages(getSafeImageArray(propertyDetails.propertyimage));
}
    }, [propertyDetails]);

    useEffect(() => {
      const immediateRoomQty = getSelectedRoomDisplayQuantity();
      setRoomsLeft(immediateRoomQty);
      setIsSoldOut(false);

      if (!bookingData.checkIn || !bookingData.checkOut) {
        setIsBlackedOut(false);
      }
    }, [bookingData.selectedRoom, propertyDetails]);

  const getRoomAvailabilityKey = (baseName, packageName = '') => {
    return `${String(baseName || '').trim().toLowerCase()}__${String(packageName || '').trim().toLowerCase()}`;
  };

  const getRoomQuantity = (room, option = null) => {
    const optionQty = parseInt(option?.quantity ?? option?.qty, 10);
    if (!isNaN(optionQty) && optionQty > 0) return optionQty;

    const roomQty = parseInt(room?.quantity ?? room?.qty, 10);
    if (!isNaN(roomQty) && roomQty > 0) return roomQty;

    return 1;
  };

  const getRoomAvailability = (baseName, packageName = '') => {
    const key = getRoomAvailabilityKey(baseName, packageName);
    return roomAvailabilityMap[key] || null;
  };

  const normalizeText = (value = '') => {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  };

  const getBookedRequestText = (booking) => {
    return normalizeText(
      booking?.request ||
      booking?.reservationrequest ||
      booking?.additionalrequests ||
      booking?.reservation_request ||
      ''
    );
  };

  const shouldHoldRoomStock = (reservation) => {
  const status = normalizeReservationStatus(reservation?.reservationstatus);


  return status === 'paid' || status === 'partially paid';
};

  const extractBookedRoomInfo = (booking) => {
    const rawText = String(
      booking?.request ||
      booking?.reservationrequest ||
      booking?.additionalrequests ||
      booking?.reservation_request ||
      ''
    );

    const roomMatch = rawText.match(/Room Selected:\s*([^\n\r(]+)/i);
    const packageMatch = rawText.match(/\(Package:\s*([^)]+)\)/i);

    return {
      roomName: normalizeText(roomMatch?.[1] || rawText),
      packageName: normalizeText(packageMatch?.[1] || ''),
      rawText: normalizeText(rawText),
    };
  };

  const bookingMatchesRoomAndPackage = (booking, baseRoomName = '', packageName = '') => {
    const baseName = normalizeText(baseRoomName);
    const pkgName = normalizeText(packageName);

    if (!baseName) return false;

    const booked = extractBookedRoomInfo(booking);

    const sameRoom =
      booked.roomName === baseName ||
      booked.rawText.includes(`room selected: ${baseName}`);

    if (!sameRoom) return false;

    // Package room: must match same base room + same package.
    if (pkgName) {
      return booked.packageName === pkgName;
    }

    // Standard room: must match same base room and no package.
    return !booked.packageName;
  };

  const countUniqueMatchingBookings = (bookings = [], baseRoomName = '', packageName = '') => {
    const ids = new Set();

    bookings.forEach((booking, index) => {
      if (!shouldHoldRoomStock(booking)) return;

      if (bookingMatchesRoomAndPackage(booking, baseRoomName, packageName)) {
        ids.add(
          booking.reservationid ||
          booking.id ||
          `${getBookedRequestText(booking)}-${index}`
        );
      }
    });

    return ids.size;
  };

const getRoomChecksForWholeProperty = () => {
  const rooms = Array.isArray(availableRooms) && availableRooms.length > 0
    ? availableRooms
    : [
        {
          name: 'Entire Property',
          quantity: propertyDetails?.quantity || propertyDetails?.propertyquantity || 1,
          options: []
        }
      ];

  const checks = [];

  rooms.forEach((room) => {
    const baseRoomName = room?.name || 'Entire Property';
    const options = Array.isArray(room?.options) ? room.options : [];

    if (options.length > 0) {
      options.forEach((option) => {
        checks.push({
          baseRoomName,
          packageName: option?.name || '',
          totalQty: getRoomQuantity(room, option)
        });
      });
    } else {
      checks.push({
        baseRoomName,
        packageName: '',
        totalQty: getRoomQuantity(room, null)
      });
    }
  });

  return checks;
};

const checkWholePropertySoldOutForDate = async (dateStr) => {
  const propIdToCheck = parseInt(propertyDetails?.propertyid || propertyId, 10);

  if (!propIdToCheck || !dateStr) return false;

  const nextDateStr = addDaysToIsoDate(dateStr, 1);
  const roomChecks = getRoomChecksForWholeProperty();

  if (roomChecks.length === 0) return false;

  const results = await Promise.all(
    roomChecks.map(async (roomCheck) => {
      const availabilityUrl = new URL(getApiUrl('/property-availability'));
      availabilityUrl.searchParams.set('propertyid', propIdToCheck);
      availabilityUrl.searchParams.set('checkIn', dateStr);
      availabilityUrl.searchParams.set('checkOut', nextDateStr);

      if (roomCheck.baseRoomName) {
        availabilityUrl.searchParams.set('roomName', roomCheck.baseRoomName);
      }

      if (roomCheck.packageName) {
        availabilityUrl.searchParams.set('packageName', roomCheck.packageName);
      }

      const response = await authJsonFetch(availabilityUrl.toString());

      if (!response.ok) {
        return {
          soldOut: false,
          left: roomCheck.totalQty
        };
      }

      const data = await response.json();

      const booked = countUniqueMatchingBookings(
        data.bookings || [],
        roomCheck.baseRoomName,
        roomCheck.packageName
      );

      const left = Math.max(0, roomCheck.totalQty - booked);

      return {
        soldOut: left <= 0,
        left
      };
    })
  );

  // Only grey out when ALL room/package checks are sold out.
  return results.length > 0 && results.every((item) => item.soldOut);
};


useEffect(() => {
  const loadWholePropertySoldOutDates = async () => {
    const propIdToCheck = parseInt(propertyDetails?.propertyid || propertyId, 10);

    if (!propIdToCheck) {
      setPropertySoldOutDates([]);
      return;
    }

    setIsLoadingPropertySoldOutDates(true);

    try {
      const response = await authJsonFetch(
       getApiUrl(`/property-sold-out-dates?propertyid=${propIdToCheck}&days=365`)
      );

      if (!response.ok) {
        throw new Error('Failed to load sold-out dates');
      }

      const data = await response.json();

      setPropertySoldOutDates(
        Array.isArray(data.soldOutDates) ? data.soldOutDates : []
      );
    } catch (error) {
      console.error('Failed to load whole property sold-out dates:', error);
      setPropertySoldOutDates([]);
    } finally {
      setIsLoadingPropertySoldOutDates(false);
    }
  };

  loadWholePropertySoldOutDates();
}, [
  propertyDetails,
  propertyId
]);

    // CRASH-PROOF ROOM QUANTITY LOGIC
  useEffect(() => {
    const checkAvailability = async () => {
      const propIdToCheck = parseInt(propertyDetails?.propertyid || propertyId, 10);

      if (!propIdToCheck) return;

      let maxQuantity =
        parseInt(propertyDetails?.quantity, 10) ||
        parseInt(propertyDetails?.propertyquantity, 10) ||
        1;

      let specificRoomQuantity = maxQuantity;
      let roomNameToCheck = '';
      let exactRoomStr = '';

      if (bookingData.selectedRoom) {
        roomNameToCheck =
          bookingData.selectedRoom.baseRoomName ||
          bookingData.selectedRoom.name ||
          '';

        const packageStr = bookingData.selectedRoom.isVariation
          ? ` (Package: ${bookingData.selectedRoom.name})`
          : '';

        exactRoomStr = `${roomNameToCheck}${packageStr}`;

        let extractedQty = parseInt(bookingData.selectedRoom.quantity, 10);

        if (isNaN(extractedQty)) {
          extractedQty = parseInt(bookingData.selectedRoom.qty, 10);
        }

        if (isNaN(extractedQty) || extractedQty <= 0) {
          const baseRoom = availableRooms.find((room) => {
            return String(room?.name || '').trim() === String(roomNameToCheck || '').trim();
          });

          if (baseRoom) {
            extractedQty = parseInt(baseRoom.quantity || baseRoom.qty, 10);
          }
        }

        specificRoomQuantity = !isNaN(extractedQty) && extractedQty > 0
          ? extractedQty
          : 1;
      }

      if (!bookingData.checkIn || !bookingData.checkOut) {
        setRoomsLeft(specificRoomQuantity);
        setIsSoldOut(false);
        setIsDateOverlapping(false);
        return;
      }

      if (selectedBlackoutRanges.length > 0) {
        setIsBlackedOut(true);
        setIsSoldOut(false);
        setIsDateOverlapping(false);
        setRoomsLeft(0);
        return;
      }


      try {
        setIsBlackedOut(false);

        let globalRoomBookedCount = 0;

        try {

          const availabilityUrl = new URL(getApiUrl('/property-availability'));
          availabilityUrl.searchParams.set('propertyid', propIdToCheck);
          availabilityUrl.searchParams.set('checkIn', bookingData.checkIn);
          availabilityUrl.searchParams.set('checkOut', bookingData.checkOut);

  if (bookingData.selectedRoom?.isVariation) {
    availabilityUrl.searchParams.set('roomName', roomNameToCheck);
    availabilityUrl.searchParams.set('packageName', bookingData.selectedRoom.name);
  } else if (roomNameToCheck) {
    availabilityUrl.searchParams.set('roomName', roomNameToCheck);
  }
  const availabilityResponse = await authJsonFetch(availabilityUrl.toString());

          if (!availabilityResponse.ok) {
            throw new Error('Failed to check room availability');
          }

          const availabilityData = await availabilityResponse.json();
          console.log("PROPERTY AVAILABILITY RESULT:", availabilityData);

          console.log('Availability debug:', {
            roomNameToCheck,
            exactRoomStr,
            specificRoomQuantity,
            bookedCount: availabilityData.bookedCount,
            bookings: availabilityData.bookings
          });

  const selectedPackageName = bookingData.selectedRoom?.isVariation
    ? bookingData.selectedRoom.name
    : '';

  globalRoomBookedCount = countUniqueMatchingBookings(
    availabilityData.bookings || [],
    roomNameToCheck,
    selectedPackageName
  );
  } catch (resErr) {
    console.error("Failed fetching general reservations:", resErr);

    // do not allow overbooking if availability check fails
    setRoomsLeft(0);
    setIsSoldOut(true);
    setIsDateOverlapping(true);
    return;
  }

let cartRoomOverlapCount = 0;

        const totalRoomTaken = globalRoomBookedCount + cartRoomOverlapCount;
        const roomLeft = Math.max(0, specificRoomQuantity - totalRoomTaken);

        console.log('Final room stock debug:', {
          specificRoomQuantity,
          globalRoomBookedCount,
          cartRoomOverlapCount,
          totalRoomTaken,
          roomLeft
        });

        setRoomsLeft(roomLeft);
        setIsSoldOut(roomLeft <= 0);
        setIsDateOverlapping(roomLeft <= 0);
      } catch (error) {
        console.error('Availability check failed entirely:', error);
        setRoomsLeft(specificRoomQuantity);
        setIsSoldOut(false);
        setIsBlackedOut(false);
      }
    };

    checkAvailability();
  }, [
    propertyDetails,
    propertyId,
    bookingData.checkIn,
    bookingData.checkOut,
    bookingData.selectedRoom,
    userId,
    usergroup,
    selectedBlackoutRanges
  ]);

  useEffect(() => {
    const hasWholePropertyBlackoutForSelectedDates =
    selectedBlackoutRanges.some((blackout) => isWholePropertyBlackout(blackout));
    const checkAllRoomAvailability = async () => {
      const propIdToCheck = parseInt(propertyDetails?.propertyid || propertyId, 10);

      if (
        !propIdToCheck ||
        !bookingData.checkIn ||
        !bookingData.checkOut ||
        !isJsonInventory ||
        !Array.isArray(availableRooms) ||
        availableRooms.length === 0 ||
  hasWholePropertyBlackoutForSelectedDates
      ) {
        setRoomAvailabilityMap({});
        return;
      }

      const nextMap = {};

      const checks = [];

      availableRooms.forEach((room) => {
        const baseName = room?.name || '';
        const baseQty = getRoomQuantity(room, null);
        const baseKey = getRoomAvailabilityKey(baseName, '');

  checks.push(
    (async () => {
      const availabilityUrl = new URL(getApiUrl('/property-availability')); 
      availabilityUrl.searchParams.set('propertyid', propIdToCheck);
      availabilityUrl.searchParams.set('checkIn', bookingData.checkIn);
      availabilityUrl.searchParams.set('checkOut', bookingData.checkOut);

      // Standard Rate should check the base room name
      availabilityUrl.searchParams.set('roomName', baseName);
  const availabilityResponse = await authJsonFetch(availabilityUrl.toString());
  const data = availabilityResponse.ok ? await availabilityResponse.json() : { bookings: [] };

  const booked = countUniqueMatchingBookings(data.bookings || [], baseName, '');
  const left = Math.max(0, baseQty - booked);

            nextMap[baseKey] = {
              total: baseQty,
              booked,
              left,
              soldOut: left <= 0
            };
          })()
        );

        if (Array.isArray(room.options)) {
          room.options.forEach((option) => {
            const packageName = option?.name || '';
            const optionQty = getRoomQuantity(room, option);
            const optionKey = getRoomAvailabilityKey(baseName, packageName);

            checks.push(
              (async () => {
  const availabilityUrl = new URL(getApiUrl('/property-availability'));
                availabilityUrl.searchParams.set('propertyid', propIdToCheck);
                availabilityUrl.searchParams.set('checkIn', bookingData.checkIn);
                availabilityUrl.searchParams.set('checkOut', bookingData.checkOut);


  // Check base room + package together, so same package name in other rooms will not affect this room.
  availabilityUrl.searchParams.set('roomName', baseName);
  availabilityUrl.searchParams.set('packageName', packageName);

  const availabilityResponse = await authJsonFetch(availabilityUrl.toString());
  const data = availabilityResponse.ok ? await availabilityResponse.json() : { bookings: [] };

  const booked = countUniqueMatchingBookings(data.bookings || [], baseName, packageName);
  const left = Math.max(0, optionQty - booked);

                nextMap[optionKey] = {
                  total: optionQty,
                  booked,
                  left,
                  soldOut: left <= 0
                };
              })()
            );
          });
        }
      });

      try {
  await Promise.all(checks);

  console.log('ROOM AVAILABILITY MAP DEBUG:', nextMap);
  console.log('ROOM SETUP DEBUG:', availableRooms.map((room) => ({
    roomName: room.name,
    roomQty: room.quantity ?? room.qty,
    options: (room.options || []).map((opt) => ({
      packageName: opt.name,
      packageQty: opt.quantity ?? opt.qty,
    })),
  })));

  setRoomAvailabilityMap(nextMap);
      } catch (error) {
        console.error('Failed checking all room availability:', error);
        setRoomAvailabilityMap({});
      }
    };

    checkAllRoomAvailability();
  }, [
    propertyDetails,
    propertyId,
    bookingData.checkIn,
    bookingData.checkOut,
    isJsonInventory,
    selectedBlackoutRanges
  ]);
    useEffect(() => {
      const verifyStayAndReviews = async () => {
        const propIdToCheck = parseInt(propertyDetails?.propertyid || propertyId);
        if (propIdToCheck) {
          try {
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const res = await authJsonFetch(getApiUrl(`/reviews/${propIdToCheck}`));
            let fetchedReviews = [];
            if (res.ok) {
                const data = await res.json();
                fetchedReviews = data.reviews || [];
                setAllReviews(fetchedReviews);
            }

            if (usergroup === 'Customer' && userId) {
                try {
                    const userReservationsRes = await fetchCart({ queryKey: ['cart', usergroup, userId] }); 
                    const userResArray = Array.isArray(userReservationsRes) ? userReservationsRes : (userReservationsRes?.reservations || []);
                    
                    const pastStays = userResArray.filter(res => 
                      parseInt(res.propertyid) === propIdToCheck &&
                      (res.reservationstatus === 'Paid' || res.reservationstatus === 'Accepted' || res.reservationstatus === 'Partially Paid') &&
                      new Date(res.checkoutdatetime) < new Date()
                    );

                    if (pastStays.length > 0) {
                        setIsEligibleToReview(true);
                        const latestStay = pastStays.sort((a,b) => new Date(b.checkoutdatetime) - new Date(a.checkoutdatetime))[0];
                        setLatestCheckout(latestStay.checkoutdatetime);

                        const myReview = fetchedReviews.find(r => r.name === username || r.userid == userId);
                        const hasDeletedBefore = localStorage.getItem(`locked_review_${propIdToCheck}_${userId}`);

                        if (hasDeletedBefore) {
                            setReviewState('locked');
                        } else if (myReview) {
                            setExistingReviewId(myReview.id);
                            setReviewText(myReview.comment || '');
                            
                            setSubRatings({ 
                                location: Number(myReview.location_score) || Number(myReview.rating) || 5, 
                                cleanliness: Number(myReview.cleanliness_score) || Number(myReview.rating) || 5, 
                                value: Number(myReview.value_score) || Number(myReview.rating) || 5, 
                                facilities: Number(myReview.facilities_score) || Number(myReview.rating) || 5, 
                                service: Number(myReview.service_score) || Number(myReview.rating) || 5 
                            });
                            setReviewState('view');
                        } else {
                            setReviewState('create');
                        }
                    } else {
                        setIsEligibleToReview(false);
                    }
                } catch (e) { console.error("Stay verification failed:", e); }
            }
          } catch (error) {
            console.error("Error fetching reviews:", error);
            setReviewState('create');
          }
        }
      };
      verifyStayAndReviews();
    }, [propertyDetails, propertyId, userId, usergroup, username]);

    const censorReview = (text) => {
      const sensitiveWords = [
          'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'bastard', 'dick', 'pussy', 
          'scam', 'fraud', 'racist', 'kill', 'murder',
          'bodoh', 'pukimak', 'babi', 'sial', 'bangsat', 'pantat',
          'allah', 'jesus', 'buddha', 'islam', 'muslim', 'christian', 'hindu', 'jew', 'terrorist'
      ];
      let censoredText = text;
      sensitiveWords.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          censoredText = censoredText.replace(regex, '*'.repeat(word.length));
      });
      return censoredText;
    };

  const handleReviewSubmit = async () => {
    const cleanedReviewText = reviewText.trim();

    const isAllRated = Object.values(subRatings).every((val) => Number(val) > 0);

    if (!isAllRated) {
      return displayToast('error', 'Please provide a star rating for all categories.');
    }

    if (!cleanedReviewText) {
      return displayToast('error', 'Please write a review comment.');
    }

    if (cleanedReviewText.length < 10) {
      return displayToast('error', 'Please write at least 10 characters for your review.');
    }

    if (cleanedReviewText.length > 1000) {
      return displayToast('error', 'Review is too long. Please keep it below 1000 characters.');
    }

    const safeReviewText = censorReview(cleanedReviewText);

  setIsSubmittingReview(true);
  try {
      const calculatedAverageRating = Math.round((subRatings.location + subRatings.cleanliness + subRatings.value + subRatings.facilities + subRatings.service) / 5);

          const payload = {
              userid: parseInt(userId),
              propertyid: parseInt(propertyDetails?.propertyid || propertyId),
              review: safeReviewText, 
              rating: calculatedAverageRating,
              location_score: subRatings.location || 5,
              cleanliness_score: subRatings.cleanliness || 5,
              value_score: subRatings.value || 5,
              facilities_score: subRatings.facilities || 5,
              service_score: subRatings.service || 5
          };

  if (reviewState === 'create') {
    try {
      const data = await submitReview(payload, username);

      displayToast('success', 'Thank you! Your review has been submitted successfully.');
      setExistingReviewId(data.reviewid);

      setAllReviews((prev) => [
        {
          ...payload,
          id: data.reviewid,
          name: username,
          comment: safeReviewText,
          datePosted: 'Just now',
        },
        ...prev,
      ]);

      setReviewState('view');
    } catch (error) {
      if (error.status === 409) {
        displayToast('error', 'You have already reviewed this property!');
        localStorage.setItem(
          `locked_review_${propertyDetails?.propertyid || propertyId}_${userId}`,
          'true'
        );
        setReviewState('locked');
        return;
      }

      throw error;
    }
  }
      } catch (err) {
          console.error("Review Error:", err);
  displayToast('error', err.message || 'Failed to process review. Check database connection.');
      } finally {
          setIsSubmittingReview(false);
      }
    };

    const handleDeleteReview = async (reviewIdToDelete = null) => {
      const targetId = reviewIdToDelete || existingReviewId;
      if (!window.confirm("Are you sure you want to delete this review?")) return;
      
      setIsSubmittingReview(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      
      try {
  const response = await authJsonFetch(getApiUrl(`/reviews/${targetId}?creatorUsername=${username}`), {
              method: 'DELETE'
          });
          if (!response.ok) throw new Error('Failed to delete review');
          
          displayToast('success', 'Review deleted.');
          setAllReviews(prev => prev.filter(r => r.id !== targetId));
          
          if (!reviewIdToDelete || reviewIdToDelete === existingReviewId) {
              localStorage.setItem(`locked_review_${propertyDetails?.propertyid || propertyId}_${userId}`, 'true');
              setReviewState('locked');
              setExistingReviewId(null);
              setReviewText('');
          }
      } catch (err) {
          displayToast('error', 'Failed to delete review.');
      } finally {
          setIsSubmittingReview(false);
      }
    };

    const sortedReviews = useMemo(() => {
    const getReviewTime = (review) => {
      const rawDate =
        review.reviewdate ||
        review.datePosted ||
        review.created_at ||
        review.createdAt ||
        '';

      const time = new Date(rawDate).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    return [...allReviews].sort((a, b) => {
      if (reviewSort === 'oldest') {
        return getReviewTime(a) - getReviewTime(b);
      }

      if (reviewSort === 'highest') {
        return Number(b.rating || 0) - Number(a.rating || 0);
      }

      if (reviewSort === 'lowest') {
        return Number(a.rating || 0) - Number(b.rating || 0);
      }

      return getReviewTime(b) - getReviewTime(a);
    });
  }, [allReviews, reviewSort]);
    const reviewCount = allReviews.length;
    const realAverage = reviewCount > 0 ? (allReviews.reduce((sum, r) => sum + (r.rating || 5), 0) / reviewCount) : 0;
    const agodaScore = reviewCount > 0 ? (realAverage * 2).toFixed(1) : "0.0"; 
    
    const locScore = reviewCount > 0 ? Math.min(10, (realAverage * 2 + 0.4)).toFixed(1) : 0;
    const cleanScore = reviewCount > 0 ? Math.min(10, (realAverage * 2 + 0.3)).toFixed(1) : 0;
    const valueScore = reviewCount > 0 ? Math.min(10, (realAverage * 2 + 0.1)).toFixed(1) : 0;
    const facScore = reviewCount > 0 ? Math.max(0, (realAverage * 2 - 0.1)).toFixed(1) : 0;
    const servScore = reviewCount > 0 ? Math.max(0, (realAverage * 2 - 0.4)).toFixed(1) : 0;

    const distribution = { exceptional: 0, excellent: 0, veryGood: 0, good: 0, below: 0 };
    allReviews.forEach(r => {
        const s = (r.rating || 5) * 2;
        if (s >= 9) distribution.exceptional++;
        else if (s >= 8) distribution.excellent++;
        else if (s >= 7) distribution.veryGood++;
        else if (s >= 6) distribution.good++;
        else distribution.below++;
    });

    const getAgodaText = (score) => {
        const s = parseFloat(score);
        if (s >= 9) return "Exceptional";
        if (s >= 8) return "Excellent";
        if (s >= 7) return "Very Good";
        if (s >= 6) return "Good";
        if (s > 0) return "Below Expectation";
        return "No Ratings";
    };

    const renderSubRatingRow = (categoryKey, label) => {
      return (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed #eee' }}>
              <span style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>{label}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                      <span 
                          key={star} 
                          onMouseEnter={() => reviewState === 'create' && setHoverSubRatings(prev => ({...prev, [categoryKey]: star}))}
                          onMouseLeave={() => reviewState === 'create' && setHoverSubRatings(prev => ({...prev, [categoryKey]: 0}))}
                          onClick={() => reviewState === 'create' && setSubRatings(prev => ({...prev, [categoryKey]: star}))}
                          style={{ 
                            cursor: reviewState === 'create' ? 'pointer' : 'default', 
                            fontSize: '22px', 
                            color: (hoverSubRatings[categoryKey] || subRatings[categoryKey]) >= star ? '#ffc107' : '#e4e5e9', 
                            transition: 'transform 0.1s',
                            transform: (hoverSubRatings[categoryKey] || subRatings[categoryKey]) >= star && reviewState === 'create' ? 'scale(1.1)' : 'scale(1)' 
                          }}
                      >
                          {(hoverSubRatings[categoryKey] || subRatings[categoryKey]) >= star ? <FaStar /> : <FaRegStar />}
                      </span>
                  ))}
              </div>
          </div>
      );
    };

    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setBookingData((prev) => {
          const updatedData = { ...prev, [name]: value };
          if ((name === "checkIn" && new Date(value) >= new Date(prev.checkOut)) || (name === "checkOut" && new Date(prev.checkIn) >= new Date(value))) {
              updatedData.checkOut = "";
          }
          return updatedData;
      });
    };

    const googleLoginHandler = useGoogleLogin({
      onSuccess: async (tokenResponse) => {
        try {
          const accessToken = tokenResponse.access_token;
          const data = await googleLogin(accessToken);
        localStorage.setItem("isLoggedIn", "true");

        // this allows login only for current browser session
        sessionStorage.setItem("activeSession", "true");

        localStorage.setItem("userid", data.userid);
        localStorage.setItem("username", data.username);
        localStorage.setItem("usergroup", data.usergroup);

        if (data.uimage) {
          localStorage.setItem("uimage", data.uimage);
        }

        window.dispatchEvent(new Event('cart-login-updated'));

        displayToast("success", "Login Successful! Filling details...");
        fetchUserInfo();

        } catch (error) {
          displayToast("error", error.message || "Login Failed");
        }
      },
      onError: (error) => displayToast("error", "Google Sign-In Failed")
    });

    const fetchUserInfo = async () => {
      const userid = localStorage.getItem('userid');
      if (!userid) return;
      try {
        const userData = await fetchUserData(userid);
        setBookingForm(prev => ({
          ...prev, title: userData.utitle || 'Mr.', firstName: userData.ufirstname || '', lastName: userData.ulastname || '', email: userData.uemail || '', phoneNumber: userData.uphoneno || ''
        }));
      } catch (error) {
        console.error('Failed to get user information:', error);
      }
    };

    useEffect(() => { fetchUserInfo(); }, []);
    useEffect(() => { if (showBookingForm) fetchUserInfo(); }, [showBookingForm]);
useEffect(() => {
  let isMounted = true;

  const fetchDetails = async () => {
    const existingProperty = propertyDetails || location.state?.propertyDetails || null;
    const idToFetch = propertyId || existingProperty?.propertyid;

    if (!idToFetch) {
      if (isMounted) {
        setError('No property ID provided');
        setLoading(false);
      }
      return;
    }

    // If opened from Product page, show page immediately with preview data.
    if (existingProperty) {
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const fullProperty = await fetchFullPropertyDetails(idToFetch);

      if (!isMounted) return;

      const normalizedImages = getSafeImageArray(fullProperty.propertyimage);

      console.log('FULL PROPERTY DETAILS DEBUG:', {
        propertyid: idToFetch,
        previewImageCount: getSafeImageArray(existingProperty?.propertyimage).length,
        fullImageCount: normalizedImages.length,
      });

      setPropertyDetails((prev) => ({
        ...(prev || existingProperty || {}),
        ...fullProperty,
        propertyimage: normalizedImages,
      }));

      setFullscreenImages(normalizedImages);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch full property details:', err);

      if (!isMounted) return;

      if (!existingProperty) {
        setError('Property details not found.');
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  fetchDetails();

  return () => {
    isMounted = false;
  };
}, [propertyId, location.state?.propertyDetails?.propertyid]);

    useEffect(() => {
      if (propertyDetails && !bookingData.selectedRoom) {
          let defaultRoom = null;

          // Prioritize room if there is only one available from your parsing logic
          if (!isJsonInventory && availableRooms.length === 1) {
              defaultRoom = { 
                  name: availableRooms[0].name, 
                  price: propertyDetails.normalrate 
              };
          } 
          // Fallback to "Entire Property" if it's a Homestay or no inventory found
          else if (isHomestay || !isJsonInventory) {
              defaultRoom = { 
                  name: 'Entire Property', 
                  price: propertyDetails.normalrate,
                  isVariation: false,
                  baseRoomName: 'Entire Property'
              };
          }

          if (defaultRoom) {
              setBookingData(prev => ({ ...prev, selectedRoom: defaultRoom }));
          }
        }
      }, [propertyDetails, isHomestay, isJsonInventory, availableRooms]);

  useEffect(() => {
    const fetchCoordinates = async () => {
      try {
        const savedLat = parseFloat(propertyDetails?.latitude);
        const savedLng = parseFloat(propertyDetails?.longitude);

        if (!Number.isNaN(savedLat) && !Number.isNaN(savedLng)) {
          setLocationCoords({ lat: savedLat, lng: savedLng });
          return;
        }

        const address =
          propertyDetails?.nearbylocation ||
          propertyDetails?.propertyaddress ||
          '';

        if (!address) {
          setLocationCoords({ lat: null, lng: null });
          return;
        }

        const coords = await getCoordinates(address);

        if (coords?.lat && coords?.lng) {
          setLocationCoords({
            lat: parseFloat(coords.lat),
            lng: parseFloat(coords.lng)
          });
        } else {
          setLocationCoords({ lat: null, lng: null });
        }
      } catch (error) {
        console.error('Failed to get property coordinates:', error);
        setLocationCoords({ lat: null, lng: null });
      }
    };

    fetchCoordinates();
  }, [propertyDetails]);

  useEffect(() => {
    const fetchNearbyPlaces = async () => {
      setNearbyPlaces({ walkable: [], landmarks: [] });
      setNearbyError('');

      const addressForNearbySearch =
        propertyDetails?.nearbylocation ||
        propertyDetails?.propertyaddress ||
        '';

      if (
        !window.google ||
        !window.google.maps ||
        !window.google.maps.places
      ) {
        setNearbyError('Google Places is not loaded. Please check that libraries=places is added.');
        return;
      }

      setNearbyLoading(true);

      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );

      const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;

        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      };

      const formatDistance = (meters) => {
        if (meters < 1000) return `${Math.round(meters)} m`;
        return `${(meters / 1000).toFixed(1)} km`;
      };

      const runNearbySearch = (request) => {
        return new Promise((resolve) => {
          service.nearbySearch(request, (results, status) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              Array.isArray(results)
            ) {
              resolve(results);
            } else {
              resolve([]);
            }
          });
        });
      };

      const runTextSearch = (request) => {
        return new Promise((resolve) => {
          service.textSearch(request, (results, status) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              Array.isArray(results)
            ) {
              resolve(results);
            } else {
              resolve([]);
            }
          });
        });
      };

  const normalizeNearbyPlaces = (places, limit) => {
    const seen = new Set();

    return places
      .filter((place) => place?.name)
      .map((place) => {
        let meters = 0;

        if (
          locationCoords?.lat &&
          locationCoords?.lng &&
          place?.geometry?.location
        ) {
          const placeLat = place.geometry.location.lat();
          const placeLng = place.geometry.location.lng();

          meters = getDistance(
            locationCoords.lat,
            locationCoords.lng,
            placeLat,
            placeLng
          );
        }

      return {
    name: place.name.trim(),
    meters,
    distanceText: meters > 0 ? formatDistance(meters) : '',
    placeId: place.place_id || ''
  };
      })
      .filter((place) => {
  const key = `name-${place.name.toLowerCase().trim()}`;

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      })
      .sort((a, b) => a.meters - b.meters)
      .slice(0, limit);
  };
      try {
        let businessResults = [];
        let landmarkResults = [];

        if (locationCoords?.lat && locationCoords?.lng) {
          const propertyLocation = new window.google.maps.LatLng(
            locationCoords.lat,
            locationCoords.lng
          );

          businessResults = await runNearbySearch({
            location: propertyLocation,
            radius: 1500,
            keyword: 'restaurant cafe shop supermarket pharmacy business'
          });

          landmarkResults = await runNearbySearch({
            location: propertyLocation,
            radius: 10000,
            keyword: 'tourist attraction shopping mall transit station park museum'
          });
        } else if (addressForNearbySearch) {
          businessResults = await runTextSearch({
            query: `restaurants cafes shops supermarkets pharmacies near ${addressForNearbySearch}`
          });

          landmarkResults = await runTextSearch({
            query: `tourist attractions shopping malls transport stations near ${addressForNearbySearch}`
          });
        } else {
          setNearbyError('Nearby places are not available because the property location cannot be detected.');
          return;
        }

        setNearbyPlaces({
          walkable: normalizeNearbyPlaces(businessResults, 5),
          landmarks: normalizeNearbyPlaces(landmarkResults, 3)
        });
      } catch (error) {
        console.error('Failed to fetch nearby places:', error);
        setNearbyError('Nearby places could not be loaded.');
      } finally {
        setNearbyLoading(false);
      }
    };

    fetchNearbyPlaces();
  }, [locationCoords, propertyDetails]);

  const handlePhotoClick = (index, imagesToUse = null) => { 
      if (imagesToUse && imagesToUse.length > 0) {
          setFullscreenImages(imagesToUse);
      } else {
          setFullscreenImages(propertyDetails.propertyimage);
      }

      setSelectedImageIndex(index);
      setImageZoom(1);
      setImagePosition({ x: 0, y: 0 });
      setIsDraggingImage(false);
      setIsFullscreen(true); 
      document.body.style.overflow = 'hidden'; 
  };
    
  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
    setIsDraggingImage(false);
    document.body.style.overflow = 'auto';
  };

  const handleZoomIn = () => {
    setImageZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setImageZoom((prev) => {
      const nextZoom = Math.max(prev - 0.25, 1);

      if (nextZoom === 1) {
        setImagePosition({ x: 0, y: 0 });
      }

      return nextZoom;
    });
  };

  const handleResetZoom = () => {
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
    setIsDraggingImage(false);
  };

  const handleImageMouseDown = (e) => {
    if (imageZoom <= 1) return;

    e.preventDefault();

    setIsDraggingImage(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    });
  };

  const handleImageMouseMove = (e) => {
    if (!isDraggingImage || imageZoom <= 1) return;

    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleImageMouseUp = () => {
    setIsDraggingImage(false);
  };

  const changeFullscreenImage = (direction) => {
    setSelectedImageIndex((prev) => {
      const nextIndex = prev + direction;

      if (nextIndex < 0) return 0;
      if (nextIndex > fullscreenImages.length - 1) {
        return fullscreenImages.length - 1;
      }

      return nextIndex;
    });

    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
    setIsDraggingImage(false);
  };

    const handleBackToSearch = (e) => {
        if (e) e.preventDefault(); 
        displayToast('info', 'Loading your search results...', true);
        setTimeout(() => {
            setShowToast(false); 
            navigate('/product', { 
                state: { 
                    searchDates: {
                        checkIn: bookingData.checkIn,
                        checkOut: bookingData.checkOut,
                        adults: bookingData.adults,
                        children: bookingData.children
                    },
                    filterRegion: passedFilterRegion 
                } 
            });
        }, 500);
    };

    useEffect(() => {
     if (
  showDescriptionOverlay ||
  showBookingForm ||
  isFullscreen ||
  selectedRoomDetails ||
  showBookingBlockedModal
) {
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed'; document.body.style.top = `-${scrollY}px`; document.body.style.width = '100%'; document.body.style.overflow = 'hidden';
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
        return () => { document.body.style.position = ''; document.body.style.top = ''; document.body.style.width = ''; document.body.style.overflow = ''; document.body.style.paddingRight = ''; window.scrollTo(0, scrollY); };
      }
    }, [
  showDescriptionOverlay,
  showBookingForm,
  isFullscreen,
  selectedRoomDetails,
  showPaymentModal,
  showBookingBlockedModal
]);

    // Start/reset 5-minute payment timer when modal opens
   useEffect(() => {
  if (showPaymentModal && paymentStatus !== 'success') {
    setPaymentCountdown(300);
    paymentExpiredRef.current = false;

    if (paymentTimerRef.current) {
      clearInterval(paymentTimerRef.current);
      paymentTimerRef.current = null;
    }

    paymentTimerRef.current = setInterval(() => {
                setPaymentCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(paymentTimerRef.current);
                        paymentTimerRef.current = null;
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (paymentTimerRef.current) {
                clearInterval(paymentTimerRef.current);
                paymentTimerRef.current = null;
            }
        };
    }, [showPaymentModal, paymentStatus]);

    // Handle payment session expiry when countdown hits 0
    useEffect(() => {
        if (paymentCountdown === 0 && showPaymentModal && paymentStatus !== 'success' && !paymentExpiredRef.current) {
            paymentExpiredRef.current = true;
            (async () => {
                if (currentReservationIdRef.current) {
                    try {
                        await updateReservationStatus(currentReservationIdRef.current, 'Expired');
                    } catch (err) {
                        console.error('Failed to expire reservation on timeout:', err);
                    }
                }
                currentReservationIdRef.current = null;
                if (paymentTimerRef.current) {
                    clearInterval(paymentTimerRef.current);
                    paymentTimerRef.current = null;
                }
                setShowPaymentModal(false);
                setSelectedReservation(null);
                setPaymentStatus('idle');
                setPaymentError('');
                setAcceptedTerms(false);
                displayToast('error', 'Payment time expired. Your reservation hold has been released. Please try booking again.');
            })();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentCountdown, showPaymentModal, paymentStatus]);

    // Handle countdown dynamically when payment succeeds
  useEffect(() => {
    let interval = null;

    if (paymentStatus === 'success') {
      setCountdownTimer(5);

      interval = setInterval(() => {
        setCountdownTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);

          const paidReservationId = selectedReservation?.reservationid;

  setShowPaymentModal(false);
  setSelectedReservation(null);
  setPaymentStatus('idle');

navigate('/cart', {
  replace: true,
  state: {
    refreshCart: true,
    scrollToSection: isInstantPayment ? 'history' : 'cart',
    paidReservationId: paidReservationId
  }
});

            return 0;
          }

          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
}, [paymentStatus, isInstantPayment, navigate, selectedReservation]);

    const handleFormChange = (e) => { const { name, value } = e.target; setBookingForm(prev => ({ ...prev, [name]: value })); if (paymentFormError) setPaymentFormError(''); };


useEffect(() => {
  if (!passedPricingInfo || !bookingData.checkIn || !bookingData.checkOut) return;

  const start = new Date(`${bookingData.checkIn}T00:00:00`);
  const end = new Date(`${bookingData.checkOut}T00:00:00`);

  const nights = Math.max(
    1,
    Math.floor((end - start) / (1000 * 60 * 60 * 24))
  );

  const passedTotalPrice = Number(
    passedPricingInfo.totalPrice ??
    passedPricingInfo.total_price ??
    passedPricingInfo.total ??
    0
  );

  const passedBaseRate = Number(
    passedPricingInfo.originalBase ??
    passedPricingInfo.price ??
    0
  );

  if (passedTotalPrice > 0) {
    setTotalNights(nights);
    setUsedBaseRate(passedBaseRate);
    setBreakdownData({
      ...passedPricingInfo,
      totalPrice: passedTotalPrice
    });
    setIsLoadingBreakdown(false);
  }
}, [passedPricingInfo, bookingData.checkIn, bookingData.checkOut]);

    // --- FAST CACHED DYNAMIC PRICE ---
    useEffect(() => {
      const fetchDynamicPrice = async () => {
          const propIdToCheck = parseInt(propertyDetails?.propertyid || propertyId);
          
          // ONLY RUN IF BOTH DATES EXIST! This prevents multi-trigger lag
          if (propIdToCheck && bookingData.checkIn && bookingData.checkOut) {
              
              let lowestBaseRate = Infinity;
              if (!bookingData.selectedRoom && isJsonInventory && availableRooms.length > 0) {
                  availableRooms.forEach(r => {
                      if (parseFloat(r.price) < lowestBaseRate) lowestBaseRate = parseFloat(r.price);
                      if (r.options) {
                          r.options.forEach(opt => {
                              if (parseFloat(opt.price) < lowestBaseRate) lowestBaseRate = parseFloat(opt.price);
                          });
                      }
                  });
              }

              let baseRoomRate = bookingData.selectedRoom 
                  ? parseFloat(bookingData.selectedRoom.price) 
                  : (lowestBaseRate !== Infinity ? lowestBaseRate : parseFloat(propertyDetails.normalrate));

             const cacheKey = `${propIdToCheck}_${bookingData.checkIn}_${bookingData.checkOut}_${baseRoomRate}_${bookingData.selectedRoom?.name || 'no-room'}`;
              
              // USE INSTANT MEMORY CACHE
              if (priceCache.current[cacheKey]) {
                  setUsedBaseRate(baseRoomRate); 
                  setBreakdownData(priceCache.current[cacheKey]);
                  const start = new Date(bookingData.checkIn);
                  const end = new Date(bookingData.checkOut);
                  setTotalNights(Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24))));
                  setIsLoadingBreakdown(false);
                  return;
              }

              // INSTANT LOCAL CALCULATION TO MAKE IT FASTER AND ACCURATE
             const start = new Date(`${bookingData.checkIn}T00:00:00`);
const end = new Date(`${bookingData.checkOut}T00:00:00`);
const nights = Math.max(
  1,
  Math.floor((end - start) / (1000 * 60 * 60 * 24))
);

setTotalNights(nights);
setIsLoadingBreakdown(!passedPricingInfo);

try {
  const res = await calculateBookingPrice(
    bookingData.checkIn,
    bookingData.checkOut,
    baseRoomRate,
    propIdToCheck
  );

  const backendTotal = parseFloat(
    res?.totalPrice ??
    res?.total_price ??
    res?.total ??
    res?.price ??
    baseRoomRate * nights
  );

  const safeTotal = Number.isFinite(backendTotal)
    ? backendTotal
    : baseRoomRate * nights;

  const apiData = {
    ...res,
    totalPrice: safeTotal
  };

  priceCache.current[cacheKey] = apiData;

  setUsedBaseRate(baseRoomRate);
  setBreakdownData(apiData);
} catch (error) {
  console.error('Failed to calculate property details price:', error);

  const fallbackTotal = baseRoomRate * nights;

  const fallbackData = {
    totalPrice: fallbackTotal
  };

  priceCache.current[cacheKey] = fallbackData;

  setUsedBaseRate(baseRoomRate);
  setBreakdownData(fallbackData);
} finally {
  setIsLoadingBreakdown(false);
}
              
          } else {
              setBreakdownData(null);
          }
      };
      fetchDynamicPrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookingData.checkIn, bookingData.checkOut, bookingData.selectedRoom, propertyDetails, propertyId]);

    let instantBaseRate = parseFloat(propertyDetails?.normalrate || 0);
    if (bookingData.selectedRoom) {
        instantBaseRate = parseFloat(bookingData.selectedRoom.price);
    } else if (isJsonInventory && availableRooms.length > 0) {
        let lowestBaseRate = Infinity;
        availableRooms.forEach(r => {
            if (parseFloat(r.price) < lowestBaseRate) lowestBaseRate = parseFloat(r.price);
            if (r.options) {
                r.options.forEach(opt => {
                    if (parseFloat(opt.price) < lowestBaseRate) lowestBaseRate = parseFloat(opt.price);
                });
            }
        });
        if (lowestBaseRate !== Infinity) instantBaseRate = lowestBaseRate;
    }

    const flatDiscount = parseFloat(propertyDetails?.propertydiscount || 0);
    const nights = totalNights > 0 ? totalNights : 1;

    let sumMultipliers = nights; 
    if (breakdownData && usedBaseRate > 0) {
        sumMultipliers = (breakdownData.totalPrice + (nights * flatDiscount)) / usedBaseRate;
    }

    let optimisticRoomTotal = (instantBaseRate * sumMultipliers) - (nights * flatDiscount);
    optimisticRoomTotal = Math.max(0, optimisticRoomTotal);

    const finalRoomTotal = breakdownData ? breakdownData.totalPrice : optimisticRoomTotal;
    const finalSstTotal = finalRoomTotal * globalSstRate;
    const finalGrandTotal = finalRoomTotal + finalSstTotal;
    const displayTopRate = (finalRoomTotal / nights).toFixed(2);
    const averageNightlyMultiplier = sumMultipliers / nights;

   const rawInstantPaymentRate = propertyDetails?.instantpaymentrate;

const instantPaymentRate =
  rawInstantPaymentRate === undefined ||
  rawInstantPaymentRate === null ||
  String(rawInstantPaymentRate).trim() === ''
    ? 0.10
    : parseFloat(rawInstantPaymentRate) || 0;
    const instantPaymentTotal = instantPaymentRate > 0
        ? parseFloat((finalGrandTotal * (1 - instantPaymentRate)).toFixed(2))
        : finalGrandTotal;
    const instantPaymentSavings = parseFloat((finalGrandTotal - instantPaymentTotal).toFixed(2));

    const depositPercentage = globalDepositRate; 
const rawDaysBeforePayment = propertyDetails?.daysbeforepaying;

const parsedDaysBeforePayment = parseFloat(rawDaysBeforePayment);

const hasDaysBeforePayment =
  rawDaysBeforePayment !== undefined &&
  rawDaysBeforePayment !== null &&
  String(rawDaysBeforePayment).trim() !== '' &&
  !Number.isNaN(parsedDaysBeforePayment) &&
  parsedDaysBeforePayment > 0;

const daysBeforePayment = hasDaysBeforePayment
  ? parsedDaysBeforePayment
  : 0;

    const daysBeforePaymentLabel = daysBeforePayment < 1/24
      ? `${Math.round(daysBeforePayment * 1440)} minutes`
      : daysBeforePayment < 1
      ? `${Math.round(daysBeforePayment * 24)} hours`
      : `${daysBeforePayment} days`;  
const getNearCheckInBookingInfo = (checkInValue = bookingData.checkIn) => {
  if (!checkInValue) {
    return {
      isBlocked: false,
      hasDeadlineRule: false
    };
  }

  const rawDaysBeforePayment = propertyDetails?.daysbeforepaying;

  if (
    rawDaysBeforePayment === undefined ||
    rawDaysBeforePayment === null ||
    String(rawDaysBeforePayment).trim() === ''
  ) {
    return {
      isBlocked: false,
      hasDeadlineRule: false
    };
  }

  const requiredDaysBeforePayment = parseFloat(rawDaysBeforePayment);

  if (
    Number.isNaN(requiredDaysBeforePayment) ||
    requiredDaysBeforePayment <= 0
  ) {
    return {
      isBlocked: false,
      hasDeadlineRule: false
    };
  }

  const now = new Date();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkInDate = new Date(`${checkInValue}T00:00:00`);

  const latestAllowedBookingDate = new Date(
    checkInDate.getTime() - requiredDaysBeforePayment * 24 * 60 * 60 * 1000
  );

  const nextAllowedCheckInDate = new Date(
    now.getTime() + requiredDaysBeforePayment * 24 * 60 * 60 * 1000
  );

  const isBlocked = now >= latestAllowedBookingDate;

return {
  isBlocked,
  hasDeadlineRule: true,
  requiredDaysBeforePayment,
  now,
  today,
  checkInDate,
  latestAllowedBookingDate,
  nextAllowedCheckInDate
};
};

const isTooCloseForBooking = () => {
  const bookingInfo = getNearCheckInBookingInfo();
  return bookingInfo.hasDeadlineRule && bookingInfo.isBlocked;
};

const isSameDayInstantPayment = (checkInValue = bookingData.checkIn) => {
  if (!checkInValue) return false;

  const today = getLocalTodayIsoDate();
  const selectedCheckIn = toSafeIsoDate(checkInValue);

  return selectedCheckIn === today;
};

const openNearCheckInBlockedModal = (checkInValue = bookingData.checkIn) => {
  const bookingInfo = getNearCheckInBookingInfo(checkInValue);

  if (!bookingInfo?.isBlocked) {
    return false;
  }


const {
  requiredDaysBeforePayment,
  now,
  checkInDate,
  latestAllowedBookingDate,
  nextAllowedCheckInDate
} = bookingInfo;

 const message =
  `This booking cannot proceed because the selected check-in date is too close. ` +
  `For security and non-refundable payment protection, bookings must be made before ${formatFriendlyDateTime(latestAllowedBookingDate)}. ` +
  `For a new booking today, please choose a check-in date from ${formatFriendlyDateTime(nextAllowedCheckInDate)} onwards.`;

  setBlockedBookingTitle('Booking Window Closed');
  setBlockedBookingMessage(message);
 setBlockedBookingDetails({
  today: formatFriendlyDateTime(now),
  checkInDate: formatFriendlyDateTime(checkInDate),
  latestAllowedBookingDate: formatFriendlyDateTime(latestAllowedBookingDate),
  nextAllowedCheckInDate: formatFriendlyDateTime(nextAllowedCheckInDate),
  requiredDaysBeforePayment
});

  setShowBookingBlockedModal(true);

  return true;
};

const openInstantSameDayBlockedModal = (checkInValue = bookingData.checkIn) => {
  if (!isSameDayInstantPayment(checkInValue)) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  setBlockedBookingTitle('Same-Day Instant Payment Not Available');

  setBlockedBookingMessage(
    `Instant payment is not available for same-day check-in. ` +
    `This helps avoid last-minute non-refundable payment issues and gives the property operator enough time to prepare. ` +
    `Please choose a check-in date from ${formatFriendlyDate(tomorrow)} onwards.`
  );

  setBlockedBookingDetails({
    today: formatFriendlyDate(today),
    checkInDate: formatFriendlyDate(checkInValue),
    latestAllowedBookingDate: formatFriendlyDate(today),
    nextAllowedCheckInDate: formatFriendlyDate(tomorrow),
    requiredDaysBeforePayment: 1
  });

  setShowBookingBlockedModal(true);

  return true;
};

const validateBlockedBookingBeforeOpenForm = (paymentMode) => {
if (!bookingData.checkIn || !bookingData.checkOut) {
  const errorMsg = 'Please choose your check-in and check-out dates first before proceeding to payment.';

  setPaymentFormError(errorMsg);
  displayToast('error', errorMsg);
  alert(errorMsg);

  bookingCardRef.current?.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });

  return true;
}

  // Book & Pay only: booking window close modal
  // Put this BEFORE room check so the modal can pop out even when no room selected.
  if (paymentMode === 'deposit' && isTooCloseForBooking()) {
    openNearCheckInBlockedModal(bookingData.checkIn);
    return true;
  }

  // Instant Pay only: same-day instant payment modal
  // Put this BEFORE room check so the modal can pop out even when no room selected.
  if (paymentMode === 'instant' && isSameDayInstantPayment(bookingData.checkIn)) {
    openInstantSameDayBlockedModal(bookingData.checkIn);
    return true;
  }

  if (isBlackedOut) {
    displayToast('error', 'These dates are unavailable. Please choose different dates.');
    return true;
  }

  if (isSoldOut) {
    displayToast('error', 'This room is sold out for the selected date. Please choose another room or date.');
    return true;
  }

  // Room check should be LAST
  if (isJsonInventory && !bookingData.selectedRoom) {
    displayToast('error', 'Please select a room type from the list to continue.');
    document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
    return true;
  }

  return false;
};

const closeNearCheckInBlockedModal = () => {
  setShowBookingBlockedModal(false);

  setBookingData((prev) => ({
    ...prev,
    checkIn: '',
    checkOut: ''
  }));

  setPaymentFormError('');
  setBreakdownData(null);
  setTotalNights(0);
};

const handleAddToCart = async (e) => {
  e.preventDefault();

  if (isProcessingCheckout) return;

  setIsProcessingCheckout(true);
  setPaymentFormError('');

  console.log('PROCEED TO PAYMENT CLICKED:', {
    isInstantPayment,
    checkIn: bookingData.checkIn,
    checkOut: bookingData.checkOut,
    selectedRoom: bookingData.selectedRoom,
    propertyId: propertyDetails?.propertyid || propertyId,
    finalGrandTotal,
    instantPaymentRate
  });

  try {
    const userid = getStoredUserId();

    if (!userid) {
      setAuthPromptMode(isInstantPayment ? 'instant' : 'deposit');
      setShowAuthPrompt(true);
      return;
    }

    setShowAuthPrompt(false);

   if (!bookingData.checkIn || !bookingData.checkOut) {
  const errorMsg = 'Please choose your check-in and check-out dates first before proceeding to payment.';

  setPaymentFormError(errorMsg);
  displayToast('error', errorMsg);
  alert(errorMsg);

  bookingCardRef.current?.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });

  return;
}

    if (isBlackedOut) {
      const errorMsg = 'These dates are unavailable. Please choose different dates.';
      setPaymentFormError(errorMsg);
      displayToast('error', errorMsg);
      return;
    }

    if (isSoldOut) {
      const errorMsg = 'This room is sold out for the selected date. Please choose another room or date.';
      setPaymentFormError(errorMsg);
      displayToast('error', errorMsg);
      return;
    }

if (!isInstantPayment && isTooCloseForBooking()) {
  setPaymentFormError('This booking cannot proceed because the selected check-in date is too close.');
  openNearCheckInBlockedModal(bookingData.checkIn);
  return;
}

if (isInstantPayment && isSameDayInstantPayment(bookingData.checkIn)) {
  setPaymentFormError('Instant payment is not available for same-day check-in.');
  openInstantSameDayBlockedModal(bookingData.checkIn);
  return;
}

    if ((isHotel || isHomestay) && !bookingData.selectedRoom) {
      const errorMsg = 'Please select a room type first.';
      setPaymentFormError(errorMsg);
      displayToast('error', errorMsg);
      document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const missingFields = [];

    if (!String(bookingForm.firstName || '').trim()) missingFields.push('First Name');
    if (!String(bookingForm.lastName || '').trim()) missingFields.push('Last Name');
    if (!String(bookingForm.email || '').trim()) missingFields.push('Email');
    if (!String(bookingForm.phoneNumber || '').trim()) missingFields.push('Phone Number');

    if (missingFields.length > 0) {
      const errorMsg = `Please complete the required fields before proceeding to payment: ${missingFields.join(', ')}`;
      setPaymentFormError(errorMsg);
      displayToast('error', errorMsg);
      return;
    }

    const safePropertyId = parseInt(propertyDetails?.propertyid || propertyId, 10);

    if (!safePropertyId) {
      throw new Error('Property ID is missing. Please refresh and try again.');
    }

    const baseRoomStr =
      bookingData.selectedRoom?.baseRoomName ||
      bookingData.selectedRoom?.name ||
      '';

    const packageStr = bookingData.selectedRoom?.isVariation
      ? ` (Package: ${bookingData.selectedRoom.name})`
      : '';

    const roomNameStr = baseRoomStr + packageStr;

    const payloadPrice = Number.isFinite(finalGrandTotal)
      ? parseFloat(finalGrandTotal.toFixed(2))
      : 0;

    if (payloadPrice <= 0) {
      throw new Error('Invalid payment amount. Please check the selected dates and room.');
    }

    let downPaymentAmount = payloadPrice * depositPercentage;
    let fullTotalPrice = payloadPrice;

    if (isInstantPayment) {
      const rate = parseFloat(propertyDetails?.instantpaymentrate) || 0;
      fullTotalPrice = parseFloat((payloadPrice * (1 - rate)).toFixed(2));
      downPaymentAmount = fullTotalPrice;
    }

    const reservationBlockTime = new Date(
      new Date(bookingData.checkIn).getTime() - daysBeforePayment * 24 * 60 * 60 * 1000
    ).toISOString();

    const reservationData = {
  propertyid: safePropertyId,
  checkindatetime: bookingData.checkIn,
  checkoutdatetime: bookingData.checkOut,
  reservationblocktime: reservationBlockTime,
  request: roomNameStr
    ? `Room Selected: ${roomNameStr}\n\nAdditional Requests: ${bookingForm.additionalRequests || 'None'}`
    : bookingForm.additionalRequests || '',
  totalprice: fullTotalPrice,
  rcfirstname: bookingForm.firstName,
  rclastname: bookingForm.lastName,
  rcemail: bookingForm.email,
  rcphoneno: bookingForm.phoneNumber,
  rctitle: bookingForm.title,
  adults: parseInt(bookingData.adults, 10) || 1,
  children: parseInt(bookingData.children, 10) || 0,
  userid: parseInt(userid, 10),
 reservationstatus: 'Checkout Pending',
  downpaymentamount: downPaymentAmount,


  paymenttype: isInstantPayment ? 'instant' : 'deposit'
};

    console.log('CREATE RESERVATION PAYLOAD:', reservationData);

    const createdReservation = await createReservation(reservationData);

    console.log('CREATE RESERVATION RESULT:', createdReservation);

    if (!createdReservation || !createdReservation.reservationid) {
      throw new Error('Failed to create reservation.');
    }

    const payPalData = await getPropertyOwnerPayPalId(safePropertyId);

    console.log('OWNER PAYPAL RESULT:', payPalData);

    if (!payPalData?.payPalId) {
      throw new Error('Property owner has no PayPal ID configured.');
    }

    const updatedReservation = {
      ...createdReservation,
      propertyaddress: propertyDetails.propertyaddress,
      checkindatetime: bookingData.checkIn,
      checkoutdatetime: bookingData.checkOut,
      totalprice: fullTotalPrice,
      originalTotal: payloadPrice,
      downPaymentAmount,
      reservationblocktime: reservationBlockTime,
      daysBeforePaying: daysBeforePayment
    };

    setPropertyOwnerPayPalId(payPalData.payPalId);
    setAcceptedTerms(false);
    setPaymentStatus('idle');
    setPaymentError('');
    currentReservationIdRef.current = createdReservation.reservationid;
    setSelectedReservation(updatedReservation);
    setShowPaymentModal(true);
    setShowBookingForm(false);

  } catch (error) {
    console.error('Checkout init error:', error);

    const serverMsg =
  error?.data?.message ||
  error?.data?.error ||
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  '';
    const lowerMsg = serverMsg.toLowerCase();

    if (
      lowerMsg.includes('too close') ||
      lowerMsg.includes('booking cannot proceed') ||
      lowerMsg.includes('deadline') ||
      lowerMsg.includes('check-in date')
    ) {
      setPaymentFormError(serverMsg);

      const opened = openNearCheckInBlockedModal();

      if (!opened) {
        setBlockedBookingTitle('Booking Window Closed');
        setBlockedBookingMessage(
          serverMsg ||
          'This booking cannot proceed because the selected check-in date is too close.'
        );
        setBlockedBookingDetails(null);
        setShowBookingBlockedModal(true);
      }

      return;
    }

    if (
      lowerMsg.includes('blackout') ||
      lowerMsg.includes('unavailable')
    ) {
      displayToast(
        'error',
        serverMsg || 'These dates are blocked and unavailable. Please select different dates.'
      );
      return;
    }

    setPaymentFormError(serverMsg || 'Failed to initialize checkout.');
    displayToast('error', serverMsg || 'Failed to initialize checkout.');
  } finally {
    setIsProcessingCheckout(false);
  }
};

    const handlePayPalApprove = useCallback(async (data, actions) => {
    try {
  const response = await fetch(getApiUrl(`/paypal/capture-order/${data.orderID}`), {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
});
 const details = await response.json();

console.log('PAYPAL CAPTURE RESPONSE:', {
  status: response.status,
  ok: response.ok,
  details
});

if (!response.ok || details.error || details.authenticated === false) {
  throw new Error(details.error || details.message || 'Capture failed');
}

      console.log('Payment completed successfully', details);

      const newStatus = isInstantPayment ? 'Paid' : 'Partially Paid';
try {
  // Call this first so backend can detect the old status correctly.
  // If old status is Checkout Pending / Payment Pending = deposit payment.
  // If old status is Partially Paid = balance payment.
  try {
    await paymentSuccess(selectedReservation.reservationid);
  } catch (emailError) {
    console.error("Payment email/log failed, but payment was captured:", emailError);
  }

  // After log/email is done, then update final reservation status.
  await updateReservationStatus(selectedReservation.reservationid, newStatus);

  // payment completed, so do not expire this reservation later
  paymentExpiredRef.current = true;
  currentReservationIdRef.current = null;

  if (paymentTimerRef.current) {
    clearInterval(paymentTimerRef.current);
    paymentTimerRef.current = null;
  }

  allResCache.current = null;
  cartResCache.current = null;

  await queryClient.invalidateQueries({ queryKey: ['reservations'] });
  await queryClient.invalidateQueries({ queryKey: ['cart'] });
} catch (dbError) {
  console.error("Payment was captured, but reservation status update failed:", dbError);

  paymentExpiredRef.current = true;
  currentReservationIdRef.current = null;

  if (paymentTimerRef.current) {
    clearInterval(paymentTimerRef.current);
    paymentTimerRef.current = null;
  }

  setPaymentStatus('error');
  setPaymentError(
    'Payment was captured, but the reservation status could not be updated. Please contact support.'
  );

  return false;
}

setPaymentStatus('success');
return true;
    } catch (error) {
      console.error('Error completing PayPal payment:', error);
      setPaymentStatus('error');
      setPaymentError('Payment could not be processed. Please try again.');
      return false;
    }
}, [selectedReservation, isInstantPayment, queryClient]);

const createOrder = useCallback(async (data, actions) => {
  if (!selectedReservation || !propertyOwnerPayPalId) {
    setPaymentError('Payment information not available. Please try again.');
    return Promise.reject('Invalid reservation or recipient information');
  }

  const paymentAmount = isInstantPayment
    ? selectedReservation.totalprice
    : selectedReservation.downPaymentAmount;

  try {
    await updateReservationStatus(selectedReservation.reservationid, 'Payment Pending');
  } catch (error) {
    console.error('Failed to mark reservation as payment pending:', error);
  }

  return actions.order.create({
    purchase_units: [
      {
        amount: {
          currency_code: 'MYR',
          value: paymentAmount.toFixed(2),
        },
        description: isInstantPayment
          ? `Full Payment for ${selectedReservation.propertyaddress}`
          : `Deposit for ${selectedReservation.propertyaddress}`,
        reference_id: `reservation-${selectedReservation.reservationid}`,
        payee: propertyOwnerPayPalId.includes('@')
          ? { email_address: propertyOwnerPayPalId }
          : { merchant_id: propertyOwnerPayPalId }
      }
    ]
  });
}, [selectedReservation, propertyOwnerPayPalId, isInstantPayment]);

    const handlePayPalError = (err) => {
      console.error('PayPal error:', err);
      setPaymentError('An error occurred with PayPal. Please try again.');
    };

    const formatPaymentCountdown = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

const expireCurrentPaymentReservation = useCallback(async () => {
  if (!currentReservationIdRef.current || paymentStatus === 'success') return;

  try {
    await updateReservationStatus(currentReservationIdRef.current, 'Expired');
  } catch (err) {
    console.error('Failed to expire unpaid reservation:', err);
  }

  currentReservationIdRef.current = null;
}, [paymentStatus]);

  const handleCancelPayment = async () => {
  if (paymentTimerRef.current) {
    clearInterval(paymentTimerRef.current);
    paymentTimerRef.current = null;
  }

  await expireCurrentPaymentReservation();

  setShowPaymentModal(false);
  setSelectedReservation(null);
  setPaymentError('');
  setPaymentStatus('idle');
  setAcceptedTerms(false);

  queryClient.invalidateQueries({ queryKey: ['cart'] });
  queryClient.invalidateQueries({ queryKey: ['reservations'] });
};


useEffect(() => {
  if (!showPaymentModal || !currentReservationIdRef.current) return;

  const handlePageHide = () => {
  if (paymentStatus === 'success' || paymentExpiredRef.current) return;

    const reservationId = currentReservationIdRef.current;
    if (!reservationId) return;

    try {
      const url = getApiUrl(`/reservation/${reservationId}/status`);

      const payload = JSON.stringify({
        status: 'Expired'
      });

      navigator.sendBeacon?.(
        url,
        new Blob([payload], { type: 'application/json' })
      );
    } catch (error) {
      console.error('Failed to send expire beacon:', error);
    }
  };

  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('beforeunload', handlePageHide);

  return () => {
    window.removeEventListener('pagehide', handlePageHide);
    window.removeEventListener('beforeunload', handlePageHide);

if (
  paymentStatus !== 'success' &&
  !paymentExpiredRef.current &&
  currentReservationIdRef.current
) {
  updateReservationStatus(currentReservationIdRef.current, 'Expired')
    .catch((err) => console.error('Failed to expire on modal unmount:', err));

  currentReservationIdRef.current = null;
}
  };
}, [showPaymentModal, paymentStatus]);

    const toggleRoomDesc = (roomId) => {
        setExpandedRoomDesc(prev => ({ ...prev, [roomId]: !prev[roomId] }));
    };

if (loading && !propertyDetails) {
  return (
    <div style={{ marginTop: '150px', textAlign: 'center', minHeight: '60vh' }}>
      <h2>Loading Property Details...</h2>
    </div>
  );
}
    if (error || (!propertyDetails && !propertyId)) return (
        <div style={{ marginTop: '150px', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <FaExclamationCircle size={60} color="#ff4d4f" style={{ marginBottom: '20px' }} />
          <h2 style={{ color: '#333', marginBottom: '10px' }}>Property Unavailable</h2>
          <p style={{ color: '#666', marginBottom: '25px', maxWidth: '400px' }}>This property is no longer available.</p>
          <button onClick={() => navigate(-1)} style={{ padding: '12px 25px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px' }}>Go Back</button>
        </div>
    );

    const facilitiesArray2 = propertyDetails?.facilities ? propertyDetails.facilities.split(",") : [];

    const nextSlide = () => { 
        if (currentSlide < (propertyDetails?.propertyimage?.length || 0) - 1) {
            setCurrentSlide(prev => prev + 1); 
        }
    };
    
    const prevSlide = () => { 
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1); 
        }
    };

  const displayWalkable = nearbyPlaces.walkable || [];
  const displayLandmarks = nearbyPlaces.landmarks || [];

  const addressForMap =
    propertyDetails?.nearbylocation ||
    propertyDetails?.propertyaddress ||
    '';

  const googleMapSrc =
    locationCoords?.lat && locationCoords?.lng
      ? `https://maps.google.com/maps?q=${locationCoords.lat},${locationCoords.lng}&z=15&output=embed`
      : `https://maps.google.com/maps?q=${encodeURIComponent(addressForMap)}&z=15&output=embed`;

  const getGoogleMapsSearchUrl = (place) => {
    if (place?.placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} near ${addressForMap}`)}&query_place_id=${place.placeId}`;
    }

    const query =
      locationCoords?.lat && locationCoords?.lng
        ? `${place?.name || place} near ${locationCoords.lat},${locationCoords.lng}`
        : `${place?.name || place} near ${addressForMap}`;

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  const getMainGoogleMapsUrl = () => {
    if (locationCoords?.lat && locationCoords?.lng) {
      return `https://www.google.com/maps/search/?api=1&query=${locationCoords.lat},${locationCoords.lng}`;
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressForMap)}`;
  };

  const visibleCalendarBlackouts = (propertyBlackouts || []).filter((blackout) => {
    if (blackout.is_active === false) return false;

    // Whole property blackout always show red immediately
    if (isWholePropertyBlackout(blackout)) return true;

    // Room-specific blackout only show red after user selects that matching room
    return isBlackoutForSelectedRoom(blackout);
  });

  const checkInTime =
    propertyDetails?.checkintime ||
    propertyDetails?.check_in_time ||
    propertyDetails?.propertycheckintime ||
    '3:00 PM';

  const checkOutTime =
    propertyDetails?.checkouttime ||
    propertyDetails?.check_out_time ||
    propertyDetails?.propertycheckouttime ||
    '12:00 PM';

    return (
      <div style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
        <div className="Property_Details_Main_Container">
          <AuthProvider>
          <Navbar />

          <div
  style={{
    position: 'relative',
    zIndex: 50,
    maxWidth: '1280px',
    margin: '0 auto',
    paddingTop: '110px',
    paddingBottom: '15px',
    paddingLeft: '15px'
  }}
>
  <button
    onClick={handleBackToSearch}
    style={{
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      color: '#A9774D',
      fontWeight: 'bold',
      fontSize: '15px',
      width: 'fit-content',
      background: '#fffaf5',
      border: '1px solid #D8C7B8',
      padding: '8px 16px',
      borderRadius: '8px',
      boxShadow: '0 2px 6px rgba(73, 56, 41, 0.08)',
      transition: 'all 0.2s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = '#F5EDE4';
      e.currentTarget.style.color = '#806853';
      e.currentTarget.style.borderColor = '#C4956A';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = '#fffaf5';
      e.currentTarget.style.color = '#A9774D';
      e.currentTarget.style.borderColor = '#D8C7B8';
    }}
  >
    <IoIosArrowBack
      size={18}
      style={{
        marginRight: '6px',
        color: 'currentColor'
      }}
    />
    Back to Search Results
  </button>
</div>

          <div className="property-details-main-container" style={{ marginTop: '0px' }}>

            <div className="Main_Image_gallery_container" style={{ position: 'relative', marginTop: '0px' }}>
              <div className="Image_gallery_card_1">
                {propertyDetails?.propertyimage && propertyDetails.propertyimage.length > 0 && (
                  <>
                    <img src={getSafeImageSrc(getSafeImageArray(propertyDetails.propertyimage)[0])} onClick={() => handlePhotoClick(0, propertyDetails.propertyimage)} className="main_gallery_image" alt="Main" style={{ cursor: 'pointer' }} />
                    <div style={{ position: 'absolute', bottom: '15px', right: '15px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'none', zIndex: 5 }}>
                        <FaImages size={14}/> 1 / {propertyDetails.propertyimage.length}
                    </div>
                  </>
                )}
              </div>
              <div className="Image_gallery_container">
                <div className="Image_gallery_card_2">
                  {propertyDetails?.propertyimage && propertyDetails.propertyimage.length > 1 && (
                      <img src={getSafeImageSrc(propertyDetails.propertyimage[1])} onClick={() => handlePhotoClick(1, propertyDetails.propertyimage)} className="second_gallery_image" alt="Second" style={{ cursor: 'pointer' }} />
                  )}
                </div>
                <div className="Image_gallery_card_2">
                  {propertyDetails?.propertyimage && propertyDetails.propertyimage.length > 2 && (
                      <img src={getSafeImageSrc(propertyDetails.propertyimage[2])} onClick={() => handlePhotoClick(2, propertyDetails.propertyimage)} className="second_gallery_image" alt="Third" style={{ cursor: 'pointer' }} />
                  )}
                </div>
              </div>
              <button className="show-all-btn" onClick={() => handlePhotoClick(0, propertyDetails?.propertyimage)} style={{ position: 'absolute', bottom: '20px', right: '20px', backgroundColor: 'rgba(255, 255, 255, 0.9)', color: '#333', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', zIndex: 10 }}>See all photos</button>
            </div>

            <div className="mobile-slideshow">
              {propertyDetails?.propertyimage?.map((image, index) => (
                <div key={index} className={`slide ${currentSlide === index ? 'active' : ''}`} style={{transform: `translateX(${100 * (index - currentSlide)}%)`, transition: 'transform 0.3s'}}>
                  <img src={getSafeImageSrc(image)} alt={`Property image ${index + 1}`} onClick={() => handlePhotoClick(index, propertyDetails.propertyimage)} style={{ cursor: 'pointer' }} />
                </div>
              ))}
              
              {currentSlide > 0 && (
                  <button className="slide-nav prev" onClick={prevSlide}><IoIosArrowBack /></button>
              )}
              
              {currentSlide < (propertyDetails?.propertyimage?.length || 0) - 1 && (
                  <button className="slide-nav next" onClick={nextSlide}><IoIosArrowForward /></button>
              )}

              <div style={{ position: 'absolute', bottom: '15px', right: '15px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 5, pointerEvents: 'none' }}>
                  <FaImages size={14}/> {currentSlide + 1} / {propertyDetails?.propertyimage?.length}
              </div>
            </div>

            {isFullscreen && (
    <div className="fullscreen-overlay">
      <div className="fullscreen-header">
        <button className="close-btn" onClick={handleCloseFullscreen}>
          <IoMdClose />
        </button>

      <div className="image-counter">
    {Math.max(1, selectedImageIndex + 1)} / {fullscreenImages.length}
  </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            position: 'absolute',
            right: '20px',
            top: '18px',
            zIndex: 10002
          }}
        >
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={imageZoom <= 1}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: imageZoom <= 1 ? '#6b7280' : '#ffffff',
              color: imageZoom <= 1 ? '#d1d5db' : '#111827',
              fontWeight: '700',
              cursor: imageZoom <= 1 ? 'not-allowed' : 'pointer'
            }}
          >
            −
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#ffffff',
              color: '#111827',
              fontWeight: '700',
              cursor: 'pointer',
              minWidth: '70px'
            }}
          >
            {Math.round(imageZoom * 100)}%
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={imageZoom >= 3}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: imageZoom >= 3 ? '#6b7280' : '#ffffff',
              color: imageZoom >= 3 ? '#d1d5db' : '#111827',
              fontWeight: '700',
              cursor: imageZoom >= 3 ? 'not-allowed' : 'pointer'
            }}
          >
            +
          </button>
        </div>
      </div>

      <div
    className="fullscreen-content"
    style={{
      overflow: 'hidden',
      cursor: imageZoom > 1 ? (isDraggingImage ? 'grabbing' : 'grab') : 'default'
    }}
    onMouseMove={handleImageMouseMove}
    onMouseUp={handleImageMouseUp}
    onMouseLeave={handleImageMouseUp}
  >
        {selectedImageIndex > 0 && imageZoom === 1 && (
    <button
      className="nav-btn prev-btn"
      onClick={() => changeFullscreenImage(-1)}
    >
      <IoIosArrowBack />
    </button>
  )}

      <img
    src={getSafeImageSrc(fullscreenImages[selectedImageIndex] || fullscreenImages[0])}
    alt="fullscreen"
    className="fullscreen-image"
    draggable={false}
    style={{
      transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageZoom})`,
      transition: isDraggingImage ? 'none' : 'transform 0.2s ease',
      cursor: imageZoom > 1 ? (isDraggingImage ? 'grabbing' : 'grab') : 'zoom-in',
      maxWidth: '100%',
      maxHeight: '90vh',
      userSelect: 'none'
    }}
    onMouseDown={handleImageMouseDown}
    onClick={(e) => {
      if (isDraggingImage) return;

      if (imageZoom <= 1) {
        setImageZoom(1.5);
      }
    }}
  />

      {selectedImageIndex < fullscreenImages.length - 1 && imageZoom === 1 && (
    <button
      className="nav-btn next-btn"
      onClick={() => changeFullscreenImage(1)}
    >
      <IoIosArrowForward />
    </button>
  )}
      </div>
    </div>
  )}

            <div className="Details_container">
              <div className="Description_container">
                <div className="first_container" style={{ maxWidth: '100%' }}>
        {/* Property title */}
            <div className="pd-hero-info-card">
              <div className="Room_name_container pd-title-row">
                <h2 className="Room_name pd-property-title">
                  {propertyDetails?.propertyaddress}
                </h2>
              </div>

              <div className="pd-property-meta-row">
                <div className="pd-property-meta-item">
                  <FaMapMarkerAlt size={15} />
                  <span>{propertyDetails?.clustername}</span>
                </div>

                <div className="pd-property-meta-item">
                  <IoIosBed size={17} />
                  <span>{propertyDetails?.propertybedtype}</span>
                </div>

                <div className="pd-property-meta-item">
                  <FaUser size={15} />
                  <span>{propertyDetails?.propertyguestpaxno} Guest</span>
                </div>

                <div className="pd-host-box">
                <img
                  src={
                    propertyDetails?.uimage
                      ? getSafeImageSrc(propertyDetails.uimage.trim())
                      : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                  }
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid #ddd'
                  }}
                  alt="Admin"
                />                         
                       <span className="pd-host-name">
        Hosted by {propertyDetails?.username || "Unknown Host"}
      </span>
    </div>
  </div>
</div>

                  {propertyDetails?.highlights && propertyDetails.highlights.length > 0 && (
                    <div style={{ marginTop: '20px', padding: '0', borderRadius: '8px' }}>
                      <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#333' }}>Highlights</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {propertyDetails.highlights.map((highlight, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                            <div style={{ backgroundColor: '#e8f4fd', padding: '10px', borderRadius: '50%', color: '#007bff' }}>
                              {idx % 3 === 0 ? <FaMapMarkerAlt size={20} /> : idx % 3 === 1 ? <IoIosBed size={20} /> : <FaThumbsUp size={20} />}
                            </div>
                            <div>
                              <div style={{ fontWeight: 'bold', color: '#333' }}>{highlight.title}</div>
                              <div style={{ color: '#666', fontSize: '14px' }}>"{highlight.description}"</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <hr className="custom-line" />

                  {/* About section */}
                  <div className="Room_description_container pd-about-card">
                    <div className="pd-section-label">About This Place</div>

                    <p className="Room_description pd-about-text">
                      {description.length > 250 ? `${description.slice(0, 250)}...` : description}
                    </p>

                    {description.length > 250 && (
                      <button
                        className="show-more-btn pd-read-more-btn"
                        onClick={() => setShowDescriptionOverlay(true)}
                      >
                        Read more
                      </button>
                    )}
                  </div>

                  <div
    className="check-time-container"
    style={{
      marginTop: '20px',
      marginBottom: '25px',
      padding: '20px',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}
  >
    <h2
      style={{
        fontSize: '20px',
        marginBottom: '15px',
        color: '#333'
      }}
    >
      Check-in / Check-out Time
    </h2>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '15px'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px',
          borderRadius: '10px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0'
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <FaKey size={18} />
        </div>

        <div>
          <div
            style={{
              fontSize: '12px',
              color: '#64748b',
              fontWeight: '700',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}
          >
            Check-in
          </div>
          <div
            style={{
              fontSize: '16px',
              color: '#111827',
              fontWeight: '700'
            }}
          >
            From {checkInTime}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px',
          borderRadius: '10px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0'
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: '#fff7ed',
            color: '#c2410c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <FaDoorOpen size={18} />
        </div>

        <div>
          <div
            style={{
              fontSize: '12px',
              color: '#64748b',
              fontWeight: '700',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}
          >
            Check-out
          </div>
          <div
            style={{
              fontSize: '16px',
              color: '#111827',
              fontWeight: '700'
            }}
          >
            Before {checkOutTime}
          </div>
        </div>
      </div>
    </div>
  </div>

                  {showDescriptionOverlay && (
                    <div className="description-overlay">
                      <div className="description-overlay-content">
                        <div className="overlay-header-About">
                          <h2 className="About_text">About This Place</h2>
                          <button className="close-overlay" onClick={() => setShowDescriptionOverlay(false)}><IoMdClose /></button>
                        </div>
                        <div className="full-description">
                          <p className="Room_description">{description}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- REVIEW SECTION --- */}
                  {isEligibleToReview && reviewState !== 'loading' && (
                    <div style={{ marginBottom: '40px', padding: '30px', backgroundColor: '#f8faff', borderRadius: '12px', border: '1px solid #cce5ff', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                        {reviewState === 'locked' ? (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <FaExclamationCircle size={40} color="#dc3545" style={{ marginBottom: '15px' }} />
                                <h3 style={{ color: '#dc3545', fontSize: '20px', marginBottom: '10px' }}>Review Locked</h3>
                                <p style={{ color: '#555', fontSize: '15px' }}>You have already submitted (or deleted) a review for this property. Guests are limited to one review per stay.</p>
                            </div>
                        ) : (
                            <>
                                <h3 style={{ marginBottom: '10px', color: '#0056b3', fontSize: '22px' }}>
                                  {reviewState === 'create' ? 'Rate Your Stay' : 'Your Submitted Review'}
                                </h3>
                                <p style={{ color: '#555', marginBottom: '20px', fontSize: '14px' }}>
                                  {reviewState === 'create' ? "Since you recently stayed here, we'd love to hear your thoughts! Note: Reviews cannot be edited once submitted." : "You have already reviewed this property. You cannot edit it, but you may delete it."}
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px', maxWidth: '400px' }}>
                                    {renderSubRatingRow("location", "Location")}
                                    {renderSubRatingRow("cleanliness", "Cleanliness")}
                                    {renderSubRatingRow("value", "Value for money")}
                                    {renderSubRatingRow("facilities", "Facilities")}
                                    {renderSubRatingRow("service", "Service")}
                                </div>
                                <textarea 
                                    placeholder="Share your experience (Sensitive words will be automatically filtered)..."
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    disabled={reviewState === 'view'}
                                    style={{ width: '100%', minHeight: '120px', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '15px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit', backgroundColor: reviewState === 'view' ? '#f8f9fa' : '#fff' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        {reviewState === 'view' && (
                                            <button onClick={() => handleDeleteReview()} disabled={isSubmittingReview} style={{ background: 'none', border: 'none', color: '#dc3545', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', padding: '5px 0' }}>Delete Review</button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {reviewState === 'create' && (
                                            <button onClick={handleReviewSubmit} disabled={isSubmittingReview || !reviewText.trim()} style={{ background: (!reviewText.trim()) ? '#ccc' : '#007bff', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: (!reviewText.trim()) ? 'not-allowed' : 'pointer' }}>{isSubmittingReview ? 'Submitting...' : 'Submit Review'}</button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                  )}

                  {/* --- REVIEWS SUMMARY --- */}
                  <div style={{ marginTop: '40px', marginBottom: '30px', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                      <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                          <span
                        style={{
                          fontWeight: 'bold',
                          color: '#A9774D',
                          borderBottom: '2px solid #C4956A',
                          paddingBottom: '11px',
                          marginRight: '20px',
                          fontSize: '14px',
                          letterSpacing: '0.5px'
                        }}
                      >
                        PROPERTY REVIEWS ({reviewCount})
                      </span>
                      </div>
                      {reviewCount > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'stretch' }}>
                              <div style={{ flex: '0 0 120px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                  <div
                                  style={{
                                    background: 'linear-gradient(145deg, #806853, #C4956A)',
                                    color: 'white',
                                    borderRadius: '10px 10px 10px 0',
                                    width: '74px',
                                    height: '74px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '30px',
                                    fontWeight: 'bold',
                                    position: 'relative',
                                    boxShadow: '0 10px 22px rgba(128, 104, 83, 0.22)'
                                  }}
                                >
                                  {agodaScore}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      bottom: '-10px',
                                      left: '0',
                                      width: '0',
                                      height: '0',
                                      borderTop: '10px solid #493829',
                                      borderRight: '10px solid transparent'
                                    }}
                                  />
                                </div>
                                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#333', marginTop: '10px' }}>{getAgodaText(agodaScore)}</div>
                                  <div style={{ fontSize: '12px', color: '#A9774D', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><FaCheck size={10}/> From {reviewCount} reviews</div>
                              </div>
                              <div style={{ flex: '1', minWidth: '250px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                  {[
                                      { name: 'Location', score: locScore }, { name: 'Cleanliness', score: cleanScore },
                                      { name: 'Value for money', score: valueScore }, { name: 'Facilities', score: facScore },
                                      { name: 'Service', score: servScore }
                                  ].map((item, idx) => (
                                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#333' }}><span>{item.name}</span><span style={{ color: '#0f8a4e', fontWeight: 'bold' }}>{item.score}</span></div>
                                          <div style={{ width: '100%', height: '6px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}><div style={{ width: `${(item.score / 10) * 100}%`, height: '100%', backgroundColor: '#0f8a4e', borderRadius: '3px' }}></div></div>
                                      </div>
                                  ))}
                              </div>
                              <div style={{ flex: '0 0 200px', borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
                                  <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px', color: '#333' }}>Rating</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#666' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={distribution.exceptional>0} readOnly style={{ accentColor: '#A9774D' }}/> 9+ Exceptional ({distribution.exceptional})</div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={distribution.excellent>0} readOnly style={{ accentColor: '#A9774D' }}/> 8-9 Excellent ({distribution.excellent})</div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={distribution.veryGood>0} readOnly style={{ accentColor: '#A9774D' }}/> 7-8 Very Good ({distribution.veryGood})</div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={distribution.good>0} readOnly style={{ accentColor: '#A9774D' }}/> 6-7 Good ({distribution.good})</div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={distribution.below>0} readOnly style={{ accentColor: '#A9774D' }}/> {"< 6"} Below Expectation ({distribution.below})</div>
                                  </div>
                              </div>
                          </div>
                      ) : ( <div style={{ padding: '20px 0', color: '#666', fontSize: '14px' }}>No reviews yet.</div> )}
                  </div>

                  {/* --- CUSTOMER COMMENTS --- */}
                  {reviewCount > 0 && (
                      <div style={{ marginBottom: '40px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '20px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <h3 style={{ fontSize: '18px', color: '#333', margin: 0 }}>
                          What guests are saying
                        </h3>

                        <select
                          value={reviewSort}
                          onChange={(e) => setReviewSort(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            backgroundColor: '#fff',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="latest">Latest first</option>
                          <option value="oldest">Oldest first</option>
                          <option value="highest">Highest rating</option>
                          <option value="lowest">Lowest rating</option>
                        </select>
                      </div>
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                           {sortedReviews.map((rev, idx) => (
                              <div
                                key={rev.id || idx}
                                style={{
                                  padding: '20px',
                                  border: '1px solid #eee',
                                  borderRadius: '8px',
                                  backgroundColor: '#fff',
                                  position: 'relative'
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: '15px',
                                    gap: '12px'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div
                                      style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        backgroundColor: '#C4956A',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '18px'
                                      }}
                                    >
                                      {rev.name ? rev.name.charAt(0).toUpperCase() : 'U'}
                                    </div>

                                    <div>
                                      <div style={{ fontWeight: 'bold', color: '#333' }}>
                                        {rev.name || 'Verified Guest'}
                                      </div>
                                      <div style={{ fontSize: '12px', color: '#888' }}>
                                        {rev.datePosted}
                                      </div>
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      background: 'rgba(196, 149, 106, 0.14)',
                                      color: '#A9774D',
                                      padding: '4px 10px',
                                      borderRadius: '15px',
                                      fontSize: '14px',
                                      fontWeight: 'bold',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      flexShrink: 0
                                    }}
                                  >
                                    <FaStar size={12} color="#A9774D" />
                                    {((rev.rating || 5) * 2).toFixed(1)} / 10
                                  </div>
                                </div>

                                <p
                                  style={{
                                    color: '#444',
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    margin: 0
                                  }}
                                >
                                  "{rev.comment}"
                                </p>

                               {/* Host response */}
                                {rev.owner_reply && (
                                  <div
                                    style={{
                                      marginTop: '15px',
                                      padding: '15px',
                                      backgroundColor: '#f8fafc',
                                      borderLeft: '3px solid #C4956A',
                                      borderRadius: '0 8px 8px 0'
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        marginBottom: '5px'
                                      }}
                                    >
                                      <FaCheckCircle size={14} color="#A9774D" />
                                      <span
                                        style={{
                                          fontWeight: 'bold',
                                          fontSize: '13px',
                                          color: '#A9774D'
                                        }}
                                      >
                                        Response from Host
                                      </span>

                                      {rev.reply_date && (
                                        <span
                                          style={{
                                            fontSize: '12px',
                                            color: '#888',
                                            marginLeft: 'auto'
                                          }}
                                        >
                                          {new Date(rev.reply_date).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>

                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: '14px',
                                        color: '#4a5568',
                                        lineHeight: '1.5'
                                      }}
                                    >
                                      {rev.owner_reply}
                                    </p>
                                  </div>
                                )}
                                                   </div>
                            ))}
                          </div>
                      </div>
                  )}

                  <div className="Facilities_Main_Container">
                    <h2 className="Facilities_text">What this place offers</h2>
                    <hr className="custom-line" />
                    <div className="Facilities_Icon_Container">
                      <div className="facilities-details">
                        {(facilitiesArray2.slice(0, 9)).map((facilityName, index) => {
                            const facility = facilities.find(f => f.name === facilityName.trim());
                            return ( <div key={index} className="facilities-item">{facility ? facility.icon : null}<span>{facilityName.trim()}</span></div> );
                        })}
                      </div>
                    </div>
                    <button className="More_button" onClick={() => setShowAllFacilities(true)}>More</button>
                  </div>

                  {showAllFacilities && (
                      <div className="facilities-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAllFacilities(false); }}>
                        <div className="facilities-overlay-content" role="dialog">
                          <div className="overlay-header-Offer"><h3 className="Facilities_text">What this place offers</h3><button className="close-overlay" onClick={() => setShowAllFacilities(false)}><IoMdClose /></button></div>
                          <div className="full-facilities-list">
                            {facilitiesArray2.length > 0 ? (
                              <div className="facilities-grid">
                                {facilitiesArray2.map((facilityName, index) => {
                                  const facility = facilities.find(f => f.name === facilityName.trim());
                                  return ( <div key={index} className="facilities-overlay-item"><div className="facility-icon">{facility ? facility.icon : null}</div><span className="facility-name">{facilityName.trim()}</span></div> );
                                })}
                              </div>
                            ) : ( <p className="no-facilities">No facilities available</p> )}
                          </div>
                        </div>
                      </div>
                  )}

                  {/* --- FULL-WIDTH HORIZONTAL ROOM SELECTION SECTION --- */}
                  {isJsonInventory && availableRooms.length > 0 && (
                    <div className="room-selection-container" id="rooms" style={{ marginTop: '30px', paddingBottom: '20px', width: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
                      <h2 className="room-selection-header" style={{ fontSize: '24px', marginBottom: '20px', color: '#333', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Available Room Types</h2>
                      
                      {/* HORIZONTAL SCROLLING WRAPPER */}
                      <div className="room-list-horizontal" style={{ 
                          display: 'flex', 
                          gap: '16px', 
                          overflowX: 'auto', 
                          paddingBottom: '15px',
                          scrollSnapType: 'x mandatory',
                          WebkitOverflowScrolling: 'touch',
                          scrollbarWidth: 'thin'
                      }}>
                        {availableRooms.map((room, index) => {
                          const roomId = room.id || index;
                          const isMainRoomSelected = bookingData.selectedRoom?.id === room.id && bookingData.selectedRoom?.isVariation === false;
                          const roomDynamicPrice = Math.max(0, (parseFloat(room.price) * averageNightlyMultiplier) - flatDiscount).toFixed(2);

                          const baseAvailability = getRoomAvailability(room.name, '');
                          const baseLeft = baseAvailability ? baseAvailability.left : getRoomQuantity(room, null);
                          const baseSoldOut = baseAvailability ? baseAvailability.soldOut : false;
                          
                          const isExpanded = expandedRoomDesc[roomId];
                          const descText = room.description || "";
                          const shouldTruncate = descText.length > 120;
                          
                          return (
                            <div key={roomId} className="room-type-group" style={{ 
                                flex: '0 0 auto', 
                                width: '360px', 
                                scrollSnapAlign: 'start',
                                display: 'flex', flexDirection: 'column', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
                            }}>
                              
                              {/* TOP: Room Information & Image */}
                              <div className="room-main-info" style={{ backgroundColor: '#fff', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  <RoomCardImageSlider images={room.images} fallbackImage={propertyDetails?.propertyimage && propertyDetails.propertyimage[0]} onImageClick={handlePhotoClick} width="100%" height="200px" />
                                  <div>
                                      <h3 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '18px', lineHeight: '1.2' }}>{room.name}</h3>
                                      <div style={{ display: 'flex', gap: '12px', color: '#4a5568', fontSize: '13px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><IoIosBed color="#d97706" size={16} /> {room.bedType}</span>
                                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FaUser color="#d97706" size={14} /> Max {room.maxGuests}</span>
                                      </div>
                                      <p style={{ fontSize: '13px', color: '#718096', margin: 0, lineHeight: '1.5' }}>
                                          {isExpanded || !shouldTruncate ? descText : `${descText.substring(0, 120)}...`}
                                          {shouldTruncate && (
                                              <span 
                                                  onClick={() => toggleRoomDesc(roomId)} 
                                                  style={{ color: '#3182ce', cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold' }}
                                              >
                                                  {isExpanded ? "Show less" : "Read more"}
                                              </span>
                                          )}
                                      </p>
                                  </div>
                              </div>

                              {/* BOTTOM: Rate Packages */}
                              <div className="package-list" style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#fff', padding: 0 }}>
                                  <div style={{ padding: '10px 15px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0', fontWeight: 'bold', color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                      Room Options
                                  </div>
                                  <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                      
                                      {/* Standard Rate */}
                                      <div className={`package-card ${isMainRoomSelected ? 'selected' : ''}`} style={{ 
                                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', 
                                          border: isMainRoomSelected ? '2px solid #16a34a' : '1px solid #e2e8f0', 
                                          borderRadius: '8px', 
                                          backgroundColor: isMainRoomSelected ? '#f0fdf4' : '#fff', 
                                          transition: 'all 0.2s' 
                                      }}>
                                          <div style={{ flex: 1, paddingRight: '10px' }}>
                                              <div style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '14px' }}>Standard Rate</div>
                                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>Room Only</div>
                                          </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#111827', marginBottom: '4px' }}>
                                                  RM {roomDynamicPrice}
                                                </div>

                                                        {baseSoldOut && (
                                                <div
                                                  style={{
                                                    fontSize: '11px',
                                                    color: '#b91c1c',
                                                    fontWeight: '700',
                                                    marginBottom: '6px'
                                                  }}
                                                >
                                                  Sold Out
                                                </div>
                                              )}

                                              <button 
                                                  onClick={() => {
                                                      if (baseSoldOut) {
                                                        displayToast('error', 'This room is sold out for the selected date.');
                                                        return;
                                                      }

                                                      const immediateQty = parseInt(room.quantity ?? room.qty, 10);
                                                      if (!isNaN(immediateQty) && immediateQty > 0) {
                                                        setRoomsLeft(immediateQty);
                                                        setIsSoldOut(false);
                                                      }
                                                      setBookingData(prev => ({ 
                                                          ...prev, 
                                                          selectedRoom: { 
                                                              ...room, 
                                                              isVariation: false, 
                                                              baseRoomName: room.name,
                                                              quantity: room.quantity ?? room.qty 
                                                          } 
                                                      }));
                                                      bookingCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                  }}
                                                style={{
                                                  padding: '6px 12px',
                                                  backgroundColor: baseSoldOut ? '#e5e7eb' : isMainRoomSelected ? '#16a34a' : '#2563eb',
                                                  color: baseSoldOut ? '#6b7280' : 'white',
                                                  border: 'none',
                                                  borderRadius: '6px',
                                                  cursor: baseSoldOut ? 'not-allowed' : 'pointer',
                                                  fontWeight: 'bold',
                                                  fontSize: '12px',
                                                  transition: 'background 0.2s',
                                                  width: '100%'
                                                }}                                            >
                                  {baseSoldOut ? "Sold Out" : isMainRoomSelected ? "✓ Selected" : "Select"}
                                              </button>
                                          </div>
                                      </div>

                                      {/* Packages / Variations */}
                                      {room.options && room.options.length > 0 && room.options.map((opt, optIdx) => {
                                          const isVarSelected = bookingData.selectedRoom?.id === opt.id && bookingData.selectedRoom?.isVariation === true;
                                          const varPrice = Math.max(0, (parseFloat(opt.price) * averageNightlyMultiplier) - flatDiscount).toFixed(2);
                                          const optionAvailability = getRoomAvailability(room.name, opt.name);
                                          const optionLeft = optionAvailability ? optionAvailability.left : getRoomQuantity(room, opt);
                                          const optionSoldOut = optionAvailability ? optionAvailability.soldOut : false;
                                          return (
                                              <div key={opt.id || optIdx} className={`package-card variation ${isVarSelected ? 'selected' : ''}`} style={{ 
                                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', 
                                                  border: isVarSelected ? '2px solid #16a34a' : '1px solid #e2e8f0', 
                                                  borderRadius: '8px', 
                                                  backgroundColor: isVarSelected ? '#f0fdf4' : '#fff', 
                                                  transition: 'all 0.2s' 
                                              }}>
                                                  <div style={{ flex: 1, paddingRight: '10px' }}>
                                                      <div style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '14px' }}>{opt.name}</div>
                                                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Includes base features</div>
                                                  </div>
                                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                                <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#111827', marginBottom: '4px' }}>
                                                                  RM {varPrice}
                                                                </div>

                                                          {optionSoldOut && (
                                                            <div
                                                              style={{
                                                                fontSize: '11px',
                                                                color: '#b91c1c',
                                                                fontWeight: '700',
                                                                marginBottom: '6px'
                                                              }}
                                                            >
                                                              Sold Out
                                                            </div>
                                                          )}

                                                <button 
                                                    onClick={() => {
                                                        if (optionSoldOut) {
                                                          displayToast('error', 'This room package is sold out for the selected date.');
                                                          return;
                                                        }

                                                        const resolvedQty = (opt.quantity && String(opt.quantity).trim() !== "") 
                                                            ? opt.quantity 
                                                            : (opt.qty && String(opt.qty).trim() !== "") 
                                                                ? opt.qty 
                                                                : (room.quantity ?? room.qty);
                                                              const immediateQty = parseInt(resolvedQty, 10);
                                                              if (!isNaN(immediateQty) && immediateQty > 0) {
                                                                setRoomsLeft(immediateQty);
                                                                setIsSoldOut(false);
                                                              }
                                                              setBookingData(prev => ({ 
                                                                  ...prev, 
                                                                  selectedRoom: { 
                                                                      ...opt, 
                                                                      isVariation: true, 
                                                                      bedType: room.bedType, 
                                                                      maxGuests: room.maxGuests, 
                                                                      baseRoomName: room.name, 
                                                                      quantity: resolvedQty
                                                                  } 
                                                              }));
                                                              bookingCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                          }}
                                                      style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: optionSoldOut ? '#e5e7eb' : isVarSelected ? '#16a34a' : '#2563eb',
                                                        color: optionSoldOut ? '#6b7280' : 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: optionSoldOut ? 'not-allowed' : 'pointer',
                                                        fontWeight: 'bold',
                                                        fontSize: '12px',
                                                        transition: 'background 0.2s',
                                                        width: '100%'
                                                      }}                                                    >
                                                    {optionSoldOut ? "Sold Out" : isVarSelected ? "✓ Selected" : "Select"}
                                                      </button>
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div> {/* <-- End of first_container --> */}

                {/* Start of Right Sidebar (Booking Card & Map) */}
                <div className="second_container">
                  <div 
                    className="booking_card" 
                    ref={bookingCardRef} 
                    style={{ 
                      position: window.innerWidth >= 991 ? 'sticky' : 'static',
                      top: '90px', 
                      height: 'auto',
                      maxHeight: 'none', 
                      overflowY: 'visible',
                      marginBottom: '20px'
                    }}
                  >
                    
                    <h3 style={{ fontSize: '22px', margin: '0 0 10px 0', display: 'flex', flexDirection: 'column' }}>
                      {!bookingData.selectedRoom && isHotel && (
                          <span style={{ fontSize: '12px', color: '#717171', fontWeight: 'normal', marginBottom: '2px' }}>Starts from</span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          RM {displayTopRate} <span style={{ fontSize: '13px', color: '#717171', fontWeight: 'normal' }}>/night</span>
                      </div>
                    </h3>
                    
                    <div style={{ display: 'flex', border: isBlackedOut ? '2px solid red' : '1px solid #cbd5e0', borderRadius: '8px', marginBottom: '10px', overflow: 'visible', position: 'relative' }}>
                      <div style={{ flex: 1, borderRight: isBlackedOut ? '2px solid red' : '1px solid #cbd5e0' }}>
                        <CustomCalendar
                        label="CHECK-IN"
                        placeholder="Add date"
                        value={bookingData.checkIn}
                        minDate={getLocalTodayIsoDate()}
                        blackoutRanges={visibleCalendarBlackouts}
                        soldOutDates={propertySoldOutDates}
                       onChange={(val) => {
                          setPaymentFormError('');

                          setBookingData((prev) => {
                            const updated = {
                              ...prev,
                              checkIn: val
                            };

                            if (prev.checkOut && val >= prev.checkOut) {
                              updated.checkOut = '';
                            }

                            return updated;
                          });
                        }}
                      />
                      </div>
                      <div style={{ flex: 1, backgroundColor: !bookingData.checkIn ? '#edf2f7' : 'transparent', borderRadius: '0 8px 8px 0' }}>
                  <CustomCalendar
                          key={`checkout-${bookingData.checkIn || 'empty'}`}
                          label="CHECK-OUT"
                          placeholder="Add date"
                          value={bookingData.checkOut}
                          blackoutRanges={visibleCalendarBlackouts}
                          soldOutDates={propertySoldOutDates}
                          disabled={!bookingData.checkIn}
                          alignRight={true}
                          defaultViewDate={bookingData.checkIn ? addDaysToIsoDate(bookingData.checkIn, 1) : ''}
                          minDate={bookingData.checkIn
                          ? addDaysToIsoDate(bookingData.checkIn, 1)
                          : getLocalTodayIsoDate()}
                          onChange={(val) => {
                            setBookingData(prev => ({ ...prev, checkOut: val }));
                          }}
                        />
                      </div>
                    </div>

                    {isLoadingPropertySoldOutDates && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#64748b',
                        marginBottom: '8px',
                        textAlign: 'center'
                      }}
                    >
                      Checking sold-out dates...
                    </div>
                  )}

                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#4a5568', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span>{totalNights} {totalNights === 1 ? 'Night' : 'Nights'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', color: '#718096', textTransform: 'uppercase', fontWeight: 'bold' }}>GUESTS:</span>
                            <select 
                                value={guests} 
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setGuests(val);
                                    setBookingData(prev => ({...prev, adults: val, children: 0}));
                                }}
                                style={{ padding: '2px 4px', border: '1px solid #cbd5e0', borderRadius: '4px', fontSize: '12px', outline: 'none' }}
                            >
                                {[...Array(parseInt(propertyDetails?.propertyguestpaxno) || 10)].map((_, i) => (
                                    <option key={i+1} value={i+1}>{i+1} Guest{i > 0 ? 's' : ''}</option>
                                ))}
                            </select>
                        </div>
                    </div>

  {bookingData.checkIn && bookingData.checkOut && selectedBlackoutRanges.length > 0 && (
    <div style={{ marginBottom: '10px', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#fff7ed', border: '1px solid #fdba74' }}>
      <div style={{ fontSize: '12px', fontWeight: '700', color: '#c2410c', marginBottom: '6px' }}>
        🚫 Selected dates include blackout dates
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {selectedBlackoutRanges.map((blackout) => {
          const startLabel = formatDisplayDate(blackout.start_date || blackout.startDate);
          const endLabel = formatDisplayDate(
            blackout.end_date ||
            blackout.endDate ||
            blackout.start_date ||
            blackout.startDate
          );
          const sameDay = startLabel === endLabel;

          return (
            <span
              key={`${startLabel}-${endLabel}`}
              style={{
                fontSize: '11px',
                color: '#9a3412',
                backgroundColor: '#ffedd5',
                border: '1px solid #fdba74',
                borderRadius: '999px',
                padding: '4px 8px',
                fontWeight: '600'
              }}
            >
              {sameDay ? startLabel : `${startLabel} - ${endLabel}`}
            </span>
          );
        })}
      </div>

      <div style={{ fontSize: '11px', color: '#9a3412', marginTop: '6px' }}>
        Please choose another date range.
      </div>
    </div>
  )}
              
                    {/* ── EXACT STOCK & SELECTION DISPLAY UI ── */}
                    {displayedRoomsLeft !== null && !isBlackedOut && (!isJsonInventory || bookingData.selectedRoom) && (
                        <div style={{ 
                            padding: '10px', 
                            marginBottom: '10px', 
                            borderRadius: '8px', 
                            border: `1px solid ${isSoldOut ? '#fecaca' : '#bbf7d0'}`,
                            backgroundColor: isSoldOut ? '#fef2f2' : '#f0fdf4',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: bookingData.selectedRoom ? '6px' : '0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isSoldOut ? '#dc2626' : '#16a34a', fontWeight: 'bold', fontSize: '13px' }}>
                                    {bookingData.selectedRoom ? <FaCheckCircle size={14} /> : <FaDoorOpen size={14} />}
                                    <span>{isSoldOut ? 'Sold Out' : (bookingData.selectedRoom ? 'Room Selected' : 'Total Available Rooms')}</span>
                                </div>
                                {!bookingData.selectedRoom && (
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: isSoldOut ? '#b91c1c' : '#15803d', backgroundColor: isSoldOut ? '#fee2e2' : '#dcfce7', padding: '2px 8px', borderRadius: '12px' }}>
                                        {displayedRoomsLeft} {displayedRoomsLeft === 1 ? 'Room' : 'Rooms'} Left
                                    </div>
                                )}
                            </div>

                            {bookingData.selectedRoom && (
                                <div style={{ fontSize: '13px', color: '#166534', borderTop: `1px dashed ${isSoldOut ? '#fecaca' : '#bbf7d0'}`, paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '600', display: 'block', wordBreak: 'break-word', paddingRight: '10px' }}>
                                        {bookingData.selectedRoom.baseRoomName || bookingData.selectedRoom.name}
                                        {bookingData.selectedRoom.isVariation && (
                                            <span style={{ display: 'block', fontSize: '11px', color: '#15803d', fontWeight: 'normal', marginTop: '2px' }}>
                                                {bookingData.selectedRoom.name}
                                            </span>
                                        )}
                                    </span>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: isSoldOut ? '#b91c1c' : '#15803d', backgroundColor: isSoldOut ? '#fee2e2' : '#dcfce7', padding: '4px 10px', borderRadius: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                        {displayedRoomsLeft} {displayedRoomsLeft === 1 ? 'Room' : 'Rooms'} Left
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Warning Messages */}

                    {!isJsonInventory && isHomestay && availableRooms.length > 0 && (
                      <div className="bed_selection_container" style={{ marginBottom: '10px' }}>
                          <div className="date_label" style={{ marginBottom: '4px', fontSize: '10px' }}>PROPERTY SETUP</div>
                          <div className="booking-bed-readonly" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 10px', fontSize: '12px' }}>
                              <IoIosBed size={16} color="#CC8C18" />
                              <span>{availableRooms[0]}</span>
                          </div>
                      </div>
                    )}

                    {bookingData.checkIn && bookingData.checkOut && isJsonInventory && !bookingData.selectedRoom && !isBlackedOut && (
                      <div style={{color: '#b91c1c', fontSize: '13px', marginTop: '8px', textAlign: 'center', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '8px', border: '1px solid #fecaca'}}>
                          Please select a room option below to see final prices.
                      </div>
                    )}

                    <div className="price_details" style={{ opacity: isLoadingBreakdown ? 0.6 : 1, transition: 'opacity 0.2s ease', marginTop: '10px' }}>
                        <h3 style={{ marginBottom: '8px', color: '#333', fontSize: '15px' }}>Price details</h3>
                        {(!breakdownData && isLoadingBreakdown) ? (
                            <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', padding: '8px 0', textAlign: 'center' }}>Calculating live dynamic rates...</p>
                        ) : breakdownData ? (
                          <div className="price-breakdown">
                            <div className="price_item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#555', fontSize: '12px' }}>
                              <span>RM {displayTopRate} x {totalNights} night{totalNights > 1 ? 's' : ''}</span>
                              <span>RM {finalRoomTotal.toFixed(2)}</span>
                            </div>
                            
                            {/* --- SST DISPLAY: Platform commission is already included in room price --- */}

                            <div className="price_item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#555', fontSize: '12px' }}>
                              <span>SST {!isPricingLoading && <small>({(globalSstRate * 100).toFixed(1)}%)</small>}</span>
                              <span>RM {(finalRoomTotal * globalSstRate).toFixed(2)}</span>
                            </div>

                            <div className="price_total" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #333', paddingTop: '10px', fontWeight: 'bold', fontSize: '18px', color: '#333', marginTop: '5px' }}>
                              <span>Total (MYR)</span>
                              <span style={{ color: '#007bff' }}>RM {finalGrandTotal.toFixed(2)}</span>
                            </div>

                            {instantPaymentRate > 0 && breakdownData && (
                              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#ffedd5', borderRadius: '8px', border: '1px solid #fb923c', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                  <div style={{ fontSize: '13px', color: '#c2410c', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <FaPaypal size={14} /> Instant Pay Promotion
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#9a3412', textDecoration: 'line-through', marginBottom: '4px' }}>
                                      <span>Regular Total</span>
                                      <span>RM {finalGrandTotal.toFixed(2)}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: '#9a3412', fontWeight: 'bold' }}>
                                      <span>Instant Pay ({(instantPaymentRate * 100).toFixed(0)}% off)</span>
                                      <span>RM {instantPaymentTotal.toFixed(2)}</span>
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#c2410c', marginTop: '6px', fontWeight: '700' }}>
                                      🔥 You save RM {instantPaymentSavings.toFixed(2)} with instant pay!
                                  </div>
                              </div>
                            )}
                          </div>
                        ) : null}
                    </div>
                    
                    {/* Action Buttons */}
                    <div style={{ marginTop: '15px' }}>
                        {isBlackedOut ? (
                          <button
                            disabled
                            style={{ fontSize: '14px', padding: '10px 0', width: '100%', backgroundColor: '#e2e8f0', color: '#a0aec0', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'not-allowed' }}
                          >
                            Unavailable
                          </button>
                            ) : isSoldOut ? (
                              <button
                                disabled
                                style={{
                                  fontSize: '14px',
                                  padding: '10px 0',
                                  width: '100%',
                                  backgroundColor: '#fee2e2',
                                  color: '#b91c1c',
                                  border: '1px solid #fecaca',
                                  borderRadius: '8px',
                                  fontWeight: 'bold',
                                  cursor: 'not-allowed'
                                }}
                              >
                                Sold Out
                              </button>
                            ) : (
                          <>
                         <button
                            className="reserve_button"
                            style={{ fontSize: '15px', padding: '10px 0' }}
                            onClick={() => {
                              const blocked = validateBlockedBookingBeforeOpenForm('deposit');

                              if (blocked) {
                                return;
                              }

                              setIsInstantPayment(false);
                              setShowBookingForm(true);
                            }}
                          >
                            {isDateOverlapping ? 'Enquiry' : 'Book & Pay'}
                          </button>
                            {instantPaymentRate > 0 && (
                          <button
                            className="reserve_button instant-pay-button"
                            style={{ fontSize: '15px', padding: '10px 0', marginTop: '8px' }}
                            onClick={() => {
                              const blocked = validateBlockedBookingBeforeOpenForm('instant');

                              if (blocked) {
                                return;
                              }

                              console.log('INSTANT PAY SELECTED');

                              setIsInstantPayment(true);
                              setShowBookingForm(true);
                            }}
                          >
                            <FaPaypal /> Instant Pay {instantPaymentRate > 0 && `(${(instantPaymentRate * 100).toFixed(0)}% off)`}
                          </button>
                            )}
                          </>
                        )}
                    </div>
                  </div>
                  
  {/* Right Side Nearby Places Block */}
  <div
    style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '15px',
      marginTop: '15px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    }}
  >
    {nearbyLoading && (
      <div
        style={{
          fontSize: '13px',
          color: '#666',
          marginBottom: '12px'
        }}
      >
        Loading nearby places...
      </div>
    )}

    {nearbyError && !nearbyLoading && (
      <div
        style={{
          fontSize: '13px',
          color: '#b91c1c',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '12px'
        }}
      >
        {nearbyError}
      </div>
    )}

    <div style={{ marginBottom: '10px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#333',
          fontWeight: 'bold',
          marginBottom: '8px',
          fontSize: '14px'
        }}
      >
      <FaWalking size={16} /> Nearby Places
      </div>

      {displayWalkable.length > 0 ? (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            fontSize: '12px',
            color: '#555'
          }}
        >
          {displayWalkable.map((place, idx) => (
          <li
    key={`${place.name}-${idx}`}
    style={{
      padding: '6px 0',
      lineHeight: '1.4'
    }}
  >
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '12px',
      width: '100%'
    }}
  >
    <a
      href={getGoogleMapsSearchUrl(place)}
      target="_blank"
      rel="noreferrer"
      style={{
        color: '#007bff',
        textDecoration: 'none',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500',
        wordBreak: 'break-word',
        flex: 1
      }}
    >
      {place.name}
    </a>

    {place.distanceText && (
      <span
        style={{
          fontSize: '12px',
          color: '#555',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}
      >
        {place.distanceText}
      </span>
    )}
  </div>
  </li>
          ))}
        </ul>
      ) : (
        !nearbyLoading && (
          <p style={{ fontSize: '12px', color: '#777', margin: 0 }}>
            No nearby places found nearby.
          </p>
        )
      )}
    </div>

    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#333',
          fontWeight: 'bold',
          marginBottom: '8px',
          borderTop: '1px solid #eee',
          paddingTop: '10px',
          fontSize: '14px'
        }}
      >
        <FaCarSide size={16} /> Popular landmarks
      </div>

      {displayLandmarks.length > 0 ? (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            fontSize: '12px',
            color: '#555'
          }}
        >
          {displayLandmarks.map((place, idx) => (
            <li
    key={`${place.name}-${idx}`}
    style={{
      padding: '6px 0',
      lineHeight: '1.4'
    }}
  >
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '12px',
      width: '100%'
    }}
  >
    <a
      href={getGoogleMapsSearchUrl(place)}
      target="_blank"
      rel="noreferrer"
      style={{
        color: '#007bff',
        textDecoration: 'none',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500',
        wordBreak: 'break-word',
        flex: 1
      }}
    >
      {place.name}
    </a>

    {place.distanceText && (
      <span
        style={{
          fontSize: '12px',
          color: '#555',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}
      >
        {place.distanceText}
      </span>
    )}
  </div>
  </li>
          ))}
        </ul>
      ) : (
        !nearbyLoading && (
          <p style={{ fontSize: '12px', color: '#777', margin: 0 }}>
            No popular landmarks found nearby.
          </p>
        )
      )}
    </div>

    <div
      style={{
        textAlign: 'center',
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px solid #eee'
      }}
    >
      <a
        href={getMainGoogleMapsUrl()}
        target="_blank"
        rel="noreferrer"
        style={{
          color: '#007bff',
          fontWeight: 'bold',
          textDecoration: 'none',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        See nearby places
      </a>
    </div>
  </div>
                  {/* Map Block Restored to Right Column */}
                  <div id="map" className="Location_Main_Container" style={{ marginTop: '15px' }}>
                    <h2 className="Location_text" style={{ fontSize: '18px' }}>Hotel Location</h2>
                    <hr className="custom-line" style={{ margin: '10px 0' }} />
                    
                    <p style={{ color: '#555', marginBottom: '10px', display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '13px', lineHeight: '1.4' }}>
                      <FaMapMarkerAlt color="#007bff" style={{ marginTop: '3px', flexShrink: 0 }} /> {addressForMap}
                    </p>

                    <div className="Google_map_container">
                      <iframe 
                          src={googleMapSrc} 
                          width="100%" 
                          height="200" 
                          style={{ border: 0, borderRadius: '8px' }} 
                          allowFullScreen="" 
                          loading="lazy" 
                          referrerPolicy="no-referrer-when-downgrade"
                      ></iframe>
                    </div>
                  </div>

                </div> {/* <-- End of second_container --> */}
              </div>
            </div>

            {showBookingForm && (
              <div className="booking-overlay">
                <div className="booking-modal">
                  <div className="booking-header">
                    <button 
                      className="back-button" 
                      onClick={() => setShowBookingForm(false)}
                    >
                      <span><IoReturnUpBackOutline/> {isSoldOut ? 'Enquiry Details' : 'Booking Information'}</span>
                    </button>
                  </div>
                  <div className="booking-content">
                    <div className="booking-left">
                      <div className="trip-section">
                        <h2>{isSoldOut ? 'Enquire for stay' : 'Your trip'}</h2>
                        <br />
                        
                        <div className="trip-dates" style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div className="section-header" style={{ marginBottom: '10px' }}>
                            <h3 style={{ fontSize: '14px', color: '#718096', textTransform: 'uppercase' }}>Dates Confirmed</h3>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 'bold', color: '#2d3748', fontSize: '16px' }}>
                              <span>{new Date(bookingData.checkIn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                              <IoIosArrowForward color="#a0aec0" />
                              <span>{new Date(bookingData.checkOut).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <div style={{ marginTop: '8px', fontSize: '14px', color: '#4a5568' }}>
                              {totalNights} {totalNights === 1 ? 'Night' : 'Nights'} • {guests} Guest{guests > 1 ? 's' : ''}
                          </div>
                        </div>

                        {(isJsonInventory || isHomestay) && (
                          <div className="trip-dates" style={{ marginTop: '20px' }}>
                              <div className="section-header">
                                  <h3>{isHomestay ? "Property Setup" : "Selected Room"}</h3>
                              </div>
                              <div className="booking-bed-readonly" style={{ marginTop: '0', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                  <IoIosBed size={18} color="#CC8C18" />
                                  <span>{bookingData.selectedRoom ? bookingData.selectedRoom.name : (availableRooms.length > 0 ? availableRooms[0] : 'Standard Setup')}</span>
                              </div>
                          </div>
                        )}
                        
                        <br />
                      </div>

                      <div className="login-section">
                        <div className="guest-details-section">
                          <h2>Guest details</h2>
                          <div className="form-grid">
                            <div className="form-group title-group">
                              <label>Title</label>
                              <div className="title-options" style={{ display: 'flex', gap: '10px' }}>
                                {['Mr.', 'Mrs.', 'Ms.'].map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => { setBookingForm(prev => ({...prev, title: t})); if (paymentFormError) setPaymentFormError(''); }}
                                    style={{
                                      padding: '8px 20px',
                                      border: bookingForm.title === t ? '1px solid #ff4d4f' : '1px solid #ddd',
                                      backgroundColor: 'white',
                                      color: bookingForm.title === t ? '#ff4d4f' : '#333',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      fontWeight: bookingForm.title === t ? 'bold' : 'normal'
                                    }}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="form-group">
                              <label>First name</label>
                              <input 
                                  type="text" 
                                  name="firstName" 
                                  value={bookingForm.firstName} 
                                  onChange={handleFormChange} 
                                  required
                              />
                            </div>
                            
                            <div className="form-group">
                              <label>Last name</label>
                              <input 
                                  type="text" 
                                  name="lastName" 
                                  value={bookingForm.lastName} 
                                  onChange={handleFormChange} 
                                  required
                              />
                            </div>
                            
                            <div className="form-group">
                              <label>Email</label>
                              <input 
                                  type="email" 
                                  name="email" 
                                  value={bookingForm.email} 
                                  onChange={handleFormChange} 
                                  required
                              />
                            </div>
                            
                            <div className="form-group">
                              <label>Phone number</label>
                              <input 
                                  type="tel" 
                                  name="phoneNumber" 
                                  value={bookingForm.phoneNumber} 
                                  onChange={handleFormChange} 
                                  required
                              />
                            </div>
                            
                            <div className="form-group full-width">
                              <label>Additional requests</label>
                              <textarea 
                                  name="additionalRequests" 
                                  value={bookingForm.additionalRequests} 
                                  onChange={handleFormChange} 
                                  rows="4"
                              />
                            </div>
                          </div>
                        </div>
                        <br /><br />
                        
                        {paymentFormError && (
                            <div style={{ fontSize: '14px', color: '#b42318', marginBottom: '15px', backgroundColor: '#fef3f2', padding: '12px 14px', borderRadius: '10px', border: '1px solid #fda29b', textAlign: 'center', fontWeight: 500, lineHeight: 1.5 }}>
                                ⚠️ {paymentFormError}
                            </div>
                        )}

                        {!isInstantPayment && daysBeforePayment > 0 && (
                            <div style={{ fontSize: '13px', color: '#c53030', marginBottom: '15px', backgroundColor: '#fff5f5', padding: '10px', borderRadius: '6px', border: '1px solid #feb2b2', textAlign: 'center' }}>
                                ⏳ Reminder: Remaining balance must be paid <strong>{daysBeforePaymentLabel}</strong> before check-in to prevent auto-cancellation.
                            </div>
                        )}

                        <button 
                          type="button"
                          className="continue-button" 
                          onClick={handleAddToCart}
                          disabled={isProcessingCheckout}
                          style={{
                            opacity: isProcessingCheckout ? 0.65 : 1,
                            cursor: isProcessingCheckout ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isProcessingCheckout
                            ? 'Processing...'
                            : isSoldOut
                              ? 'Join Waitlist'
                              : 'Proceed to Payment'}
                        </button>
                        <div className="divider">or</div>
                        <div className="social-buttons">
                          <button 
                              className="social-button google" 
                              onClick={() => googleLoginHandler()}
                              style={{ width: '100%', padding: '10px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: '500', cursor: 'pointer', color: '#333' }}
                          >
                              <FcGoogle size={20} /> Continue with Google
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="booking-right">
                      <div className="property-card">
                        <img 
                          src={getSafeImageSrc(propertyDetails?.propertyimage[0])} 
                          alt={propertyDetails?.propertyname}
                        />
                        <div className="property-info">
                          <h3>{propertyDetails?.propertyname}</h3>
                        </div>
                      </div>

                      {totalNights > 0 && breakdownData && (
                        <div className="price-details" style={{ opacity: isLoadingBreakdown ? 0.6 : 1, transition: 'opacity 0.2s ease', marginTop: '20px' }}>
                            <h3 style={{ marginBottom: '15px', color: '#333', fontSize: '18px' }}>Price details</h3>
                            {(!breakdownData && isLoadingBreakdown) ? (
                                <p style={{ fontSize: '13px', color: '#888', fontStyle: 'italic', padding: '10px 0', textAlign: 'center' }}>Calculating live dynamic rates...</p>
                            ) : breakdownData ? (
                              <div className="price-breakdown">
                                <div className="price_item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#555', fontSize: '14px' }}>
                                  <span>RM {displayTopRate} x {totalNights} night{totalNights > 1 ? 's' : ''}</span>
                                  <span>RM {finalRoomTotal.toFixed(2)}</span>
                                </div>
                                
                                {/* --- UPDATED SST & COMMISSION DISPLAY --- */}

                                <div className="price_item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#555', fontSize: '14px' }}>
                                  <span>SST {!isPricingLoading && <small>({(globalSstRate * 100).toFixed(1)}%)</small>}</span>
                                  <span>RM {(finalRoomTotal * globalSstRate).toFixed(2)}</span>
                                </div>

                                <div className="price_total" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #333', paddingTop: '15px', fontWeight: 'bold', fontSize: '20px', color: '#333', marginTop: '5px' }}>
                                  <span>Total (MYR)</span>
                                  <span style={{ color: isInstantPayment && instantPaymentRate > 0 ? '#999' : '#007bff', textDecoration: isInstantPayment && instantPaymentRate > 0 ? 'line-through' : 'none' }}>
                                    RM {finalGrandTotal.toFixed(2)}
                                  </span>
                                </div>

                                {isInstantPayment && instantPaymentRate > 0 && (
                                  <div style={{ marginTop: '12px', padding: '15px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#c2410c', marginBottom: '6px' }}>
                                      <span>Instant Pay Discount ({(instantPaymentRate * 100).toFixed(0)}% off)</span>
                                      <span style={{ fontWeight: 'bold' }}>- RM {instantPaymentSavings.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', color: '#c2410c', fontWeight: 'bold', borderTop: '1px solid #fb923c', paddingTop: '10px' }}>
                                      <span>You Pay (MYR)</span>
                                      <span>RM {instantPaymentTotal.toFixed(2)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showAuthPrompt && (
              <div className="modal-overlay" style={{
                position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.55)',
                display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '20px'
              }}>
                <div style={{
                  width: '100%', maxWidth: '460px', backgroundColor: '#fff', borderRadius: '18px',
                  padding: '28px', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)', position: 'relative'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowAuthPrompt(false)}
                    style={{ position: 'absolute', top: '14px', right: '14px', border: 'none', background: '#f8fafc', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <IoMdClose size={18} />
                  </button>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: authPromptMode === 'instant' ? '#fff7ed' : '#eff6ff', color: authPromptMode === 'instant' ? '#c2410c' : '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    {authPromptMode === 'instant' ? <FaPaypal size={28} /> : <FaUser size={24} />}
                  </div>
                  <h3 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>Login required</h3>
                  <p style={{ margin: '10px 0 0', color: '#475569', fontSize: '15px', lineHeight: '1.6' }}>
                    Please login to continue with {authPromptMode === 'instant' ? 'Instant Pay' : 'Book & Pay'}. If you do not have an account yet, please register first.
                  </p>
                  <div style={{ marginTop: '22px', display: 'grid', gap: '10px' }}>
                    <button
                    type="button"
                    onClick={() =>
                      navigate('/login', {
                        state: {
                          from: location.pathname,
                          propertyId: propertyDetails?.propertyid || propertyId,
                          propertyDetails,
                          searchDates: {
                            checkIn: bookingData.checkIn,
                            checkOut: bookingData.checkOut,
                            adults: bookingData.adults,
                            children: bookingData.children
                          },
                          filterRegion: passedFilterRegion
                        }
                      })
                    }
                    style={{
                      width: '100%',
                      border: 'none',
                      background: '#806853',
                      color: 'white',
                      borderRadius: '12px',
                      padding: '13px 16px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '15px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#6b5442';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#806853';
                    }}
                  >
                    Login to continue
                  </button>
                    <button
                      type="button"
                      onClick={() =>
                        navigate('/register', {
                          state: {
                            from: location.pathname,
                            propertyId: propertyDetails?.propertyid || propertyId,
                            propertyDetails,
                            searchDates: {
                              checkIn: bookingData.checkIn,
                              checkOut: bookingData.checkOut,
                              adults: bookingData.adults,
                              children: bookingData.children
                            },
                            filterRegion: passedFilterRegion
                          }
                        })
                      }
                    style={{
                      width: '100%',
                      border: '1px solid #806853',
                      background: '#fff',
                      color: '#806853',
                      borderRadius: '12px',
                      padding: '13px 16px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '15px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3ebe4';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff';
                    }}                   
                     >
                      Register an account
                    </button>
                  </div>
                </div>
              </div>
            )}

           

            {/* === REDESIGNED DEPOSIT MODAL === */}
            {showPaymentModal && selectedReservation && (
              <div
                className="modal-overlay payment-modal-overlay"
                style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.55)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  zIndex: 10000,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '12px 8px',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
              <div
                        className="modal-content payment-modal-content"
                        style={{
                          backgroundColor: 'white',
                          padding: '18px',
                          borderRadius: '18px',
                          maxWidth: '500px',
                          width: '100%',
                          maxHeight: 'calc(100dvh - 24px)',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          WebkitOverflowScrolling: 'touch',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                          transform: 'none'
                        }}
                      >
                    {paymentStatus === 'success' ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', animation: 'fadeIn 0.5s' }}>
                      <FaCheckCircle size={60} color="#16a34a" style={{ marginBottom: '20px' }} />
                      <h2 style={{ color: '#16a34a', marginBottom: '10px' }}>Payment Successful!</h2>
                      <p style={{ color: '#475569', fontSize: '16px', marginBottom: '10px' }}>
                          {isInstantPayment ? 'Your payment has been completed.' : 'Finished paying deposit fee!'}
                      </p>
                      <p style={{ color: '#64748b', fontSize: '15px', fontWeight: 'bold' }}>
                        Redirecting to cart page in {countdownTimer} seconds...
                      </p>
                      <div style={{ marginTop: '20px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                          <div style={{ width: `${(countdownTimer / 5) * 100}%`, height: '100%', backgroundColor: '#16a34a', transition: 'width 1s linear' }}></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 style={{ fontSize: '22px', color: '#1e293b', marginBottom: '20px', textAlign: 'center' }}>
                        {isInstantPayment ? 'Instant Full Payment' : 'Booking Summary & Deposit'}
                      </h3>

                      {/* 5-Minute Payment Countdown */}
                      <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          marginBottom: '20px',
                          borderRadius: '8px',
                          backgroundColor: paymentCountdown <= 60 ? '#fef2f2' : paymentCountdown <= 120 ? '#fffbeb' : '#f0fdf4',
                          border: `1px solid ${paymentCountdown <= 60 ? '#fecaca' : paymentCountdown <= 120 ? '#fde68a' : '#bbf7d0'}`,
                          transition: 'background-color 0.5s, border-color 0.5s'
                      }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: paymentCountdown <= 60 ? '#dc2626' : paymentCountdown <= 120 ? '#d97706' : '#16a34a' }}>
                              {paymentCountdown <= 60 ? '⚠️ Time running out!' : paymentCountdown <= 120 ? '⏳ Almost out of time' : '⏱️ Time to complete payment'}
                          </span>
                          <span style={{
                              fontWeight: 'bold',
                              fontSize: '22px',
                              fontFamily: 'monospace',
                              color: paymentCountdown <= 60 ? '#dc2626' : paymentCountdown <= 120 ? '#d97706' : '#16a34a',
                          }}>
                              {formatPaymentCountdown(paymentCountdown)}
                          </span>
                      </div>
                      
                      <div className="payment-details" style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '25px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#334155', fontSize: '16px' }}>{selectedReservation.propertyaddress}</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569', marginBottom: '8px' }}>
                          <span>Check-in:</span>
                          <strong>{new Date(selectedReservation.checkindatetime).toLocaleDateString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569', marginBottom: '15px', borderBottom: '1px solid #cbd5e1', paddingBottom: '15px' }}>
                          <span>Check-out:</span>
                          <strong>{new Date(selectedReservation.checkoutdatetime).toLocaleDateString()}</strong>
                        </div>

                        {!isInstantPayment ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', color: '#1e293b', marginBottom: '10px' }}>
                                  <span>Total Price:</span>
                                  <strong>RM {selectedReservation.totalprice.toFixed(2)}</strong>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', color: '#0056b3', fontWeight: 'bold', marginBottom: '10px', backgroundColor: '#eff6ff', padding: '10px', borderRadius: '6px' }}>
                                  <span>Deposit Due Now ({(depositPercentage * 100).toFixed(0)}%):</span>
                                  <span>RM {selectedReservation.downPaymentAmount.toFixed(2)}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#64748b' }}>
                                  <span>Balance Due Later:</span>
                                  <span>RM {(selectedReservation.totalprice - selectedReservation.downPaymentAmount).toFixed(2)}</span>
                                </div>
                                
                                {!isInstantPayment && (
                                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '10px', textAlign: 'center', fontWeight: '500' }}>
                                    Balance must be paid <strong>{daysBeforePaymentLabel}</strong> before check-in
                                  </p>
                                )}
                            </>
                        ) : (
                            <>
                                {/* INSTANT PAY SHOWS DISCOUNT PRICE */}
                                {selectedReservation.originalTotal > selectedReservation.totalprice && (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#78716c', textDecoration: 'line-through', marginBottom: '4px' }}>
                                      <span>Original Price:</span>
                                      <span>RM {parseFloat(selectedReservation.originalTotal).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#c2410c', fontWeight: '600', marginBottom: '8px' }}>
                                      <span>Instant Pay Discount ({(instantPaymentRate * 100).toFixed(0)}% off):</span>
                                      <span>- RM {(selectedReservation.originalTotal - selectedReservation.totalprice).toFixed(2)}</span>
                                    </div>
                                  </>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', color: '#c2410c', fontWeight: 'bold', marginBottom: '10px', backgroundColor: '#ffedd5', border: '1px solid #fb923c', padding: '10px', borderRadius: '6px' }}>
                                  <span>Total Due Now:</span>
                                  <span>RM {selectedReservation.totalprice.toFixed(2)}</span>
                                </div>
                              </>
                            )}
                      </div>
                      
                      {/* T&C CHECKBOX */}
                      <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'flex-start', gap: '12px', backgroundColor: '#fffbeb', padding: '15px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                        <input 
                          type="checkbox" 
                          id="tnc-checkbox" 
                          checked={acceptedTerms} 
                          onChange={(e) => setAcceptedTerms(e.target.checked)} 
                          style={{ marginTop: '3px', transform: 'scale(1.2)', cursor: 'pointer', accentColor: '#d97706' }}
                        />
                        <label htmlFor="tnc-checkbox" style={{ fontSize: '13px', color: '#92400e', cursor: 'pointer', lineHeight: '1.5' }}>
                          {!isInstantPayment 
                            ? <>I understand that this <strong>RM {selectedReservation.downPaymentAmount.toFixed(2)} deposit is strictly non-refundable</strong>. I agree to pay the remaining balance <strong>{daysBeforePaymentLabel} before check-in</strong>, otherwise my booking will be cancelled automatically.</>
                            : <>I understand that this instant payment of <strong>RM {selectedReservation.totalprice.toFixed(2)} is strictly non-refundable</strong>. Cancellation is only permitted in cases of unforeseen events that make travel impossible. All refund disputes must be handled directly with the property operator.</>
                          }
                        </label>
                      </div>
                      
                      {paymentStatus === 'error' && (
                        <div className="payment-error" style={{ color: '#dc2626', marginBottom: '15px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                          {paymentError}
                        </div>
                      )}
                      
                      {/* PAYPAL BUTTONS - DISABLED UNTIL CHECKED */}
                      {!acceptedTerms ? (
                        <button
                          type="button"
                          disabled
                          style={{
                            width: '100%',
                            padding: '14px 18px',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: '#9ecae1',
                            color: '#ffffff',
                            fontSize: '20px',
                            fontWeight: '700',
                            cursor: 'not-allowed'
                          }}
                        >
                          Pay with PayPal
                        </button>
                      ) : (
                        <PayPalScriptProvider options={paypalOptions}>
                          <PayPalButtons
                            key={selectedReservation?.reservationid}
                            style={paypalButtonStyle}
                            createOrder={createOrder}
                            onApprove={handlePayPalApprove}
                            onError={handlePayPalError}
                            onCancel={() => {
                              setPaymentError('Payment was canceled. You can try again when ready.');
                            }}
                          />
                        </PayPalScriptProvider>
                      )}
                      
                      <div className="modal-actions" style={{ marginTop: '20px', textAlign: 'center' }}>
                        <button 
                          onClick={handleCancelPayment}
                          style={{
                            padding: '10px 20px', backgroundColor: 'transparent', color: '#64748b',
                            border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '14px'
                          }}
                        >
                          Cancel & Go Back
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
{showBookingBlockedModal && (
  <div
    className="booking-blocked-modal-overlay"
    style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      zIndex: 10050,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}
  >
   <div
  className="booking-blocked-modal-content"
  style={{
    maxWidth: '560px',
    backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: '22px 24px',
          background: 'linear-gradient(135deg, #fff7ed, #fef2f2)',
          borderBottom: '1px solid #fed7aa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '15px'
        }}
      >
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0
            }}
          >
            <FaExclamationCircle />
          </div>

          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '22px',
                color: '#111827',
                fontWeight: '800'
              }}
            >
              {blockedBookingTitle}
            </h3>

            <p
              style={{
                margin: '5px 0 0',
                fontSize: '14px',
                color: '#6b7280'
              }}
            >
              The selected date is too close to check-in.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={closeNearCheckInBlockedModal}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '24px',
            color: '#6b7280',
            padding: 0
          }}
        >
          <IoMdClose />
        </button>
      </div>

      <div style={{ padding: '24px' }}>
        <p
          style={{
            margin: '0 0 18px',
            color: '#374151',
            lineHeight: '1.6',
            fontSize: '15px'
          }}
        >
          {blockedBookingMessage}
        </p>

        {blockedBookingDetails && (
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '14px',
              overflow: 'hidden',
              marginBottom: '18px'
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                borderBottom: '1px solid #e5e7eb'
              }}
            >
              <div style={{ padding: '14px', backgroundColor: '#f9fafb' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '700' }}>
                  Today
                </div>
                <div style={{ fontSize: '16px', color: '#111827', fontWeight: '800' }}>
                  {blockedBookingDetails.today}
                </div>
              </div>

              <div style={{ padding: '14px', backgroundColor: '#f9fafb' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '700' }}>
                  Selected Check-in
                </div>
                <div style={{ fontSize: '16px', color: '#111827', fontWeight: '800' }}>
                  {blockedBookingDetails.checkInDate}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr'
              }}
            >
              <div style={{ padding: '14px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '700' }}>
                 Booking Must Be Made Before
                </div>
                <div style={{ fontSize: '16px', color: '#dc2626', fontWeight: '800' }}>
                  Before {blockedBookingDetails.latestAllowedBookingDate}
                </div>
              </div>

              <div style={{ padding: '14px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '700' }}>
                  You Can Choose Check-in From
                </div>
                <div style={{ fontSize: '16px', color: '#16a34a', fontWeight: '800' }}>
                  {blockedBookingDetails.nextAllowedCheckInDate} onwards
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '14px 16px',
            color: '#1e40af',
            fontSize: '14px',
            lineHeight: '1.5',
            marginBottom: '20px'
          }}
        >
          <strong>Why?</strong> This protects users from last-minute non-refundable payments and gives the property operator enough time to prepare the booking.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={closeNearCheckInBlockedModal}
            style={{
              padding: '11px 20px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  </div>
)}
<Back_To_Top_Button />
<Footer />
{showToast && <Toast type={toastType} message={toastMessage} />}
</AuthProvider>
</div>
</div>
);
  };

  export default PropertyDetails;