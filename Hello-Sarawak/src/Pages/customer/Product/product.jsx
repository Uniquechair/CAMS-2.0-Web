import React, { useState, useEffect, useRef, lazy, Suspense, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';

// Import Components
import Navbar from '../../../Component/Navbar/navbar';
import Footer from '../../../Component/Footer/footer';
import Back_To_Top_Button from '../../../Component/Back_To_Top_Button/Back_To_Top_Button';
import Toast from '../../../Component/Toast/Toast';
import ImageSlider from '../../../Component/ImageSlider/ImageSlider';
import { AuthProvider } from '../../../Component/AuthContext/AuthContext';
import Sorting from '../../../Component/Sorting/Sorting';

import { fetchProduct, calculateBookingPrice, checkDateOverlap } from '../../../../Api/api';

// Import React Icons and CSS
import { FaStar, FaSearch } from 'react-icons/fa';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { HiUsers } from "react-icons/hi2";
import { CiCalendarDate } from "react-icons/ci";
import { IoLocationSharp } from "react-icons/io5";
import { MdOutlineLocalFireDepartment } from "react-icons/md";
import './product.css';

const TawkMessenger = lazy(() =>
  import('../../../Component/TawkMessenger/TawkMessenger')
);

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
  const previewEnd = checkIn && !checkOut ? hoverDate : checkOut;

  const month2 = viewMonth === 11 ? 0 : viewMonth + 1;
  const year2 = viewMonth === 11 ? viewYear + 1 : viewYear;

  const prevMonth = (e) => {
    e.stopPropagation();

    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e) => {
    e.stopPropagation();

    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayClick = (dateStr) => {
    if (minDate && dateStr < minDate) return;

    if (selecting === 'checkin') {
      onCheckInChange(dateStr);
      onCheckOutChange('');
      setHoverDate('');
      setSelecting('checkout');
      return;
    }

    if (selecting === 'checkout') {
      if (dateStr <= checkIn) {
        onCheckInChange(dateStr);
        onCheckOutChange('');
        setHoverDate('');
      } else {
        onCheckOutChange(dateStr);
        setHoverDate('');
        setSelecting('done');
      }
    }
  };

  const handleDayHover = (dateStr) => {
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

    for (let i = 0; i < start; i++) {
      cells.push(<div key={`e-${i}`} className="hdc-empty" />);
    }

    for (let d = 1; d <= count; d++) {
      const dateStr = getDateStr(y, m, d);

      const isDisabled =
        (minDate && dateStr < minDate) ||
        (checkIn && !checkOut && dateStr < checkIn);

      const isCheckIn = dateStr === checkIn;
      const isCheckOut = dateStr === checkOut;
      const isToday = dateStr === todayStr;

      const rangeStart = checkIn;
      const rangeEnd = previewEnd && previewEnd > checkIn ? previewEnd : null;
      const isInRange = rangeStart && rangeEnd && dateStr > rangeStart && dateStr < rangeEnd;
      const isRangeStart = isCheckIn && rangeEnd;
      const isRangeEnd = dateStr === rangeEnd && rangeStart;

      let cls = 'hdc-day';

      if (isDisabled) cls += ' hdc-disabled';
      if (isCheckIn) cls += ' hdc-checkin';
      if (isCheckOut) cls += ' hdc-checkout';
      if (isInRange) cls += ' hdc-in-range';
      if (isRangeStart) cls += ' hdc-range-start';
      if (isRangeEnd) cls += ' hdc-range-end';
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
    <div className="home-dual-calendar-popup" onClick={(e) => e.stopPropagation()}>
      <div className="hdc-topbar">
        <div className="hdc-pills">
          <div
            className={`hdc-pill ${selecting === 'checkin' ? 'hdc-pill-active' : ''}`}
            onClick={() => setSelecting('checkin')}
          >
            <span className="hdc-pill-label">Check-in</span>
            <span className="hdc-pill-value">
              {checkIn
                ? new Date(`${checkIn}T00:00:00`).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })
                : '—'}
            </span>
          </div>

          <div className="hdc-pill-arrow">→</div>

          <div
            className={`hdc-pill ${selecting === 'checkout' ? 'hdc-pill-active' : ''}`}
            onClick={() => setSelecting('checkout')}
          >
            <span className="hdc-pill-label">Check-out</span>
            <span className="hdc-pill-value">
              {checkOut
                ? new Date(`${checkOut}T00:00:00`).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })
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

      <div className="hdc-months" onMouseLeave={handleMouseLeaveGrid}>
        {[{ y: viewYear, m: viewMonth }, { y: year2, m: month2 }].map(({ y, m }) => (
          <div key={`${y}-${m}`} className="hdc-month">
            <div className="hdc-month-days-header">
              {days.map((day) => (
                <div key={day}>{day}</div>
              ))}
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

const Product = () => {
  const location = useLocation();
  const passedRegion = location.state?.filterRegion || '';
  const queryClient = useQueryClient();

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState('');
  const toastTimerRef = useRef(null);

  const [selectedCluster, setSelectedCluster] = useState(passedRegion);
  const [bookingData, setBookingData] = useState({
    checkIn: "",
    checkOut: "",
    adults: 1,
    children: 0,
  });

  const [lastSearchDates, setLastSearchDates] = useState({ checkIn: "", checkOut: "" });
  const [shouldRestoreSearch, setShouldRestoreSearch] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  const [activeTab, setActiveTab] = useState(null);
  const [calendarSelecting, setCalendarSelecting] = useState('checkin');
  const [allProperties, setAllProperties] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [sortOrder, setSortOrder] = useState("none");
  const [propertySearchTerm, setPropertySearchTerm] = useState('');

  const [selectedFacilities, setSelectedFacilities] = useState([]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState([]);
  const [selectedBookingOptions, setSelectedBookingOptions] = useState([]);

  const [isDateOverlapping, setIsDateOverlapping] = useState({});
  const [hasSearchedWithDates, setHasSearchedWithDates] = useState(false);
  const [dynamicPrices, setDynamicPrices] = useState({});
  const [isCalculatingPrices, setIsCalculatingPrices] = useState(false);

  const [propertyCategory, setPropertyCategory] = useState('All');

  const [page, setPage] = useState(1);
 const itemsPerPage = 12;
  const listHeaderRef = useRef(null);

  const clusters = [
    "Kuching", "Miri", "Sibu", "Bintulu", "Limbang", "Sarikei", "Sri Aman",
    "Kapit", "Mukah", "Betong", "Samarahan", "Serian", "Lundu", "Lawas",
    "Marudi", "Simunjan", "Tatau", "Belaga", "Debak", "Kabong", "Pusa",
    "Sebuyau", "Saratok", "Selangau", "Tebedu",
  ];

  const navigate = useNavigate();

const PRODUCT_QUERY_KEY = ['product-properties'];

const { data: fetchedProperties, isLoading, error } = useQuery({
  queryKey: PRODUCT_QUERY_KEY,
  queryFn: fetchProduct,
  staleTime: 60 * 1000,
  gcTime: 10 * 60 * 1000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  retry: 1,
});

  const toNumber = (value, fallback = 0) => {
    const number = parseFloat(value);
    return Number.isFinite(number) ? number : fallback;
  };

  const getNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 1;

    const start = new Date(`${checkIn}T00:00:00`);
    const end = new Date(`${checkOut}T00:00:00`);
    const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));

    return diff > 0 ? diff : 1;
  };

const getImageSrc = (image) => {
  if (!image) return '';

  if (typeof image !== 'string') return '';

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  if (image.startsWith('data:image')) {
    return image;
  }

  return `data:image/jpeg;base64,${image}`;
};

const getSafePropertyImages = (property) => {
  const images = property?.propertyimage;

  if (Array.isArray(images)) {
    return images
      .filter(Boolean)
      .map(getImageSrc);
  }

  if (typeof images === 'string' && images.trim()) {
    try {
      const parsed = JSON.parse(images);

      if (Array.isArray(parsed)) {
        return parsed
          .filter(Boolean)
          .map(getImageSrc);
      }
    } catch (error) {
      return [getImageSrc(images)];
    }

    return [getImageSrc(images)];
  }

  return [];
};

  const getPropertyReviewDisplay = (property) => {
    const rating = Number(
      property?.rating ??
      property?.live_rating ??
      property?.averagerating ??
      0
    );

    const ratingNo = Number(
      property?.ratingno ??
      property?.live_ratingno ??
      property?.reviewcount ??
      property?.review_count ??
      0
    );

    return {
      hasReviews: ratingNo > 0 && rating > 0,
      ratingText: Number.isInteger(rating)
        ? rating.toFixed(1)
        : rating.toFixed(2).replace(/\.?0+$/, '')
    };
  };

  const getLowestPropertyRate = (prop) => {
    let lowestBaseRate = toNumber(prop?.normalrate, 0);

    const isHotel = ['Hotel', 'Resort', 'Inn', 'Hostel'].includes(prop?.categoryname);

    if (isHotel) {
      let rawSetup = prop?.room_details || prop?.roomsetup || '';

      if (typeof rawSetup === 'string' && rawSetup.includes('_ROOMDATA_')) {
        rawSetup = rawSetup.split('_ROOMDATA_')[1];
      }

      let parsedRooms = [];

      try {
        if (Array.isArray(rawSetup)) {
          parsedRooms = rawSetup;
        } else if (typeof rawSetup === 'string' && rawSetup.trim().startsWith('[')) {
          parsedRooms = JSON.parse(rawSetup);
        }
      } catch (error) {
        console.error('Failed to parse room setup:', error);
      }

      if (Array.isArray(parsedRooms) && parsedRooms.length > 0) {
        let tempLowest = Infinity;

        parsedRooms.forEach((room) => {
          const roomPrice = toNumber(room?.price, NaN);
          if (Number.isFinite(roomPrice) && roomPrice > 0 && roomPrice < tempLowest) {
            tempLowest = roomPrice;
          }

          if (Array.isArray(room?.options)) {
            room.options.forEach((option) => {
              const optionPrice = toNumber(option?.price, NaN);
              if (Number.isFinite(optionPrice) && optionPrice > 0 && optionPrice < tempLowest) {
                tempLowest = optionPrice;
              }
            });
          }
        });

        if (tempLowest !== Infinity) {
          lowestBaseRate = tempLowest;
        }
      }
    }

    return Number.isFinite(lowestBaseRate) && lowestBaseRate > 0 ? lowestBaseRate : 0;
  };

  const getPropertyFilterPrice = (property) => {
    const lowestRate = getLowestPropertyRate(property);
    const normalRate = toNumber(property?.normalrate, 0);

    if (lowestRate > 0) return lowestRate;
    if (normalRate > 0) return normalRate;

    return 0;
  };

  const getPropertyFacilities = (property) => {
    if (!property?.facilities) return [];

    return String(property.facilities)
      .split(',')
      .map((facility) => facility.trim())
      .filter(Boolean);
  };

const PROPERTY_TYPE_CONFIG = {
  Hotel:       { label: 'Hotel',       cls: 'badge-hotel'       },
  Resort:      { label: 'Resort',      cls: 'badge-resort'      },
  Inn:         { label: 'Inn',         cls: 'badge-inn'       },
  Hostel:      { label: 'Hostel',      cls: 'badge-hostel'      },
  Homestay:    { label: 'Homestay',    cls: 'badge-homestay'},
  Kampungstay: { label: 'Kampungstay', cls: 'badge-kampungstay'},
  Lodge:       { label: 'Lodge',       cls: 'badge-lodge' },
  Guesthouse:  { label: 'Guesthouse',  cls: 'badge-guesthouse' },
  Apartment:   { label: 'Apartment',   cls: 'badge-apartment' },
};


const PropertyTypeBadge = ({ categoryName = '' }) => {
  const config = PROPERTY_TYPE_CONFIG[categoryName];
  if (!config) return null;
  return (
    <span className={`property-type-badge ${config.cls}`}>
      <span className="badge-icon" aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
};
  const getPropertyBookingOptions = (property) => {
    const facilities = getPropertyFacilities(property);

    return facilities.filter((facility) =>
      ['Instant booking', 'Self check-in', 'Pets Allowed', 'No Pets'].includes(facility)
    );
  };

  const getApiUrl = (path) => {
    const rawBase = (import.meta.env.VITE_API_URL || '').trim();

    if (rawBase.startsWith('http://') || rawBase.startsWith('https://')) {
      return `${rawBase.replace(/\/$/, '')}${path}`;
    }

    if (rawBase.startsWith('/')) {
      return `${window.location.origin}${rawBase}${path}`;
    }

    return `http://localhost:8080${path}`;
  };

  const normalizeText = (value = '') => {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  };

const parsePropertyRooms = (prop) => {
  let rawSetup = prop?.room_details || prop?.roomsetup || '';

  if (typeof rawSetup === 'string' && rawSetup.includes('_ROOMDATA_')) {
    rawSetup = rawSetup.split('_ROOMDATA_')[1];
  }

  let rooms = [];

  try {
    if (Array.isArray(rawSetup)) {
      rooms = rawSetup;
    } else if (typeof rawSetup === 'string' && rawSetup.trim().startsWith('[')) {
      rooms = JSON.parse(rawSetup);
    }
  } catch (error) {
    console.error('Failed to parse room setup for stock check:', error);
  }

  // If property has room setup, use it for Hotel, Guesthouse, Apartment, etc.
  if (Array.isArray(rooms) && rooms.length > 0) {
    return rooms;
  }

  // For Homestay / whole property booking, PropertyDetails saves:
  // "Room Selected: Entire Property"
  // So Product page must check the same name.
  return [
    {
      name: 'Entire Property',
      quantity: prop?.quantity || prop?.propertyquantity || 1,
      options: []
    }
  ];
};

  const getRoomQuantity = (room, option = null) => {
    const optionQty = parseInt(option?.quantity ?? option?.qty, 10);
    if (!Number.isNaN(optionQty) && optionQty > 0) return optionQty;

    const roomQty = parseInt(room?.quantity ?? room?.qty, 10);
    if (!Number.isNaN(roomQty) && roomQty > 0) return roomQty;

    return 1;
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

  const normalizeReservationStatus = (status) => {
    return String(status || '')
      .toLowerCase()
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');
  };

  const shouldHoldRoomStock = (reservation) => {
    const status = normalizeReservationStatus(reservation?.reservationstatus);

    return [
      'paid',
      'partially paid'
    ].includes(status);
  };

  const bookingMatchesRoomAndPackage = (booking, baseRoomName = '', packageName = '') => {
    const baseName = normalizeText(baseRoomName);
    const pkgName = normalizeText(packageName);

    if (!baseName) return false;

    const booked = extractBookedRoomInfo(booking);

const sameRoom =
  booked.roomName === baseName ||
  booked.rawText.includes(`room selected: ${baseName}`) ||
  (
    baseName === 'entire property' &&
    (
      booked.roomName === 'entire property' ||
      booked.rawText.includes('room selected: entire property') ||
      booked.rawText.includes('entire property')
    )
  );
    if (!sameRoom) return false;

    if (pkgName) {
      return booked.packageName === pkgName;
    }

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
          `${booking.request || booking.reservationrequest || ''}-${index}`
        );
      }
    });

    return ids.size;
  };

  const checkPropertyAllRoomsSoldOut = async (prop, checkIn, checkOut) => {
    const propId = parseInt(prop?.propertyid, 10);

    if (!propId || !checkIn || !checkOut) {
      return {
        soldOut: false,
        lowStock: false,
        roomsLeft: null
      };
    }

    const rooms = parsePropertyRooms(prop);
    const roomChecks = [];

    rooms.forEach((room) => {
      const baseRoomName = room?.name || prop?.propertybedtype || 'Whole Property';
      const options = Array.isArray(room?.options) ? room.options : [];

      if (options.length > 0) {
        options.forEach((option) => {
          roomChecks.push({
            baseRoomName,
            packageName: option?.name || '',
            totalQty: getRoomQuantity(room, option)
          });
        });
      } else {
        roomChecks.push({
          baseRoomName,
          packageName: '',
          totalQty: getRoomQuantity(room, null)
        });
      }
    });

    if (roomChecks.length === 0) {
      return {
        soldOut: false,
        lowStock: false,
        roomsLeft: null
      };
    }

    const results = await Promise.all(
      roomChecks.map(async (roomCheck) => {
        const availabilityUrl = new URL(getApiUrl('/property-availability'));

        availabilityUrl.searchParams.set('propertyid', propId);
        availabilityUrl.searchParams.set('checkIn', checkIn);
        availabilityUrl.searchParams.set('checkOut', checkOut);

      const isEntirePropertyCheck =
  normalizeText(roomCheck.baseRoomName) === 'entire property';

// For Entire Property / Homestay, do NOT send roomName.
// Let backend return all bookings for the property, then frontend counts matching booking request.
if (roomCheck.baseRoomName && !isEntirePropertyCheck) {
  availabilityUrl.searchParams.set('roomName', roomCheck.baseRoomName);
}

if (roomCheck.packageName) {
  availabilityUrl.searchParams.set('packageName', roomCheck.packageName);
}

        const response = await fetch(availabilityUrl.toString(), {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to check property availability');
        }

        const data = await response.json();

        const bookedCount = countUniqueMatchingBookings(
          data.bookings || [],
          roomCheck.baseRoomName,
          roomCheck.packageName
        );

        const left = Math.max(0, roomCheck.totalQty - bookedCount);

        return {
          ...roomCheck,
          bookedCount,
          left,
          soldOut: left <= 0
        };
      })
    );

    const totalRoomsLeft = results.reduce((sum, item) => sum + item.left, 0);
    const allSoldOut = results.every((item) => item.soldOut);

    return {
      soldOut: allSoldOut,
      lowStock: !allSoldOut && totalRoomsLeft === 1,
      roomsLeft: totalRoomsLeft,
      roomResults: results
    };
  };

  useEffect(() => {
    if (error) {
      displayToast('error', 'Failed to load properties');
    }
  }, [error]);

  useEffect(() => {
    if (location.state?.filterRegion) {
      setSelectedCluster(location.state.filterRegion);

      if (!bookingData.checkIn || !bookingData.checkOut) {
        displayToast('info', `Looking for stays in ${location.state.filterRegion}? Pick your dates first!`);
        setTimeout(() => setActiveTab('checkin'), 500);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const searchShellRef = useRef(null);
  const locationRef = useRef(null);
  const checkinRef = useRef(null);
  const checkoutRef = useRef(null);
  const guestsRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        activeTab &&
        searchShellRef.current &&
        !searchShellRef.current.contains(event.target)
      ) {
        setActiveTab(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeTab]);

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

const handleViewDetails = async (property) => {
  let pricingInfo = dynamicPrices[property.propertyid] || null;

  if (bookingData.checkIn && bookingData.checkOut && !pricingInfo) {
    const lowestBaseRate = getLowestPropertyRate(property);
    const nights = getNights(bookingData.checkIn, bookingData.checkOut);

    try {
      const res = await calculateBookingPrice(
        bookingData.checkIn,
        bookingData.checkOut,
        lowestBaseRate,
        property.propertyid
      );

      const totalPrice = toNumber(
        res?.totalPrice ?? res?.total_price ?? res?.total ?? res?.price,
        lowestBaseRate * nights
      );

      const totalNights = toNumber(
        res?.totalNights ?? res?.total_nights ?? res?.nights,
        nights
      );

      const averageNightly =
        totalNights > 0 ? totalPrice / totalNights : lowestBaseRate;

      pricingInfo = {
        price: averageNightly,
        totalPrice,
        totalNights,
        originalBase: lowestBaseRate,
        isDiscounted: averageNightly < lowestBaseRate,
        isPeak: averageNightly > lowestBaseRate,
        discountPercent:
          averageNightly < lowestBaseRate && lowestBaseRate > 0
            ? Math.round(((lowestBaseRate - averageNightly) / lowestBaseRate) * 100)
            : 0,
      };
    } catch (error) {
      console.error('Failed to prepare price before opening details:', error);

      pricingInfo = {
        price: lowestBaseRate,
        totalPrice: lowestBaseRate * nights,
        totalNights: nights,
        originalBase: lowestBaseRate,
        isDiscounted: false,
        isPeak: false,
        discountPercent: 0,
      };
    }
  }

  navigate(`/product/${property.propertyid}`, {
    state: {
      propertyDetails: {
        ...property,
        preCalculatedPrice: pricingInfo,
      },
      searchDates: {
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        adults: bookingData.adults,
        children: bookingData.children
      },
      pricingInfo,
      filterRegion: selectedCluster
    }
  });
};

const handleInputChange = (name, value) => {
  setBookingData((prev) => {
    const updatedData = { ...prev, [name]: value };

    if (name === 'checkIn' && prev.checkOut && value >= prev.checkOut) {
      updatedData.checkOut = '';
    }

    return updatedData;
  });

  if (name === 'checkIn' || name === 'checkOut') {
    setHasSearchedWithDates(false);
    setDynamicPrices({});
    setIsDateOverlapping({});
    setLastSearchDates({ checkIn: '', checkOut: '' });
  }
};

  const clearDates = (e) => {
    if (e) e.stopPropagation();

    setBookingData((prev) => ({
      ...prev,
      checkIn: '',
      checkOut: ''
    }));

    setHasSearchedWithDates(false);
    setIsDateOverlapping({});
    setDynamicPrices({});
    setLastSearchDates({ checkIn: '', checkOut: '' });
    setCalendarSelecting('checkin');
    setActiveTab(null);

    displayToast('info', 'Dates cleared. Showing all availability.');
  };

useEffect(() => {
  if (calendarSelecting === 'done') {
    setTimeout(() => setActiveTab('guests'), 250);
  }
}, [calendarSelecting]);

  const applyProductFilters = (propertiesArray, overrideCluster = undefined) => {
    const totalGuests = bookingData.adults + bookingData.children;
    const targetCluster = overrideCluster !== undefined ? overrideCluster : selectedCluster;

    const safeFacilities = Array.isArray(selectedFacilities) ? selectedFacilities : [];
    const safePropertyTypes = Array.isArray(selectedPropertyTypes) ? selectedPropertyTypes : [];
    const safeBookingOptions = Array.isArray(selectedBookingOptions) ? selectedBookingOptions : [];
    const searchTerm = normalizeText(propertySearchTerm);

    let filteredProperties = propertiesArray.filter((property) => {
      if (property.propertystatus !== 'Available') return false;
        if (searchTerm) {
    const searchableText = normalizeText(`
      ${property.propertyname || ''}
      ${property.propertyaddress || ''}
      ${property.clustername || ''}
      ${property.categoryname || ''}
    `);

    if (!searchableText.includes(searchTerm)) return false;
  }

      const propertyPrice = getPropertyFilterPrice(property);

      if (propertyPrice < priceRange.min || propertyPrice > priceRange.max) return false;

      if (Number(property.propertyguestpaxno || 0) < totalGuests) return false;

      if (targetCluster && property.clustername !== targetCluster) return false;

      const exactCategory = String(property.categoryname || '').trim();

if (propertyCategory !== 'All' && exactCategory !== propertyCategory) {
  return false;
}

      if (safePropertyTypes.length > 0) {
  const matchedType = safePropertyTypes.includes(exactCategory);

  if (!matchedType) return false;
}

      const propertyFacilities = getPropertyFacilities(property);

      if (safeFacilities.length > 0) {
        for (const facility of safeFacilities) {
          if (!propertyFacilities.includes(facility)) return false;
        }
      }

      const propertyBookingOptions = getPropertyBookingOptions(property);

      if (safeBookingOptions.length > 0) {
        for (const option of safeBookingOptions) {
          if (!propertyBookingOptions.includes(option)) return false;
        }
      }

      return true;
    });

    if (sortOrder === 'asc') {
      filteredProperties.sort(
        (a, b) => getPropertyFilterPrice(a) - getPropertyFilterPrice(b)
      );
    } else if (sortOrder === 'desc') {
      filteredProperties.sort(
        (a, b) => getPropertyFilterPrice(b) - getPropertyFilterPrice(a)
      );
    } else {
      filteredProperties.sort((a, b) => b.propertyid - a.propertyid);
    }

    return filteredProperties;
  };

const handleCheckAvailability = async (e, overrideCluster = undefined) => {
  if (e) e.stopPropagation();

  try {
  const fetchedProps = fetchedProperties || await queryClient.fetchQuery({
  queryKey: PRODUCT_QUERY_KEY,
  queryFn: fetchProduct,
  staleTime: 60 * 1000,
});
    const safePropsArray = Array.isArray(fetchedProps)
      ? fetchedProps
      : (fetchedProps.data || fetchedProps.properties || []);

    const availableProperties = applyProductFilters(safePropsArray, overrideCluster);

    if (!bookingData.checkIn || !bookingData.checkOut) {
      setAllProperties(availableProperties);
      setPage(1);
      setShowFilters(false);
      setHasSearchedWithDates(false);
      setActiveTab(null);

      displayToast('info', 'Filters applied. Select dates to view accurate booking prices.');
      return;
    }

    if (
      bookingData.checkIn !== lastSearchDates.checkIn ||
      bookingData.checkOut !== lastSearchDates.checkOut
    ) {
      setDynamicPrices({});
      setIsDateOverlapping({});
      setLastSearchDates({
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut
      });
    }

    setAllProperties(availableProperties);
    setPage(1);
    setShowFilters(false);
    setHasSearchedWithDates(true);
    setActiveTab(null);

  } catch (error) {
    console.error('Error filtering properties:', error);
    displayToast('error', 'Failed to filter properties');
  }
};

  useEffect(() => {
    if (!fetchedProperties) return;

    if (hasSearchedWithDates && bookingData.checkIn && bookingData.checkOut) {
      handleCheckAvailability();
      return;
    }

    const propertiesArray = Array.isArray(fetchedProperties)
      ? fetchedProperties
      : (fetchedProperties.data || fetchedProperties.properties || []);

    const filteredProperties = applyProductFilters(propertiesArray);

    setAllProperties(filteredProperties);
    setPage(1);

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  propertyCategory,
  propertySearchTerm,
  selectedCluster,
  fetchedProperties,
  sortOrder,
  priceRange,
  selectedFacilities,
  selectedPropertyTypes,
  selectedBookingOptions
]);

  const openCalendarAndScroll = () => {
    setCalendarSelecting('checkin');
    setActiveTab('checkin');

    setTimeout(() => {
      searchShellRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 80);
  };

  const handleTabClick = (tab) => {
    let nextTab = tab;

    if (tab === 'checkin') {
      setCalendarSelecting('checkin');
    }

    if (tab === 'checkout') {
      if (!bookingData.checkIn) {
        displayToast('error', 'Please select check-in date first.');
        setCalendarSelecting('checkin');
        nextTab = 'checkin';
      } else {
        setCalendarSelecting('checkout');
      }
    }

    setActiveTab((currentTab) => (currentTab === nextTab ? null : nextTab));
  };

  const formatDisplayDate = (value) => {
    if (!value) return 'dd/mm/yyyy';

    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return value;

    return `${day}/${month}/${year}`;
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
    const width = isMobile ? '92%' : isDualCalendar ? 580 : Math.max(280, ref.offsetWidth);
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
      padding: isDualCalendar ? '0' : '18px'
    };
  };

  const addOneDay = (dateValue) => {
    if (!dateValue) return '';

    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';

    date.setDate(date.getDate() + 1);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const ClusterSelector = ({ selectedCluster, setSelectedCluster, clusters, closeTab }) => {
    return (
      <div className="product-destination-grid">
        <button
          type="button"
          className={`product-destination-btn ${!selectedCluster ? 'selected' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedCluster('');
            if (closeTab) closeTab();
          }}
        >
          All Areas
        </button>

        {clusters.map((cluster) => (
          <button
            type="button"
            key={cluster}
            className={`product-destination-btn ${selectedCluster === cluster ? 'selected' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCluster(cluster);
              if (closeTab) closeTab();
            }}
          >
            {cluster}
          </button>
        ))}
      </div>
    );
  };

  const handleTopTypeFilter = (type) => {
  setPropertyCategory(type);
  setSelectedPropertyTypes([]); // clear property type selected inside Filters
  setPage(1);

  if (hasSearchedWithDates) {
    setDynamicPrices({});
    setIsDateOverlapping({});
  }
};

  const renderSearchSection = () => {
    return (
      <section className="product-search-section">
        <div
          ref={searchShellRef}
          className="home-search-shell product-home-search-shell"
        >
          <div className="flex w-full md:w-auto flex-1 product-home-search-fields">
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
                <span>
                  {bookingData.checkIn ? formatDisplayDate(bookingData.checkIn) : 'dd/mm/yyyy'}
                </span>
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
                <span>
                  {bookingData.checkOut ? formatDisplayDate(bookingData.checkOut) : 'dd/mm/yyyy'}
                </span>
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
            onClick={(e) => {
              e.stopPropagation();
              handleCheckAvailability(e);
            }}
            className="home-search-button hoverable"
            aria-label="Search rooms"
          >
            <FaSearch />
          </button>

          {activeTab && (
            <div
              className={`home-expanded-panel ${activeTab}-panel`}
              style={getPanelStyle()}
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {activeTab === 'location' && (
                <div>
                  <h3 style={{ marginBottom: '10px', color: '#493829', fontWeight: 700 }}>
                    Popular destinations
                  </h3>

                  <ClusterSelector
                    selectedCluster={selectedCluster}
                    setSelectedCluster={setSelectedCluster}
                    clusters={clusters}
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

                  <div className="product-home-guest-row">
                    <div>
                      <p className="product-home-guest-title">Adults</p>
                      <p className="product-home-guest-subtitle">Ages 13+</p>
                    </div>

                    <div className="product-home-counter">
                      <button
                        type="button"
                        onClick={() =>
                          setBookingData((prev) => ({
                            ...prev,
                            adults: Math.max(1, prev.adults - 1)
                          }))
                        }
                      >
                        -
                      </button>

                      <span>{bookingData.adults}</span>

                      <button
                        type="button"
                        onClick={() =>
                          setBookingData((prev) => ({
                            ...prev,
                            adults: prev.adults + 1
                          }))
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="product-home-guest-row last">
                    <div>
                      <p className="product-home-guest-title">Children</p>
                      <p className="product-home-guest-subtitle">Ages 2-12</p>
                    </div>

                    <div className="product-home-counter">
                      <button
                        type="button"
                        onClick={() =>
                          setBookingData((prev) => ({
                            ...prev,
                            children: Math.max(0, prev.children - 1)
                          }))
                        }
                      >
                        -
                      </button>

                      <span>{bookingData.children}</span>

                      <button
                        type="button"
                        onClick={() =>
                          setBookingData((prev) => ({
                            ...prev,
                            children: prev.children + 1
                          }))
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    );
  };

  const SkeletonPropertyCard = () => {
    return (
      <div className="tour-property-item skeleton-item">
        <div className="tour-property-image-box skeleton-image-box">
          <div className="skeleton-pulse"></div>
        </div>
        <div className="tour-property-info">
          <div className="property-location skeleton-location">
            <div className="skeleton-pulse skeleton-title"></div>
            <div className="tour-property-rating skeleton-rating">
              <div className="skeleton-pulse skeleton-rating-pill"></div>
            </div>
          </div>
          <div className="skeleton-pulse skeleton-cluster"></div>
          <div className="property-details-row">
            <div className="property-price skeleton-price">
              <div className="skeleton-pulse skeleton-price-amount"></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

const safeProperties = useMemo(() => {
  return Array.isArray(allProperties) ? allProperties : [];
}, [allProperties]);

// Hide sold-out properties BEFORE pagination
const visibleProperties = useMemo(() => {
  if (!hasSearchedWithDates) return safeProperties;

  return safeProperties.filter(
    (property) => !isDateOverlapping[property.propertyid]?.soldOut
  );
}, [safeProperties, hasSearchedWithDates, isDateOverlapping]);

const totalPages = useMemo(() => {
  return Math.ceil(visibleProperties.length / itemsPerPage);
}, [visibleProperties.length]);

const currentProperties = useMemo(() => {
  return visibleProperties.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
}, [visibleProperties, page]);

  useEffect(() => {
    const fetchPricesAndAvailabilityForPage = async () => {
if (!hasSearchedWithDates || safeProperties.length === 0) return;
      const newPrices = { ...dynamicPrices };
      const newOverlaps = { ...isDateOverlapping };

     const sourceProperties = safeProperties;

const propsToFetch = sourceProperties.filter(
  (prop) => !newPrices[prop.propertyid] || !newOverlaps[prop.propertyid]
);

      if (propsToFetch.length === 0) return;

      setIsCalculatingPrices(true);

      await Promise.all(propsToFetch.map(async (prop) => {
        if (!newPrices[prop.propertyid]) {
          try {
            const lowestBaseRate = getLowestPropertyRate(prop);
            const nights = getNights(bookingData.checkIn, bookingData.checkOut);

            let averageNightly = lowestBaseRate;

            try {
              const res = await calculateBookingPrice(
                bookingData.checkIn,
                bookingData.checkOut,
                lowestBaseRate,
                prop.propertyid
              );

              const totalPrice = toNumber(
                res?.totalPrice ?? res?.total_price ?? res?.total ?? res?.price,
                lowestBaseRate * nights
              );

              const totalNights = toNumber(
                res?.totalNights ?? res?.total_nights ?? res?.nights,
                nights
              );

              averageNightly =
                totalNights > 0
                  ? totalPrice / totalNights
                  : lowestBaseRate;
            } catch (error) {
              console.error('Failed to calculate dynamic price for', prop.propertyid, error);
              averageNightly = lowestBaseRate;
            }

            averageNightly = Number.isFinite(averageNightly) && averageNightly > 0
              ? averageNightly
              : lowestBaseRate;

            newPrices[prop.propertyid] = {
              price: averageNightly,
              originalBase: lowestBaseRate,
              isDiscounted: averageNightly < lowestBaseRate,
              isPeak: averageNightly > lowestBaseRate,
              discountPercent:
                averageNightly < lowestBaseRate && lowestBaseRate > 0
                  ? Math.round(((lowestBaseRate - averageNightly) / lowestBaseRate) * 100)
                  : 0,
            };

          } catch (e) {
            console.error("Failed to fetch dynamic price for", prop.propertyid);
            const fallbackRate = getLowestPropertyRate(prop);

            newPrices[prop.propertyid] = {
              price: fallbackRate,
              originalBase: fallbackRate,
              isDiscounted: false,
              isPeak: false,
              discountPercent: 0,
            };
          }
        }

        if (!newOverlaps[prop.propertyid]) {
          try {
            const overlapData = await checkDateOverlap(
              prop.propertyid,
              bookingData.checkIn,
              bookingData.checkOut
            );

            if (overlapData?.isBlackout) {
              newOverlaps[prop.propertyid] = {
                soldOut: true,
                lowStock: false,
                roomsLeft: 0
              };
            } else {
              const availabilityResult = await checkPropertyAllRoomsSoldOut(
                prop,
                bookingData.checkIn,
                bookingData.checkOut
              );

              newOverlaps[prop.propertyid] = {
                soldOut: availabilityResult.soldOut,
                lowStock: availabilityResult.lowStock,
                roomsLeft: availabilityResult.roomsLeft,
                roomResults: availabilityResult.roomResults || []
              };
            }
          } catch (err) {
            console.error('Failed to check room-level stock for product page:', err);

            newOverlaps[prop.propertyid] = {
              soldOut: false,
              lowStock: false,
              roomsLeft: null
            };
          }
        }
      }));

  

      setDynamicPrices(newPrices);
      setIsDateOverlapping(newOverlaps);
      setIsCalculatingPrices(false);
    };

    fetchPricesAndAvailabilityForPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [safeProperties, hasSearchedWithDates, bookingData.checkIn, bookingData.checkOut]);

  const initializedFromState = useRef(false);

  useEffect(() => {
    if (initializedFromState.current) return;

    const searchDates = location.state?.searchDates;

    if (searchDates && searchDates.checkIn && searchDates.checkOut && fetchedProperties) {
      initializedFromState.current = true;

      setBookingData((prev) => ({
        ...prev,
        checkIn: searchDates.checkIn,
        checkOut: searchDates.checkOut,
        adults: searchDates.adults || 1,
        children: searchDates.children || 0,
      }));

      setSelectedCluster(location.state?.filterRegion || '');
      setShouldRestoreSearch(true);
    }
  }, [location.state, fetchedProperties]);

  useEffect(() => {
    if (
      !shouldRestoreSearch ||
      !bookingData.checkIn ||
      !bookingData.checkOut ||
      !fetchedProperties
    ) {
      return;
    }

    const restoreCluster = location.state?.filterRegion || selectedCluster || '';

    setShouldRestoreSearch(false);

    handleCheckAvailability(null, restoreCluster);
  }, [
    shouldRestoreSearch,
    bookingData.checkIn,
    bookingData.checkOut,
    fetchedProperties,
    location.state,
    selectedCluster
  ]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
  };

  const safeSelectedFacilities = Array.isArray(selectedFacilities) ? selectedFacilities : [];
  const safeSelectedPropertyTypes = Array.isArray(selectedPropertyTypes) ? selectedPropertyTypes : [];
  const safeSelectedBookingOptions = Array.isArray(selectedBookingOptions) ? selectedBookingOptions : [];

  return (
    <div>
      <div className="Product_Main_Container">
        <AuthProvider>
          {!showFilters && <Navbar />}
         

          <div className="property-container_for_product">

            {renderSearchSection()}

 <div className="header-container" ref={listHeaderRef}>
  <div className="product-header-title-block">
    <h2>Available Properties</h2>
    <p className="product-header-subtitle">
      Find your preferred stay by name or destination.
    </p>
  </div>

  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
  

    {/* Category pill tabs — horizontally scrollable on mobile */}
    <div className="category-pill-group">
      {['All', 'Hotel', 'Homestay', 'Kampungstay', 'Inn'].map(type => (
        <button
          key={type}
          className={`category-pill ${propertyCategory === type ? 'active' : ''}`}
          onClick={() => handleTopTypeFilter(type)}
        >
          {type === 'All' ? 'All Types' : type}
        </button>
      ))}
    </div>

    {/* Sorting / Filter component — unchanged */}
    <Sorting
      showFilters={showFilters}
      setShowFilters={setShowFilters}
      priceRange={priceRange}
      setPriceRange={setPriceRange}
      sortOrder={sortOrder}
      setSortOrder={setSortOrder}
      selectedFacilities={safeSelectedFacilities}
      setSelectedFacilities={setSelectedFacilities}
      selectedPropertyTypes={safeSelectedPropertyTypes}
      setSelectedPropertyTypes={setSelectedPropertyTypes}
      selectedBookingOptions={safeSelectedBookingOptions}
      setSelectedBookingOptions={setSelectedBookingOptions}
      handleCheckAvailability={handleCheckAvailability}
    />
  </div>
</div>

<div className="product-name-search-wrap">
  <div className="product-name-search-box">
    <FaSearch className="product-name-search-icon" />

    <input
      type="text"
      value={propertySearchTerm}
      onChange={(e) => {
        setPropertySearchTerm(e.target.value);
        setPage(1);
      }}
      placeholder="Search hotel or stay name..."
      className="product-name-search-input"
    />

    {propertySearchTerm && (
      <button
        type="button"
        className="product-name-search-clear"
        onClick={() => {
          setPropertySearchTerm('');
          setPage(1);
        }}
      >
        Clear
      </button>
    )}
  </div>
</div>

            {isLoading ? (
              <div className="scrollable-container_for_product">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
                  <SkeletonPropertyCard key={`skeleton-${index}`} />
                ))}
              </div>
            ) : !hasSearchedWithDates ? (
              <div className="scrollable-container_for_product">
                {currentProperties.length > 0 ? (
                  currentProperties.map((property) => (
                    <div
                      className="tour-property-item"
                      key={property.propertyid}
                      onClick={() => handleViewDetails(property)}
                      style={{
                        position: 'relative',
                        cursor: 'pointer'
                      }}
                    >
                      <div className="tour-property-image-box">
                        {getSafePropertyImages(property).length > 0 ? (
                         <ImageSlider
                          images={getSafePropertyImages(property)}
                          onClick={(e) => { e.stopPropagation(); }}
                        />
                        ) : (
                          <p>No images available</p>
                        )}
                      </div>
                      <div className="tour-property-info" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="property-location">
                          <h4>{property.propertyaddress}</h4>
                          <div className="tour-property-rating">
                            {(() => {
                              const reviewDisplay = getPropertyReviewDisplay(property);

                              return reviewDisplay.hasReviews ? (
                                <>
                                  <span className="rating-number">
                                    {reviewDisplay.ratingText}
                                  </span>
                                  <FaStar />
                                </>
                              ) : (
                                <span className="no-reviews">No reviews</span>
                              );
                            })()}
                          </div>
                        </div>
                        {/* ── Property Type Badge ── */}
                          <PropertyTypeBadge categoryName={property.categoryname} />
                        <span className="property-cluster">{property.clustername}</span>

           <div className="property-details-row" style={{ marginTop: 'auto', alignItems: 'flex-end' }}>
  <div className="property-price price-select-dates-cta">
    <span className="price-select-dates-label">From per night</span>
    <button
      type="button"
      className="price-select-dates-btn"
      onClick={(e) => {
        e.stopPropagation();
        openCalendarAndScroll();
      }}
    >
      <CiCalendarDate />
      Select dates for price
    </button>
    <span className="price-select-dates-hint">Pick dates to unlock pricing</span>
  </div>
</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#666', background: '#f8fafc', borderRadius: '12px' }}>
                    <h3>No properties match your filter</h3>
                    <p>Try clearing your location or category filters to see more results.</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="scrollable-container_for_product">
{currentProperties.length > 0 ? (
  currentProperties.map((property, index) => {
                      const pricingInfo = dynamicPrices[property.propertyid];
                      const isHotel = ['Hotel', 'Resort', 'Inn', 'Hostel'].includes(property.categoryname);

                      const fallbackRate = getLowestPropertyRate(property);
                      const dynPrice = pricingInfo ? toNumber(pricingInfo.price, fallbackRate) : fallbackRate;
                      const basePrice = pricingInfo ? toNumber(pricingInfo.originalBase, fallbackRate) : fallbackRate;
                      const isDiscounted = pricingInfo ? pricingInfo.isDiscounted : false;
                      const isPeak = pricingInfo ? pricingInfo.isPeak : false;
                      const discountPercent = pricingInfo ? pricingInfo.discountPercent : 0;

                      const availability = isDateOverlapping[property.propertyid];
                      const isAvailabilityReady = !!availability;

                      const isSoldOut = hasSearchedWithDates && isAvailabilityReady
                        ? availability.soldOut
                        : false;

                      const isLowStock = hasSearchedWithDates && isAvailabilityReady
                        ? availability.lowStock
                        : false;

                      return (
                        <div
                          className={`tour-property-item ${isSoldOut ? 'sold-out-card' : ''}`}
                          key={property.propertyid}
                          onClick={() => {
                          if (isSoldOut) return;
                          handleViewDetails(property);
                        }}
                          style={{
                            position: 'relative',
                            opacity: isSoldOut ? 0.6 : 1,
                            filter: isSoldOut ? 'grayscale(30%)' : 'none',
                            cursor: isSoldOut ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isDiscounted && !isSoldOut && (
                            <div style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: '#e12d2d', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', zIndex: 10 }}>
                              Limited Time Offer
                            </div>
                          )}
                          {isPeak && !isSoldOut && (
                            <div style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: '#CC8C18', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', zIndex: 10 }}>
                              High Demand
                            </div>
                          )}

                          {isLowStock && !isSoldOut && (
                            <div style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#e12d2d', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MdOutlineLocalFireDepartment size={14} /> Only 1 room left!
                            </div>
                          )}

                          <div className="tour-property-image-box">
                            {getSafePropertyImages(property).length > 0 ? (
                           <ImageSlider
                            images={getSafePropertyImages(property)}
                            onClick={(e) => { e.stopPropagation(); }}
                          />
                            ) : (
                              <p>No images available</p>
                            )}
                          </div>
                          <div className="tour-property-info" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div className="property-location">
                              <h4>{property.propertyaddress}</h4>
                              <div className="tour-property-rating">
                                {(() => {
                                  const reviewDisplay = getPropertyReviewDisplay(property);

                                  return reviewDisplay.hasReviews ? (
                                    <>
                                      <span className="rating-number">
                                        {reviewDisplay.ratingText}
                                      </span>
                                      <FaStar />
                                    </>
                                  ) : (
                                    <span className="no-reviews">No reviews</span>
                                  );
                                })()}
                              </div>
                            </div>
                            {/* ── Property Type Badge ── */}
                            <PropertyTypeBadge categoryName={property.categoryname} />
                            <span className="property-cluster">{property.clustername}</span>

                            <div className="property-details-row" style={{ marginTop: 'auto', alignItems: 'flex-end' }}>
                              <div className="property-price" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '100%' }}>
                                {isCalculatingPrices && !dynamicPrices[property.propertyid] ? (
                                  <span style={{ fontSize: '0.9rem', color: '#666' }}>Calculating...</span>
                                ) : (
                                  <>
                                   <span style={{ fontSize: '11px', color: '#717171', marginBottom: '2px' }}>
                                  Starts from (per night)
                                </span>

                                    {isDiscounted ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ textDecoration: 'line-through', color: '#717171', fontSize: '14px' }}>RM {basePrice.toFixed(2)}</span>
                                        <span style={{ color: '#e12d2d', fontWeight: 'bold', fontSize: '14px' }}>-{discountPercent}%</span>
                                      </div>
                                    ) : isPeak ? (
                                      <span style={{ color: '#CC8C18', fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>📈 Price has increased</span>
                                    ) : null}

                                    <div>
                                      <span
                                        className="price-amount"
                                        style={{
                                          fontSize: '22px',
                                          fontWeight: 'bold',
                                          color: '#333'
                                        }}
                                      >
                                        {dynPrice > 0 ? `RM ${dynPrice.toFixed(2)}` : 'Select dates for price'}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="no-properties-message">No properties available.</p>
                  )}
                </div>
              </>
            )}

            {totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="page-btn"
                >
                  Previous
                </button>

                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    className={`page-btn ${page === i + 1 ? 'active' : ''}`}
                    onClick={() => handlePageChange(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="page-btn"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {showToast && <Toast type={toastType} message={toastMessage} />}
          <Back_To_Top_Button />
          <Footer />

<Suspense fallback={null}>
  <TawkMessenger />
</Suspense>
        </AuthProvider>
      </div>
    </div>
  );
};

export default Product;