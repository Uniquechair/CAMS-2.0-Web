import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from '../../Component/Sidebar/Sidebar';
import Dashboard from './Modules/Dashboard/Dashboard';
import PropertyListing from './Modules/Property Listing/PropertyListing';

// import Administrators from './Modules/Administrators/Administrators';
// import Moderators from './Modules/Moderators/Moderators';
// import Customers from './Modules/Customers/Customers';

import RolesManagement from './Modules/Roles/RolesManagement';

//import Reservations from './Modules/Reservations/Reservations';
import StockManager from './Modules/Stock Manager/StockManager';
import BooknPayLog from './Modules/BooknPay Log/BooknPayLog';
import Finance from './Modules/Finance/Finances';
import LedgerPage from './Modules/Ledger/LedgerPage';
import NoAccess from '../../Component/NoAccess/NoAccess';
import Profile from './Modules/Profile/Profile';
import AuditTrails from './Modules/Audit Trails/AuditTrails';
import AdminReview from './Modules/AdminReview/AdminReview';
import AdminFAQ from './Modules/FAQ/AdminFAQ';

import { FiHome, FiUsers, FiCalendar, FiStar } from 'react-icons/fi';
import { GoLog } from "react-icons/go";
import { FaHotel, FaHistory, FaFileInvoiceDollar } from 'react-icons/fa';
import { FaQuestionCircle } from "react-icons/fa";
import { VscGraphLine } from "react-icons/vsc";
import { CgProfile } from "react-icons/cg";

import '../../Component/MainContent/MainContent.css';
import { useQuery } from '@tanstack/react-query';
import { fetchUserData } from '../../../Api/api';

const AdminDashboard = () => {
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

            if (loggedInStatus !== 'true' || usergroupStatus !== 'Administrator') {
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

    if (!isLoggedIn || usergroup !== 'Administrator') {
        return <div>Loading...</div>;
    }

    const links = [
    { path: '/administrator_dashboard/dashboard', label: 'Dashboard', icon: <FiHome /> },

    // { path: '/administrator_dashboard/customers', label: 'Customer', icon: <FiUsers /> },
    // { path: '/administrator_dashboard/moderators', label: 'Moderator', icon: <FaBuildingUser /> },
    // { path: '/administrator_dashboard/administrators', label: 'Administrator', icon: <FaUserTie /> },

    { path: '/administrator_dashboard/roles', label: 'Role Management', icon: <FiUsers /> },

    { path: '/administrator_dashboard/property-listing', label: 'PropertyListing', icon: <FaHotel /> },
    // { path: '/administrator_dashboard/reservations', label: 'Reservation', icon: <FiCalendar /> },
    { path: '/administrator_dashboard/stock-manager', label: 'StockManager', icon: <FaHotel /> },
    { path: '/administrator_dashboard/booknpay-log', label: 'BooknPayLog', icon: <GoLog /> },
    { path: '/administrator_dashboard/audit-trails', label: 'AuditTrails', icon: <FaHistory /> },
    { path: '/administrator_dashboard/ledger', label: 'Ledger', icon: <FaFileInvoiceDollar /> },
    { path: '/administrator_dashboard/faq', label: 'FAQ', icon: <FaQuestionCircle /> },
    { path: '/administrator_dashboard/finance', label: 'Finance', icon: <VscGraphLine /> },
    { path: '/administrator_dashboard/reviews', label: 'Customer Reviews', icon: <FiStar /> },
    { path: '/administrator_dashboard/profile', label: 'Profile', icon: <CgProfile /> },
];

    return (
        <div className={`dashboard-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebar
                title="Administrator"
                links={links}
                isCollapsed={isSidebarCollapsed}
                toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                handleLogout={handleLogout}
            />

            <div className="dashboard-content">
                <Routes>
                    <Route path="/" element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="property-listing" element={<PropertyListing />} />


                    <Route path="roles" element={<RolesManagement />} />
                    <Route path="stock-manager" element={<StockManager />} />
                    <Route path="booknpay-log" element={<BooknPayLog />} />
                    <Route path="audit-trails" element={<AuditTrails />} />
                    <Route path="ledger" element={<LedgerPage />} />
                    <Route path="faq" element={<AdminFAQ />} />
                    <Route path="finance" element={<Finance />} />
                    <Route path="reviews" element={<AdminReview />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="*" element={<NoAccess />} />
                </Routes>
            </div>
        </div>
    );
};

export default AdminDashboard;