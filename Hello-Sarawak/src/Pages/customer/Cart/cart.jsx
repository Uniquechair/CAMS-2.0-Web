import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FaArrowLeft, FaArrowRight, FaShoppingCart, FaHistory, FaTrash, 
  FaCreditCard, FaCalendarAlt, FaFilter, FaSort, FaExclamationCircle, 
  FaPaypal, FaBed, FaStickyNote, FaRegClock, FaStar, FaRegStar, 
FaCheck, FaPhone, FaEnvelope, FaExclamationTriangle, FaUser, FaCheckCircle,
  FaLock, FaSignInAlt, FaSearch
} from 'react-icons/fa';
import { removeReservation, updateReservationStatus, getPropertyOwnerPayPalId, fetchCart, paymentSuccess, fetchCommissionRate, fetchUserData } from '../../../../Api/api';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '../../../Component/AuthContext/AuthContext';
import Navbar from '../../../Component/Navbar/navbar';
import Footer from '../../../Component/Footer/footer';
import Back_To_Top_Button from '../../../Component/Back_To_Top_Button/Back_To_Top_Button';
import Toast from '../../../Component/Toast/Toast';
import TawkMessenger from '../../../Component/TawkMessenger/TawkMessenger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './cart.css';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const CART_THEME = {
  primary: '#806853',       // main brown
  primaryDark: '#6b5442',   // hover brown
  primarySoft: '#f3ebe4',   // light brown background
  primaryBorder: '#d8c7ba', // soft border
  primaryText: '#493829',   // dark brown text
  mutedText: '#7a6555',     // lighter brown text
};

// --- SAFE IMAGE HELPER ---
const getSafeImageSrc = (imgStr) => {
    if (!imgStr) return '';
    const cleanStr = imgStr.toString().trim(); // Strips hidden spaces to prevent ERR_INVALID_URL
    if (cleanStr.startsWith('http')) return cleanStr;
    if (cleanStr.startsWith('data:image')) return cleanStr;
    return `data:image/jpeg;base64,${cleanStr}`;
};
const toSafeIsoDate = (value) => {
  if (!value) return '';

  const raw = String(value).trim();
  if (!raw) return '';

  // Already correct format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // Convert DD/MM/YYYY to YYYY-MM-DD
  const slashMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month}-${day}`;
  }

  // Convert ISO datetime or valid JS date
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatSafeDate = (value) => {
  const iso = toSafeIsoDate(value);
  if (!iso) return 'Invalid date';

  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

const getFirstPropertyImage = (propertyimage) => {
  if (!propertyimage) return '';

  if (Array.isArray(propertyimage)) {
    return propertyimage[0] || '';
  }

  if (typeof propertyimage === 'string') {
    const cleanValue = propertyimage.trim();

    if (!cleanValue) return '';

    try {
      const parsed = JSON.parse(cleanValue);

      if (Array.isArray(parsed)) {
        return parsed[0] || '';
      }
    } catch (error) {
      // Not JSON, continue to comma-split fallback below
    }

    if (cleanValue.includes(',')) {
      return cleanValue
        .split(',')
        .map((img) => img.trim())
        .filter(Boolean)[0] || '';
    }

    return cleanValue;
  }

  return '';
};

// --- BEAUTIFUL & PROFESSIONAL STATUS BADGES ---
const StatusBadge = ({ status = 'Unknown' }) => {
  const getStatusIcon = (status) => {
    switch(status?.toString().toLowerCase()) {
      case 'enquiry': return <FaStickyNote />;
      case 'pending':
      case 'booking': return <FaRegClock />;
      case 'canceled': 
      case 'cancelled':
         return <FaTrash />;
      case 'rejected': return <FaExclamationCircle />;
      case 'paid': return <FaCheck />;
      case 'partially paid': return <FaCreditCard />;
      case 'accepted': return <FaCheck />;
      case 'expired': return <FaCalendarAlt />;
      default: return <FaExclamationCircle />;
    }
  };
  
  const getStatusStyle = (status) => {
    const s = status?.toString().toLowerCase();
    // Standard, normal, readable, friendly tones
    if (s === 'enquiry') return { background: '#e2e3e5', color: '#383d41', border: '1px solid #d6d8db' }; 
    if (s === 'partially paid') return { background: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' }; 
    if (s === 'paid' || s === 'accepted') return { background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' }; 
    if (s === 'pending' || s === 'booking') {
  return {
    background: CART_THEME.primarySoft,
    color: CART_THEME.primaryText,
    border: `1px solid ${CART_THEME.primaryBorder}`
  };
}
    if (s === 'canceled' || s === 'cancelled' || s === 'expired' || s === 'rejected') return { background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }; 
    return { background: '#f8f9fa', color: '#343a40', border: '1px solid #e2e8f0' }; 
  };

  return (
    <span style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '20px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px', ...getStatusStyle(status) }}>
      {getStatusIcon(status)} {status}
    </span>
  );
};

const CartItemSkeleton = () => (
  <div className="cart-item skeleton" style={{ display: 'flex', padding: '20px', borderRadius: '12px', marginBottom: '15px' }}>
    <div className="skeleton-image" style={{ width: '180px', height: '130px', borderRadius: '8px' }}></div>
    <div style={{ flex: 1, paddingLeft: '20px' }}>
      <h5 className="skeleton-text" style={{ width: '50%' }}></h5>
      <p className="skeleton-text" style={{ width: '30%' }}></p>
      <p className="skeleton-text" style={{ width: '40%' }}></p>
    </div>
  </div>
);

const CartLoginPrompt = ({ onLogin, onBrowse }) => {
  return (
    <div className="cart-section">
      <div className="reservation-container" style={{ minHeight: '65vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#ffffff', border: '1px solid #E8E1D9', borderRadius: '20px', padding: '48px 40px 40px', textAlign: 'center', maxWidth: '480px', width: '100%', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(73,56,41,0.09)' }}>

          {/* Gold top bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #806853 0%, #C4956A 100%)', borderRadius: '20px 20px 0 0' }} />

          {/* Icon with lock badge */}
          <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 24px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F5F0E8', border: '1.5px solid #E8E1D9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaShoppingCart style={{ fontSize: '32px', color: '#806853' }} />
            </div>
            <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '26px', height: '26px', borderRadius: '50%', background: '#C4956A', border: '2.5px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaLock style={{ fontSize: '10px', color: '#ffffff' }} />
            </div>
          </div>

          {/* Text */}
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px', fontWeight: '700', color: '#2C2016', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
            Please log in to view your cart
          </h2>
          <p style={{ fontSize: '14px', color: '#7A6555', margin: '0 0 28px', lineHeight: '1.6' }}>
            Your cart and reservation history are only available after login.
          </p>

          {/* Login button */}
          <button
            onClick={onLogin}
            style={{ width: '100%', padding: '13px 28px', borderRadius: '10px', border: 'none', background: '#806853', color: '#ffffff', fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', transition: 'background 0.2s, transform 0.15s', fontFamily: 'inherit' }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#6b5442'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#806853'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <FaSignInAlt style={{ fontSize: '16px' }} />
            Login to Your Account
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0 16px' }}>
            <div style={{ flex: 1, height: '1px', background: '#E8E1D9' }} />
            <span style={{ fontSize: '12px', color: '#7A6555', fontWeight: '500' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#E8E1D9' }} />
          </div>

          {/* Browse Rooms button */}
          <button
            onClick={onBrowse}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#F5F0E8', border: '1px solid #d8c7ba', borderRadius: '10px', padding: '11px 24px', color: '#493829', fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s, transform 0.15s', fontFamily: 'inherit' }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#ede3da'; e.currentTarget.style.borderColor = '#806853'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#F5F0E8'; e.currentTarget.style.borderColor = '#d8c7ba'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <FaSearch style={{ fontSize: '14px', color: '#806853' }} />
            Browse Rooms
          </button>

          {/* Sign up link */}
          <p style={{ fontSize: '12px', color: '#b0a090', marginTop: '24px', marginBottom: '0' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#806853', fontWeight: '600', textDecoration: 'none' }}>Sign up free</Link>
          </p>

        </div>
      </div>
    </div>
  );
};

const Cart = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('Latest');
  const [filterStatus, setFilterStatus] = useState('All status');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState(null);
  const [selectedReservationId, setSelectedReservationId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('idle'); 
  const [paymentError, setPaymentError] = useState('');
  const [payPalClientId, setPayPalClientId] = useState(import.meta.env.VITE_PAYPAL_CLIENT_ID || 'AZwIftz_uEFyQ-OCopoy7MXW8pk-JKgH4IeLTKkpDXF3GjnpeSQ4am5NZxFeT4spij_sgxIv8DETjzux');
  const [lastPaidReservationId, setLastPaidReservationId] = useState(null);
  const [recentlyPaidReservationIds, setRecentlyPaidReservationIds] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem('recentlyPaidReservationIds') || '[]');
  } catch {
    return [];
  }
});

const [recentPaymentTimes, setRecentPaymentTimes] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem('recentPaymentTimes') || '{}');
  } catch {
    return {};
  }
});

  const [propertyOwnerPayPalId, setPropertyOwnerPayPalId] = useState(null);
  
  // --- ADVANCED REVIEW MODAL STATES ---
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewProperty, setReviewProperty] = useState(null);
  const [reviewState, setReviewState] = useState('create'); 
  const [existingReviewId, setExistingReviewId] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // --- NEW: REFUND/SUPPORT MODAL STATES ---
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportOperatorData, setSupportOperatorData] = useState(null);
  const [isFetchingSupport, setIsFetchingSupport] = useState(false);

  // Track all user's existing reviews
  const [userReviews, setUserReviews] = useState([]);

  // Advanced Sub-Ratings
  const [subRatings, setSubRatings] = useState({ location: 0, cleanliness: 0, value: 0, facilities: 0, service: 0 });
  const [hoverSubRatings, setHoverSubRatings] = useState({ location: 0, cleanliness: 0, value: 0, facilities: 0, service: 0 });

 const navigate = useNavigate();
const location = useLocation();

const getStoredCartUser = () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  const storedUserId = isLoggedIn
    ? localStorage.getItem('userid') || localStorage.getItem('userId') || ''
    : '';

  const storedUserGroup = isLoggedIn
    ? localStorage.getItem('usergroup') || localStorage.getItem('userGroup') || ''
    : '';

  const storedUsername = isLoggedIn
    ? localStorage.getItem('username') || ''
    : '';

  return {
    isLoggedIn,
    userId: storedUserId,
    usergroup: storedUserGroup,
    username: storedUsername,
    normalizedUserGroup: String(storedUserGroup || '').trim().toLowerCase()
  };
};

const [cartUser, setCartUser] = useState(getStoredCartUser);

const userId = cartUser.userId;
const usergroup = cartUser.usergroup;
const username = cartUser.username;
const normalizedUserGroup = cartUser.normalizedUserGroup;

const isCartUserLoggedIn =
  cartUser.isLoggedIn === true &&
  !!userId &&
  normalizedUserGroup === 'customer';

  const { data: taxRate = 0.07, isLoading: isTaxLoading } = useQuery({
      queryKey: ["commissionRate"],
      queryFn: fetchCommissionRate,
  });

  const safeTaxRate = isNaN(taxRate) ? 0.07 : taxRate;

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState('');
  const [showCartRefreshNotice, setShowCartRefreshNotice] = useState(false);
const [cartRefreshMessage, setCartRefreshMessage] = useState('');
const [isCancelProcessing, setIsCancelProcessing] = useState(false);
  
 //Payment countdown timer state
 const [countdownTimer, setCountdownTimer] = useState(5);
  // 5-minute payment session timer for cart payment modal
const [paymentCountdown, setPaymentCountdown] = useState(300);
const paymentTimerRef = useRef(null);
const paymentExpiredRef = useRef(false);

  const queryClient = useQueryClient();

  const displayToast = (type, message) => {
    setToastType(type);
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };
useEffect(() => {
  const refreshCartUser = () => {
    setCartUser(getStoredCartUser());
  };

  refreshCartUser();

  window.addEventListener('focus', refreshCartUser);
  window.addEventListener('storage', refreshCartUser);
  window.addEventListener('cart-login-updated', refreshCartUser);

  return () => {
    window.removeEventListener('focus', refreshCartUser);
    window.removeEventListener('storage', refreshCartUser);
    window.removeEventListener('cart-login-updated', refreshCartUser);
  };
}, []);
useEffect(() => {
  if (!isCartUserLoggedIn) {
    queryClient.removeQueries({ queryKey: ['cart'], exact: false });
    queryClient.removeQueries({ queryKey: ['reservations'], exact: false });

    setSelectedReservation(null);
    setSelectedReservationId(null);
    setShowPaymentModal(false);
    setShowConfirmModal(false);
    setActionToConfirm(null);
    setPaymentStatus('idle');
    setPaymentError('');
  }
}, [isCartUserLoggedIn, queryClient]);

  const normalizeReviews = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.reviews)) return data.reviews;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};
const normalizeReservations = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.reservations)) return data.reservations;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};

const fetchMyReviews = async () => {
  if (userId && normalizedUserGroup === 'customer') {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await fetch(
        `${API_BASE}/user-reviews/${userId}?username=${encodeURIComponent(username || '')}`
      );

      if (response.ok) {
        const data = await response.json();
        const reviews = normalizeReviews(data);
        setUserReviews(reviews);
        return reviews;
      }

      setUserReviews([]);
      return [];
    } catch (error) {
      console.error('Failed to load user reviews', error);
      setUserReviews([]);
      return [];
    }
  }

  setUserReviews([]);
  return [];
};


 const normalizeStatus = (
  status = ''
) => {
  const normalized =
    status
      .toString()
      .trim()
      .toLowerCase();

  // Treat both spellings as the same status.
  if (
    normalized === 'cancelled' ||
    normalized === 'canceled'
  ) {
    return 'canceled';
  }

  return normalized;
};

const isAutoCanceledReservation = (reservation) => {
  const status = normalizeStatus(reservation?.reservationstatus);

 
  // Do not auto-expire Paid or Partially Paid here.
  // Partially Paid is handled separately by isOverduePartiallyPaid.
  if (!['accepted', 'pending', 'booking', 'payment pending'].includes(status)) {
    return false;
  }

  if (!reservation?.reservationblocktime) return false;

  const now = new Date();
  const autoCancelDate = new Date(reservation.reservationblocktime);

  if (Number.isNaN(autoCancelDate.getTime())) return false;

  autoCancelDate.setHours(23, 59, 59, 999);

  return now > autoCancelDate;
};

const isOverduePartiallyPaid = (reservation) => {
  const status = normalizeStatus(reservation?.reservationstatus);

  // Only Partially Paid can expire because balance was not paid.
  if (status !== 'partially paid') return false;

  // Never expire recently updated paid/deposit reservations during refresh delay.
 const reservationIdText = String(reservation?.reservationid || '');

const isRecentlyUpdated =
  (lastPaidReservationId && reservationIdText === String(lastPaidReservationId)) ||
  recentlyPaidReservationIds.map(String).includes(reservationIdText);

if (isRecentlyUpdated) {
  return false;
}

  if (!reservation?.reservationblocktime) return false;

  const now = new Date();
  const deadlineDate = new Date(reservation.reservationblocktime);

  if (Number.isNaN(deadlineDate.getTime())) return false;

  deadlineDate.setHours(23, 59, 59, 999);

  return now > deadlineDate;
};

const getEffectiveReservationStatus = (reservation) => {
  if (isAutoCanceledReservation(reservation)) return 'Expired';
  if (isOverduePartiallyPaid(reservation)) return 'Expired';
  return reservation.reservationstatus;
};

  // --- PERFORMANCE OPTIMIZATION ---
const {
  data: reservations = [],
  isLoading: loading,
  isFetching,
  refetch
} = useQuery({
  queryKey: [
    'cart',
    normalizedUserGroup,
    userId
  ],

  queryFn: () => fetchCart(),

  enabled: isCartUserLoggedIn,

  // Always consider cart data fresh from DB.
  staleTime: 0,

  gcTime: 10 * 60 * 1000,

  // Customer opens Cart again
  // → get latest reservation status.
  refetchOnMount: 'always',

  // Customer returns to browser tab
  // → refresh latest status.
  refetchOnWindowFocus: true,

  refetchOnReconnect: true,

  // While Cart is open, check for changes
  // made by Admin / Moderator / Owner.
  refetchInterval: 10000,

  onError: (error) => {
    console.error(
      'Error fetching reservations:',
      error
    );

    displayToast(
      'error',
      'Failed to load your reservations. Please try again.'
    );
  }
});


const safeReservations = useMemo(() => {
  if (!isCartUserLoggedIn) return [];

  const allReservations = normalizeReservations(reservations);

  return allReservations.filter((reservation) => {
    const status = normalizeStatus(reservation?.reservationstatus);

    // Hide temporary checkout attempts that were created before real payment
    return status !== 'checkout pending';
  });
}, [reservations, isCartUserLoggedIn]);


const updateReservationStatusInCartCache = (reservationId, status) => {
  queryClient.setQueryData(['cart', normalizedUserGroup, userId], (oldData) => {
    const updateList = (list = []) =>
      list.map((res) =>
        String(res.reservationid) === String(reservationId)
          ? { ...res, reservationstatus: status }
          : res
      );

    if (Array.isArray(oldData)) {
      return updateList(oldData);
    }

    if (Array.isArray(oldData?.reservations)) {
      return {
        ...oldData,
        reservations: updateList(oldData.reservations)
      };
    }

    if (Array.isArray(oldData?.data)) {
      return {
        ...oldData,
        data: updateList(oldData.data)
      };
    }

    if (Array.isArray(oldData?.rows)) {
      return {
        ...oldData,
        rows: updateList(oldData.rows)
      };
    }

    return oldData;
  });
};

const markReservationAsRecentlyUpdated = (reservationId) => {
  if (!reservationId) return;

  const reservationIdText = String(reservationId);
  const paidAt = new Date().toISOString();

  setLastPaidReservationId(reservationIdText);
  setSortOrder('Latest');
  setFilterStatus('All status');
  setCurrentPage(1);

  setRecentlyPaidReservationIds((prev) => {
    const updated = [
      reservationIdText,
      ...prev.filter((id) => String(id) !== reservationIdText)
    ].slice(0, 10);

    localStorage.setItem('recentlyPaidReservationIds', JSON.stringify(updated));
    return updated;
  });

  setRecentPaymentTimes((prev) => {
    const updated = {
      ...prev,
      [reservationIdText]: paidAt
    };

    localStorage.setItem('recentPaymentTimes', JSON.stringify(updated));
    return updated;
  });
};



  // Force a fresh fetch when landing on the cart page
useEffect(() => {
  const refreshCartAfterPayment = async () => {
    if (normalizedUserGroup !== 'customer' || !location.state?.refreshCart) return;

    const paidReservationId = location.state?.paidReservationId;
    const targetSection = location.state?.scrollToSection;

    setCartRefreshMessage(
      targetSection === 'history'
        ? 'Payment successful. Updating your reservation history...'
        : 'Payment successful. Updating your cart...'
    );
    setShowCartRefreshNotice(true);

    try {
      await queryClient.invalidateQueries({ queryKey: ['cart'], exact: false });

      // Small delay gives backend time to finish status/email/log update
      await new Promise((resolve) => setTimeout(resolve, 600));

      await refetch();

      if (paidReservationId) {
        markReservationAsRecentlyUpdated(paidReservationId);
      }

      // One more refresh to make sure latest DB status is displayed
      await new Promise((resolve) => setTimeout(resolve, 500));
      await refetch();

      setTimeout(() => {
        if (targetSection === 'history') {
          document.getElementById('reservation-history-section')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }

        if (targetSection === 'cart') {
          document.getElementById('cart-section')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 300);
    } catch (error) {
      console.error('Failed to refresh cart after payment:', error);
      displayToast('error', 'Payment completed, but failed to refresh cart. Please reload the page.');
    } finally {
      setTimeout(() => {
        setShowCartRefreshNotice(false);
        setCartRefreshMessage('');
      }, 900);

      navigate('/cart', { replace: true, state: {} });
    }
  };

  refreshCartAfterPayment();
}, [
  location.state?.refreshCart,
  location.state?.scrollToSection,
  location.state?.paidReservationId,
  normalizedUserGroup,
  userId,
  queryClient,
  refetch,
  navigate
]);

useEffect(() => {
  if (showPaymentModal && paymentStatus !== 'success') {
    setPaymentCountdown(300);
    paymentExpiredRef.current = false;

    if (paymentTimerRef.current) {
      clearInterval(paymentTimerRef.current);
      paymentTimerRef.current = null;
    }

    paymentTimerRef.current = setInterval(() => {
      setPaymentCountdown((prev) => {
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
          const wasBalancePayment =
            normalizeStatus(selectedReservation?.reservationstatus) === 'partially paid';

          setShowPaymentModal(false);
          setPaymentStatus('idle');
          setPaymentError('');

         queryClient.invalidateQueries({ queryKey: ['cart', normalizedUserGroup, userId] });
          refetch();

          if (wasBalancePayment && paidReservationId) {
  markReservationAsRecentlyUpdated(paidReservationId);

  setTimeout(() => {
    document.getElementById('reservation-history-section')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, 500);
}

          setSelectedReservation(null);

          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  }

  return () => {
    if (interval) clearInterval(interval);
  };
}, [paymentStatus, selectedReservation, queryClient, normalizedUserGroup, userId, refetch]);

const updateStatusMutation = useMutation({
  mutationFn: async ({
    reservationId,
    status,
    creatorid,
    creatorUsername
  }) => {
    console.log('CART STATUS UPDATE REQUEST:', {
      reservationId,
      status,
      creatorid,
      creatorUsername
    });

    const result = await updateReservationStatus(
      reservationId,
      status,
      creatorid,
      creatorUsername
    );

    console.log('CART STATUS UPDATE RESPONSE:', result);

    return result;
  },

  onSuccess: async (result, variables) => {
    console.log('CART STATUS UPDATE SUCCESS:', {
      requestedReservationId: variables.reservationId,
      requestedStatus: variables.status,
      backendResult: result
    });

    const backendReservation =
      result?.reservation ||
      result?.data?.reservation ||
      null;

    const backendStatus =
      backendReservation?.reservationstatus ||
      result?.reservationstatus ||
      result?.data?.reservationstatus ||
      '';

    console.log('DATABASE STATUS RETURNED:', {
      reservationId: variables.reservationId,
      requestedStatus: variables.status,
      backendStatus
    });

    // For cancellation, do not fake a successful status in frontend
    // unless backend returned the expected status.
    if (
  normalizeStatus(variables.status) === 'canceled' &&
  !['canceled', 'cancelled'].includes(normalizeStatus(backendStatus))
) {
      console.error(
        'Cancellation mismatch: backend did not return Canceled',
        {
          requested: variables.status,
          returned: backendStatus
        }
      );

      displayToast(
        'error',
        'Cancellation was not confirmed by the server. Please try again.'
      );

      return;
    }

    // Only update frontend after backend success
    updateReservationStatusInCartCache(
      variables.reservationId,
      variables.status
    );

    const normalizedUpdatedStatus =
      normalizeStatus(variables.status);

    if (
      normalizedUpdatedStatus === 'canceled' ||
      normalizedUpdatedStatus === 'cancelled' ||
      normalizedUpdatedStatus === 'expired' ||
      normalizedUpdatedStatus === 'paid'
    ) {
      markReservationAsRecentlyUpdated(
        variables.reservationId
      );

      setTimeout(() => {
        document
          .getElementById('reservation-history-section')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
      }, 300);
    }

    if (
      variables.status !== 'Paid' &&
      variables.status !== 'Partially Paid'
    ) {
      const statusMessages = {
        Canceled: 'Your reservation has been canceled.',
        Expired:
          'Your reservation has expired due to non-payment.',
        Pending:
          'Your reservations have been checked out. Please wait for the response of the operators.'
      };

      displayToast(
        'success',
        statusMessages[variables.status] ||
          'Status updated successfully.'
      );
    }

   if (
  normalizedUpdatedStatus === 'canceled' ||
  normalizedUpdatedStatus === 'cancelled' ||
  normalizedUpdatedStatus === 'expired'
) {
  await queryClient.invalidateQueries({
    queryKey: ['product-properties'],
    exact: false
  });
}

// Refresh cart from database
await queryClient.invalidateQueries({
  queryKey: ['cart'],
  exact: false
});

await refetch();
    
  },

  onError: (error) => {
    console.error('CART STATUS UPDATE FAILED:', error);

    displayToast(
      'error',
      'Failed to update reservation. Please try again.'
    );
  },

  onSettled: () => {
    setIsCancelProcessing(false);
  }
});

  useEffect(() => {
  if (
    paymentCountdown === 0 &&
    showPaymentModal &&
    paymentStatus !== 'success' &&
    !paymentExpiredRef.current
  ) {
    paymentExpiredRef.current = true;

    if (paymentTimerRef.current) {
      clearInterval(paymentTimerRef.current);
      paymentTimerRef.current = null;
    }

    const isPayingBalance =
      normalizeStatus(selectedReservation?.reservationstatus) === 'partially paid';

    setShowPaymentModal(false);
    setSelectedReservation(null);
    setPaymentStatus('idle');
    setPaymentError('');

    displayToast(
      'error',
      isPayingBalance
        ? 'Payment time expired. Please click Pay Balance again before the payment deadline.'
        : 'Payment time expired. Please click Pay Deposit again before the payment deadline.'
    );
  }
}, [paymentCountdown, showPaymentModal, paymentStatus, selectedReservation]);


useEffect(() => {
  if (!safeReservations || safeReservations.length === 0) return;

  // Do not auto-expire while payment is in progress or just succeeded.
  if (showPaymentModal || paymentStatus === 'success') return;

  const overdueAcceptedReservations = safeReservations.filter(
    (reservation) => isAutoCanceledReservation(reservation)
  );

  overdueAcceptedReservations.forEach((reservation) => {
    updateStatusMutation.mutate({
      reservationId: reservation.reservationid,
      status: 'Expired'
    });
  });

  const overduePartiallyPaidReservations = safeReservations.filter(
    (reservation) => isOverduePartiallyPaid(reservation)
  );

  overduePartiallyPaidReservations.forEach((reservation) => {
    updateStatusMutation.mutate({
      reservationId: reservation.reservationid,
      status: 'Expired'
    });
  });
}, [
  safeReservations,
  showPaymentModal,
  paymentStatus,
  lastPaidReservationId,
  recentlyPaidReservationIds,
  updateStatusMutation
]);

const removeReservationMutation = useMutation({
  mutationFn: (reservationId) => removeReservation(reservationId),
  onMutate: async (reservationId) => {
    await queryClient.cancelQueries({ queryKey: ['cart', normalizedUserGroup, userId] });
const previousCart = queryClient.getQueryData(['cart', normalizedUserGroup, userId]);

queryClient.setQueryData(['cart', normalizedUserGroup, userId], (oldData) => {
      const oldReservations = normalizeReservations(oldData);

      return oldReservations.filter(
        (res) => res.reservationid !== reservationId
      );
    });

    return { previousCart };
  },
  onSuccess: () => {
    displayToast('success', 'Reservation removed from your list.');
  },
  onError: (error, variables, context) => {
    queryClient.setQueryData(['cart', normalizedUserGroup, userId], context?.previousCart || []);
    displayToast('error', 'Failed to remove reservation. Please try again.');
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  }
});
  const fetchPropertyOwnerPayPalId = async (propertyId) => {
    try {
      setPaymentStatus('loading');
      const ownerData = await getPropertyOwnerPayPalId(propertyId);
      setPropertyOwnerPayPalId(ownerData.payPalId);
      setPaymentStatus('idle');
      return ownerData.payPalId;
    } catch (error) {
      setPaymentStatus('error');
      setPaymentError('Failed to get payment information. Please try again.');
      return null;
    }
  };

  const handleSortChange = (event) => setSortOrder(event.target.value);
  const handleFilterChange = (event) => { setFilterStatus(event.target.value); setCurrentPage(1); };

  const confirmAction = (action, reservationId) => {
    setActionToConfirm(action);
    setSelectedReservationId(reservationId);
    setShowConfirmModal(true);
  };

  const executeAction = async () => {
    if (!actionToConfirm || (!selectedReservationId && actionToConfirm !== 'checkout')) return;
    try {
      switch(actionToConfirm) {
        case 'pay':
          const reservation = safeReservations.find((r) => r.reservationid === selectedReservationId);
          if (!reservation) {
            displayToast('error', 'Reservation not found. Please refresh and try again.');
            return;
          }
          setSelectedReservation(reservation);
          await fetchPropertyOwnerPayPalId(reservation.propertyid);
          setShowPaymentModal(true);
          break;
case 'cancel': {
  setIsCancelProcessing(true);

  displayToast(
    'warning',
    'Processing cancellation...'
  );

  await updateStatusMutation.mutateAsync({
    reservationId: selectedReservationId,
    status: 'Canceled',
    creatorid: userId,
    creatorUsername: username
  });

  break;
}

case 'cancel_forfeit':
  setActionToConfirm('cancel_forfeit_final');
  setShowConfirmModal(true);
  return;

case 'cancel_forfeit_final': {
  setIsCancelProcessing(true);

  displayToast(
    'warning',
    'Processing cancellation. Deposit will not be refunded...'
  );

  console.log('CANCEL PARTIALLY PAID RESERVATION:', {
    reservationId: selectedReservationId,
    oldStatus: safeReservations.find(
      (r) =>
        String(r.reservationid) ===
        String(selectedReservationId)
    )?.reservationstatus,
    newStatus: 'Canceled'
  });

  await updateStatusMutation.mutateAsync({
    reservationId: selectedReservationId,
    status: 'Canceled',
    creatorid: userId,
    creatorUsername: username
  });

  break;
}
        case 'remove':
          displayToast('success', 'Removing...');
          removeReservationMutation.mutate(selectedReservationId);
          break;
        case 'checkout':
          handleCheckout();
          break;
        default: break;
      }
    } catch (error) {
      console.error(`Error executing ${actionToConfirm} action:`, error);
    } finally {
  if (actionToConfirm !== 'cancel_forfeit') {
    setShowConfirmModal(false);
    setActionToConfirm(null);
    setSelectedReservationId(null);
  }
}
  };

  const handleCheckout = async () => {
    try {
      const bookingReservations = safeReservations.filter(
        (reservation) => normalizeStatus(reservation.reservationstatus) === 'booking'
      );
      if (bookingReservations.length === 0) {
        displayToast('info', 'No bookings to checkout.');
        return;
      }
      await Promise.all(
        bookingReservations.map(async (reservation) => {
          updateStatusMutation.mutate({
  reservationId: reservation.reservationid,
  status: 'Pending',
  creatorid: userId,
  creatorUsername: username
});
        })
      );
    } catch (error) {
      displayToast('error', 'Checkout process failed. Please try again.');
    }
  };
 

  const handlePayPalApprove = async (data, actions) => {
  try {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
 const response = await fetch(`${API_BASE}/paypal/capture-order/${data.orderID}`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
});
    const details = await response.json();

    if (!response.ok || details.error) {
      throw new Error(details.error || 'Capture failed');
    }

    console.log('Payment completed successfully', details);
    if (paymentTimerRef.current) {
  clearInterval(paymentTimerRef.current);
  paymentTimerRef.current = null;
}

const paidReservationId = selectedReservation.reservationid;

paymentExpiredRef.current = true;

const isPayingBalance =
  normalizeStatus(selectedReservation.reservationstatus) === 'partially paid';

const newStatus = isPayingBalance ? 'Paid' : 'Partially Paid';
try {
  // IMPORTANT:
  // Run paymentSuccess BEFORE changing status.
  // Backend needs to see old status:
  // Partially Paid = balance payment
  // Accepted / Pending / Payment Pending = deposit payment
  try {
    await paymentSuccess(paidReservationId);
  } catch (emailLogError) {
    console.error('Payment captured, but email/log failed:', emailLogError);
  }

  // Then update reservation status.
  await updateStatusMutation.mutateAsync({
    reservationId: paidReservationId,
    status: newStatus,
    creatorid: userId,
    creatorUsername: username
  });

  // Update frontend immediately.
  const paidAt = new Date().toISOString();

  queryClient.setQueryData(['cart', normalizedUserGroup, userId], (oldData) => {
    const oldReservations = normalizeReservations(oldData);

    return oldReservations.map((res) =>
      String(res.reservationid) === String(paidReservationId)
        ? {
            ...res,
            reservationstatus: newStatus,
            paymentcompletedat: paidAt,
            updated_at: paidAt
          }
        : res
    );
  });

  markReservationAsRecentlyUpdated(paidReservationId);

  await queryClient.invalidateQueries({ queryKey: ['cart'], exact: false });
  await refetch();

  setTimeout(() => {
    document
      .getElementById(isPayingBalance ? 'reservation-history-section' : 'cart-section')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
  }, 500);
} catch (dbError) {
  console.error('Payment was captured, but reservation status update failed:', dbError);

  // Since PayPal already captured payment, do not let timer/cleanup treat it as unpaid.
  paymentExpiredRef.current = true;

  if (paymentTimerRef.current) {
    clearInterval(paymentTimerRef.current);
    paymentTimerRef.current = null;
  }

  setPaymentError(
    'Payment was captured, but the booking status update failed. Please contact support.'
  );
  setPaymentStatus('error');
  return false;
}

    setPaymentStatus('success');
    return true;
  } catch (error) {
    console.error('Error completing PayPal payment:', error);
    setPaymentError('Payment could not be processed. Please try again.');
    return false;
  }
};

  const createOrder = (data, actions) => {
    if (!selectedReservation || !propertyOwnerPayPalId) {
      setPaymentError('Payment information not available. Please try again.');
      return Promise.reject('Invalid reservation or recipient information');
    }

    const isPayingBalance = normalizeStatus(selectedReservation.reservationstatus) === 'partially paid';
    const totalAmount = parseFloat(selectedReservation.totalprice) || 0;
    
    // SAFE DB FETCH FOR DEPOSIT
    let depositAmount = parseFloat(selectedReservation.downpaymentamount || selectedReservation.downPaymentAmount);
    if (isNaN(depositAmount) || depositAmount <= 0) depositAmount = totalAmount * 0.10;
    
    // STRICT & DYNAMIC PAYMENT CALCULATION
    const amountToPay = isPayingBalance ? Math.max(0, totalAmount - depositAmount) : depositAmount;
    
    return actions.order.create({
      purchase_units: [{
        amount: { currency_code: 'MYR', value: amountToPay.toFixed(2) },
        description: isPayingBalance ? `Balance Payment for ${selectedReservation.propertyaddress}` : `Deposit for ${selectedReservation.propertyaddress}`,
        reference_id: `reservation-${selectedReservation.reservationid}`,
        payee: { email_address: propertyOwnerPayPalId }
      }],
      application_context: { shipping_preference: 'NO_SHIPPING' }
    });
  };

  const handlePayPalError = (err) => {
    setPaymentError('There was an error processing your payment. Please try again.');
  };

  const handlePreviousPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);
  
  const reservationsPerPage = 5;


  
  // 1. CART SECTION ONLY: Now includes 'Pending', 'Booking', 'Accepted', 'Partially Paid'.
const ACTIVE_STATUSES = ['payment pending', 'pending', 'booking', 'accepted', 'partially paid'];

const activeCartReservations = useMemo(() => {
  return safeReservations
    .filter((reservation) => {
      const status = normalizeStatus(
        getEffectiveReservationStatus(reservation)
      );

      return ACTIVE_STATUSES.includes(status);
    })
    .sort((a, b) => {
      return Number(b.reservationid || 0) - Number(a.reservationid || 0);
    });
}, [
  safeReservations,
  lastPaidReservationId,
  recentlyPaidReservationIds
]);

const historyReservationsRaw = useMemo(() => {
  return safeReservations.filter((reservation) => {
    const status = normalizeStatus(getEffectiveReservationStatus(reservation));
    return !ACTIVE_STATUSES.includes(status);
  });
}, [safeReservations, lastPaidReservationId, recentlyPaidReservationIds]);


const getPaymentSortTime = (reservation) => {
  const reservationIdText = String(reservation?.reservationid || '');

  const possiblePaymentTime =
    reservation?.paymentcompletedat ||
    reservation?.payment_completed_at ||
    reservation?.paidat ||
    reservation?.paid_at ||
    reservation?.updatedat ||
    reservation?.updated_at ||
    reservation?.modifiedat ||
    reservation?.modified_at ||
    recentPaymentTimes[reservationIdText] ||
    '';

  const parsedTime = new Date(possiblePaymentTime).getTime();

  if (!Number.isNaN(parsedTime)) {
    return parsedTime;
  }

  return Number(reservation?.reservationid || 0);
};

const sortedReservations = useMemo(() => {
  const sorted = [...historyReservationsRaw];

  if (sortOrder === 'Latest') {
    return sorted.sort((a, b) => {
      const aTime = getPaymentSortTime(a);
      const bTime = getPaymentSortTime(b);

      return bTime - aTime;
    });
  }

  if (sortOrder === 'Oldest') {
    return sorted.sort((a, b) => {
      const aTime = getPaymentSortTime(a);
      const bTime = getPaymentSortTime(b);

      return aTime - bTime;
    });
  }

  if (sortOrder === 'Price High to Low') {
    return sorted.sort((a, b) => Number(b.totalprice || 0) - Number(a.totalprice || 0));
  }

  if (sortOrder === 'Price Low to High') {
    return sorted.sort((a, b) => Number(a.totalprice || 0) - Number(b.totalprice || 0));
  }

  return sorted;
}, [
  historyReservationsRaw,
  sortOrder,
  recentPaymentTimes
]);



const filteredReservations = useMemo(() => {
  if (filterStatus === 'All status') return sortedReservations;

  return sortedReservations.filter(
    (reservation) =>
      normalizeStatus(getEffectiveReservationStatus(reservation)) === normalizeStatus(filterStatus)
  );
}, [filterStatus, sortedReservations]);

const totalPages = Math.ceil(filteredReservations.length / reservationsPerPage);

const currentReservations = useMemo(() => {
  const indexOfLastReservation = currentPage * reservationsPerPage;
  const indexOfFirstReservation = indexOfLastReservation - reservationsPerPage;
  return filteredReservations.slice(indexOfFirstReservation, indexOfLastReservation);
}, [filteredReservations, currentPage]);


  // CART SUMMARY CALCULATION
  const finalTotalOwed = activeCartReservations.reduce((acc, reservation) => {
      const totalAmount = parseFloat(reservation.totalprice) || 0;
      let depositAmount = parseFloat(reservation.downpaymentamount || reservation.downPaymentAmount);
      if (isNaN(depositAmount) || depositAmount <= 0) depositAmount = totalAmount * 0.10; 

      const amountDue = normalizeStatus(reservation.reservationstatus) === 'partially paid' 
          ? Math.max(0, totalAmount - depositAmount)
          : depositAmount;

      return acc + amountDue;
  }, 0);

  const totalNights = activeCartReservations.reduce((acc, reservation) => {
    const checkIn = new Date(reservation.checkindatetime);
    const checkOut = new Date(reservation.checkoutdatetime);

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      return acc;
    }

    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    return acc + (nights > 0 ? nights : 0);
  }, 0);

  const parseReservationRequest = (request) => {
    if (!request) return { roomName: '', specialRequest: '' };
    let roomName = '', specialRequest = '';
    if (request.includes('Room Selected:')) {
        const parts = request.split('Additional Requests:');
        roomName = parts[0].replace('Room Selected:', '').trim();
        if (parts.length > 1) specialRequest = parts[1].trim();
    } else {
        specialRequest = request;
    }
    return { roomName, specialRequest };
  };

const handlePropertyClick = (e, reservation) => {
  e.preventDefault();

  if (
    !reservation ||
    !reservation.propertyid ||
    reservation.propertyid === 'null' ||
    reservation.propertyid === 'undefined'
  ) {
    displayToast('error', 'This property is no longer available on the platform.');
    return;
  }

  const safeCheckIn = toSafeIsoDate(reservation.checkindatetime);
  const safeCheckOut = toSafeIsoDate(reservation.checkoutdatetime);

  navigate(`/product/${reservation.propertyid}`, {
    state: {
      propertyId: reservation.propertyid,
      propertyDetails: reservation,
      searchDates: {
        checkIn: safeCheckIn,
        checkOut: safeCheckOut
      }
    }
  });
};

  const handleRequestRefund = async (reservation) => {
  setSupportOperatorData(null);
  setIsFetchingSupport(true);
  setShowSupportModal(true);

  try {
    const ownerId =
      reservation.ownerid ||
      reservation.operatorid ||
      reservation.creatorid ||
      reservation.propertyownerid ||
      reservation.property_owner_id ||
      reservation.owner_id;

    if (ownerId) {
      const ownerData = await fetchUserData(ownerId);

      if (!ownerData) {
        throw new Error('Owner data not found');
      }

      setSupportOperatorData({
        name:
          `${ownerData.utitle || ''} ${ownerData.ufirstname || ''} ${ownerData.ulastname || ''}`.trim() ||
          ownerData.username ||
          'Property Owner',
        email: ownerData.uemail || '',
        phone: ownerData.uphoneno || ''
      });

      return;
    }

    // Fallback: use property owner payment API by propertyid
    if (reservation.propertyid) {
      const ownerData = await getPropertyOwnerPayPalId(reservation.propertyid);

      setSupportOperatorData({
        name: ownerData.ownerName || 'Property Owner',
        email: ownerData.ownerEmail || ownerData.payPalId || '',
        phone: ownerData.ownerPhone || ''
      });

      return;
    }

    throw new Error('Owner ID and property ID not found in reservation data');
  } catch (error) {
    console.error('Failed fetching operator info:', error);
    displayToast('error', 'Failed to retrieve operator contact info.');
    setSupportOperatorData({
      name: 'Property Owner',
      email: '',
      phone: ''
    });
  } finally {
    setIsFetchingSupport(false);
  }
};

  const renderSupportModal = () => {
    if (!showSupportModal) return null;
    
    return (
      <div className="modal-overlay_cart" style={{ zIndex: 9999 }}>
        <div className="modal-content" style={{ maxWidth: '450px', padding: '30px', borderRadius: '12px', background: '#fff' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#e2e3e5', color: '#383d41', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
                    <FaEnvelope size={26} />
                </div>
                <h3 style={{ borderBottom: 'none', color: '#212529', margin: '0 0 10px 0' }}>Contact Property Owner</h3>
                <p style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.5' }}>
                    Because this reservation has already been paid in full, standard cancellations are disabled. You may contact the property owner directly to discuss emergencies or modifications.
                </p>
            </div>
            
            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#495057', borderBottom: '1px solid #dee2e6', paddingBottom: '10px' }}>Operator Contact Information</h4>
                
                {isFetchingSupport ? (
                    <p style={{ textAlign: 'center', color: '#6c757d', fontStyle: 'italic', margin: '10px 0' }}>Loading contact details...</p>
                ) : supportOperatorData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#212529', fontSize: '14px' }}>
                           <FaUser color={CART_THEME.primary} /> <strong>{supportOperatorData.name}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#212529', fontSize: '14px' }}>
                            <FaEnvelope color={CART_THEME.primary} /> <a href={`mailto:${supportOperatorData.email}`} style={{ color: CART_THEME.primary, textDecoration: 'none' }}>{supportOperatorData.email || 'Not provided'}</a>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#212529', fontSize: '14px' }}>
                           <FaPhone color={CART_THEME.primary} /> <a href={`tel:${supportOperatorData.phone}`} style={{ color: CART_THEME.primary, textDecoration: 'none' }}>{supportOperatorData.phone || 'Not provided'}</a>
                        </div>
                    </div>
                ) : (
                    <p style={{ color: '#dc3545', fontSize: '14px', margin: 0 }}>Unable to fetch operator details. Please contact platform support.</p>
                )}
            </div>
            
            <div className="modal-actions" style={{ borderTop: 'none', paddingTop: '0', display: 'flex', justifyContent: 'center' }}>
              <button 
                  className="modal-button modal-cancel" 
                  onClick={() => setShowSupportModal(false)}
                  style={{ width: '100%', padding: '12px', fontWeight: 'bold', backgroundColor: '#6c757d', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                  Close Window
              </button>
            </div>
        </div>
      </div>
    );
  };

const openReviewModal = async (reservation) => {
  setReviewProperty(reservation);
  setShowReviewModal(true);
  setReviewState('loading');

 const latestReviews = await fetchMyReviews();

  setReviewText('');
  setExistingReviewId(null);
  setSubRatings({ location: 0, cleanliness: 0, value: 0, facilities: 0, service: 0 });

      const hasDeletedBefore = localStorage.getItem(`deleted_review_${reservation.propertyid}_${userId}`);
      if (hasDeletedBefore) {
          setReviewState('deleted');
          return;
      }

const safeUserReviews = Array.isArray(latestReviews) ? latestReviews : [];

const existingReview = safeUserReviews.find(
  (r) => r.propertyId == reservation.propertyid || r.propertyid == reservation.propertyid
);
      if (existingReview) {
          setExistingReviewId(existingReview.id);
          setReviewText(existingReview.comment || '');
          setSubRatings({
              location: Number(existingReview.location_score) || Number(existingReview.rating) || 5,
              cleanliness: Number(existingReview.cleanliness_score) || Number(existingReview.rating) || 5,
              value: Number(existingReview.value_score) || Number(existingReview.rating) || 5,
              facilities: Number(existingReview.facilities_score) || Number(existingReview.rating) || 5,
              service: Number(existingReview.service_score) || Number(existingReview.rating) || 5
          });
          setReviewState('view');
      } else {
          setReviewState('create');
      }
  };

  const handleReviewSubmit = async () => {
      const isAllRated = Object.values(subRatings).every(val => val > 0);
      if (!isAllRated) return displayToast('error', 'Please provide a star rating for all categories.');
      if (!reviewText.trim()) return displayToast('error', 'Please write a review comment.');

      const sensitiveWords = ['badword1', 'badword2', 'scam', 'fraud', 'hate', 'racist', 'kill'];
      let safeReviewText = reviewText;
      sensitiveWords.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          safeReviewText = safeReviewText.replace(regex, '*'.repeat(word.length));
      });

      setIsSubmittingReview(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const calculatedAverageRating = Math.round((subRatings.location + subRatings.cleanliness + subRatings.value + subRatings.facilities + subRatings.service) / 5);

      const payload = {
          userid: parseInt(userId),
          propertyid: parseInt(reviewProperty.propertyid),
          review: safeReviewText,
          rating: calculatedAverageRating,
          location_score: subRatings.location || 5,
          cleanliness_score: subRatings.cleanliness || 5,
          value_score: subRatings.value || 5,
          facilities_score: subRatings.facilities || 5,
          service_score: subRatings.service || 5
      };
      
      try {
          if (reviewState === 'create') {
              const response = await fetch(`${API_BASE}/reviews?creatorUsername=${username}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
              });
              const data = await response.json();

              if (!response.ok) {
                  if (response.status === 409) {
                      displayToast('error', 'You have already reviewed this property!');
                      localStorage.setItem(`deleted_review_${reviewProperty.propertyid}_${userId}`, 'true');
                      setReviewState('deleted');
                  } else {
                      throw new Error(data.message || 'Failed to submit review');
                  }
              } else {
                  displayToast('success', 'Thank you! Your review has been submitted.');
                  fetchMyReviews(); 
                  setShowReviewModal(false);
              }
          } 
      } catch (err) {
          displayToast('error', err.message || 'Failed to submit review.');
      } finally {
          setIsSubmittingReview(false);
      }
  };

  const handleDeleteReview = async () => {
      if (!window.confirm("Are you sure you want to delete your review?")) return;
      setIsSubmittingReview(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      
      try {
          const response = await fetch(`${API_BASE}/reviews/${existingReviewId}?creatorUsername=${username}`, {
              method: 'DELETE'
          });
          if (!response.ok) throw new Error('Failed to delete review');
          
          displayToast('success', 'Your review has been deleted.');
          localStorage.setItem(`deleted_review_${reviewProperty.propertyid}_${userId}`, 'true');
          setReviewState('deleted'); 
          fetchMyReviews(); 
      } catch (err) {
          displayToast('error', 'Failed to delete review.');
      } finally {
          setIsSubmittingReview(false);
      }
  };

  const renderSubRatingRow = (categoryKey, label) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed #eee' }}>
            <span style={{ fontSize: '14px', color: '#495057', fontWeight: '500' }}>{label}</span>
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
                          color: (hoverSubRatings[categoryKey] || subRatings[categoryKey]) >= star ? '#ffc107' : '#e2e8f0', 
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

  const renderReviewModal = () => {
      if (!showReviewModal || !reviewProperty) return null;

      const isAllRated = Object.values(subRatings).every(val => val > 0);
      const isSubmitDisabled = isSubmittingReview || !isAllRated || !reviewText.trim();

      return (
          <div className="modal-overlay_cart" style={{ zIndex: 9999 }}>
              <div className="modal-content" style={{ maxWidth: '500px', padding: '30px', borderRadius: '12px', background: '#fff' }}>
                  {reviewState === 'loading' ? (
                      <div style={{ textAlign: 'center', padding: '40px 0' }}>
                          <p style={{ color: '#6c757d' }}>Loading review details...</p>
                      </div>
                  ) : reviewState === 'deleted' ? (
                      <div style={{ textAlign: 'center', padding: '20px' }}>
                          <FaExclamationCircle size={40} color="#dc3545" style={{ marginBottom: '15px' }} />
                          <h3 style={{ color: '#dc3545', fontSize: '20px', marginBottom: '10px' }}>Review Deleted</h3>
                          <p style={{ color: '#495057', fontSize: '15px' }}>You have already submitted (or deleted) a review for this property. Guests are limited to one review per stay.</p>
                          <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', borderTop: 'none', paddingTop: '0' }}>
                              <button className="modal-button modal-cancel" onClick={() => setShowReviewModal(false)} style={{ padding: '8px 16px', minWidth: '100px', backgroundColor: '#6c757d', color: '#fff' }}>Close</button>
                          </div>
                      </div>
                  ) : (
                      <>
                          <h3 style={{ marginBottom: '5px', color: '#212529', fontSize: '22px', borderBottom: 'none' }}>
                              {reviewState === 'create' ? 'Rate Your Stay' : 'Your Review'}
                          </h3>
                          <p style={{ color: '#6c757d', marginBottom: '20px', fontSize: '14px' }}>
                              {reviewProperty.propertyaddress}
                          </p>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                              {renderSubRatingRow("location", "Location")}
                              {renderSubRatingRow("cleanliness", "Cleanliness")}
                              {renderSubRatingRow("value", "Value for money")}
                              {renderSubRatingRow("facilities", "Facilities")}
                              {renderSubRatingRow("service", "Service")}
                          </div>
                          
                          <textarea 
                              placeholder="Share details of your experience... Was the room clean? How was the location?"
                              value={reviewText}
                              onChange={(e) => setReviewText(e.target.value)}
                              disabled={reviewState === 'view'}
                              style={{ 
                                  width: '100%', minHeight: '130px', padding: '15px', borderRadius: '8px', 
                                  border: '1px solid #dee2e6', marginBottom: '20px', fontSize: '14px', 
                                  resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                                  backgroundColor: reviewState === 'view' ? '#f8f9fa' : '#fff'
                              }}
                          />

                          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: 'none', paddingTop: '0', marginTop: '0' }}>
                              <div>
                                  {reviewState === 'view' && (
                                      <button onClick={handleDeleteReview} disabled={isSubmittingReview} style={{ background: 'none', border: 'none', color: '#dc3545', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', padding: '5px 0' }}>Delete Review</button>
                                  )}
                              </div>

                              <div style={{ display: 'flex', gap: '10px' }}>
                                  <button className="modal-button modal-cancel" onClick={() => setShowReviewModal(false)} disabled={isSubmittingReview} style={{ padding: '8px 16px', minWidth: '80px', backgroundColor: '#6c757d', color: '#fff' }}>
                                      {reviewState === 'view' ? 'Close' : 'Cancel'}
                                  </button>

                                  {reviewState === 'create' && (
                                      <button onClick={handleReviewSubmit} disabled={isSubmitDisabled} style={{ background: isSubmitDisabled ? '#6c757d' : CART_THEME.primary, color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: isSubmitDisabled ? 'not-allowed' : 'pointer' }}>
                                          {isSubmittingReview ? 'Saving...' : 'Submit Review'}
                                      </button>
                                  )}
                              </div>
                          </div>
                      </>
                  )}
              </div>
          </div>
      );
  };

  const renderConfirmationModal = () => {
    if (!showConfirmModal) return null;
    let title = ''; let message = ''; 
    let btnText = 'Confirm';
   let btnStyle = { background: CART_THEME.primary, color: '#fff' };

    switch(actionToConfirm) {
      case 'pay': 
        title = 'Confirm Payment'; 
        message = <p>Are you sure you want to proceed to payment for this reservation?</p>; 
        break;
      case 'cancel': 
        title = 'Confirm Cancellation'; 
        message = <p>Are you sure you want to cancel this reservation?</p>; 
        btnStyle = { background: '#dc3545', color: '#fff' };
        break;
     case 'cancel_forfeit':
  title = 'Confirm Cancellation';
  message = (
    <p>
      Are you sure you want to cancel this reservation?
    </p>
  );
  btnText = 'Continue';
  btnStyle = { background: '#dc3545', color: '#fff' };
  break;

case 'cancel_forfeit_final': 
  title = 'Cancel Reservation'; 
  message = (
    <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeeba', padding: '15px', borderRadius: '8px', color: '#856404', fontSize: '14px', lineHeight: '1.5' }}>
      <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <FaExclamationTriangle /> Warning: Non-Refundable Deposit
      </strong>
      Are you sure you want to cancel? Your paid deposit is strictly non-refundable and cannot be returned to you. This action cannot be undone.
    </div>
  );
  btnText = 'Cancel & Lose Deposit';
  btnStyle = { background: '#dc3545', color: '#fff' };
  break;
      case 'remove': 
        title = 'Confirm Removal'; 
        message = <p>Are you sure you want to remove this reservation from your list?</p>; 
        btnStyle = { background: '#dc3545', color: '#fff' };
        break;
      default: 
        title = 'Confirm Action'; 
        message = <p>Are you sure you want to proceed?</p>;
    }
    
    return (
      <div className="modal-overlay_cart" style={{ zIndex: 9999 }}>
        <div className="modal-content" style={{ maxWidth: '400px', borderRadius: '12px', padding: '25px' }}>
          <h3 style={{ borderBottom: 'none', marginTop: 0, color: '#212529', fontSize: '20px' }}>{title}</h3>
          <div style={{ margin: '15px 0', color: '#495057' }}>{message}</div>
          <div className="modal-actions" style={{ borderTop: 'none', display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: 0, marginTop: '20px' }}>
            <button className="modal-button modal-cancel" onClick={() => setShowConfirmModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#6c757d', color: '#fff' }}>Back</button>
            <button className="modal-button" onClick={executeAction} disabled={updateStatusMutation.isPending || removeReservationMutation.isPending} style={{ padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', ...btnStyle }}>
              {updateStatusMutation.isPending || removeReservationMutation.isPending ? 'Processing...' : btnText}
            </button>
          </div>
        </div>
      </div>
    );
  };

const formatPaymentCountdown = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

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

const renderPaymentModal = () => {
    if (!showPaymentModal || !selectedReservation) return null;
    
    const isPayingBalance = normalizeStatus(selectedReservation.reservationstatus) === 'partially paid';
    const totalAmount = parseFloat(selectedReservation.totalprice) || 0;
    
    // STRICT FALLBACK LOGIC
    let depositAmount = parseFloat(selectedReservation.downpaymentamount || selectedReservation.downPaymentAmount);
    if (isNaN(depositAmount) || depositAmount <= 0) depositAmount = totalAmount * 0.10;
    
    const balanceAmount = Math.max(0, totalAmount - depositAmount);

    return (
      <div className="modal-overlay payment-modal-overlay">
        <div className="modal-content payment-modal-content">
          
          {/* SUCCESS SCREEN */}
          {paymentStatus === 'success' ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', animation: 'fadeIn 0.5s' }}>
              <FaCheckCircle size={60} color="#16a34a" style={{ marginBottom: '20px' }} />
              <h2 style={{ color: '#16a34a', marginBottom: '10px' }}>Payment Successful!</h2>
              <p style={{ color: '#475569', fontSize: '16px', marginBottom: '10px' }}>
                  {normalizeStatus(selectedReservation.reservationstatus) === 'partially paid' 
                    ? 'Balance payment completed. Your booking is fully Paid!' 
                    : 'Deposit fee paid successfully!'}
              </p>
              <p style={{ color: '#64748b', fontSize: '15px', fontWeight: 'bold' }}>
                 Refreshing your cart in {countdownTimer} seconds...
              </p>
              <div style={{ marginTop: '20px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${(countdownTimer / 5) * 100}%`, height: '100%', backgroundColor: '#16a34a', transition: 'width 1s linear' }}></div>
              </div>
            </div>
          ) : (
            <>
             <h3 style={{ borderBottom: 'none', color: '#212529', textAlign: 'center' }}>
  Complete Payment
</h3>

<div
  className="cart-payment-countdown-box"
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    marginBottom: '20px',
    borderRadius: '10px',
    backgroundColor:
      paymentCountdown <= 60
        ? '#fef2f2'
        : paymentCountdown <= 120
          ? '#fffbeb'
          : '#f0fdf4',
    border: `1px solid ${
      paymentCountdown <= 60
        ? '#fecaca'
        : paymentCountdown <= 120
          ? '#fde68a'
          : '#bbf7d0'
    }`,
    transition: 'background-color 0.5s, border-color 0.5s'
  }}
>
  <span
    style={{
      fontSize: '14px',
      fontWeight: '700',
      color:
        paymentCountdown <= 60
          ? '#dc2626'
          : paymentCountdown <= 120
            ? '#d97706'
            : '#16a34a'
    }}
  >
    {paymentCountdown <= 60
      ? '⚠️ Time running out!'
      : paymentCountdown <= 120
        ? '⏳ Almost out of time'
        : '⏱️ Time to complete payment'}
  </span>

  <span
    style={{
      fontWeight: 'bold',
      fontSize: '24px',
      fontFamily: 'monospace',
      color:
        paymentCountdown <= 60
          ? '#dc2626'
          : paymentCountdown <= 120
            ? '#d97706'
            : '#16a34a'
    }}
  >
    {formatPaymentCountdown(paymentCountdown)}
  </span>
</div>

<div className="payment-details">
                <div className="payment-property-info" style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6', marginBottom: '20px' }}>
                  <h4 style={{ marginBottom: '15px', color: '#212529', borderBottom: 'none' }}>{selectedReservation.propertyaddress}</h4>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#495057' }}>
                      <span>Check-in:</span>
                      <span style={{ fontWeight: '500', color: '#212529' }}>{formatSafeDate(selectedReservation.checkindatetime)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '14px', color: '#495057' }}>
                      <span>Check-out:</span>
                      <span style={{ fontWeight: '500', color: '#212529' }}>{formatSafeDate(selectedReservation.checkoutdatetime)}</span>
                  </div>
                  <hr style={{ borderTop: '1px dashed #dee2e6', margin: '15px 0' }} />
                  
                  {/* DYNAMIC PAYMENT UI BASED ON STATUS */}
                  {!isPayingBalance ? (
                      <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#495057' }}>
                              <span>Total Amount:</span>
                              <span style={{ color: CART_THEME.primary, fontWeight: 'bold' }}>MYR {totalAmount.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #dee2e6' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#212529' }}>Deposit Due Now:</span>
                              <span style={{ fontWeight: 'bold', fontSize: '18px', color: CART_THEME.primary }}>
                      RM {depositAmount.toFixed(2)}
                    </span>
                                              </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#6c757d', marginTop: '8px' }}>
                              <span>Balance Due Later:</span>
                              <span>MYR {balanceAmount.toFixed(2)}</span>
                          </div>
                      </>
                  ) : (
                      <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#495057' }}>
                              <span>Total Amount:</span>
                              <span style={{ color: CART_THEME.primary, fontWeight: 'bold' }}>MYR {totalAmount.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#28a745' }}>
                              <span>Deposit Already Paid:</span>
                              <span>- MYR {depositAmount.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #dee2e6' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#212529' }}>Balance Due Now:</span>
                              <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#e53e3e' }}>RM {balanceAmount.toFixed(2)}</span>
                          </div>
                      </>
                  )}
                </div>
          
                {paymentStatus === 'loading' ? (
                  <div className="payment-loading"><p style={{ color: '#6c757d' }}>Loading payment information...</p></div>
                ) : paymentStatus === 'error' ? (
                  <div className="payment-error" style={{ color: '#dc3545' }}><p>{paymentError || 'An error occurred. Please try again.'}</p></div>
                ) : (
                  <div className="payment-methods">
                    <div className="paypal-container">
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
                      {paymentError && <p className="payment-error-message" style={{ color: '#dc3545' }}>{paymentError}</p>}
                    </div>
                  </div>
                )}
                <div className="modal-actions" style={{ borderTop: 'none' }}>
                  <button
                className="btn-payment-retry"
                onClick={() => fetchPropertyOwnerPayPalId(selectedReservation.propertyid)}
                style={{
                  color: CART_THEME.primary,
                  borderColor: CART_THEME.primary,
                  backgroundColor: 'transparent'
                }}
              >
                Retry
              </button>
              <button
                className="modal-button modal-cancel"
                onClick={() => {
                  if (paymentTimerRef.current) {
                    clearInterval(paymentTimerRef.current);
                    paymentTimerRef.current = null;
                  }

                  setShowPaymentModal(false);
                  setSelectedReservation(null);
                  setPaymentError('');
                  setPaymentStatus('idle');
                }}
                style={{ backgroundColor: '#6c757d', color: '#fff' }}
              >
                Cancel
              </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderCartItem = (reservation, isHistorySection = false) => {
    const effectiveStatus = getEffectiveReservationStatus(reservation);
    const { roomName, specialRequest } = parseReservationRequest(reservation.request);
    
    const isPastCheckout = new Date(reservation.checkoutdatetime) < new Date();
    const hasDeletedBefore = localStorage.getItem(`deleted_review_${reservation.propertyid}_${userId}`);
const safeUserReviews = Array.isArray(userReviews) ? userReviews : [];

const hasReviewed = safeUserReviews.some(
  (r) => r.propertyId == reservation.propertyid || r.propertyid == reservation.propertyid
);
    
    const isPartiallyPaid = normalizeStatus(effectiveStatus) === 'partially paid';
    const isFullyPaid = normalizeStatus(effectiveStatus) === 'paid';
    const totalAmount = parseFloat(reservation.totalprice) || 0;
    
    
    let depositAmount = parseFloat(reservation.downpaymentamount || reservation.downPaymentAmount);
    if (isNaN(depositAmount) || depositAmount <= 0) depositAmount = totalAmount * 0.10;
    
    const balanceDue = Math.max(0, totalAmount - depositAmount);
    const firstImage = getFirstPropertyImage(reservation.propertyimage);

    return (
      <div key={reservation.reservationid} className="cart-item" style={{ display: 'flex', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #dee2e6', marginBottom: '20px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        {/* Safe image rendering to prevent ERR_INVALID_URL crashes */}
        <a href="#" onClick={(e) => handlePropertyClick(e, reservation)} style={{ width: '220px', height: '140px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', marginRight: '20px', display: 'block', cursor: 'pointer' }}>
          {firstImage ? (
            <img 
                src={getSafeImageSrc(firstImage)} 
                alt={reservation.propertyaddress} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                loading="lazy" 
                decoding="async" 
            />
          ) : (
            <div className="placeholder-image" style={{ width: '100%', height: '100%', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Image</div>
          )}
        </a>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <a href="#" onClick={(e) => handlePropertyClick(e, reservation)} style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#212529', fontWeight: 'bold' }}>{reservation.propertyaddress}</h4>
            </a>
            {roomName && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: CART_THEME.primarySoft,
                  color: CART_THEME.primaryText,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  border: `1px solid ${CART_THEME.primaryBorder}`
                }}
              >
                <FaBed style={{ marginRight: '6px' }} /> {roomName}
              </div>
            )}
            <div style={{ fontSize: '14px', color: '#495057', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center' }}><FaCalendarAlt style={{ color: '#6c757d', marginRight: '6px' }} /> Arrival: <strong style={{ marginLeft: '5px', color: '#212529' }}>{formatSafeDate(reservation.checkindatetime)}</strong></p>
              <p style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center' }}><FaCalendarAlt style={{ color: '#6c757d', marginRight: '6px' }} /> Departure: <strong style={{ marginLeft: '5px', color: '#212529' }}>{formatSafeDate(reservation.checkoutdatetime)}</strong></p>
              
              {/*  DISPLAY AUTO-CANCEL / DEADLINE INFORMATION */}
              {['payment pending', 'pending', 'booking', 'accepted', 'partially paid'].includes(normalizeStatus(effectiveStatus)) && reservation.reservationblocktime && (
                  <p style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', color: '#dc3545' }}><FaRegClock style={{ marginRight: '6px' }} /> Payment Deadline: <strong style={{ marginLeft: '5px' }}>
  {formatSafeDate(reservation.reservationblocktime)}
</strong></p>
              )}
            </div>
            {specialRequest && specialRequest !== 'None' && (
              <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '8px', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
                <FaStickyNote style={{ marginRight: '6px' }} /> Note: {specialRequest}
              </p>
            )}
          </div>

          <div style={{ width: '220px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'right' }}>
              
              {/* --- DYNAMIC PRICING DISPLAY --- */}
              {isPartiallyPaid ? (
                <>
                  <div style={{ fontSize: '12px', color: '#6c757d', textDecoration: 'line-through' }}>Total: RM {totalAmount.toFixed(2)}</div>
                  <div style={{ fontSize: '13px', color: '#28a745', fontWeight: '600', marginBottom: '2px' }}>Deposit Paid: -RM {depositAmount.toFixed(2)}</div>
                  <div style={{ fontSize: '13px', color: '#495057', marginTop: '4px', fontWeight: 'bold' }}>Balance Due</div>
                  <h3 style={{ color: '#000000', fontWeight: 'bold', margin: 0, fontSize: '24px' }}>RM {balanceDue.toFixed(2)}</h3>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '13px', color: '#495057', marginBottom: '2px', fontWeight: 'bold' }}>Total Amount</div>
                  <h3 style={{ color: '#000000', fontWeight: 'bold', margin: 0, fontSize: '22px' }}>RM {totalAmount.toFixed(2)}</h3>
                </>
              )}

              <div style={{ marginTop: '8px' }}><StatusBadge status={effectiveStatus} /></div>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px' }}>
              
              {/* --- DYNAMIC ACTION BUTTONS --- */}
              {!isHistorySection && ['payment pending', 'pending', 'booking', 'accepted', 'partially paid'].includes(normalizeStatus(effectiveStatus)) && (
               <button
                      className="btn-action btn-pay"
                      onClick={() => confirmAction('pay', reservation.reservationid)}
                      disabled={updateStatusMutation.isPending}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        background: isPartiallyPaid ? '#28a745' : CART_THEME.primary,
                        color: '#fff',
                        border: 'none',
                        transition: 'background 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = isPartiallyPaid ? '#218838' : CART_THEME.primaryDark;
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = isPartiallyPaid ? '#28a745' : CART_THEME.primary;
                      }}
                    >
                      <FaPaypal style={{ marginRight: '6px' }} /> {isPartiallyPaid ? 'Pay Balance' : 'Pay Deposit'}
                    </button>
              )}

              {!isHistorySection && ['payment pending', 'pending', 'booking', 'accepted'].includes(normalizeStatus(effectiveStatus)) && (
                <button className="btn-action btn-cancel" onClick={() => confirmAction('cancel', reservation.reservationid)} disabled={updateStatusMutation.isPending} style={{ width: '100%', padding: '10px', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #dc3545', background: '#fff', color: '#dc3545', transition: 'all 0.2s', cursor: 'pointer' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#dc3545'; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#dc3545'; }}
                >
                  Cancel Booking
                </button>
              )}

              {!isHistorySection && normalizeStatus(effectiveStatus) === 'partially paid' && (
                <button 
                  className="btn-action btn-cancel" 
                  onClick={() => confirmAction('cancel_forfeit', reservation.reservationid)} 
                  disabled={updateStatusMutation.isPending} 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #dc3545', background: '#fff', color: '#dc3545', transition: 'all 0.2s', cursor: 'pointer' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#dc3545'; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#dc3545'; }}
                >
                  Cancel (Lose Deposit)
                </button>
              )}
              
              {/* CONTACT OWNER BUTTON FOR PAID BOOKINGS */}
              {isHistorySection && isFullyPaid && (
                <button 
                onClick={() => handleRequestRefund(reservation)} 
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  border: `1px solid ${CART_THEME.primary}`,
                  background: '#fff',
                  color: CART_THEME.primary,
                  marginTop: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = CART_THEME.primarySoft;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#fff';
                }}
              >
                <FaPhone /> Contact Owner
              </button>
              )}

              {/* SMART REVIEW BUTTON (ONLY IN HISTORY SECTION) */}
              {isHistorySection && (normalizeStatus(effectiveStatus) === 'paid' || normalizeStatus(effectiveStatus) === 'accepted') && (
                isPastCheckout ? (
                  <button 
                    onClick={() => openReviewModal(reservation)}
                    style={{ 
                        background: (hasReviewed || hasDeletedBefore) ? '#f8f9fa' : '#fff', 
                        border: (hasReviewed || hasDeletedBefore) ? '1px solid #dee2e6' : '1px solid #ffc107', 
                        color: (hasReviewed || hasDeletedBefore) ? '#6c757d' : '#856404', 
                        padding: '8px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' 
                    }}
                    onMouseOver={(e) => { if(!hasReviewed && !hasDeletedBefore) { e.currentTarget.style.background = '#fff3cd'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                    onMouseOut={(e) => { if(!hasReviewed && !hasDeletedBefore) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; } }}
                  >
                    <FaStar style={{ color: (hasReviewed || hasDeletedBefore) ? '#adb5bd' : '#ffc107', fontSize: '15px' }} /> 
                    {hasDeletedBefore ? 'Review Deleted' : hasReviewed ? 'View My Review' : 'Write a Review'}
                  </button>
                ) : (
                  <span style={{ fontSize: '12px', color: '#6c757d', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <FaStar /> Review unlocks after checkout
                  </span>
                )
              )}

            </div>
          </div>
        </div>
      </div>
    );
  };

   return (
    <div>
      <div className="Cart_Container_Main">
        <AuthProvider>
          <Navbar />

          {showToast && <Toast message={toastMessage} type={toastType} />}

          {showCartRefreshNotice && (
            <div
              style={{
                position: 'fixed',
                top: '90px',
                right: '24px',
                zIndex: 99999,
                background: '#ffffff',
                border: `1px solid ${CART_THEME.primaryBorder}`,
                borderLeft: `5px solid ${CART_THEME.primary}`,
                borderRadius: '12px',
                padding: '16px 18px',
                boxShadow: '0 12px 35px rgba(15, 23, 42, 0.18)',
                minWidth: '320px',
                maxWidth: '420px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  border: `3px solid ${CART_THEME.primarySoft}`,
                  borderTop: `3px solid ${CART_THEME.primary}`,
                  borderRadius: '50%',
                  animation: 'cartRefreshSpin 0.8s linear infinite',
                  flexShrink: 0
                }}
              />

              <div>
                <div style={{ fontWeight: '800', color: CART_THEME.primaryText, fontSize: '14px' }}>
                  Please wait
                </div>
                <div style={{ color: '#475569', fontSize: '13px', lineHeight: '1.4' }}>
                  {cartRefreshMessage || 'Updating your booking...'}
                </div>
              </div>
            </div>
          )}

          {isCancelProcessing && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                zIndex: 10050,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
              }}
            >
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '28px',
                  maxWidth: '420px',
                  width: '100%',
                  textAlign: 'center',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.25)'
                }}
              >
                <FaRegClock
                  style={{
                    fontSize: '42px',
                    color: '#CC8C18',
                    marginBottom: '14px'
                  }}
                />

                <h3 style={{ margin: 0, color: '#111827' }}>
                  Processing cancellation
                </h3>

                <p style={{ color: '#6b7280', marginTop: '8px', lineHeight: '1.5' }}>
                  Please wait while we update your reservation status and refresh your reservation history.
                </p>
              </div>
            </div>
          )}

          {renderConfirmationModal()}
          {renderPaymentModal()}
          {renderReviewModal()}
          {renderSupportModal()}

          <main className="cart-page-content">
            {!isCartUserLoggedIn ? (
              <CartLoginPrompt
                onLogin={() => navigate('/login', { state: { from: '/cart' } })}
                onBrowse={() => navigate('/product')}
              />
            ) : (
              <>
                <div id="cart-section" className="cart-section">
                  <div className="reservation-container">
                    <div className="section-header" style={{ marginBottom: '30px' }}>
                      <FaShoppingCart className="section-icon" style={{ color: CART_THEME.primary }} />
                      <h2 style={{ color: '#212529' }}>Your Cart</h2>
                    </div>

                    <div className="cart-row" style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div className="cart-container" style={{ flex: '1 1 0%', minWidth: '60%' }}>
                        {loading ? (
                          Array(2).fill().map((_, index) => <CartItemSkeleton key={index} />)
                        ) : activeCartReservations.length > 0 ? (
                          activeCartReservations.map((reservation) => renderCartItem(reservation, false))
                        ) : (
                          <div className="empty-cart" style={{ padding: '60px 0', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px', border: '1px dashed #dee2e6' }}>
                            <div className="empty-cart-icon" style={{ fontSize: '40px', color: '#dee2e6', marginBottom: '15px' }}>
                              <FaShoppingCart />
                            </div>

                            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#495057', margin: '0 0 5px 0' }}>
                              Your cart is empty
                            </p>

                            <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '20px' }}>
                              Add properties to your cart to see them here
                            </p>

                            <Link to={'/product'}>
                              <button
                                className="btn-browse"
                                style={{
                                  padding: '10px 20px',
                                  borderRadius: '6px',
                                  background: CART_THEME.primary,
                                  color: '#fff',
                                  border: 'none',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.background = CART_THEME.primaryDark;
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.background = CART_THEME.primary;
                                }}
                              >
                                Browse Properties
                              </button>
                            </Link>
                          </div>
                        )}
                      </div>

                      {activeCartReservations.length > 0 && (
                        <div className="total-container" style={{ flex: '0 0 350px', width: '350px' }}>
                          <div
                            className="cart-total"
                            style={{
                              backgroundColor: '#fff',
                              padding: '25px',
                              borderRadius: '12px',
                              border: '1px solid #dee2e6',
                              boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                              position: 'sticky',
                              top: '100px'
                            }}
                          >
                            <h4 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', borderBottom: '2px solid #f8f9fa', paddingBottom: '10px', color: '#212529' }}>
                              Outstanding Balance
                            </h4>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#495057' }}>
                              <span>Active Bookings:</span>
                              <span style={{ fontWeight: 'bold', color: '#212529' }}>
                                {activeCartReservations.length}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', color: '#495057' }}>
                              <span>Total Nights:</span>
                              <span style={{ fontWeight: 'bold', color: '#212529' }}>
                                {totalNights}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '2px solid #dee2e6', paddingTop: '15px' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#343a40' }}>
                                Total Due Now:
                              </span>
                              <span style={{ fontWeight: 'bold', fontSize: '24px', color: '#000000' }}>
                                RM {finalTotalOwed.toFixed(2)}
                              </span>
                            </div>

                            <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '10px', textAlign: 'center' }}>
                              This is the combined amount currently required to confirm or complete your active bookings.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div id="reservation-history-section" className="cart-section" style={{ marginTop: '20px' }}>
                  <div className="reservation-container">
                    <div className="section-header" style={{ marginBottom: '30px' }}>
                      <FaHistory className="section-icon" style={{ color: CART_THEME.primary }} />
                      <h2 style={{ color: '#212529' }}>Reservations History</h2>
                    </div>

                    <div className="filter-cart" style={{ display: 'flex', gap: '15px', marginBottom: '25px', backgroundColor: '#fff', padding: '15px 20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                      <div className="filter-item" style={{ flex: '1' }}>
                        <label htmlFor="sortOrder" style={{ fontWeight: 'bold', fontSize: '13px', color: '#495057', marginBottom: '6px', display: 'block' }}>
                          <FaSort style={{ marginRight: '5px', color: CART_THEME.primary }} /> Sort By:
                        </label>

                        <select
                          id="sortOrder"
                          value={sortOrder}
                          onChange={handleSortChange}
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #dee2e6', color: '#212529', backgroundColor: '#fff' }}
                        >
                          <option value="Latest">Latest First</option>
                          <option value="Oldest">Oldest First</option>
                          <option value="Price High to Low">Price: High to Low</option>
                          <option value="Price Low to High">Price: Low to High</option>
                        </select>
                      </div>

                      <div className="filter-item" style={{ flex: '1' }}>
                        <label htmlFor="filterStatus" style={{ fontWeight: 'bold', fontSize: '13px', color: '#495057', marginBottom: '6px', display: 'block' }}>
                          <FaFilter style={{ marginRight: '5px', color: CART_THEME.primary }} /> Filter By Status:
                        </label>

                        <select
                          id="filterStatus"
                          value={filterStatus}
                          onChange={handleFilterChange}
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #dee2e6', color: '#212529', backgroundColor: '#fff' }}
                        >
                          <option value="All status">All Statuses</option>
                          <option value="Canceled">Canceled</option>
                          <option value="Paid">Paid</option>
                          <option value="Expired">Expired</option>
                        </select>
                      </div>
                    </div>

                    <div className="reservation-list">
                      {loading ? (
                        Array(3).fill().map((_, index) => <CartItemSkeleton key={index} />)
                      ) : currentReservations.length > 0 ? (
                        currentReservations.map((reservation) => renderCartItem(reservation, true))
                      ) : (
                        <div className="empty-reservations" style={{ padding: '40px 0', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #dee2e6' }}>
                          <div className="empty-cart-icon" style={{ fontSize: '30px', color: '#dee2e6', marginBottom: '10px' }}>
                            <FaHistory />
                          </div>

                          <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#495057', margin: '0 0 5px 0' }}>
                            No reservations found
                          </p>

                          <p style={{ fontSize: '13px', color: '#6c757d' }}>
                            {filterStatus !== 'All status'
                              ? `No history with status "${filterStatus}"`
                              : "You don't have any past reservations yet"}
                          </p>
                        </div>
                      )}
                    </div>

                    {currentReservations.length > 0 && (
                      <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '5px' }}>
                        <button
                          className="pagination-button"
                          onClick={handlePreviousPage}
                          disabled={currentPage === 1}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6',
                            background: currentPage === 1 ? '#f8f9fa' : '#fff',
                            color: '#6c757d',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <FaArrowLeft />
                        </button>

                        {[...Array(totalPages)].map((_, index) => {
                          const pageNum = index + 1;

                          if (
                            pageNum === 1 ||
                            pageNum === totalPages ||
                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={index}
                                className={`pagination-button ${currentPage === pageNum ? 'active' : ''}`}
                                onClick={() => handlePageChange(pageNum)}
                                disabled={currentPage === pageNum}
                                style={{
                                  padding: '8px 14px',
                                  borderRadius: '6px',
                                  border: '1px solid #dee2e6',
                                  background: currentPage === pageNum ? CART_THEME.primary : '#fff',
                                  color: currentPage === pageNum ? '#fff' : '#212529',
                                  fontWeight: currentPage === pageNum ? 'bold' : 'normal',
                                  cursor: currentPage === pageNum ? 'default' : 'pointer'
                                }}
                              >
                                {pageNum}
                              </button>
                            );
                          }

                          if (
                            (pageNum === currentPage - 2 && currentPage > 3) ||
                            (pageNum === currentPage + 2 && currentPage < totalPages - 2)
                          ) {
                            return (
                              <span key={index} style={{ padding: '8px', color: '#6c757d' }}>
                                ...
                              </span>
                            );
                          }

                          return null;
                        })}

                        <button
                          className="pagination-button"
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages || totalPages === 0}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6',
                            background: currentPage === totalPages ? '#f8f9fa' : '#fff',
                            color: '#6c757d',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <FaArrowRight />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </main>

          <Back_To_Top_Button />
          <Footer />

          <TawkMessenger />
        </AuthProvider>
      </div>
    </div>
  );
};

export default Cart;