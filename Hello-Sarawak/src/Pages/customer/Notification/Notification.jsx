import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    syncBookingAlertNotifications
} from '../../../../Api/api';
import './Notification.css';

function Notification() {
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('All');
    const [loading, setLoading] = useState(true);

    // NEW: Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const storedId = localStorage.getItem('userId') || localStorage.getItem('userid');
    const userId = storedId ? Number(storedId) : null;

    useEffect(() => {
        const loadNotifications = async () => {
            try {
                setLoading(true);

                await syncBookingAlertNotifications(userId);
                const data = await fetchNotifications(userId);

                setNotifications(data || []);
            } catch (error) {
                console.error('Failed to load notifications:', error);
                setNotifications([]);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            loadNotifications();
        }
    }, [userId]);

    const filteredNotifications = notifications.filter((item) => {
        if (filter === 'All') return true;
        if (filter === 'Unread') return item.isread === false;
        if (filter === 'Read') return item.isread === true;
        return item.notificationtype === filter;
    });

    // NEW: Reset to first page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    // NEW: Pagination calculation
    const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

    // NEW: Pagination button functions
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleNotificationClick = async (item) => {
        try {
            if (!item.isread) {
                await markNotificationAsRead(item.notificationid);

                setNotifications((prev) =>
                    prev.map((n) =>
                        n.notificationid === item.notificationid
                            ? { ...n, isread: true, notificationstatus: 'Read' }
                            : n
                    )
                );
            }

            /*if (item.propertyid) {
                navigate(`/product/${item.propertyid}`);
            }*/
        } catch (error) {
            console.error('Failed to open notification:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsAsRead(userId);

            setNotifications((prev) =>
                prev.map((n) => ({
                    ...n,
                    isread: true,
                    notificationstatus: 'Read'
                }))
            );
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const getPageNumbers = () => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        if (currentPage <= 3) {
            return [1, 2, 3, 4, '...', totalPages];
        }

        if (currentPage >= totalPages - 2) {
            return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }

        return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    };

    return (
        <div className="notification-page">
            <div className="notification-header">
                <button
                    className="back-btn"
                    onClick={() => navigate(-1)}
                >
                    ← Back
                </button>

                <div>
                    <h1>Notification History</h1>
                    <p>View your latest and previous notifications.</p>
                </div>

                <button className="mark-read-btn" onClick={handleMarkAllRead}>
                    Mark All as Read
                </button>
            </div>

            <div className="notification-filters">
                {['All', 'Unread', 'Read', 'Payment Reminder', 'Upcoming Booking'].map((item) => (
                    <button
                        key={item}
                        className={`filter-btn ${filter === item ? 'active' : ''}`}
                        onClick={() => setFilter(item)}
                    >
                        {item}
                    </button>
                ))}
            </div>

            <div className="notification-list-container">
                {loading ? (
                    <p className="notification-empty">Loading notifications...</p>
                ) : filteredNotifications.length === 0 ? (
                    <p className="notification-empty">No notifications found.</p>
                ) : (
                    <>
                        {paginatedNotifications.map((item) => (
                            <div
                                key={item.notificationid}
                                className={`notification-card ${!item.isread ? 'unread' : ''}`}
                                onClick={() => handleNotificationClick(item)}
                            >
                                <div className="notification-card-top">
                                    <h3>{item.notificationtitle}</h3>
                                    <span className={`status-badge ${item.isread ? 'read' : 'unread'}`}>
                                        {item.isread ? 'Read' : 'Unread'}
                                    </span>
                                </div>

                                <p className="notification-message">
                                    {item.notificationmessage}
                                </p>

                                <div className="notification-meta">
                                    <span className="notification-type">{item.notificationtype}</span>
                                    <span className="notification-date">
                                        {new Date(item.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* NEW: Pagination */}
                        {totalPages > 1 && (
                            <div className="notification-pagination">
                                <button
                                    className="pagination-btn"
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </button>

                                <div className="pagination-numbers">
                                    {getPageNumbers().map((page, index) => (
                                        page === '...' ? (
                                            <span key={`dots-${index}`} className="pagination-dots">
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                key={page}
                                                className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                                                onClick={() => goToPage(page)}
                                            >
                                                {page}
                                            </button>
                                        )
                                    ))}
                                </div>

                                <button
                                    className="pagination-btn"
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default Notification;