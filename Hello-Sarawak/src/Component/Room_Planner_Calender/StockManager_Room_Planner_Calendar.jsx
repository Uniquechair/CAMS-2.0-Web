import React, { useState, useEffect } from 'react';
import { fetchReservation } from '../../../Api/api';
import { useQuery } from '@tanstack/react-query';
import PaginatedTable from '../PaginatedTable/PaginatedTable';
import Status from '../Status/Status';
import Modal from '../Modal/Modal';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { IoMdClose } from "react-icons/io";
import Loader from '../Loader/Loader';
import './StockManager_Room_Planner_Calendar.css';

function StockManagerRoomPlannerCalendar({ highlightBooking, onJumpToTable, blackoutDates = [] }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [viewMode, setViewMode] = useState('month');
  const [currentWeek, setCurrentWeek] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateInputValue, setDateInputValue] = useState('');
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [highlightedBooking, setHighlightedBooking] = useState(null);

  const { data: reservationsData = [], isLoading: reservationsLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      try {
        const reservationData = await fetchReservation();
        if (Array.isArray(reservationData)) {
          return reservationData.map(reservation => {
            const reservationblocktime = new Date(reservation.reservationblocktime).getTime();
            const currentDateTime = Date.now() + 8 * 60 * 60 * 1000;
            if (reservation.reservationstatus === 'Pending' && currentDateTime > reservationblocktime) {
              return { ...reservation, reservationstatus: 'expired' };
            }
            return reservation;
          });
        } else {
          console.error("Invalid data format received:", reservationData);
          return [];
        }
      } catch (error) {
        console.error('Failed to fetch reservation details:', error);
        throw error;
      }
    },
    staleTime: 30 * 60 * 1000,
    refetchInterval: 1000,
  });

  const calendarReservations = Array.isArray(reservationsData)
  ? reservationsData.filter((reservation) => {
      const status = (reservation.reservationstatus || '').toLowerCase().trim();
      return (
        status === 'paid' ||
        status === 'partially paid' ||
        status === 'canceled' ||
        status === 'cancelled' ||
        status === 'expired'
      );
    })
  : [];

  const getBlackoutsForDate = (formattedDate) => {
    if (!Array.isArray(blackoutDates)) return [];
    return blackoutDates.filter(b => {
      if (!b.is_active) return false;
      // The parent component already formats these as YYYY-MM-DD
      const startYmd = typeof b.start_date === 'string' ? b.start_date : '';
      const endYmd = typeof b.end_date === 'string' ? b.end_date : '';
      return formattedDate >= startYmd && formattedDate <= endYmd;
    });
  };

  useEffect(() => { generateCalendarDays(); }, [currentMonth, reservationsData, selectedDay, blackoutDates]);
  useEffect(() => { generateWeekDays(); }, [currentMonth, viewMode, reservationsData, selectedDay, blackoutDates]);

  useEffect(() => {
    const today = new Date();
    setDateInputValue(today.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const datePickerElements = document.querySelectorAll('.date-picker, .date-picker *');
      let clickedInside = false;
      datePickerElements.forEach(element => { if (element.contains(event.target)) clickedInside = true; });
      if (!clickedInside && showDatePicker) setShowDatePicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  useEffect(() => {
    if (showDatePicker) {
      setTimeout(() => {
        const todayElement = document.querySelector('.date-picker-day.today');
        const selectedElement = document.querySelector('.date-picker-day.selected');
        if (selectedElement) selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else if (todayElement) todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [showDatePicker]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const viewModeElements = document.querySelectorAll('.view-mode-dropdown, .view-mode-dropdown *');
      let clickedInside = false;
      viewModeElements.forEach(element => { if (element.contains(event.target)) clickedInside = true; });
      if (!clickedInside && showViewModeDropdown) setShowViewModeDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showViewModeDropdown]);

  useEffect(() => {
    if (highlightBooking?.checkin && highlightBooking?.checkout) {
      setHighlightedBooking(highlightBooking);
      const checkInDate = new Date(highlightBooking.checkin);
      setCurrentMonth(checkInDate);
      setSelectedDay(checkInDate);
      setViewMode('month');
    }
  }, [highlightBooking]);

  const formatDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysFromPrevMonth = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - daysFromPrevMonth);

    const days = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const formattedDate = formatDateString(currentDate);
      const dayReservations = Array.isArray(calendarReservations)
        ? calendarReservations.filter(reservation => {
            if (!reservation.checkindatetime || !reservation.checkoutdatetime) return false;
            const checkInFormatted = formatDateString(new Date(reservation.checkindatetime));
            const checkOutFormatted = formatDateString(new Date(reservation.checkoutdatetime));
            return formattedDate >= checkInFormatted && formattedDate <= checkOutFormatted;
          })
        : [];

      const blackoutsForDay = getBlackoutsForDate(formattedDate);
      const hasReservations = dayReservations.length > 0;
      const isBlackedOut = blackoutsForDay.length > 0;
      const statusCounts = getReservationStatusCounts(dayReservations);
      const isCurrentMonth = currentDate.getMonth() === month;
      const todayFlag = isToday(currentDate);
      const isHighlightedRange = highlightedBooking
        ? formattedDate >= formatDateString(new Date(highlightedBooking.checkin)) &&
          formattedDate <= formatDateString(new Date(highlightedBooking.checkout))
        : false;

      days.push({
        date: new Date(currentDate),
        formatted: formattedDate,
        isCurrentMonth,
        hasReservations,
        isBlackedOut,
        blackouts: blackoutsForDay,
        isToday: todayFlag,
        displayDate: currentDate.getDate(),
        reservations: dayReservations,
        statusCounts,
        isHighlightedRange,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    setCalendarDays(days);
  };

  const getReservationStatusCounts = (reservations) => {
    if (!Array.isArray(reservations) || reservations.length === 0) return {};

    const counts = {
      Paid: 0,
      'Partially Paid': 0,
      cancelled: 0,
      expired: 0,
    };

    reservations.forEach((reservation) => {
      const status = (reservation.reservationstatus || '').toLowerCase().trim();

      if (status === 'paid') {
        counts.Paid++;
      } else if (status === 'partially paid') {
        counts['Partially Paid']++;
      } else if (status === 'expired') {
        counts.expired++;
      } else if (status === 'cancelled' || status === 'canceled') {
  counts.cancelled++;
      }
    });

    return counts;
  };

  const generateWeekDays = () => {
    if (viewMode !== 'week') return;
    const currentDate = new Date(currentMonth);
    const dayOfWeek = currentDate.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentDate.setDate(currentDate.getDate() - diff);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(currentDate);
      dayDate.setDate(currentDate.getDate() + i);
      const formattedDate = formatDateString(dayDate);
      const dayReservations = Array.isArray(calendarReservations)
        ? calendarReservations.filter(reservation => {
            if (!reservation.checkindatetime || !reservation.checkoutdatetime) return false;
            const checkInFormatted = formatDateString(new Date(reservation.checkindatetime));
            const checkOutFormatted = formatDateString(new Date(reservation.checkoutdatetime));
            return formattedDate >= checkInFormatted && formattedDate <= checkOutFormatted;
          })
        : [];

      const blackoutsForDay = getBlackoutsForDate(formattedDate);

      weekDays.push({
        date: dayDate,
        formatted: formattedDate,
        isToday: isToday(dayDate),
        hasReservations: dayReservations.length > 0,
        isBlackedOut: blackoutsForDay.length > 0,
        blackouts: blackoutsForDay,
        displayDate: dayDate.getDate(),
        reservations: dayReservations,
        statusCounts: getReservationStatusCounts(dayReservations),
      });
    }
    setCurrentWeek(weekDays);
  };

  const isToday = (date) => {
    if (selectedDay) {
      return date.getDate() === selectedDay.getDate() &&
             date.getMonth() === selectedDay.getMonth() &&
             date.getFullYear() === selectedDay.getFullYear();
    }
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const goToPrevious = () => {
    setCurrentMonth(prevDate => {
      const newDate = new Date(prevDate);
      if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
      else newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const goToNext = () => {
    setCurrentMonth(prevDate => {
      const newDate = new Date(prevDate);
      if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
      else newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  const goToToday = () => { setCurrentMonth(new Date()); setSelectedDay(null); };
  const toggleViewMode = (mode) => { if (mode !== viewMode) setViewMode(mode); setShowViewModeDropdown(false); };
  const toggleViewModeDropdown = () => setShowViewModeDropdown(!showViewModeDropdown);

  const handleDateClick = (clickedDate) => {
    const dateObj = clickedDate instanceof Date ? clickedDate : new Date(clickedDate);
    setSelectedDate(formatDateString(dateObj));
    setShowOverlay(true);
    setSelectedDay(new Date(dateObj));
  };

  const closeOverlay = () => setShowOverlay(false);

  const getReservationsForSelectedDate = () => {
    if (!selectedDate || !Array.isArray(calendarReservations)) return [];
    return calendarReservations.filter(reservation => {
      if (!reservation.checkindatetime || !reservation.checkoutdatetime) return false;
      const formattedCheckInDate = formatDateString(new Date(reservation.checkindatetime));
      const formattedCheckOutDate = formatDateString(new Date(reservation.checkoutdatetime));
      return selectedDate >= formattedCheckInDate && selectedDate <= formattedCheckOutDate;
    });
  };

  const getBlackoutsForSelectedDate = () => {
    if (!selectedDate) return [];
    return getBlackoutsForDate(selectedDate);
  };

const getSafeImageArray = (images) => {
  if (Array.isArray(images)) {
    return images.filter(Boolean);
  }

  if (typeof images === 'string' && images.trim()) {
    const value = images.trim();

    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }

      if (typeof parsed === 'string') {
        return [parsed];
      }
    } catch (error) {
      // If it is not JSON, it may be a single URL/base64 or comma-separated images
      return value
        .split(',')
        .map((img) => img.trim())
        .filter(Boolean);
    }

    return [value];
  }

  return [];
};

const getSafeImageSrc = (img) => {
  if (!img) return '';

  const value = String(img).trim();

  // Firebase / online URL
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  // Already complete base64 data URL
  if (value.startsWith('data:image')) {
    return value;
  }

  // Local upload path
  if (value.startsWith('/uploads') || value.startsWith('/images')) {
    return `${window.location.origin}${value}`;
  }

  // Old database base64 image
  return `data:image/jpeg;base64,${value}`;
};

  const handleViewReservation = (reservation) => {
    setSelectedReservation({
      reservationid: reservation.reservationid || 'N/A',
      propertyaddress: reservation.propertyaddress || 'N/A',
      checkindatetime: reservation.checkindatetime || 'N/A',
      checkoutdatetime: reservation.checkoutdatetime || 'N/A',
      reservationblocktime: reservation.reservationblocktime || 'N/A',
      request: reservation.request || 'N/A',
      totalprice: reservation.totalprice || 'N/A',
      rcid: reservation.rcid || 'N/A',
      reservationstatus: reservation.reservationstatus || 'N/A',
      userid: reservation.userid || 'N/A',
      images: getSafeImageArray(reservation.propertyimage),
    });
  };

  const columns = [
    { header: 'RID', accessor: 'reservationid' },
    {
  header: 'Image',
  accessor: 'propertyimage',
  render: (reservation) => {
    const images = getSafeImageArray(reservation.propertyimage);
    const firstImage = images[0];

    return firstImage ? (
      <img
        src={getSafeImageSrc(firstImage)}
        alt={`Property ${reservation.propertyaddress || ''}`}
        style={{
          width: 80,
          height: 80,
          objectFit: 'cover',
          borderRadius: '8px'
        }}
      />
    ) : (
      <span>No Image</span>
    );
  },
},
    { header: 'Property Name', accessor: 'propertyaddress' },
    { header: 'Total Price', accessor: 'totalprice' },
    {
      header: 'Status',
      accessor: 'reservationstatus',
      render: (reservation) => <Status value={reservation.reservationstatus} />,
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (reservation) => (
        <button className="pending-view-button" onClick={() => { onJumpToTable?.(reservation); closeOverlay(); }}>
          Jump to Table
        </button>
      ),
    },
  ];

  const calendarWeeks = () => {
    const weeks = [];
    for (let i = 0; i < 6; i++) weeks.push(calendarDays.slice(i * 7, i * 7 + 7));
    return weeks;
  };

  const formatMonthYear = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getWeekViewTitle = () => {
    if (!currentWeek || currentWeek.length === 0) return '';
    const firstDay = currentWeek[0].date;
    const lastDay = currentWeek[currentWeek.length - 1].date;
    if (firstDay.getMonth() !== lastDay.getMonth()) {
      return `${firstDay.toLocaleDateString('en-US', { month: 'long' })} – ${lastDay.toLocaleDateString('en-US', { month: 'long' })} ${lastDay.getFullYear()}`;
    }
    return formatMonthYear(firstDay);
  };

  const generateHours = () => {
    const hours = [];
    for (let i = 1; i <= 24; i++) hours.push(i <= 12 ? `${i} AM` : `${i - 12} PM`);
    return hours;
  };

  const toggleDatePicker = () => {
    setShowDatePicker(!showDatePicker);
    if (!showDatePicker) {
      const today = new Date();
      setDatePickerMonth(new Date(today));
      setDateInputValue(today.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }));
    }
  };

  const handleDateSelection = (date) => {
    const selectedDate = new Date(date);
    setCurrentMonth(selectedDate);
    setSelectedDay(selectedDate);
    setDateInputValue(selectedDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }));
    setShowDatePicker(false);
  };

  const handleDateInputChange = (e) => setDateInputValue(e.target.value);

  const handleDateInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      const parsedDate = new Date(e.target.value);
      if (!isNaN(parsedDate.getTime())) { setCurrentMonth(parsedDate); setShowDatePicker(false); }
    }
  };

  const goToPrevDatePickerMonth = () => setDatePickerMonth(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; });
  const goToNextDatePickerMonth = () => setDatePickerMonth(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; });

  const generateDatePickerDays = () => {
    const year = datePickerMonth.getFullYear();
    const month = datePickerMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    let daysFromPrevMonth = firstDay.getDay() - 1;
    if (daysFromPrevMonth < 0) daysFromPrevMonth = 6;
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - daysFromPrevMonth);
    const days = [];
    const currentDate = new Date(startDate);
    const selectedDateParsed = new Date(dateInputValue);
    const isSelectedDateValid = !isNaN(selectedDateParsed.getTime());

    for (let i = 0; i < 42; i++) {
      const todayFlag = isToday(currentDate);
      const isSelected = isSelectedDateValid
        ? currentDate.getDate() === selectedDateParsed.getDate() &&
          currentDate.getMonth() === selectedDateParsed.getMonth() &&
          currentDate.getFullYear() === selectedDateParsed.getFullYear()
        : todayFlag;

      days.push({
        date: new Date(currentDate),
        dayOfMonth: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: todayFlag,
        isSelected,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return days;
  };

  const datePickerWeeks = () => {
    const days = generateDatePickerDays();
    const weeks = [];
    for (let i = 0; i < 6; i++) weeks.push(days.slice(i * 7, i * 7 + 7));
    return weeks;
  };

  const activeBlackoutsThisMonth = Array.isArray(blackoutDates)
    ? blackoutDates.filter(b => {
        if (!b.is_active) return false;
        const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        // The parent component already formats these as YYYY-MM-DD
        const startYmd = typeof b.start_date === 'string' ? b.start_date : '';
        const endYmd = typeof b.end_date === 'string' ? b.end_date : '';
        return startYmd.startsWith(monthStr) || endYmd.startsWith(monthStr);
      })
    : [];

  return (
    <div className="scheduler-container">
      <div className="scheduler-controls">
        <div className="left-controls">
          <button className="today-button" onClick={goToToday}>Today</button>
          <div className="nav-buttons">
            <button className="scheduler-nav-button" onClick={goToPrevious}><FaChevronLeft /></button>
            <button className="scheduler-nav-button" onClick={goToNext}><FaChevronRight /></button>
          </div>
          <h2 className="scheduler-title">
            {viewMode === 'month' ? formatMonthYear(currentMonth) : getWeekViewTitle()}
          </h2>
        </div>

        <div className="right-controls">
          {/* Blackout indicator */}
          {activeBlackoutsThisMonth.length > 0 && (
            <div className="calendar-blackout-badge" title="Active blackouts this month">
              🚫 {activeBlackoutsThisMonth.length} blackout{activeBlackoutsThisMonth.length !== 1 ? 's' : ''}
            </div>
          )}

          <div className={`view-mode-dropdown ${showViewModeDropdown ? 'active' : ''}`}>
            <button className="view-mode-button" onClick={toggleViewModeDropdown}>
              {viewMode === 'month' ? 'Month' : 'Week'}
            </button>
            {showViewModeDropdown && (
              <div className="view-mode-options">
                <div className={`view-mode-option ${viewMode === 'week' ? 'active' : ''}`} onClick={() => toggleViewMode('week')}>Week</div>
                <div className={`view-mode-option ${viewMode === 'month' ? 'active' : ''}`} onClick={() => toggleViewMode('month')}>Month</div>
              </div>
            )}
          </div>

          <div className="date-picker">
            <span className="date-label">Date</span>
            <div className="date-picker-input-container">
              <input
                type="text"
                className="date-input"
                value={dateInputValue}
                onChange={handleDateInputChange}
                onKeyDown={handleDateInputKeyDown}
                onClick={toggleDatePicker}
                placeholder=""
              />
              <button className="date-dropdown-button" onClick={toggleDatePicker}>
                <span className="date-dropdown-icon">▼</span>
              </button>

              {showDatePicker && (
                <div className="date-picker-dropdown">
                  <div className="date-picker-header">
                    <button className="date-picker-nav-button" onClick={goToPrevDatePickerMonth}>&lt;</button>
                    <div className="date-picker-month-title">
                      {datePickerMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <button className="date-picker-nav-button" onClick={goToNextDatePickerMonth}>&gt;</button>
                  </div>
                  <div className="date-picker-calendar">
                    <div className="date-picker-weekdays">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                        <div key={index} className="date-picker-weekday">{day}</div>
                      ))}
                    </div>
                    <div className="date-picker-days">
                      {datePickerWeeks().map((week, weekIndex) => (
                        <div key={weekIndex} className="date-picker-week">
                          {week.map((day, dayIndex) => (
                            <div
                              key={dayIndex}
                              className={`date-picker-day ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''} ${day.isSelected ? 'selected' : ''}`}
                              onClick={() => handleDateSelection(day.date)}
                            >
                              {day.dayOfMonth}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'month' && (
        <div className="scheduler-calendar">
          <div className="scheduler-days-header">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
              <div key={day} className="scheduler-day-name">{day}</div>
            ))}
          </div>

          <div className="scheduler-grid">
            {calendarWeeks().map((week, weekIndex) => (
              <div key={`week-${weekIndex}`} className="scheduler-week">
                {week.map(day => (
                  <div
                    key={day.formatted}
                    className={`scheduler-cell 
                      ${day.isCurrentMonth ? '' : 'other-month'} 
                      ${day.isToday ? 'today' : ''} 
                      ${day.hasReservations ? 'has-reservations' : ''} 
                      ${day.isHighlightedRange ? 'highlighted-booking' : ''}
                      ${day.isBlackedOut ? 'blacked-out' : ''}`}
                    onClick={() => handleDateClick(day.date)}
                    title={day.isBlackedOut ? `Blocked: ${day.blackouts.map(b => b.property_name).join(', ')}` : ''}
                  >
                    <div className="day-content">
                      <span className="cell-date">{day.displayDate}</span>

                      {/* FEATURE: Blackout indicator with room specific info or multiplier */}
                      {day.isBlackedOut && (
                        <div 
                           className="blackout-indicator" 
                           title={day.blackouts.map(b => `${b.property_name} - ${b.room_name || 'All Rooms'}`).join('\n')}
                           style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold' }}
                        >
                          🚫 
                          {day.blackouts.length > 1 ? (
                            <span style={{ fontSize: '10px' }}>x{day.blackouts.length}</span>
                          ) : (
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60px' }}>
                              {day.blackouts[0].room_name && day.blackouts[0].room_name !== 'All Rooms' ? day.blackouts[0].room_name : 'All'}
                            </span>
                          )}
                        </div>
                      )}

                      {day.hasReservations && (
                        <div className="reservation-status-indicators">
                          {day.statusCounts.Paid > 0 && (
                            <div className="planner-status-dot legend-dot-status-paid" title={`${day.statusCounts.Paid} Paid`}>
                              {day.statusCounts.Paid > 1 && <span className="count-badge">×{day.statusCounts.Paid}</span>}
                            </div>
                          )}
                          {day.statusCounts['Partially Paid'] > 0 && (
                            <div className="planner-status-dot legend-dot-status-partially" title={`${day.statusCounts['Partially Paid']} Partially Paid`}>
                              {day.statusCounts['Partially Paid'] > 1 && <span className="count-badge">×{day.statusCounts['Partially Paid']}</span>}
                            </div>
                          )}
                          {day.statusCounts.cancelled > 0 && (
                            <div className="planner-status-dot legend-dot-status-cancelled" title={`${day.statusCounts.cancelled} Cancelled`}>
                              {day.statusCounts.cancelled > 1 && <span className="count-badge">×{day.statusCounts.cancelled}</span>}
                            </div>
                          )}
                          {day.statusCounts.expired > 0 && (
                            <div className="planner-status-dot legend-dot-status-expired" title={`${day.statusCounts.expired} Expired`}>
                              {day.statusCounts.expired > 1 && <span className="count-badge">×{day.statusCounts.expired}</span>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'week' && (
        <div className="week-view">
          <div className="week-header">
            <div className="time-column-header"></div>
            {currentWeek.map(day => (
              <div
                key={day.formatted}
                className={`day-column-header ${day.isToday ? 'today' : ''} ${day.isBlackedOut ? 'week-blacked-out' : ''}`}
                onClick={() => handleDateClick(day.date)}
              >
                <div className="day-name">{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][day.date.getDay()]}</div>
                <div className={`day-number ${day.isToday ? 'today-circle' : ''}`}>{day.displayDate}</div>
                
                {/* FEATURE: Week view blackout indicator */}
                {day.isBlackedOut && (
                  <div 
                    className="week-blackout-label" 
                    title={day.blackouts.map(b => `${b.property_name} - ${b.room_name || 'All Rooms'}`).join('\n')}
                  >
                    🚫 {day.blackouts.length > 1 ? `x${day.blackouts.length} Blocked` : (day.blackouts[0].room_name === 'All Rooms' || !day.blackouts[0].room_name ? 'All Rooms' : day.blackouts[0].room_name)}
                  </div>
                )}
                
                {day.hasReservations && (
                  <div className="week-status-indicators">
                    {day.statusCounts.Paid > 0 && (
                      <div
                        className="week-planner-status-dot legend-dot-status-paid"
                        title={`${day.statusCounts.Paid} Paid`}
                      ></div>
                    )}
                    {day.statusCounts['Partially Paid'] > 0 && (
                      <div
                        className="week-planner-status-dot legend-dot-status-partially"
                        title={`${day.statusCounts['Partially Paid']} Partially Paid`}
                      ></div>
                    )}
                    {day.statusCounts.cancelled > 0 && (
                      <div
                        className="week-planner-status-dot legend-dot-status-cancelled"
                        title={`${day.statusCounts.cancelled} Cancelled`}
                      ></div>
                    )}
                    {day.statusCounts.expired > 0 && (
                      <div
                        className="week-planner-status-dot legend-dot-status-expired"
                        title={`${day.statusCounts.expired} Expired`}
                      ></div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="week-grid">
            <div className="time-labels">
              {generateHours().map((hour, index) => (
                <div key={index} className="time-label">{hour}</div>
              ))}
            </div>
            <div className="day-columns">
              {currentWeek.map(day => (
                <div
                  key={day.formatted}
                  className={`day-column ${day.isToday ? 'today' : ''} ${day.isBlackedOut ? 'week-day-blacked-out' : ''}`}
                  onClick={() => handleDateClick(day.date)}
                >
                  {generateHours().map((hour, index) => (
                    <div key={index} className="time-slot">
                      {day.reservations.filter(res => {
                        const resDate = new Date(res.checkindatetime);
                        return resDate.getHours() === index;
                      }).map(res => (
                        <div key={res.reservationid} className="reservation-item" onClick={(e) => { e.stopPropagation(); handleViewReservation(res); }}>
                          {res.propertyaddress}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Date Click Overlay */}
      {showOverlay && (
        <div className="calendar-overlay">
          <div className="calendar-overlay-content">
            <div className="calendar-overlay-header">
              <h2>
                {new Date(selectedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </h2>
              <button className="close-button" onClick={closeOverlay}><IoMdClose /></button>
            </div>

            {/* Blackout notice in overlay */}
            {getBlackoutsForSelectedDate().length > 0 && (
              <div className="overlay-blackout-notice">
                <strong>🚫 Blackout Active</strong>
                {getBlackoutsForSelectedDate().map((b, i) => (
                  <div key={i} className="overlay-blackout-row">
                    <span>{b.property_name}</span>
                    {b.room_name && <span> › {b.room_name}</span>}
                    <span className={`overlay-role-tag role-${b.created_by_role}`}>{b.created_by_role}</span>
                    {b.reason && <span className="overlay-blackout-reason">"{b.reason}"</span>}
                  </div>
                ))}
              </div>
            )}

            {reservationsLoading ? (
              <div className="loader-box"><Loader /></div>
            ) : (
              <>
                {getReservationsForSelectedDate().length > 0 ? (
                  <PaginatedTable
                    data={getReservationsForSelectedDate()}
                    columns={columns}
                    rowKey="reservationid"
                    enableCheckbox={false}
                  />
                ) : (
                  <p className="no-reservations-message">No reservations found for this date.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={!!selectedReservation}
        title={'Reservation Details'}
        data={selectedReservation || {}}
        labels={{
          reservationid: "RID", propertyaddress: "Property Name",
          checkindatetime: "Check-In Date Time", checkoutdatetime: "Check-Out Date Time",
          reservationblocktime: "Block Time", request: "Request",
          totalprice: "Total Price", rcid: "RCID",
          reservationstatus: "Status", userid: "UID", images: "Images",
        }}
        onClose={() => setSelectedReservation(null)}
      />

      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-dot legend-dot-status-paid"></div>
          <span className="legend-label">Paid</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot legend-dot-status-partially"></div>
          <span className="legend-label">Partially Paid</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot legend-dot-status-cancelled"></div>
          <span className="legend-label">Cancelled</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot legend-dot-status-expired"></div>
          <span className="legend-label">Expired</span>
        </div>
        <div className="legend-item">
          <div className="blackout-legend-dot"></div>
          <span className="legend-label">Blacked Out</span>
        </div>
      </div>
    </div>
  );
}

export default StockManagerRoomPlannerCalendar;