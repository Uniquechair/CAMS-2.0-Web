import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { useNavigate } from 'react-router-dom';
import '../../../../Component/MainContent/MainContent.css';
import DashboardCard from '../../../../Component/DashboardCard/DashboardCard';
import { FaBell } from 'react-icons/fa';
import {
  fetchNotifications
} from '../../../../../Api/api';

const Dashboard = () => {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const getCurrentUserId = () => {
    return localStorage.getItem('userid') || localStorage.getItem('userId');
  };

  const fetchNavbarNotifications = async () => {
    try {
      setLoading(true);

      const userId = getCurrentUserId();

      if (!userId) {
        throw new Error('User ID not found');
      }

      const data = await fetchNotifications(userId);

      const bookingAlerts = (data || []).filter((item) =>
        [
          'Booking Paid',
          'Booking Partially Paid',
          'Booking Cancellation'
        ].includes(item.notificationtype)
      );

      setNotifications(bookingAlerts);
    } catch (err) {
      console.error('Error fetching booking alert notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    navigate('/admin/notifications');
  };

  useEffect(() => {
    fetchNavbarNotifications();
  }, []);

  return (
    <div>
      <div className="header-container">
        <h1 className="dashboard-page-title">Dashboard</h1>

        <div className="notification-container">
          <div className="notification-badge">
            <FaBell
              className="notification_icon"
              onClick={handleBellClick}
            />

            {!loading && notifications.filter((item) => !item.isread).length > 0 && (
              <span className="badge-count">
                {notifications.filter((item) => !item.isread).length}
              </span>
            )}
          </div>
        </div>
      </div>

      <DashboardCard />
    </div>
  );
};

export default Dashboard;