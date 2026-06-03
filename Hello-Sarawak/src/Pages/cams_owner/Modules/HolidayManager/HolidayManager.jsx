import React, { useState, useEffect } from 'react';
import {
  FiCalendar,
  FiPlus,
  FiTrash2,
  FiUploadCloud,
  FiTrash,
  FiDollarSign,
  FiSave,
  FiInfo
} from 'react-icons/fi';
import Toast from '../../../../Component/Toast/Toast';
import "../../../../Component/MainContent/MainContent.css";
import {
  fetchHolidaysFromApi,
  saveHolidaysToDb,
  fetchHolidaysFromDb,
  saveFestiveToDb,
  fetchFestiveFromDb
} from '../../../../../Api/api';
import './HolidayManager.css';

const HolidayManager = () => {
  const [holidays, setHolidays] = useState([]);
  const [festivePeriods, setFestivePeriods] = useState([]);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' });
  const [newFestive, setNewFestive] = useState({ name: '', start: '', end: '' });

  // Master rate default set to 120 (a 20% increase)
  const [globalRate, setGlobalRate] = useState("120");

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);

  // SMART HELPER: Converts database "1.00" to UI "100", "1.50" to "150", etc.
  const formatPercentage = (val) => {
    if (!val) return "100";

    const num = parseFloat(val);

    if (!Number.isFinite(num)) return "100";

    if (num > 0 && num <= 5) {
      return Math.round(num * 100).toString();
    }

    return num.toString();
  };

  // Safe date normalizer.
  // Important: do not use new Date().toISOString() for holiday dates,
  // because date-only values can shift timezone.
  const normalizeHolidayDate = (date, fallbackYear = new Date().getFullYear()) => {
    if (!date) return '';

    const raw = String(date).trim();

    // Handles: 2026-01-01
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    // Handles: 2026-01-01T00:00:00.000Z
    // Do not parse with new Date() because it may shift the day.
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
      return raw.slice(0, 10);
    }

    // Handles official API format: Jan 01
    const monthMap = {
      Jan: '01',
      Feb: '02',
      Mar: '03',
      Apr: '04',
      May: '05',
      Jun: '06',
      Jul: '07',
      Aug: '08',
      Sep: '09',
      Oct: '10',
      Nov: '11',
      Dec: '12'
    };

    const apiDateMatch = raw.match(/^([A-Za-z]{3})\s+(\d{1,2})$/);

    if (apiDateMatch) {
      const month = monthMap[apiDateMatch[1]];
      const day = String(apiDateMatch[2]).padStart(2, '0');

      if (month) {
        return `${fallbackYear}-${month}-${day}`;
      }
    }

    // Final fallback for other readable date formats.
    const parsed = new Date(raw);

    if (Number.isNaN(parsed.getTime())) return '';

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const buildLocalDate = (date) => {
    const normalizedDate = normalizeHolidayDate(date);

    if (!normalizedDate) return null;

    return new Date(`${normalizedDate}T00:00:00`);
  };

  const formatDisplayDate = (date, options) => {
    const dateObj = buildLocalDate(date);

    if (!dateObj) return '-';

    return dateObj.toLocaleDateString('en-MY', {
      timeZone: 'Asia/Kuching',
      ...options
    });
  };

  // Remove duplicate holidays.
  // Rule: one holiday per date.
  // If API/DB/localStorage contains duplicated dates, only the first one is kept.
  const removeDuplicateHolidays = (holidayList = [], fallbackYear = new Date().getFullYear()) => {
    const seen = new Set();

    return holidayList
      .map((holiday, index) => {
        const normalizedDate = normalizeHolidayDate(holiday.date, fallbackYear);

        return {
          ...holiday,
          id: holiday.id || `${normalizedDate}-${index}`,
          date: normalizedDate,
          name: holiday.name || holiday.holiday_name || holiday.title || 'Public Holiday',
          rate: formatPercentage(holiday.rate || '100'),
          active: holiday.active !== false,
          day_of_week: holiday.day_of_week || '',
          is_mandatory: Boolean(holiday.is_mandatory)
        };
      })
      .filter((holiday) => {
        if (!holiday.date) return false;

        const key = holiday.date;

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // --- FETCH FROM DATABASE ON LOAD ---
  useEffect(() => {
    const loadFromDb = async () => {
      try {
        const dbHolidays = await fetchHolidaysFromDb();

        if (dbHolidays && dbHolidays.length > 0) {
          setHolidays(removeDuplicateHolidays(dbHolidays));
        }
      } catch (err) {
        console.log("Failed to fetch holidays from DB, relying on LocalStorage fallback");

        const savedH = localStorage.getItem('cams_holidays');

        if (savedH) {
          try {
            setHolidays(removeDuplicateHolidays(JSON.parse(savedH)));
          } catch (parseError) {
            console.error("Failed to parse saved holidays:", parseError);
            setHolidays([]);
          }
        }
      }

      try {
        const dbFestive = await fetchFestiveFromDb();

        if (dbFestive && dbFestive.length > 0) {
          setFestivePeriods(
            dbFestive.map(p => ({
              ...p,
              start: normalizeHolidayDate(p.start),
              end: normalizeHolidayDate(p.end),
              rate: formatPercentage(p.rate)
            }))
          );
        }
      } catch (err) {
        console.log("Failed to fetch festive from DB, relying on LocalStorage fallback");

        const savedF = localStorage.getItem('cams_festive');

        if (savedF) {
          try {
            const parsedFestive = JSON.parse(savedF);

            setFestivePeriods(
              parsedFestive.map(p => ({
                ...p,
                start: normalizeHolidayDate(p.start),
                end: normalizeHolidayDate(p.end),
                rate: formatPercentage(p.rate)
              }))
            );
          } catch (parseError) {
            console.error("Failed to parse saved festive periods:", parseError);
            setFestivePeriods([]);
          }
        }
      }
    };

    loadFromDb();
  }, []);

  const displayToast = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  // --- SAVE TO POSTGRESQL DATABASE ---
  const handleSaveToDatabase = async () => {
    setIsSavingDb(true);

    try {
      const cleanedHolidays = removeDuplicateHolidays(holidays);

      const cleanedFestive = festivePeriods.map(p => ({
        ...p,
        start: normalizeHolidayDate(p.start),
        end: normalizeHolidayDate(p.end),
        rate: formatPercentage(p.rate)
      }));

      localStorage.setItem('cams_holidays', JSON.stringify(cleanedHolidays));
      localStorage.setItem('cams_festive', JSON.stringify(cleanedFestive));

      const toMultiplierRate = (rate) => {
        const num = parseFloat(rate);

        if (!Number.isFinite(num) || num <= 0) {
          return 1;
        }

        return num > 5 ? num / 100 : num;
      };

      const safeHolidays = cleanedHolidays.map(h => ({
        ...h,
        date: normalizeHolidayDate(h.date),
        rate: toMultiplierRate(h.rate)
      }));

      const safeFestive = cleanedFestive.map(p => ({
        ...p,
        start: normalizeHolidayDate(p.start),
        end: normalizeHolidayDate(p.end),
        rate: toMultiplierRate(p.rate)
      }));

      await saveHolidaysToDb(safeHolidays);
      await saveFestiveToDb(safeFestive);

      setHolidays(cleanedHolidays);
      setFestivePeriods(cleanedFestive);

      displayToast("Holiday and Festive rates saved permanently!");
    } catch (err) {
      displayToast("Failed to save to database.", "error");
      console.error("Save Error:", err);
    } finally {
      setIsSavingDb(false);
    }
  };

  const toggleHoliday = (id) => {
    setHolidays(holidays =>
      removeDuplicateHolidays(
        holidays.map(h => h.id === id ? { ...h, active: !h.active } : h)
      )
    );
  };

  const updateHolidayRate = (id, rate) => {
    setHolidays(holidays =>
      removeDuplicateHolidays(
        holidays.map(h => h.id === id ? { ...h, rate } : h)
      )
    );
  };

  const updateFestiveRate = (id, rate) => {
    setFestivePeriods(festivePeriods.map(p =>
      p.id === id ? { ...p, rate } : p
    ));
  };

  const applyGlobalRate = () => {
    if (!globalRate) return;

    setHolidays(holidays =>
      removeDuplicateHolidays(
        holidays.map(h => ({ ...h, rate: globalRate }))
      )
    );

    displayToast(`Applied ${globalRate}% rate to all holidays!`);
  };

  const handleAddHoliday = (e) => {
    e.preventDefault();

    if (!newHoliday.name || !newHoliday.date) return;

    const normalizedDate = normalizeHolidayDate(newHoliday.date);

    const alreadyExists = holidays.some(
      (holiday) => normalizeHolidayDate(holiday.date) === normalizedDate
    );

    if (alreadyExists) {
      displayToast("This holiday date already exists.", "error");
      return;
    }

    setHolidays((prev) =>
      removeDuplicateHolidays([
        {
          ...newHoliday,
          date: normalizedDate,
          id: `manual-${normalizedDate}-${Date.now()}`,
          active: true,
          rate: "100"
        },
        ...prev
      ])
    );

    setNewHoliday({ name: '', date: '' });
    displayToast("Holiday added manually!");
  };

  const handleAddFestive = (e) => {
    e.preventDefault();

    if (!newFestive.name || !newFestive.start || !newFestive.end) return;

    const normalizedStart = normalizeHolidayDate(newFestive.start);
    const normalizedEnd = normalizeHolidayDate(newFestive.end);

    if (!normalizedStart || !normalizedEnd) {
      displayToast("Invalid festive date.", "error");
      return;
    }

    if (normalizedEnd < normalizedStart) {
      displayToast("End date must be after start date!", "error");
      return;
    }

    setFestivePeriods([
      ...festivePeriods,
      {
        ...newFestive,
        id: `festive-${normalizedStart}-${normalizedEnd}-${Date.now()}`,
        start: normalizedStart,
        end: normalizedEnd,
        rate: "100"
      }
    ]);

    setNewFestive({ name: '', start: '', end: '' });
    displayToast("Festive period added successfully!");
  };

  const removeHoliday = (id) => {
    setHolidays(holidays =>
      removeDuplicateHolidays(holidays.filter(h => h.id !== id))
    );
  };

  const removeFestive = (id) => {
    setFestivePeriods(festivePeriods.filter(p => p.id !== id));
  };

  const removeAllFestive = () => {
    if (window.confirm("Are you sure you want to delete all festive seasons?")) {
      setFestivePeriods([]);
      displayToast("All festive seasons removed.");
    }
  };

  const handleApiFetch = async () => {
    setIsUploading(true);

    try {
      const fetchYear = new Date().getFullYear();
      const extractedHolidays = await fetchHolidaysFromApi(fetchYear);

      if (extractedHolidays && extractedHolidays.length > 0) {
        const enhancedHolidays = extractedHolidays.map((holiday, index) => {
          const normalizedDate = normalizeHolidayDate(holiday.date, fetchYear);

          return {
            ...holiday,
            id: holiday.id || `sarawak-${normalizedDate}-${index}`,
            date: normalizedDate,
            name: holiday.name || holiday.holiday_name || holiday.title || 'Public Holiday',
            active: holiday.active !== false,
            rate: holiday.rate ? formatPercentage(holiday.rate) : "100",
            day_of_week: holiday.day_of_week || '',
            is_mandatory: Boolean(holiday.is_mandatory)
          };
        });

        setHolidays((prev) =>
          removeDuplicateHolidays([
            ...enhancedHolidays,
            ...prev
          ], fetchYear)
        );

        displayToast(`Successfully loaded Sarawak holidays for ${fetchYear}!`);
      } else {
        displayToast(`No Sarawak holidays found for ${fetchYear}.`, "error");
      }
    } catch (error) {
      displayToast(error.message || "Failed to fetch holidays", "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="holiday-manager-container">
      {showToast && <Toast type={toastType} message={toastMessage} />}

      <div
        className="hm-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <h1 className="dashboard-page-title">Manage Holidays & Festive Seasons</h1>
          <p className="dashboard-page-description">
            Manage public holidays and festive season rates that apply to property booking prices.
          </p>
        </div>

        <button
          onClick={handleSaveToDatabase}
          disabled={isSavingDb}
          style={{
            backgroundColor: '#3182ce',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FiSave size={18} /> {isSavingDb ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* --- INSTRUCTION BANNER --- */}
      <div
        style={{
          backgroundColor: '#e8f4fd',
          borderLeft: '4px solid #3182ce',
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '25px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start'
        }}
      >
        <FiInfo size={20} color="#3182ce" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ display: 'block', marginBottom: '5px', color: '#2b6cb0' }}>
            How to configure rates:
          </strong>
          <p style={{ margin: 0, fontSize: '14px', color: '#333', lineHeight: '1.5' }}>
            <strong>100%</strong> equals your standard room price. <br />
            • To charge <strong>extra</strong> during a holiday, enter a number higher than 100
            (e.g., <strong>120%</strong> charges 20% more).<br />
            • Make sure the toggle switch is turned <strong>ON</strong> (green) for the holiday
            rate to actively apply to customer bookings.
          </p>
        </div>
      </div>

      <div className="hm-grid">

        {/* LEFT COLUMN */}
        <div className="hm-card">
          <h3><FiCalendar /> Official Public Holidays</h3>
          <p className="hm-help-text">
            Fetch official Sarawak public holiday dates. When active, you can set a custom pricing rate for each holiday.
          </p>

          <div className="hm-upload-box">
            <button
              onClick={handleApiFetch}
              className="hm-upload-btn"
              disabled={isUploading}
              style={{ opacity: isUploading ? 0.7 : 1 }}
            >
              <FiUploadCloud size={20} />
              {isUploading ? "Fetching Holidays..." : `Fetch ${new Date().getFullYear()} Sarawak Holidays`}
            </button>
          </div>

          {holidays.length > 0 && (
            <div className="hm-global-rate-control">
              <span className="hm-rate-label"><FiDollarSign size={16} /> Set Rate For All:</span>
              <div className="hm-global-input-group">
                <div className="hm-rate-input-wrapper">
                  <input
                    type="number"
                    value={globalRate}
                    onChange={(e) => setGlobalRate(e.target.value)}
                    placeholder="120"
                  />
                  <span className="hm-rate-suffix">%</span>
                </div>
                <button type="button" onClick={applyGlobalRate} className="hm-apply-all-btn">
                  Apply
                </button>
              </div>
            </div>
          )}

          <div className="hm-list">
            {holidays.length === 0 ? (
              <div className="hm-empty-state">
                <FiCalendar size={32} color="#cbd5e0" style={{ marginBottom: '10px' }} />
                <p>List is empty.<br />Fetch the calendar or add dates below.</p>
              </div>
            ) : (
              holidays.map(h => {
                const normalizedDate = normalizeHolidayDate(h.date);
                const dateObj = buildLocalDate(normalizedDate);

                return (
                  <div key={h.id || normalizedDate} className={`hm-list-item ${h.active ? 'active' : 'inactive'}`}>
                    <div className="hm-item-top">
                      <div className="hm-item-content">
                        <div className={`hm-date-block ${h.active ? 'active-block' : 'inactive-block'}`}>
                          <span className="hm-day">
                            {dateObj
                              ? dateObj.toLocaleDateString('en-MY', {
                                  timeZone: 'Asia/Kuching',
                                  day: '2-digit'
                                })
                              : '-'}
                          </span>

                          <span className="hm-month">
                            {dateObj
                              ? dateObj.toLocaleDateString('en-MY', {
                                  timeZone: 'Asia/Kuching',
                                  month: 'short'
                                })
                              : '-'}
                          </span>
                        </div>

                        <div className="hm-event-details">
                          <strong>{h.name}</strong>
                          <span>
                            {dateObj
                              ? dateObj.toLocaleDateString('en-MY', {
                                  timeZone: 'Asia/Kuching',
                                  weekday: 'long',
                                  year: 'numeric'
                                })
                              : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="hm-item-actions">
                        <label className="dp-switch">
                          <input
                            type="checkbox"
                            checked={h.active}
                            onChange={() => toggleHoliday(h.id)}
                          />
                          <span className="dp-slider round"></span>
                        </label>

                        <button
                          type="button"
                          onClick={() => removeHoliday(h.id)}
                          className="hm-delete-btn"
                          title="Remove"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>

                    {h.active && (
                      <div className="hm-custom-rate-box">
                        <span className="hm-rate-label">
                          <FiDollarSign size={14} /> Holiday Rate:
                        </span>

                        <div className="hm-rate-input-wrapper">
                          <input
                            type="number"
                            value={h.rate}
                            onChange={(e) => updateHolidayRate(h.id, e.target.value)}
                          />
                          <span className="hm-rate-suffix">%</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <h4 className="hm-subheading">Add Manually:</h4>

          <form onSubmit={handleAddHoliday} className="hm-form">
            <input
              type="text"
              placeholder="Holiday Name"
              value={newHoliday.name}
              onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })}
              required
            />

            <input
              type="date"
              value={newHoliday.date}
              onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })}
              required
            />

            <button type="submit" className="hm-add-btn">
              <FiPlus /> Add
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN */}
        <div className="hm-card">
          <h3><FiCalendar /> Custom Festive Seasons</h3>
          <p className="hm-help-text">
            Add custom date ranges (e.g. School Holidays). Give each period a specific pricing rate.
          </p>

          <form onSubmit={handleAddFestive} className="hm-form-column">
            <input
              type="text"
              placeholder="Season Name (e.g. Dec School Holidays)"
              value={newFestive.name}
              onChange={e => setNewFestive({ ...newFestive, name: e.target.value })}
              required
            />

            <div className="hm-date-row">
              <div className="hm-date-input">
                <label>Start Date</label>
                <input
                  type="date"
                  value={newFestive.start}
                  onChange={e => setNewFestive({ ...newFestive, start: e.target.value })}
                  required
                />
              </div>

              <div className="hm-date-input">
                <label>End Date</label>
                <input
                  type="date"
                  value={newFestive.end}
                  onChange={e => setNewFestive({ ...newFestive, end: e.target.value })}
                  min={newFestive.start}
                  required
                  disabled={!newFestive.start}
                />
              </div>
            </div>

            <button type="submit" className="hm-add-btn">
              <FiPlus /> Add Season Range
            </button>
          </form>

          <div className="hm-section-header">
            <h4 className="hm-subheading" style={{ margin: 0 }}>Saved Periods</h4>

            {festivePeriods.length > 0 && (
              <button type="button" onClick={removeAllFestive} className="hm-text-danger-btn">
                <FiTrash size={14} /> Delete All
              </button>
            )}
          </div>

          <div className="hm-list" style={{ marginTop: '10px' }}>
            {festivePeriods.length === 0 ? (
              <p className="hm-empty">No festive periods added yet.</p>
            ) : null}

            {festivePeriods.map(p => {
              const normalizedStart = normalizeHolidayDate(p.start);
              const normalizedEnd = normalizeHolidayDate(p.end);

              return (
                <div key={p.id} className="hm-list-item active">
                  <div className="hm-item-top">
                    <div className="hm-item-content">
                      <div className="hm-date-block festive-block">
                        <span className="hm-day" style={{ fontSize: '14px' }}>To</span>
                      </div>

                      <div className="hm-event-details">
                        <strong>{p.name}</strong>
                        <span className="hm-range-text">
                          {formatDisplayDate(normalizedStart, {
                            day: 'numeric',
                            month: 'short'
                          })}
                          <span style={{ margin: '0 6px' }}>→</span>
                          {formatDisplayDate(normalizedEnd, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFestive(p.id)}
                      className="hm-delete-btn"
                    >
                      <FiTrash2 />
                    </button>
                  </div>

                  <div className="hm-custom-rate-box">
                    <span className="hm-rate-label" style={{ color: '#3182ce' }}>
                      <FiDollarSign size={14} /> Festive Rate:
                    </span>

                    <div className="hm-rate-input-wrapper outline-blue">
                      <input
                        type="number"
                        value={p.rate}
                        onChange={(e) => updateFestiveRate(p.id, e.target.value)}
                      />
                      <span className="hm-rate-suffix">%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default HolidayManager;