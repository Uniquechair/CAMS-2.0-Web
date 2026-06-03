import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchReservation,
    fetchPropertiesListingTable,
    fetchBlackoutDates,
    createBlackout,
    overrideBlackout,
    deleteBlackout
} from '../../../../../Api/api';
import Filter from '../../../../Component/Filter/Filter';
import Modal from '../../../../Component/Modal/Modal';
import SearchBar from '../../../../Component/SearchBar/SearchBar';
import PaginatedTable from '../../../../Component/PaginatedTable/StockManager_PaginatedTable';
import Loader from '../../../../Component/Loader/Loader';
import Status from '../../../../Component/Status/Status';
import StockManagerRoomPlannerCalendar from '../../../../Component/Room_Planner_Calender/StockManager_Room_Planner_Calendar';
import '../../../../Component/MainContent/MainContent.css';
import '../../../../Component/Modal/Modal.css';
import '../../../../Component/Filter/Filter.css';
import './StockManager.css';

const HOTEL_CATEGORIES = ['hotel', 'resort', 'inn', 'hostel'];

const normalizeText = (value) => (value || '').toString().trim().toLowerCase();
const normalizeMatchText = (value) =>
    (value || '')
        .toString()
        .toLowerCase()
        .replace(/[–—]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
const pad2 = (value) => String(value).padStart(2, '0');

const toYmd = (value) => {
    if (!value) return '';

    const raw = String(value).trim();
    if (!raw) return '';

    // If backend sends a real datetime like 2026-05-12T16:00:00.000Z,
    // convert it to local date so it matches customer cart/property booking date.
    if (raw.includes('T')) {
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) return '';

        return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    }

    // If already date-only, keep as written.
    const isoDateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateOnlyMatch) {
        return `${isoDateOnlyMatch[1]}-${isoDateOnlyMatch[2]}-${isoDateOnlyMatch[3]}`;
    }

    const slashMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
        const [, day, month, year] = slashMatch;
        return `${year}-${month}-${day}`;
    }

    const dashMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dashMatch) {
        const [, day, month, year] = dashMatch;
        return `${year}-${month}-${day}`;
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return '';

    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const formatDateDisplay = (value) => {
    const ymd = toYmd(value);
    if (!ymd) return '—';

    const [year, month, day] = ymd.split('-');
    return `${day}/${month}/${year}`;
};

const addDaysToYmd = (value, daysToAdd = 1) => {
    const ymd = toYmd(value);
    if (!ymd) return '';

    const [year, month, day] = ymd.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + daysToAdd);

    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const getCheckoutExclusiveLastNight = (checkoutValue) => {
    const checkoutYmd = toYmd(checkoutValue);
    if (!checkoutYmd) return '';

    return addDaysToYmd(checkoutYmd, -1);
};

const sortNewestFirst = (items, accessor) =>
    [...items].sort((a, b) => {
        const aValue = accessor(a);
        const bValue = accessor(b);
        if (aValue === bValue) return 0;
        return aValue < bValue ? 1 : -1;
    });

const isHotelProperty = (property) => {
    const category = normalizeText(
        property?.categoryname ||
        property?.propertycategory ||
        property?.propertytype ||
        property?.property_type
    );
    return HOTEL_CATEGORIES.some((item) => category.includes(item));
};

const parseRoomDetails = (property) => {
    const raw = property?.room_details || property?.roomsetup || [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim()) {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const getRoomName = (room, property, index = 0) => {
    if (!isHotelProperty(property)) return 'Standard';
    return room?.roomname || room?.room_name || room?.name || `Room ${index + 1}`;
};

const getRoomQuantity = (room) => {
    const qty = parseInt(room?.quantity || room?.roomquantity || room?.qty || 0, 10);
    return Number.isFinite(qty) && qty > 0 ? qty : 1;
};

const extractPropertyImage = (property) => {
    let firstImage = null;

    if (Array.isArray(property?.propertyimage) && property.propertyimage.length > 0) {
        firstImage = property.propertyimage[0];
    } else if (typeof property?.propertyimage === 'string' && property.propertyimage.trim()) {
        const cleanValue = property.propertyimage.trim();

        try {
            const parsed = JSON.parse(cleanValue);

            if (Array.isArray(parsed) && parsed.length > 0) {
                firstImage = parsed[0];
            } else {
                firstImage = cleanValue.split(',')[0]?.trim();
            }
        } catch {
            firstImage = cleanValue.split(',')[0]?.trim();
        }
    }

    if (!firstImage) return null;

    const cleanImage = String(firstImage).replace(/['"]/g, '').trim();

    if (cleanImage.startsWith('http://') || cleanImage.startsWith('https://')) {
        return cleanImage;
    }

    if (cleanImage.startsWith('data:image')) {
        return cleanImage;
    }

    return `data:image/jpeg;base64,${cleanImage}`;
};


const getSafeImageSrc = (image) => {
    const cleanImage = String(image || '').replace(/['"]/g, '').trim();

    if (!cleanImage) return '';

    // Firebase / normal URL
    if (cleanImage.startsWith('http://') || cleanImage.startsWith('https://')) {
        return cleanImage;
    }

    // Already full base64 image
    if (cleanImage.startsWith('data:image')) {
        return cleanImage;
    }

    // Old database base64 image
    return `data:image/jpeg;base64,${cleanImage}`;
};

const getSafeReservationImages = (images) => {
    if (!images) return [];

    let imageArray = [];

    if (Array.isArray(images)) {
        imageArray = images;
    } else if (typeof images === 'string') {
        const cleanValue = images.trim();

        try {
            const parsed = JSON.parse(cleanValue);
            imageArray = Array.isArray(parsed) ? parsed : cleanValue.split(',');
        } catch {
            imageArray = cleanValue.split(',');
        }
    }

    return imageArray
        .map((img) => getSafeImageSrc(img))
        .filter(Boolean);
};

const extractRoomFromRequest = (request, property, booking = null) => {
    if (!isHotelProperty(property)) return 'Standard';

    const text = (request || '').toString();

    const roomMatch = text.match(/Room Selected:\s*([\s\S]*?)(?:\n\s*\n?Additional Requests:|$)/i);
    if (roomMatch?.[1]) {
        return roomMatch[1].replace(/\s+/g, ' ').trim();
    }

    const packageMatch = text.match(/Package:\s*([\s\S]*?)(?:\n\s*\n?Additional Requests:|$)/i);
    if (packageMatch?.[1]) {
        return packageMatch[1].replace(/\s+/g, ' ').trim();
    }

    if (booking?.roomname) return booking.roomname;
    if (booking?.room_name) return booking.room_name;
    if (booking?.selectedroom) return booking.selectedroom;
    if (booking?.selected_room) return booking.selected_room;

    return 'Standard';
};

const extractRoomAndPackageFromRequest = (request, property, booking = null) => {
    const fullRoomText = extractRoomFromRequest(request, property, booking);

    const packageMatch = fullRoomText.match(/\(Package:\s*([^)]+)\)/i);

    if (packageMatch) {
        const baseRoom = fullRoomText.replace(/\(Package:\s*[^)]+\)/i, '').trim();

        return {
            roomName: baseRoom || 'Standard',
            packageName: packageMatch[1].trim(),
            fullText: fullRoomText
        };
    }

    return {
        roomName: fullRoomText || 'Standard',
        packageName: '',
        fullText: fullRoomText || 'Standard'
    };
};

const enumerateDays = (startDate, endDate) => {
    const startYmd = toYmd(startDate);
    const endYmd = toYmd(endDate);

    if (!startYmd || !endYmd || startYmd > endYmd) return [];

    const [startYear, startMonth, startDay] = startYmd.split('-').map(Number);
    const [endYear, endMonth, endDay] = endYmd.split('-').map(Number);

    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);

    const days = [];
    const cursor = new Date(start);

    while (cursor <= end) {
        days.push(`${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}-${pad2(cursor.getDate())}`);
        cursor.setDate(cursor.getDate() + 1);
    }

    return days;
};

const bookingOverlapsDay = (booking, day) => {
    const checkIn = toYmd(booking?.checkindatetime);
    const checkOut = toYmd(booking?.checkoutdatetime);
    const selectedDay = toYmd(day);

    if (!checkIn || !checkOut || !selectedDay) return false;

    // Check-in date counts. Check-out date does not count.
    return selectedDay >= checkIn && selectedDay < checkOut;
};

const bookingOverlapsRange = (booking, startDate, endDate) => {
    const checkIn = toYmd(booking?.checkindatetime);
    const checkOut = toYmd(booking?.checkoutdatetime);
    const start = toYmd(startDate);
    const end = toYmd(endDate);

    if (!checkIn || !checkOut || !start || !end) return false;

    // Selected stock range is inclusive, but booking checkout remains exclusive.
    const selectedEndExclusive = addDaysToYmd(end, 1);

    return checkIn < selectedEndExclusive && checkOut > start;
};

const PaginationControls = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i += 1) pages.push(i);

    return (
        <div className="stock-pagination">
            <button className="stock-page-btn" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
                ←
            </button>
            {pages.map((page) => (
                <button
                    key={page}
                    className={`stock-page-btn ${page === currentPage ? 'active' : ''}`}
                    onClick={() => onPageChange(page)}
                >
                    {page}
                </button>
            ))}
            <button className="stock-page-btn" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
                →
            </button>
        </div>
    );
};

const BlackoutModal = ({ isOpen, onClose, onConfirm, properties = [] }) => {
    const [step, setStep] = useState(1);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [propertySearch, setPropertySearch] = useState('');
    const [conflicts, setConflicts] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setSelectedProperty(null);
            setSelectedRoom(null);
            setStartDate('');
            setEndDate('');
            setReason('');
            setPropertySearch('');
            setConflicts([]);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const safeProperties = useMemo(() => {
        const raw = Array.isArray(properties) ? properties : (properties?.properties || []);
        return raw.filter((p) => (p?.propertystatus || '').toLowerCase() === 'available');
    }, [properties]);

    const filteredProperties = useMemo(
        () =>
            safeProperties.filter((p) =>
                p.propertyaddress?.toLowerCase().includes(propertySearch.toLowerCase()) ||
                p.propertyname?.toLowerCase().includes(propertySearch.toLowerCase())
            ),
        [safeProperties, propertySearch]
    );

    const propertyRooms = useMemo(() => {
        if (!selectedProperty) return [];

        if (!isHotelProperty(selectedProperty)) {
            return [{ display_name: 'Standard', room_level: 'base' }];
        }

        const rooms = parseRoomDetails(selectedProperty);
        const result = [];

        rooms.forEach((room, index) => {
            const baseName = getRoomName(room, selectedProperty, index);

            result.push({
                ...room,
                display_name: baseName,
                room_level: 'base',
                parent_room: baseName
            });

            if (Array.isArray(room.options) && room.options.length > 0) {
                room.options.forEach((opt, optIndex) => {
                    result.push({
                        ...opt,
                        id: opt.id || `${baseName}-${optIndex}`,
                        display_name: `${baseName} — ${opt.name}`,
                        parent_room: baseName,
                        room_level: 'variation'
                    });
                });
            }
        });

        return result;
    }, [selectedProperty]);

    if (!isOpen) return null;

    const handleInitialSubmit = async () => {
        setIsSubmitting(true);
        try {
            const response = await onConfirm({
                propertyid: selectedProperty?.propertyid,
                room_name: selectedRoom?.display_name || '',
                propertyName: selectedProperty?.propertyaddress || selectedProperty?.propertyname,
                startDate,
                endDate,
                reason,
                force: false
            });

            if (response?.isConflict) {
                setConflicts(response.conflicts || []);
                setStep(4);
            }
        } catch (error) {
            console.error(error);
        }
        setIsSubmitting(false);
    };

    const handleForceSubmit = async () => {
        setIsSubmitting(true);
        await onConfirm({
            propertyid: selectedProperty?.propertyid,
            room_name: selectedRoom?.display_name || '',
            propertyName: selectedProperty?.propertyaddress || selectedProperty?.propertyname,
            startDate,
            endDate,
            reason,
            force: true
        });
        setIsSubmitting(false);
    };

    return (
        <div className="blackout-overlay">
            <div className="blackout-modal">
                <div className="blackout-modal-header">
                    <div>
                        <h2 className="blackout-modal-title">🚫 Blackout Dates</h2>
                        <p className="blackout-modal-subtitle">Block dates to prevent reservations</p>
                    </div>
                    <button className="blackout-close-btn" onClick={onClose} disabled={isSubmitting}>✕</button>
                </div>

                {step < 4 && (
                    <div className="blackout-steps">
                        {['Property', 'Room', 'Dates'].map((label, i) => (
                            <div key={i} className={`blackout-step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'done' : ''}`}>
                                <div className="blackout-step-circle">{step > i + 1 ? '✓' : i + 1}</div>
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {step === 1 && (
                    <div className="blackout-step-content">
                        <input className="blackout-search" placeholder="Search properties..." value={propertySearch} onChange={(e) => setPropertySearch(e.target.value)} />
                        <div className="blackout-property-grid">
                            {filteredProperties.length === 0 && <p className="blackout-empty">No available properties found.</p>}
                            {filteredProperties.map((p) => {
                                const imageSrc = extractPropertyImage(p);
                                return (
                                    <div key={p.propertyid} className={`blackout-property-card ${selectedProperty?.propertyid === p.propertyid ? 'selected' : ''}`} onClick={() => setSelectedProperty(p)}>
                                        <div className="blackout-property-img-wrap">
                                            {imageSrc ? (
                                                <img src={imageSrc} alt={p.propertyaddress || p.propertyname} className="blackout-property-img" />
                                            ) : (
                                                <div className="blackout-property-placeholder">No Image</div>
                                            )}
                                        </div>
                                        <div className="blackout-property-info">
                                            <div className="blackout-property-name">{p.propertyaddress || p.propertyname}</div>
                                            <div className="blackout-property-meta">{p.categoryname || 'Property'}</div>
                                        </div>
                                        {selectedProperty?.propertyid === p.propertyid && <div className="blackout-selected-badge">✓</div>}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="blackout-modal-footer">
                            <button className="blackout-btn-secondary" onClick={onClose}>Cancel</button>
                            <button className="blackout-btn-primary" disabled={!selectedProperty} onClick={() => setStep(2)}>Next →</button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="blackout-step-content">
                        <p className="blackout-step-label">Selected: <strong>{selectedProperty?.propertyaddress || selectedProperty?.propertyname}</strong></p>
                        <div className="blackout-room-grid">
                            {isHotelProperty(selectedProperty) && (
                                <div className={`blackout-room-card ${selectedRoom === null ? 'selected' : ''}`} onClick={() => setSelectedRoom(null)}>
                                    <span className="blackout-room-icon">🏨</span>
                                    <span className="blackout-room-name">All Rooms</span>
                                    {selectedRoom === null && <div className="blackout-selected-badge">✓</div>}
                                </div>
                            )}

                            {propertyRooms.map((room, idx) => {
                                const selected = selectedRoom?.display_name === room.display_name;
                                return (
                                    <div key={`${room.display_name}-${idx}`} className={`blackout-room-card ${selected ? 'selected' : ''}`} onClick={() => setSelectedRoom(room)}>
                                        <span className="blackout-room-icon">
                                            {room.room_level === 'variation' ? '✨' : isHotelProperty(selectedProperty) ? '🛏️' : '🏠'}
                                        </span>
                                        <span className="blackout-room-name">{room.display_name}</span>
                                        {room.room_level === 'variation' && (
                                            <span className="blackout-room-sub">{room.parent_room}</span>
                                        )}
                                        {selected && <div className="blackout-selected-badge">✓</div>}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="blackout-modal-footer">
                            <button className="blackout-btn-secondary" onClick={() => setStep(1)}>← Back</button>
                            <button className="blackout-btn-primary" onClick={() => setStep(3)}>Next →</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="blackout-step-content">
                        <div className="blackout-date-row">
                            <div className="blackout-date-group">
                                <label>Start Date</label>
                                <input type="date" className="blackout-date-input" value={startDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setStartDate(e.target.value)} />
                            </div>
                            <div className="blackout-date-group">
                                <label>End Date</label>
                                <input type="date" className="blackout-date-input" value={endDate} min={startDate || new Date().toISOString().split('T')[0]} onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="blackout-date-group" style={{ marginTop: '12px' }}>
                            <label>Reason (optional)</label>
                            <textarea className="blackout-reason-input" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                        </div>
                        <div className="blackout-modal-footer">
                            <button className="blackout-btn-secondary" onClick={() => setStep(2)}>← Back</button>
                            <button className="blackout-btn-danger" disabled={!startDate || !endDate || isSubmitting} onClick={handleInitialSubmit}>
                                {isSubmitting ? 'Checking...' : '🚫 Confirm Blackout'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="blackout-step-content" style={{ backgroundColor: '#fffaf0', border: '2px solid #ed8936', borderRadius: '8px' }}>
                        <h3 style={{ color: '#c05621', marginTop: 0 }}>⚠️ Overlapping Bookings Detected</h3>
                        <p style={{ fontSize: '14px', color: '#4a5568' }}>
                            This blackout overlaps with <strong>{conflicts.length}</strong> active booking(s).
                            If you proceed, the Administrator will be notified to handle the cancellations manually.
                        </p>

                        <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                            {conflicts.map((c) => (
                                <div key={c.reservationid} style={{ fontSize: '13px', borderBottom: '1px solid #edf2f7', padding: '6px 0' }}>
                                    <strong>Res #{c.reservationid}</strong>: {c.rcfirstname} {c.rclastname} <br />
                                    <span style={{ color: '#718096' }}>{formatDateDisplay(c.checkindatetime)} - {formatDateDisplay(c.checkoutdatetime)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="blackout-modal-footer">
                            <button className="blackout-btn-secondary" onClick={() => setStep(3)} disabled={isSubmitting}>← Cancel</button>
                            <button className="blackout-btn-danger" onClick={handleForceSubmit} disabled={isSubmitting}>
                                {isSubmitting ? 'Processing...' : 'Proceed Anyway'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const OverrideModal = ({ isOpen, blackout, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (!isOpen) setReason('');
    }, [isOpen]);

    if (!isOpen || !blackout) return null;

    return (
        <div className="blackout-overlay">
            <div className="override-modal">
                <div className="blackout-modal-header">
                    <div>
                        <h2 className="blackout-modal-title">⚠️ Override Blackout</h2>
                        <p className="blackout-modal-subtitle">This will unblock dates set by a moderator</p>
                    </div>
                    <button className="blackout-close-btn" onClick={onClose}>✕</button>
                </div>
                <div className="override-details">
                    <div className="override-info-row"><span className="override-label">Property</span><span className="override-value">{blackout.property_name}</span></div>
                    <div className="override-info-row"><span className="override-label">Room</span><span className="override-value">{blackout.room_name || 'All Rooms'}</span></div>
                    <div className="override-info-row"><span className="override-label">Blocked Dates</span><span className="override-value">{formatDateDisplay(blackout.start_date)} → {formatDateDisplay(blackout.end_date)}</span></div>
                    <div className="override-info-row"><span className="override-label">Blocked By</span><span className="override-value moderator-badge">{blackout.created_by_username}</span></div>
                    {blackout.reason && <div className="override-info-row"><span className="override-label">Their Reason</span><span className="override-value">{blackout.reason}</span></div>}
                </div>
                <div className="blackout-date-group" style={{ padding: '0 24px 16px' }}>
                    <label>Your Override Reason <span style={{ color: '#e53e3e' }}>*</span></label>
                    <textarea className="blackout-reason-input" placeholder="Provide a reason for overriding this blackout..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                </div>
                <div className="blackout-modal-footer" style={{ padding: '0 24px 24px' }}>
                    <button className="blackout-btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="blackout-btn-primary" disabled={!reason.trim()} onClick={() => onConfirm(blackout.id, reason)}>✓ Confirm Override</button>
                </div>
            </div>
        </div>
    );
};

const DeleteBlackoutModal = ({ isOpen, blackout, onClose, onConfirm, isSubmitting }) => {
    if (!isOpen || !blackout) return null;

    return (
        <div className="blackout-overlay">
            <div className="override-modal">
                <div className="blackout-modal-header">
                    <div>
                        <h2 className="blackout-modal-title">🗑️ Delete Blackout</h2>
                        <p className="blackout-modal-subtitle">This action will remove the blackout record.</p>
                    </div>
                    <button className="blackout-close-btn" onClick={onClose} disabled={isSubmitting}>✕</button>
                </div>

                <div className="override-details">
                    <div className="override-info-row"><span className="override-label">Property</span><span className="override-value">{blackout.property_name || 'N/A'}</span></div>
                    <div className="override-info-row"><span className="override-label">Room</span><span className="override-value">{blackout.room_name || 'All Rooms'}</span></div>
                    <div className="override-info-row"><span className="override-label">Blocked Dates</span><span className="override-value">{formatDateDisplay(blackout.start_date)} → {formatDateDisplay(blackout.end_date)}</span></div>
                </div>

                <div className="blackout-modal-footer" style={{ padding: '0 24px 24px' }}>
                    <button className="blackout-btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                    <button className="blackout-btn-danger" onClick={() => onConfirm(blackout.id)} disabled={isSubmitting}>
                        {isSubmitting ? 'Deleting...' : 'Delete Blackout'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const BlackoutTable = ({ blackouts = [], propertiesById = {}, onOverride, onDelete, isAdmin, currentUserId }) => {
    const [filterRole, setFilterRole] = useState('all');
    const [filterStatus, setFilterStatus] = useState('active');
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;
    const today = new Date().toISOString().split('T')[0];

    const normalized = useMemo(() => {
        const rows = (Array.isArray(blackouts) ? blackouts : []).map((item) => ({
            ...item,
            property_name:
                item.property_name ||
                propertiesById[item.propertyid]?.propertyaddress ||
                propertiesById[item.propertyid]?.propertyname ||
                'N/A',
            room_name: item.room_name || 'All Rooms'
        }));

        const seen = new Map();
        rows.forEach((item) => {
            const key = [
                item.propertyid || item.property_name,
                item.room_name,
                toYmd(item.start_date),
                toYmd(item.end_date),
                item.is_active ? 'active' : 'overridden'
            ].join('|');

            if (!seen.has(key)) seen.set(key, item);
        });

        return Array.from(seen.values());
    }, [blackouts, propertiesById]);

    const filtered = useMemo(
        () =>
            sortNewestFirst(
                normalized.filter((b) => {
                    const endDate = toYmd(b.end_date);
                    const roleMatch = filterRole === 'all' || b.created_by_role === filterRole;
                    const statusMatch =
                        filterStatus === 'all' ||
                        (filterStatus === 'active' && b.is_active && endDate >= today) ||
                        (filterStatus === 'overridden' && !b.is_active) ||
                        (filterStatus === 'expired' && endDate < today && b.is_active);
                    return roleMatch && statusMatch;
                }),
                (item) => item.created_at || item.id || item.start_date
            ),
        [normalized, filterRole, filterStatus, today]
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [filterRole, filterStatus, filtered.length]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    const pageItems = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    return (
        <div className="blackout-table-section">
            <div className="blackout-table-header">
                <div>
                    <h3 className="blackout-table-title">🚫 Blackout Date Management</h3>
                    <p className="blackout-table-subtitle">{filtered.length} record{filtered.length !== 1 ? 's' : ''} shown</p>
                </div>
                <div className="blackout-table-filters">
                    {isAdmin && (
                        <select className="blackout-filter-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="moderator">Moderator</option>
                        </select>
                    )}
                    <select className="blackout-filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="active">Active</option>
                        <option value="overridden">Overridden</option>
                        <option value="expired">Expired</option>
                        <option value="all">All</option>
                    </select>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="blackout-table-empty">
                    <span style={{ fontSize: '2rem' }}>📅</span>
                    <p>No blackout records found</p>
                </div>
            ) : (
                <>
                    <div className="blackout-table-wrap">
                        <table className="blackout-table">
                            <thead>
                                <tr>
                                    <th>Property</th>
                                    <th>Room</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Blocked By</th>
                                    <th>Role</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageItems.map((b) => {
                                    const endDate = toYmd(b.end_date);
                                    const isExpired = endDate < today;
                                    const statusLabel = !b.is_active ? 'Overridden' : isExpired ? 'Expired' : 'Active';
                                    const statusClass = !b.is_active ? 'status-overridden' : isExpired ? 'status-expired' : 'status-active';
                                    const canDelete = b.is_active && (isAdmin || `${b.created_by_userid}` === `${currentUserId}`);

                                    return (
                                        <tr key={`${b.propertyid}-${b.room_name}-${toYmd(b.start_date)}-${toYmd(b.end_date)}`} className={!b.is_active ? 'row-overridden' : ''}>
                                            <td>{b.property_name}</td>
                                            <td>{b.room_name || <span className="all-rooms-tag">All Rooms</span>}</td>
                                            <td>{formatDateDisplay(b.start_date)}</td>
                                            <td>{formatDateDisplay(b.end_date)}</td>
                                            <td>{b.created_by_username}</td>
                                            <td>
                                                <span className={`role-badge role-${b.created_by_role}`}>
                                                    {b.created_by_role}
                                                </span>
                                            </td>
                                            <td className="reason-cell">{b.reason || '—'}</td>
                                            <td><span className={`blackout-status ${statusClass}`}>{statusLabel}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    {isAdmin && b.created_by_role === 'moderator' && b.is_active && !isExpired && (
                                                        <button className="override-btn" onClick={() => onOverride(b)}>Override</button>
                                                    )}
                                                    {canDelete ? (
                                                        <button className="blackout-delete-btn" onClick={() => onDelete(b)}>Delete</button>
                                                    ) : (
                                                        <span className="no-action">—</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </>
            )}
        </div>
    );
};

const StockManager = () => {
    const queryClient = useQueryClient();
    const userGroup = localStorage.getItem('userGroup') || localStorage.getItem('usergroup') || '';
    const currentUserId = localStorage.getItem('userid') || localStorage.getItem('userId') || '';
    const isAdmin = userGroup.toLowerCase() === 'admin' || userGroup.toLowerCase() === 'administrator';

    const [searchKey, setSearchKey] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [selectedCheckInDate, setSelectedCheckInDate] = useState('');
    const [selectedCheckOutDate, setSelectedCheckOutDate] = useState('');
    const [appliedFilters, setAppliedFilters] = useState({
        status: 'All',
        checkInDate: '',
        checkOutDate: ''
    });

    const [selectedReservation, setSelectedReservation] = useState(null);
    const [calendarHighlight, setCalendarHighlight] = useState(null);

    const [summaryFilterType, setSummaryFilterType] = useState('month');
    const [summaryMonth, setSummaryMonth] = useState(new Date().toISOString().slice(0, 7));
    const [summaryStartDate, setSummaryStartDate] = useState('');
    const [summaryEndDate, setSummaryEndDate] = useState('');

    const [tableHighlightReservationId, setTableHighlightReservationId] = useState(null);
    const [tableCurrentPage, setTableCurrentPage] = useState(1);
    const tableRowsPerPage = 4;
const todayYmd = `${new Date().getFullYear()}-${pad2(new Date().getMonth() + 1)}-${pad2(new Date().getDate())}`;
const [selectedRosterStartDate, setSelectedRosterStartDate] = useState('');
const [selectedRosterEndDate, setSelectedRosterEndDate] = useState('');
    const [rosterPage, setRosterPage] = useState(1);

  const [expandedProperties, setExpandedProperties] = useState({});
const [showDailyStock, setShowDailyStock] = useState(false);
const [stockPropertySearch, setStockPropertySearch] = useState('');
const [stockRoleFilter, setStockRoleFilter] = useState('all');
    const [showBlackoutModal, setShowBlackoutModal] = useState(false);
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedBlackout, setSelectedBlackout] = useState(null);
    const [blackoutSuccess, setBlackoutSuccess] = useState('');

    const blackoutTableRef = useRef(null);

    const {
    data: reservationsData = [],
    isLoading: reservationsLoading,
    refetch: refetchReservations
} = useQuery({
        queryKey: ['reservations', currentUserId, userGroup],
        queryFn: async () => {
            try {
                const reservationData = await fetchReservation();

                if (!Array.isArray(reservationData)) return [];

                return reservationData.map((reservation) => {
                    const reservationblocktime = new Date(reservation.reservationblocktime).getTime();
                    const currentDateTime = Date.now() + 8 * 60 * 60 * 1000;

                    if (reservation.reservationstatus === 'Pending' && currentDateTime > reservationblocktime) {
                        return { ...reservation, reservationstatus: 'expired' };
                    }

                    return reservation;
                });
            } catch (error) {
                console.error('Failed to fetch reservation details:', error);
                return [];
            }
        },
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,

        // Keep disabled because this page is heavy.
        // refetchInterval: 30000,
    });

    const { data: propertiesData = [] } = useQuery({
        queryKey: ['propertiesForBlackout', currentUserId, userGroup],
        queryFn: fetchPropertiesListingTable,
        staleTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
    });

    const { data: blackoutsData = [], isLoading: blackoutsLoading } = useQuery({
        queryKey: ['blackoutDates', currentUserId, userGroup],
        queryFn: fetchBlackoutDates,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
    });

    const createBlackoutMutation = useMutation({
        mutationFn: createBlackout,
        onSuccess: (res) => {
            if (res?.isConflict) return res;

            queryClient.invalidateQueries({
                queryKey: ['blackoutDates', currentUserId, userGroup]
            });

            setShowBlackoutModal(false);
            setBlackoutSuccess('Blackout dates created successfully!');
            setTimeout(() => setBlackoutSuccess(''), 3500);
        },
        onError: (err) => console.error('Failed to create blackout:', err),
    });

    const overrideBlackoutMutation = useMutation({
        mutationFn: ({ id, overrideReason }) => overrideBlackout(id, overrideReason),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['blackoutDates', currentUserId, userGroup]
            });

            setShowOverrideModal(false);
            setSelectedBlackout(null);
            setBlackoutSuccess('Blackout successfully overridden!');
            setTimeout(() => setBlackoutSuccess(''), 3500);
        },
        onError: (err) => console.error('Failed to override blackout:', err),
    });

    const deleteBlackoutMutation = useMutation({
        mutationFn: deleteBlackout,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['blackoutDates', currentUserId, userGroup]
            });

            setShowDeleteModal(false);
            setSelectedBlackout(null);
            setBlackoutSuccess('Blackout deleted successfully!');
            setTimeout(() => setBlackoutSuccess(''), 3500);
        },
        onError: (err) => console.error('Failed to delete blackout:', err),
    });

    const rawPropertiesList = useMemo(() => {
        return Array.isArray(propertiesData)
            ? propertiesData
            : propertiesData?.properties || [];
    }, [propertiesData]);

    const propertiesList = useMemo(() => {
        if (isAdmin) return rawPropertiesList;

        return rawPropertiesList.filter((property) => {
            const ownerId =
                property.userid ||
                property.owner_userid ||
                property.property_owner_userid;

            return String(ownerId) === String(currentUserId);
        });
    }, [rawPropertiesList, isAdmin, currentUserId]);

    const propertiesById = useMemo(() => {
        return propertiesList.reduce((acc, property) => {
            acc[property.propertyid] = property;
            return acc;
        }, {});
    }, [propertiesList]);

    const activeBlackouts = useMemo(() => {
        if (!Array.isArray(blackoutsData)) return [];

        return blackoutsData.filter((b) => b.is_active && toYmd(b.end_date) >= todayYmd);
    }, [blackoutsData, todayYmd]);

    const moderatorBlackouts = useMemo(() => {
        return activeBlackouts.filter((b) => b.created_by_role === 'moderator');
    }, [activeBlackouts]);

   const calendarBlackouts = useMemo(() => {
    if (!Array.isArray(blackoutsData)) return [];

    return blackoutsData.filter((b) => b.is_active).map((b) => ({
        ...b,
        start_date: toYmd(b.start_date),
        end_date: toYmd(b.end_date)
    }));
}, [blackoutsData]);

    const handleBlackoutConfirm = (data) => createBlackoutMutation.mutateAsync(data);

    const handleOverrideClick = (blackout) => {
        setSelectedBlackout(blackout);
        setShowOverrideModal(true);
    };

    const handleDeleteClick = (blackout) => {
        setSelectedBlackout(blackout);
        setShowDeleteModal(true);
    };

    const handleOverrideConfirm = (id, reason) => {
        overrideBlackoutMutation.mutate({ id, overrideReason: reason });
    };

    const handleDeleteConfirm = (id) => {
        deleteBlackoutMutation.mutate(id);
    };

    const handleScrollToBlackouts = () => {
        blackoutTableRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    };

   const handleApplyFilters = async () => {
    setAppliedFilters({
        status: selectedStatus,
        checkInDate: selectedCheckInDate,
        checkOutDate: selectedCheckOutDate,
    });

    setTableCurrentPage(1);

    if (selectedCheckInDate && selectedCheckOutDate) {
        setSelectedRosterStartDate(selectedCheckInDate);
        setSelectedRosterEndDate(selectedCheckOutDate);

        await queryClient.invalidateQueries({ queryKey: ['reservations', currentUserId, userGroup] });
        await refetchReservations();

        setShowDailyStock(true);
    }
};

    const filters = [
        {
            name: 'status',
            label: 'Status',
            value: selectedStatus,
            onChange: setSelectedStatus,
            options: [
                { value: 'All', label: 'All Statuses' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Partially Paid', label: 'Partially Paid' },
                { value: 'Expired', label: 'Expired' },
            ],
        },
        {
            name: 'checkInDate',
            label: 'Check-in Date',
            type: 'date',
            value: selectedCheckInDate,
            onChange: setSelectedCheckInDate,
        },
        {
            name: 'checkOutDate',
            label: 'Check-out Date',
            type: 'date',
            value: selectedCheckOutDate,
            onChange: setSelectedCheckOutDate,
        },
    ];

    const displayLabels = {
        reservationid: 'Reservation ID',
        propertyaddress: 'Property Name',
        room: 'Selected Room Type',
        checkindatetime: 'Check-In Date',
        checkoutdatetime: 'Check-Out Date',

        name: 'Customer Name',
        customerEmail: 'Customer Email',
        customerPhone: 'Customer Phone',

        request: 'Request',
        totalprice: 'Total Price',
        reservationstatus: 'Status',
        images: 'Images',
    };

    const formatDate = (datetime) => {
        if (!datetime) return '';

        const date = new Date(datetime);

        if (Number.isNaN(date.getTime())) return '';

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    };

    const isWithinSummaryRange = (reservation) => {
        if (!reservation.checkindatetime) return false;

        const reservationDate = new Date(reservation.checkindatetime);

        if (Number.isNaN(reservationDate.getTime())) return false;

        if (summaryFilterType === 'month') {
            const reservationMonth = `${reservationDate.getFullYear()}-${String(reservationDate.getMonth() + 1).padStart(2, '0')}`;
            return reservationMonth === summaryMonth;
        }

        if (summaryFilterType === 'date') {
            if (!summaryStartDate || !summaryEndDate) return true;

            const start = new Date(summaryStartDate);
            const end = new Date(summaryEndDate);
            end.setHours(23, 59, 59, 999);

            return reservationDate >= start && reservationDate <= end;
        }

        return true;
    };

    const formatCurrency = (amount) => {
        const safeAmount = Number(amount || 0);

        return `RM ${safeAmount.toLocaleString('en-MY', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    const getReservationStatusKey = (reservation) => {
        const raw = String(reservation?.reservationstatus || '')
            .toLowerCase()
            .trim()
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ');

        if (raw === 'partial paid' || raw === 'partially paid' || raw === 'partiallypaid') {
            return 'partially paid';
        }

        if (raw === 'cancelled' || raw === 'canceled') {
            return 'cancelled';
        }

        return raw;
    };

    const isStockDeductedStatus = (reservation) => {
        const status = getReservationStatusKey(reservation);

        return status === 'paid' || status === 'partially paid';
    };

    const isRestockedStatus = (reservation) => {
        const status = getReservationStatusKey(reservation);

        return status === 'expired' || status === 'cancelled';
    };

    const getReservationCommissionAmount = (reservation) => {
        const directCommission = parseFloat(
            reservation?.commissionamount ??
            reservation?.commission_amount ??
            reservation?.commission
        );

        if (Number.isFinite(directCommission) && directCommission > 0) {
            return directCommission;
        }

        const totalPrice = parseFloat(reservation?.totalprice || 0);
        const commissionRate = parseFloat(reservation?.commission_rate || 0);

        if (Number.isFinite(totalPrice) && Number.isFinite(commissionRate)) {
            return totalPrice * commissionRate;
        }

        return 0;
    };

    const summaryReservations = useMemo(() => {
        if (!Array.isArray(reservationsData)) return [];

        return reservationsData.filter((reservation) => {
            const status = getReservationStatusKey(reservation);

            return (
                isWithinSummaryRange(reservation) &&
                (
                    status === 'paid' ||
                    status === 'partially paid'
                )
            );
        });
    }, [
        reservationsData,
        summaryFilterType,
        summaryMonth,
        summaryStartDate,
        summaryEndDate,
    ]);

    const totalRevenue = useMemo(() => {
        return summaryReservations.reduce(
            (sum, reservation) => sum + (parseFloat(reservation.totalprice) || 0),
            0
        );
    }, [summaryReservations]);

    const totalCommission = useMemo(() => {
        return summaryReservations.reduce(
            (sum, reservation) => sum + getReservationCommissionAmount(reservation),
            0
        );
    }, [summaryReservations]);

    const filteredReservations = useMemo(() => {
        if (!Array.isArray(reservationsData)) return [];

        const keyword = searchKey.toLowerCase();

        return reservationsData.filter((reservation) => {
            const status = getReservationStatusKey(reservation);

            const allowedStatus =
                status === 'paid' ||
                status === 'partially paid' ||
                status === 'expired';

            if (!allowedStatus) return false;

            const statusMatch =
                appliedFilters.status === 'All' ||
                status === appliedFilters.status.toLowerCase();

           const reservationCheckIn = toYmd(reservation.checkindatetime);
            const reservationCheckOut = toYmd(reservation.checkoutdatetime);

            const checkInMatch =
                !appliedFilters.checkInDate || reservationCheckIn === appliedFilters.checkInDate;

            const checkOutMatch =
                !appliedFilters.checkOutDate || reservationCheckOut === appliedFilters.checkOutDate;

            const propertyForRoom =
                propertiesById[reservation.propertyid] ||
                reservation;

            const selectedRoomType = extractRoomFromRequest(
                reservation.request,
                propertyForRoom,
                reservation
            );

            const searchMatch =
                (reservation.reservationid?.toString().toLowerCase().includes(keyword) || false) ||
                (reservation.propertyaddress?.toString().toLowerCase().includes(keyword) || false) ||
                (selectedRoomType?.toLowerCase().includes(keyword) || false) ||
                (reservation.totalprice?.toString().toLowerCase().includes(keyword) || false) ||
                (reservation.request?.toLowerCase().includes(keyword) || false) ||
                (reservation.reservationstatus?.toLowerCase().includes(keyword) || false) ||
                (formatDate(reservation.checkindatetime).includes(searchKey) || false) ||
                (formatDate(reservation.checkoutdatetime).includes(searchKey) || false) ||
                (reservation.rcfirstname?.toLowerCase().includes(keyword) || false) ||
                (reservation.rclastname?.toLowerCase().includes(keyword) || false);

            return statusMatch && checkInMatch && checkOutMatch && searchMatch;
        });
    }, [
        reservationsData,
        appliedFilters.status,
        appliedFilters.checkInDate,
        appliedFilters.checkOutDate,
        searchKey,
        propertiesById,
    ]);

    const handleRowClick = (reservation) => {
        const propertyForRoom =
            propertiesById[reservation.propertyid] ||
            reservation;

        const selectedRoomType = extractRoomFromRequest(
            reservation.request,
            propertyForRoom,
            reservation
        );

        const essentialFields = {
            reservationid: reservation.reservationid || 'N/A',
            propertyaddress: reservation.propertyaddress || 'N/A',
            room: selectedRoomType || 'N/A',
            checkindatetime: formatDate(reservation.checkindatetime) || 'N/A',
            checkoutdatetime: formatDate(reservation.checkoutdatetime) || 'N/A',

            name: `${reservation.rcfirstname || ''} ${reservation.rclastname || ''}`.trim() || 'N/A',
            customerEmail:
                reservation.rcemail ||
                reservation.email ||
                reservation.customeremail ||
                reservation.useremail ||
                'N/A',
            customerPhone:
                reservation.rcphoneno ||
                reservation.rcphone ||
                reservation.phone ||
                reservation.customerphone ||
                reservation.userphone ||
                'N/A',

            request: reservation.request || 'N/A',
            totalprice: reservation.totalprice ? `RM ${reservation.totalprice}` : 'N/A',
            reservationstatus: reservation.reservationstatus || 'N/A',
            images: getSafeReservationImages(reservation.propertyimage),
        };

        setSelectedReservation(essentialFields);
    };

    const handleJumpToCalendar = (reservation) => {
        setCalendarHighlight({
            checkin: reservation.checkindatetime,
            checkout: reservation.checkoutdatetime,
            property: reservation.propertyaddress,
            reservationid: reservation.reservationid,
        });

        document.querySelector('.room-planner-container')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    const handleJumpToTable = (reservation) => {
        const sortedReservations = [...filteredReservations].sort((a, b) => {
            const aValue = a?.reservationid;
            const bValue = b?.reservationid;

            if (aValue === bValue) return 0;

            return aValue < bValue ? 1 : -1;
        });

        const targetIndex = sortedReservations.findIndex(
            (item) => item.reservationid === reservation.reservationid
        );

        if (targetIndex === -1) return;

        const targetPage = Math.floor(targetIndex / tableRowsPerPage) + 1;

        setTableCurrentPage(targetPage);
        setTableHighlightReservationId(reservation.reservationid);

        setTimeout(() => {
            document.querySelector(`[data-row-key="${reservation.reservationid}"]`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }, 200);

        setTimeout(() => setTableHighlightReservationId(null), 3000);
    };

    const columns = useMemo(() => [
        {
            header: 'Reservation ID',
            accessor: 'reservationid',
            render: (reservation) => reservation.reservationid || 'N/A',
        },
   {
    header: 'Image',
    accessor: 'propertyimage',
    render: (reservation) => {
        const imageSrc = extractPropertyImage(reservation);

        return imageSrc ? (
            <img
                src={imageSrc}
                alt={`Property ${reservation.propertyaddress || ''}`}
                loading="lazy"
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
        {
            header: 'Property',
            accessor: 'propertyaddress',
            render: (reservation) => reservation.propertyaddress || 'N/A',
        },
        {
            header: 'Operator',
            accessor: 'operator',
            render: (reservation) => reservation.property_owner_username || 'N/A',
        },
        {
            header: 'Customer',
            accessor: 'customer',
            render: (reservation) =>
                `${reservation.rcfirstname || ''} ${reservation.rclastname || ''}`.trim() || 'N/A',
        },
        {
            header: 'Room',
            accessor: 'room',
            render: (reservation) => {
                const propertyForRoom =
                    propertiesById[reservation.propertyid] ||
                    reservation;

                return extractRoomFromRequest(
                    reservation.request,
                    propertyForRoom,
                    reservation
                );
            },
        },
        {
            header: 'Check-in Date',
            accessor: 'checkindatetime',
            render: (reservation) => formatDateDisplay(reservation.checkindatetime),
        },
        {
            header: 'Check-out Date',
            accessor: 'checkoutdatetime',
            render: (reservation) => formatDateDisplay(reservation.checkoutdatetime),
        },
        {
            header: 'Revenue',
            accessor: 'totalprice',
            render: (reservation) => `RM ${reservation.totalprice ?? '0.00'}`,
        },
        {
            header: 'Commission',
            accessor: 'commission',
            render: (reservation) => `RM ${getReservationCommissionAmount(reservation).toFixed(2)}`,
        },
        {
            header: 'Status',
            accessor: 'reservationstatus',
            render: (reservation) => <Status value={reservation.reservationstatus} />,
        },
        {
            header: 'Actions',
            accessor: 'actions',
            render: (reservation) => (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(reservation);
                        }}
                        style={{
                            padding: '7px 12px',
                            backgroundColor: '#8dc63f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '700',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        View Details
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleJumpToCalendar(reservation);
                        }}
                        style={{
                            padding: '7px 12px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '700',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Jump to Calendar
                    </button>
                </div>
            ),
        },
    ], [propertiesById]);

    const activePropertiesForStock = useMemo(() => {
        return propertiesList.filter((p) => p.propertystatus === 'Available');
    }, [propertiesList]);

    const rosterFilterStart = selectedRosterStartDate || '1900-01-01';
    const rosterFilterEnd = selectedRosterEndDate || '2999-12-31';

    const rosterDays = useMemo(() => {
        if (!showDailyStock) return [];

        return selectedRosterStartDate && selectedRosterEndDate
            ? enumerateDays(selectedRosterStartDate, selectedRosterEndDate)
            : [];
    }, [showDailyStock, selectedRosterStartDate, selectedRosterEndDate]);

  const activeRangeBookings = useMemo(() => {
    if (!showDailyStock) return [];

    const rows = Array.isArray(reservationsData) ? reservationsData : [];

    return sortNewestFirst(
        rows.filter((reservation) => {
            const status = getReservationStatusKey(reservation);

            if (status !== 'paid' && status !== 'partially paid') {
                return false;
            }

            return bookingOverlapsRange(
                reservation,
                rosterFilterStart,
                rosterFilterEnd
            );
        }),
        (reservation) => reservation.reservationid || reservation.createdat || reservation.checkindatetime
    );
}, [showDailyStock, reservationsData, rosterFilterStart, rosterFilterEnd]);

   const ownerStockSummary = useMemo(() => {
    if (!showDailyStock) return [];

    const propertySearchKeyword = stockPropertySearch.trim().toLowerCase();

    const searchableProperties = activePropertiesForStock.filter((prop) => {
        const roleText = normalizeText(
            prop.usergroup ||
            prop.userGroup ||
            prop.roletype ||
            prop.role ||
            prop.created_by_role ||
            prop.property_owner_role ||
            ''
        );

        const ownerText = normalizeText(
            prop.property_owner_username ||
            prop.ownername ||
            prop.username ||
            ''
        );

        const roleMatch =
            stockRoleFilter === 'all' ||
            roleText === stockRoleFilter ||
            ownerText.includes(stockRoleFilter);

        if (!roleMatch) return false;

        if (!propertySearchKeyword) return true;

        const propertyText = [
            prop.propertyaddress,
            prop.propertyname,
            prop.clustername,
            prop.property_owner_username,
            prop.ownername,
            prop.username,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return propertyText.includes(propertySearchKeyword);
    });

    const groupedByOwner = searchableProperties.reduce((acc, prop) => {
            const ownerName =
                prop.property_owner_username ||
                prop.ownername ||
                prop.propertyowner ||
                `${prop.ufirstname || ''} ${prop.ulastname || ''}`.trim() ||
                prop.username ||
                'Unassigned Owner';

            const propertyBookings = activeRangeBookings.filter(
                (booking) => String(booking.propertyid) === String(prop.propertyid)
            );

            let propertySummary;

            if (isHotelProperty(prop) && parseRoomDetails(prop).length > 0) {
                const roomStock = [];
                const parsedRooms = parseRoomDetails(prop);

                parsedRooms.forEach((room, index) => {
                    const baseName = getRoomName(room, prop, index);
                    const baseQty = getRoomQuantity(room);

                    let peakBooked = 0;
                    let rangeBooked = 0;

                    const matchedBaseBookings = propertyBookings.filter((booking) => {
                            const roomInfo = extractRoomAndPackageFromRequest(
                                booking.request,
                                prop,
                                booking
                            );

                            const bookedBaseRoom = normalizeMatchText(roomInfo.roomName);
                            const bookedPackage = normalizeMatchText(roomInfo.packageName);
                            const normalizedBaseName = normalizeMatchText(baseName);

                            if (bookedBaseRoom === 'standard' && parsedRooms.length === 1) return true;

                            // Base room only counts direct room bookings.
                            // Package bookings must count under the package/variation row.
                            return bookedBaseRoom === normalizedBaseName && !bookedPackage;
                        });

                    if (rosterDays.length > 0) {
                        rosterDays.forEach((day) => {
                         const matchingBookingsForDay = matchedBaseBookings.filter((booking) =>
                        bookingOverlapsDay(booking, day)
                    );

                    console.log('MODERATOR DAILY ROOM COUNT DEBUG:', {
                        property: prop.propertyaddress || prop.propertyname,
                        room: baseName,
                        day,
                        matchingReservationIds: matchingBookingsForDay.map((b) => b.reservationid),
                        matchingBookings: matchingBookingsForDay.map((b) => ({
                            reservationid: b.reservationid,
                            checkIn: toYmd(b.checkindatetime),
                            checkOut: toYmd(b.checkoutdatetime),
                            rawCheckIn: b.checkindatetime,
                            rawCheckOut: b.checkoutdatetime
                        }))
                    });

                    const dayCount = matchingBookingsForDay.length;

                            if (dayCount > peakBooked) peakBooked = dayCount;
                        });
                    } else {
                        peakBooked = matchedBaseBookings.length;
                    }

                    rangeBooked = matchedBaseBookings.length;

                    const baseRemainingStock = Math.max(0, baseQty - peakBooked);

                    roomStock.push({
                        roomName: baseName,
                        roomLevel: 'base',
                        totalQty: baseQty,
                        bookedQty: peakBooked,
                        rangeBookedQty: rangeBooked,
                        remainingStock: baseRemainingStock
                    });

                    if (Array.isArray(room.options) && room.options.length > 0) {
                        room.options.forEach((opt) => {
                            const optQtyValue = parseInt(opt.quantity || opt.qty, 10);
                            const optQty = Number.isFinite(optQtyValue) && optQtyValue > 0
                                ? optQtyValue
                                : baseQty;

                            let optPeak = 0;
                            let optRange = 0;

                           const matchedVariationBookings = propertyBookings.filter((booking) => {
                            const roomInfo = extractRoomAndPackageFromRequest(
                                booking.request,
                                prop,
                                booking
                            );

                            const bookedBaseRoom = normalizeMatchText(roomInfo.roomName);
                            const bookedPackage = normalizeMatchText(roomInfo.packageName);
                            const normalizedBaseName = normalizeMatchText(baseName);
                            const normalizedOptionName = normalizeMatchText(opt.name);

                            // Package booking must match both:
                            // 1. same base room
                            // 2. same package name
                            return (
                                bookedBaseRoom === normalizedBaseName &&
                                bookedPackage === normalizedOptionName
                            );
                        });

                            if (rosterDays.length > 0) {
                                rosterDays.forEach((day) => {
                                    const count = matchedVariationBookings.filter((booking) =>
                                        bookingOverlapsDay(booking, day)
                                    ).length;

                                    if (count > optPeak) optPeak = count;
                                });
                            } else {
                                optPeak = matchedVariationBookings.length;
                            }

                            optRange = matchedVariationBookings.length;

                            const optRemainingStock = Math.max(0, optQty - optPeak);

                            roomStock.push({
                                roomName: opt.name,
                                roomLevel: 'variation',
                                parentRoom: baseName,
                                totalQty: optQty,
                                bookedQty: optPeak,
                                rangeBookedQty: optRange,
                                remainingStock: optRemainingStock
                            });
                        });
                    }
                });

                const hotelTotalQty = roomStock.reduce((sum, room) => sum + room.totalQty, 0);
                const hotelBookedQty = roomStock.reduce((sum, room) => sum + room.bookedQty, 0);
                const hotelRemainingStock = roomStock.reduce((sum, room) => sum + room.remainingStock, 0);

                propertySummary = {
                    id: prop.propertyid,
                    name: prop.propertyaddress || prop.propertyname || 'Unnamed Property',
                    isHotel: true,
                    totalQty: hotelTotalQty,
                    bookedQty: hotelBookedQty,
                    rangeBookedQty: propertyBookings.length,
                    remainingStock: hotelRemainingStock,
                    roomStock,
                };
            } else {
                const totalQty =
                    parseInt(prop.quantity || prop.propertyquantity || prop.propertyguestpaxno || 1, 10) || 1;

                let peakBooked = 0;
                const rangeBooked = propertyBookings.length;

                if (rosterDays.length > 0) {
                    rosterDays.forEach((day) => {
                        const count = propertyBookings.filter((booking) =>
                            bookingOverlapsDay(booking, day)
                        ).length;

                        if (count > peakBooked) peakBooked = count;
                    });
                } else {
                    peakBooked = propertyBookings.length;
                }

                propertySummary = {
                    id: prop.propertyid,
                    name: prop.propertyaddress || prop.propertyname || 'Unnamed Property',
                    isHotel: false,
                    totalQty,
                    bookedQty: peakBooked,
                    rangeBookedQty: rangeBooked,
                    remainingStock: Math.max(0, totalQty - peakBooked),
                    roomStock: [
                        {
                            roomName: 'Standard',
                            roomLevel: 'base',
                            totalQty,
                            bookedQty: peakBooked,
                            rangeBookedQty: rangeBooked,
                            remainingStock: Math.max(0, totalQty - peakBooked),
                        },
                    ],
                };
            }

            if (!acc[ownerName]) acc[ownerName] = [];
            acc[ownerName].push(propertySummary);

            return acc;
        }, {});

        return Object.entries(groupedByOwner)
            .map(([ownerName, properties]) => ({
                ownerName,
                properties: properties.sort((a, b) => a.name.localeCompare(b.name)),
            }))
            .sort((a, b) => a.ownerName.localeCompare(b.ownerName));
 }, [showDailyStock, activePropertiesForStock, activeRangeBookings, rosterDays, stockPropertySearch, stockRoleFilter]);

    const rosterTotalPages = Math.max(1, Math.ceil(activeRangeBookings.length / 15));

    const rosterBookingsOnPage = useMemo(() => {
        return activeRangeBookings.slice((rosterPage - 1) * 15, rosterPage * 15);
    }, [activeRangeBookings, rosterPage]);

    useEffect(() => {
        setRosterPage(1);
    }, [selectedRosterStartDate, selectedRosterEndDate, activeRangeBookings.length]);

   const clearRosterDates = () => {
    setSelectedRosterStartDate('');
    setSelectedRosterEndDate('');
    setStockPropertySearch('');
    setStockRoleFilter('all');
    setShowDailyStock(false);
    setRosterPage(1);
};

    const togglePropertyExpand = useCallback((propertyUniqueId) => {
        setExpandedProperties((prev) => ({
            ...prev,
            [propertyUniqueId]: !prev[propertyUniqueId]
        }));
    }, []);

    return (
        <div>
            {blackoutSuccess && (
                <div className="blackout-toast">{blackoutSuccess}</div>
            )}

            <div className="header-container">
                <div>
                    <h1 className="dashboard-page-title">Stock Management</h1>
                    <p className="dashboard-page-description">
                        Monitor room stock, booking occupancy, revenue summaries, commission, and blackout dates to manage property availability more accurately.
                    </p>
                </div>

                <div className="header-actions">
                    <button className="blackout-create-btn" onClick={() => setShowBlackoutModal(true)}>
                        🚫 Blackout Dates
                    </button>
                </div>
            </div>

            <div className="stock-summary-section">
                <div className="stock-summary-filter-bar">
                    <div className="stock-summary-filter-group">
                        <label className="stock-summary-label">View By</label>
                        <select
                            className="stock-summary-input"
                            value={summaryFilterType}
                            onChange={(e) => setSummaryFilterType(e.target.value)}
                        >
                            <option value="month">Month</option>
                            <option value="date">Date Range</option>
                        </select>
                    </div>

                    {summaryFilterType === 'month' ? (
                        <div className="stock-summary-filter-group">
                            <label className="stock-summary-label">Month</label>
                            <input
                                type="month"
                                className="stock-summary-input"
                                value={summaryMonth}
                                onChange={(e) => setSummaryMonth(e.target.value)}
                            />
                        </div>
                    ) : (
                        <>
                            <div className="stock-summary-filter-group">
                                <label className="stock-summary-label">Start Date</label>
                                <input
                                    type="date"
                                    className="stock-summary-input"
                                    value={summaryStartDate}
                                    onChange={(e) => setSummaryStartDate(e.target.value)}
                                />
                            </div>

                            <div className="stock-summary-filter-group">
                                <label className="stock-summary-label">End Date</label>
                                <input
                                    type="date"
                                    className="stock-summary-input"
                                    value={summaryEndDate}
                                    onChange={(e) => setSummaryEndDate(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="stock-summary-cards">
                    <div className="stock-summary-card">
                        <div className="stock-summary-card-title">Total Revenue</div>
                        <div className="stock-summary-card-value">{formatCurrency(totalRevenue)}</div>
                        <div className="stock-summary-card-subtitle">
                            {summaryFilterType === 'month' ? summaryMonth : 'Selected date range'}
                        </div>
                    </div>

                    <div className="stock-summary-card">
                        <div className="stock-summary-card-title">Total Commission</div>
                        <div className="stock-summary-card-value">{formatCurrency(totalCommission)}</div>
                        <div className="stock-summary-card-subtitle">
                            {summaryFilterType === 'month' ? summaryMonth : 'Selected date range'}
                        </div>
                    </div>

                    <div
                        className="stock-summary-card blackout-summary-card"
                        onClick={handleScrollToBlackouts}
                        title="Click to view blackout details"
                    >
                        <div className="stock-summary-card-title">Active Blackouts</div>
                        <div className="stock-summary-card-value blackout-count">{activeBlackouts.length}</div>

                        <div className="blackout-card-breakdown">
                            {moderatorBlackouts.length > 0 && (
                                <span className="moderator-blackout-pill">
                                    ⚠️ {moderatorBlackouts.length} by moderator{moderatorBlackouts.length !== 1 ? 's' : ''}
                                </span>
                            )}

                            <span className="blackout-card-link">View details →</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="room-planner-container">
                <StockManagerRoomPlannerCalendar
                    highlightBooking={calendarHighlight}
                    onJumpToTable={handleJumpToTable}
                    blackoutDates={calendarBlackouts}
                />
            </div>

          <div className="daily-roster-container">
    <div className="roster-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div>
                <h3 className="roster-title">📋 Daily Occupancy & Stock</h3>
                <p className="roster-description">
                    Select a date range, search by property, filter by role, then click Load Daily Stock to view booked rooms, remaining stock, and active bookings for that period.
                </p>
            </div>
        </div>

        <div className="roster-controls">
            <div className="roster-range-controls">
                <div className="roster-range-group">
                    <label>From</label>
                    <input
                        type="date"
                        value={selectedRosterStartDate}
                        onChange={(e) => {
                            const newStart = e.target.value;
                            setSelectedRosterStartDate(newStart);

                            if (selectedRosterEndDate && selectedRosterEndDate < newStart) {
                                setSelectedRosterEndDate('');
                            }

                            setShowDailyStock(false);
                        }}
                        className="roster-date-picker"
                    />
                </div>

                <div className="roster-range-group">
                    <label>To</label>
                    <input
                        type="date"
                        min={selectedRosterStartDate || todayYmd}
                        value={selectedRosterEndDate}
                        onChange={(e) => {
                            setSelectedRosterEndDate(e.target.value);
                            setShowDailyStock(false);
                        }}
                        className="roster-date-picker"
                    />
                </div>

                <div className="roster-range-group">
                    <label>Search Property</label>
                    <input
                        type="text"
                        value={stockPropertySearch}
                        onChange={(e) => setStockPropertySearch(e.target.value)}
                        className="roster-date-picker"
                        placeholder="Search property..."
                    />
                </div>

                <div className="roster-range-group">
                    <label>Role</label>
                    <select
                        value={stockRoleFilter}
                        onChange={(e) => setStockRoleFilter(e.target.value)}
                        className="roster-date-picker"
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="moderator">Moderator</option>
                    </select>
                </div>

                {!showDailyStock ? (
                    <button
                    className="roster-view-btn"
                    onClick={async () => {
                        if (!selectedRosterStartDate || !selectedRosterEndDate) {
                            alert('Please select From and To dates first.');
                            return;
                        }

                        await queryClient.invalidateQueries({ queryKey: ['reservations', currentUserId, userGroup] });
                        await refetchReservations();

                        setShowDailyStock(true);
                    }}
                >
                    Load Daily Stock
                </button>
                ) : (
                    <>
                        <button className="roster-clear-btn" onClick={clearRosterDates}>
                            Clear Dates
                        </button>

                        <button
                            className="roster-clear-btn"
                            onClick={() => setShowDailyStock(false)}
                        >
                            Hide Daily Stock
                        </button>

                        <div className="roster-summary-badge">
                            <span style={{ fontWeight: 'bold' }}>{activeRangeBookings.length}</span> Active Bookings
                        </div>
                    </>
                )}
            </div>
        </div>
    </div>

    {!showDailyStock ? (
        <div className="roster-empty-state">
            <span style={{ fontSize: '2rem' }}>🛏️</span>
            <p>Please select From and To dates, then click “Load Daily Stock”.</p>
        </div>
    ) : (
        <>
            {ownerStockSummary.length > 0 && (
                <div className="owner-stock-list">
                    {ownerStockSummary.map((owner) => (
                        <div key={owner.ownerName} className="owner-stock-group">
                            <div className="stock-tracker-header owner-stock-group-header">
                                <span
                                    className="stock-tracker-name owner-stock-group-title"
                                    title={owner.ownerName}
                                >
                                    {owner.ownerName}
                                </span>
                            </div>

                            <div
                                className="owner-properties-list"
                                style={{
                                    alignItems: 'flex-start',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                    gap: '16px'
                                }}
                            >
                                {owner.properties.map((property) => {
                                    const occupancyPercentage =
                                        property.totalQty > 0
                                            ? Math.min(100, Math.round((property.bookedQty / property.totalQty) * 100))
                                            : 0;

                                    const uniquePropertyKey = `${property.id}-${property.name}`;
                                    const isExpanded = !!expandedProperties[uniquePropertyKey];

                                    const groupedBaseRooms = property.roomStock.filter(
                                        (room) => room.roomLevel !== 'variation'
                                    );

                                    const groupedVariationRooms = property.roomStock.filter(
                                        (room) => room.roomLevel === 'variation'
                                    );

                                    return (
                                        <div
                                            key={uniquePropertyKey}
                                            className={`hotel-stock-card ${
                                                property.remainingStock === 0
                                                    ? 'sold-out'
                                                    : property.bookedQty > 0
                                                        ? 'available-active'
                                                        : 'available'
                                            }`}
                                        >
                                            <div className="hotel-stock-top">
                                                <div>
                                                    <div className="hotel-stock-name">{property.name}</div>
                                                    <div className="hotel-stock-sub">
                                                        {property.isHotel ? 'Room stock summary' : 'Unit stock summary'}
                                                    </div>
                                                </div>

                                                <div className={`hotel-stock-badge ${property.remainingStock === 0 ? 'sold-out' : ''}`}>
                                                    {property.remainingStock === 0 ? 'Sold Out' : `${property.remainingStock} Left`}
                                                </div>
                                            </div>

                                            <div
                                                className="hotel-stock-progress-wrap"
                                                style={{
                                                    width: '100%',
                                                    height: '8px',
                                                    backgroundColor: '#e2e8f0',
                                                    borderRadius: '4px',
                                                    overflow: 'hidden',
                                                    margin: '12px 0'
                                                }}
                                            >
                                                <div
                                                    className="hotel-stock-progress-bar"
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        display: 'block'
                                                    }}
                                                >
                                                    <div
                                                        className="hotel-stock-progress-fill"
                                                        style={{
                                                            height: '100%',
                                                            display: 'block',
                                                            width: `${occupancyPercentage}%`,
                                                            backgroundColor:
                                                                property.remainingStock === 0
                                                                    ? '#ef4444'
                                                                    : occupancyPercentage >= 75
                                                                        ? '#f59e0b'
                                                                        : '#3b82f6',
                                                            transition: 'width 0.5s ease-in-out'
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div
                                                className="hotel-stock-summary-row compact"
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    fontSize: '13px',
                                                    color: '#64748b',
                                                    marginTop: '8px'
                                                }}
                                            >
                                                <span>Total: <strong style={{ color: '#334155' }}>{property.totalQty}</strong></span>
                                                <span>Booked: <strong style={{ color: '#334155' }}>{property.bookedQty}</strong></span>
                                                <span
                                                    className="left-value"
                                                    style={{
                                                        color: property.remainingStock === 0 ? '#ef4444' : '#10b981',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    Left: {property.remainingStock}
                                                </span>
                                            </div>

                                            <div className="hotel-variation-section" style={{ marginTop: '12px' }}>
                                                <button
                                                    type="button"
                                                    className="variation-toggle-btn"
                                                    onClick={() => togglePropertyExpand(uniquePropertyKey)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '6px',
                                                        background: '#f8fafc',
                                                        color: '#475569',
                                                        fontSize: '13px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    {isExpanded ? 'Hide room details' : 'Show room details'}
                                                </button>

                                                {isExpanded && (
                                                    <div
                                                        className="stock-room-breakdown pretty-grid"
                                                        style={{
                                                            marginTop: '12px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '10px'
                                                        }}
                                                    >
                                                        {groupedBaseRooms.map((room) => {
                                                            const variations = groupedVariationRooms.filter(
                                                                (variation) => variation.parentRoom === room.roomName
                                                            );

                                                            const roomOccupancy =
                                                                room.totalQty > 0
                                                                    ? Math.min(100, Math.round((room.bookedQty / room.totalQty) * 100))
                                                                    : 0;

                                                            return (
                                                                <div
                                                                    key={`${property.id}-${room.roomName}`}
                                                                    className="room-group-card"
                                                                    style={{
                                                                        padding: '10px',
                                                                        backgroundColor: '#f1f5f9',
                                                                        borderRadius: '8px',
                                                                        border: '1px solid #e2e8f0'
                                                                    }}
                                                                >
                                                                    <div className="stock-room-item card-style base-row">
                                                                        <div
                                                                            className="stock-room-main"
                                                                            style={{
                                                                                display: 'flex',
                                                                                justifyContent: 'space-between',
                                                                                alignItems: 'center',
                                                                                marginBottom: '6px'
                                                                            }}
                                                                        >
                                                                            <span
                                                                                className="stock-room-name"
                                                                                style={{
                                                                                    fontWeight: 'bold',
                                                                                    fontSize: '14px',
                                                                                    color: '#1e293b'
                                                                                }}
                                                                            >
                                                                                {room.roomName}
                                                                            </span>

                                                                            <span
                                                                                className={`stock-room-left ${room.remainingStock <= 1 ? 'low' : ''}`}
                                                                                style={{
                                                                                    fontSize: '12px',
                                                                                    fontWeight: 'bold',
                                                                                    padding: '2px 8px',
                                                                                    borderRadius: '12px',
                                                                                    backgroundColor: room.remainingStock === 0 ? '#fee2e2' : '#dcfce7',
                                                                                    color: room.remainingStock === 0 ? '#b91c1c' : '#15803d'
                                                                                }}
                                                                            >
                                                                                {room.remainingStock} left
                                                                            </span>
                                                                        </div>

                                                                        <div
                                                                            style={{
                                                                                width: '100%',
                                                                                height: '6px',
                                                                                backgroundColor: '#e2e8f0',
                                                                                borderRadius: '3px',
                                                                                overflow: 'hidden',
                                                                                marginBottom: '8px'
                                                                            }}
                                                                        >
                                                                            <div
                                                                                style={{
                                                                                    height: '100%',
                                                                                    display: 'block',
                                                                                    width: `${roomOccupancy}%`,
                                                                                    backgroundColor:
                                                                                        room.remainingStock === 0
                                                                                            ? '#ef4444'
                                                                                            : roomOccupancy >= 75
                                                                                                ? '#f59e0b'
                                                                                                : '#3b82f6',
                                                                                    transition: 'width 0.5s ease-in-out'
                                                                                }}
                                                                            />
                                                                        </div>

                                                                        <div
                                                                            className="stock-room-meta"
                                                                            style={{
                                                                                display: 'flex',
                                                                                justifyContent: 'space-between',
                                                                                fontSize: '12px',
                                                                                color: '#64748b'
                                                                            }}
                                                                        >
                                                                            <span>Total: {room.totalQty}</span>
                                                                            <span>Booked: {room.bookedQty}</span>
                                                                        </div>
                                                                    </div>

                                                                    {variations.length > 0 && (
                                                                        <div
                                                                            className="variation-list"
                                                                            style={{
                                                                                marginTop: '8px',
                                                                                display: 'flex',
                                                                                flexDirection: 'column',
                                                                                gap: '6px',
                                                                                paddingLeft: '10px',
                                                                                borderLeft: '2px solid #cbd5e1'
                                                                            }}
                                                                        >
                                                                            {variations.map((variation) => {
                                                                                const varOccupancy =
                                                                                    variation.totalQty > 0
                                                                                        ? Math.min(100, Math.round((variation.bookedQty / variation.totalQty) * 100))
                                                                                        : 0;

                                                                                return (
                                                                                    <div
                                                                                        key={`${property.id}-${variation.roomName}`}
                                                                                        className="stock-room-item card-style variation-row"
                                                                                        style={{
                                                                                            padding: '8px',
                                                                                            backgroundColor: '#fff',
                                                                                            borderRadius: '6px',
                                                                                            border: '1px solid #e2e8f0'
                                                                                        }}
                                                                                    >
                                                                                        <div
                                                                                            className="stock-room-main"
                                                                                            style={{
                                                                                                display: 'flex',
                                                                                                justifyContent: 'space-between',
                                                                                                alignItems: 'center',
                                                                                                marginBottom: '4px'
                                                                                            }}
                                                                                        >
                                                                                            <span
                                                                                                className="stock-room-name"
                                                                                                style={{
                                                                                                    fontSize: '13px',
                                                                                                    color: '#334155'
                                                                                                }}
                                                                                            >
                                                                                                {variation.roomName}
                                                                                            </span>

                                                                                            <span
                                                                                                className={`stock-room-left ${variation.remainingStock <= 1 ? 'low' : ''}`}
                                                                                                style={{
                                                                                                    fontSize: '11px',
                                                                                                    fontWeight: 'bold',
                                                                                                    color: variation.remainingStock === 0 ? '#dc2626' : '#16a34a'
                                                                                                }}
                                                                                            >
                                                                                                {variation.remainingStock} left
                                                                                            </span>
                                                                                        </div>

                                                                                        <div
                                                                                            style={{
                                                                                                width: '100%',
                                                                                                height: '4px',
                                                                                                backgroundColor: '#f1f5f9',
                                                                                                borderRadius: '2px',
                                                                                                overflow: 'hidden',
                                                                                                marginBottom: '6px'
                                                                                            }}
                                                                                        >
                                                                                            <div
                                                                                                style={{
                                                                                                    height: '100%',
                                                                                                    display: 'block',
                                                                                                    width: `${varOccupancy}%`,
                                                                                                    backgroundColor:
                                                                                                        variation.remainingStock === 0
                                                                                                            ? '#fca5a5'
                                                                                                            : varOccupancy >= 75
                                                                                                                ? '#fcd34d'
                                                                                                                : '#93c5fd',
                                                                                                    transition: 'width 0.5s ease-in-out'
                                                                                                }}
                                                                                            />
                                                                                        </div>

                                                                                        <div
                                                                                            className="stock-room-meta"
                                                                                            style={{
                                                                                                display: 'flex',
                                                                                                justifyContent: 'space-between',
                                                                                                fontSize: '11px',
                                                                                                color: '#94a3b8'
                                                                                            }}
                                                                                        >
                                                                                            <span>Total: {variation.totalQty}</span>
                                                                                            <span>Booked: {variation.bookedQty}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeRangeBookings.length === 0 ? (
                <div className="roster-empty-state">
                    <span style={{ fontSize: '2rem' }}>🛏️</span>
                    <p>No active reservations in the selected date range.</p>
                </div>
            ) : (
                <>
                    <div className="roster-grid">
                        {rosterBookingsOnPage.map((booking) => {
                            const statusLower = booking.reservationstatus?.toLowerCase() || '';

                            let statusClass = 'status-default';

                            if (statusLower.includes('paid') && !statusLower.includes('partially')) {
                                statusClass = 'status-paid';
                            }

                            if (statusLower.includes('partially')) {
                                statusClass = 'status-partially';
                            }

                            if (statusLower.includes('accepted')) {
                                statusClass = 'status-accepted';
                            }

                            return (
                                <div key={booking.reservationid} className="roster-card">
                                    <div className="roster-card-header">
                                        <strong className="roster-guest-name">
                                            {booking.rcfirstname} {booking.rclastname}
                                        </strong>

                                        <span className={`roster-status-badge ${statusClass}`}>
                                            {booking.reservationstatus}
                                        </span>
                                    </div>

                                    <div className="roster-card-body">
                                        <p><strong>Property:</strong> {booking.propertyaddress}</p>

                                        <p>
                                            <strong>Room:</strong>{' '}
                                            {extractRoomFromRequest(
                                                booking.request,
                                                propertiesById[booking.propertyid] || booking,
                                                booking
                                            )}
                                        </p>

                                       <div className="roster-dates">
                                    <span>Check-in: {formatDateDisplay(booking.checkindatetime)}</span>
                                    <span>Check-out: {formatDateDisplay(booking.checkoutdatetime)}</span>
                                </div>

                                <div
                                    style={{
                                        marginTop: '6px',
                                        fontSize: '12px',
                                        color: '#64748b',
                                        fontWeight: '600'
                                    }}
                                >
                                    Occupied stock date{formatDateDisplay(booking.checkindatetime) !== formatDateDisplay(getCheckoutExclusiveLastNight(booking.checkoutdatetime)) ? 's' : ''}: {' '}
                                    {formatDateDisplay(booking.checkindatetime)}
                                    {formatDateDisplay(booking.checkindatetime) !== formatDateDisplay(getCheckoutExclusiveLastNight(booking.checkoutdatetime))
                                        ? ` - ${formatDateDisplay(getCheckoutExclusiveLastNight(booking.checkoutdatetime))}`
                                        : ''}
                                </div>
                                     </div>

                                    <button
                                        className="roster-view-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRowClick(booking);
                                        }}
                                    >
                                        View Details
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <PaginationControls
                        currentPage={rosterPage}
                        totalPages={rosterTotalPages}
                        onPageChange={setRosterPage}
                    />
                </>
            )}
        </>
    )}
</div>

            <div className="stock-manager-filter-box">
                <div className="stock-manager-search-box">
                    <SearchBar
                        value={searchKey}
                        onChange={(newValue) => {
                            setSearchKey(newValue);
                            setTableCurrentPage(1);
                        }}
                        placeholder="Search reservations..."
                    />
                </div>

                <Filter filters={filters} onApplyFilters={handleApplyFilters} />
            </div>

            {reservationsLoading ? (
                <div className="loader-box"><Loader /></div>
            ) : (
                <PaginatedTable
                    data={filteredReservations}
                    columns={columns}
                    rowKey="reservationid"
                    enableCheckbox={false}
                    onRowClick={handleRowClick}
                    highlightedRowKey={tableHighlightReservationId}
                    currentPage={tableCurrentPage}
                    onPageChange={setTableCurrentPage}
                    rowsPerPage={tableRowsPerPage}
                />
            )}

            <div ref={blackoutTableRef}>
                {blackoutsLoading ? (
                    <div className="loader-box"><Loader /></div>
                ) : (
                    <BlackoutTable
                        blackouts={blackoutsData}
                        propertiesById={propertiesById}
                        onOverride={handleOverrideClick}
                        onDelete={handleDeleteClick}
                        isAdmin={isAdmin}
                        currentUserId={currentUserId}
                    />
                )}
            </div>

            <Modal
                isOpen={!!selectedReservation}
                title={'Reservation Details'}
                data={selectedReservation || {}}
                labels={displayLabels}
                onClose={() => setSelectedReservation(null)}
            />

            <BlackoutModal
                isOpen={showBlackoutModal}
                onClose={() => setShowBlackoutModal(false)}
                onConfirm={handleBlackoutConfirm}
                properties={propertiesList}
            />

            <OverrideModal
                isOpen={showOverrideModal}
                blackout={selectedBlackout}
                onClose={() => {
                    setShowOverrideModal(false);
                    setSelectedBlackout(null);
                }}
                onConfirm={handleOverrideConfirm}
            />

            <DeleteBlackoutModal
                isOpen={showDeleteModal}
                blackout={selectedBlackout}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSelectedBlackout(null);
                }}
                onConfirm={handleDeleteConfirm}
                isSubmitting={deleteBlackoutMutation.isPending}
            />
        </div>
    );
};

export default StockManager;