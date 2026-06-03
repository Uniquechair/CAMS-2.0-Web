import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from '../../Component/Sidebar/Sidebar';
import Dashboard from './Modules/Dashboard/Dashboard';
import Customers from './Modules/Customers/Customers';
import PropertyListing from './Modules/Property Listing/PropertyListing';
import Reservations from './Modules/Reservations/Reseravtions';
import StockManager from './Modules/Stock Manager/StockManager';
import BooknPayLog from './Modules/BooknPay Log/BooknPayLog';
import Finance from './Modules/Finance/Finances';
import LedgerPage from './Modules/Ledger/LedgerPage';
import NoAccess from '../../Component/NoAccess/NoAccess';
import Profile from './Modules/Profile/Profile';
import AuditTrails from './Modules/Audit Trails/AuditTrails';
import ModeratorReview from './Modules/ModeratorReview/ModeratorReview';
import ModeratorFAQ from './Modules/FAQ/ModeratorFAQ';
import '../../Component/MainContent/MainContent.css';

import { FiCalendar, FiUsers, FiHome, FiStar, FiHelpCircle } from 'react-icons/fi';
import { CgProfile } from "react-icons/cg";
import { GoLog } from "react-icons/go";
import { FaHotel, FaHistory, FaFileInvoiceDollar } from 'react-icons/fa';
import { VscGraphLine } from "react-icons/vsc";
import { useQuery } from '@tanstack/react-query';
import { fetchUserData } from '../../../Api/api';

const ModeratorDashboard = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [usergroup, setusergroup] = useState('');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const navigate = useNavigate();
    const userID = localStorage.getItem('userid');

    const { data: userData } = useQuery({
        queryKey: ['userData', userID],
        queryFn: () => fetchUserData(userID),
        enabled: !!isLoggedIn && !!userID,
        staleTime: 0,
        refetchInterval: 1000,
        refetchIntervalInBackground: true,
    });

    useEffect(() => {
        if (userData?.uactivation === "Inactive") {
            handleLogout();
            navigate('/no-access');
        }
    }, [userData?.uactivation, navigate]);

    useEffect(() => {
        checkAndRedirect();

        const checkInterval = setInterval(() => {
            checkAndRedirect();
        }, 3000);

        function checkAndRedirect() {
            const loggedInStatus = localStorage.getItem('isLoggedIn');
            const usergroupStatus = localStorage.getItem('usergroup');

            setIsLoggedIn(loggedInStatus === 'true');
            setusergroup(usergroupStatus);

            if (loggedInStatus !== 'true' || usergroupStatus !== 'Moderator') {
                navigate('/no-access');
            }
        }

        return () => clearInterval(checkInterval);
    }, [navigate]);

    const handleLogout = () => {
        localStorage.clear();
        setIsLoggedIn(false);
        setusergroup('');
    };

    if (!isLoggedIn || usergroup !== 'Moderator') {
        return <div>Loading...</div>;
    }

    const links = [
        { path: '/moderator_dashboard/dashboard', label: 'Dashboard', icon: <FiHome /> },
        { path: '/moderator_dashboard/customers', label: 'Customer', icon: <FiUsers /> },
        { path: '/moderator_dashboard/property-listing', label: 'PropertyListing', icon: <FaHotel /> },
        //{ path: '/moderator_dashboard/reservations', label: 'Reservations', icon: <FiCalendar /> },
        { path: '/moderator_dashboard/stock-manager', label: 'StockManager', icon: <FaHotel /> },
        { path: '/moderator_dashboard/booknpay-log', label: 'BooknPayLog', icon: <GoLog /> },
        { path: '/moderator_dashboard/audit-trails', label: 'AuditTrails', icon: <FaHistory /> },
        { path: '/moderator_dashboard/ledger', label: 'Ledger', icon: <FaFileInvoiceDollar /> },
        { path: '/moderator_dashboard/finance', label: 'Finance', icon: <VscGraphLine /> },
        { path: '/moderator_dashboard/reviews', label: 'Customer Reviews', icon: <FiStar /> },
        { path: '/moderator_dashboard/faq', label: 'FAQ', icon: <FiHelpCircle /> },
        { path: '/moderator_dashboard/profile', label: 'Profile', icon: <CgProfile /> },
    ];

    return (
        <div className={`dashboard-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebar
                title="Moderator"
                links={links}
                isCollapsed={isSidebarCollapsed}
                toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                handleLogout={handleLogout}
            />

            <div className="dashboard-content">
                <Routes>
                    <Route path="/" element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="property-listing" element={<PropertyListing />} />
                    <Route path="reservations" element={<Reservations />} />
                    <Route path="stock-manager" element={<StockManager />} />
                    <Route path="booknpay-log" element={<BooknPayLog />} />
                    <Route path="audit-trails" element={<AuditTrails />} />
                    <Route path="ledger" element={<LedgerPage />} />
                    <Route path="finance" element={<Finance />} />
                    <Route path="reviews" element={<ModeratorReview />} />
                    <Route path="faq" element={<ModeratorFAQ />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="*" element={<NoAccess />} />
                </Routes>
            </div>
        </div>
    );
};

export default ModeratorDashboard;