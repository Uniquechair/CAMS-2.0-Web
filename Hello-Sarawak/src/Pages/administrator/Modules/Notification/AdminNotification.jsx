import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../../../../../Api/api';
import './AdminNotification.css';

function AdminNotification() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const storedId = localStorage.getItem('userid') || localStorage.getItem('userId');
  const userId = storedId ? Number(storedId) : null;

  const loadNotifications = async () => {
    try {
      setLoading(true);

      const data = await fetchNotifications(userId);

      const adminBookingAlerts = (data || []).filter((item) =>
        [
          'Booking Paid',
          'Booking Partially Paid',
          'Booking Cancellation'
        ].includes(item.notificationtype)
      );

      setNotifications(adminBookingAlerts);
    } catch (error) {
      console.error('Failed to load admin notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
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
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
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
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const formatMalaysiaDateTime = (dateValue) => {
    if (!dateValue) return 'N/A';

    return new Date(dateValue).toLocaleString('en-MY', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="admin-notification-page">
      <div className="admin-notification-header">
        <button
          className="admin-back-btn"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <div>
          <h1>Notification History</h1>
          <p>View booking payment and cancellation alerts.</p>
        </div>

        <button
          className="admin-mark-read-btn"
          onClick={handleMarkAllRead}
        >
          Mark All as Read
        </button>
      </div>

      <div className="admin-notification-filters">
        {[
          'All',
          'Unread',
          'Read',
          'Booking Paid',
          'Booking Partially Paid',
          'Booking Cancellation'
        ].map((item) => (
          <button
            key={item}
            className={`admin-filter-btn ${filter === item ? 'active' : ''}`}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="admin-notification-list-container">
        {loading ? (
          <p className="admin-notification-empty">Loading notifications...</p>
        ) : filteredNotifications.length === 0 ? (
          <p className="admin-notification-empty">No notifications found.</p>
        ) : (
          <>
            {paginatedNotifications.map((item) => (
              <div
                key={item.notificationid}
                className={`admin-notification-card ${!item.isread ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(item)}
              >
                <div className="admin-notification-card-top">
                  <h3>{item.notificationtitle}</h3>

                  <span className={`admin-status-badge ${item.isread ? 'read' : 'unread'}`}>
                    {item.isread ? 'Read' : 'Unread'}
                  </span>
                </div>

                <p className="admin-notification-message">
                  {item.notificationmessage}
                </p>

                <div className="admin-notification-meta">
                  <span className="admin-notification-type">
                    {item.notificationtype}
                  </span>

                  <span className="admin-notification-date">
                    {formatMalaysiaDateTime(item.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="admin-notification-pagination">
                <button
                  className="admin-pagination-btn"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>

                <div className="admin-pagination-numbers">
                  {getPageNumbers().map((page, index) =>
                    page === '...' ? (
                      <span
                        key={`dots-${index}`}
                        className="admin-pagination-dots"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        className={`admin-pagination-number ${currentPage === page ? 'active' : ''}`}
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  className="admin-pagination-btn"
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

export default AdminNotification;