import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    FiUsers,
    FiCalendar,
    FiDollarSign,
    FiArrowRight
} from 'react-icons/fi';
import {
    FaBuilding,
    FaMoneyBillWave,
    FaReceipt,
    FaHourglassHalf,
    FaStar
} from 'react-icons/fa';
import {
    fetchCustomers,
    fetchModerators,
    fetchAdministrators,
    fetchReservation,
    fetchPropertiesListingTable
} from '../../../Api/api';
import './DashboardCard.css';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const queryOptions = {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
};

const freshDashboardQueryOptions = {
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1,
};
const DashboardCard = () => {
    const navigate = useNavigate();
const [userid, setUserid] = useState(() => localStorage.getItem('userid') || '');
const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
const [userGroup, setUserGroup] = useState(() => localStorage.getItem('usergroup') || '');
useEffect(() => {
    const storedUserId = localStorage.getItem('userid') || '';
    const storedUsername = localStorage.getItem('username') || '';
    const storedUserGroup = localStorage.getItem('usergroup') || '';

    setUserid(storedUserId);
    setUsername(storedUsername);
    setUserGroup(storedUserGroup);
}, []);

    // Fetch customers
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['dashboard-customers', userGroup, userid],
    queryFn: fetchCustomers,
    enabled: !!userid && !!userGroup,
    ...freshDashboardQueryOptions,
});

    // Fetch moderators
    const { data: moderators = [], isLoading: moderatorsLoading } = useQuery({
    queryKey: ['dashboard-moderators', userGroup, userid],
    queryFn: fetchModerators,
    enabled: !!userid && !!userGroup,
    ...freshDashboardQueryOptions,
});

    // Fetch administrators
  const { data: administrators = [], isLoading: administratorsLoading } = useQuery({
    queryKey: ['dashboard-administrators', userGroup, userid],
    queryFn: fetchAdministrators,
    enabled: !!userid && !!userGroup,
    ...freshDashboardQueryOptions,
});
    // Fetch properties
const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['dashboard-properties', userGroup, userid, username],
    queryFn: fetchPropertiesListingTable,
    enabled: !!userid && !!username && !!userGroup,
    ...freshDashboardQueryOptions,
});

    // Fetch reservations
const { data: reservations = [], isLoading: reservationsLoading } = useQuery({
    queryKey: ['dashboard-reservations', userGroup, userid, username],
    queryFn: fetchReservation,
    enabled: !!userid && !!username && !!userGroup,
    ...freshDashboardQueryOptions,
});

    // Latest finance data from new ledger-based finance page
    const { data: financeLedgerData, isLoading: financeLedgerLoading } = useQuery({
        queryKey: ['finance-ledger-card', userid],
        queryFn: async () => {
            const res = await fetch(`${BASE_URL}/finance/ledger-card?userid=${userid}`, {
                credentials: 'include',
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to load finance data');
            }

            return data;
        },
        enabled: !!userid,
        ...queryOptions,
    });

    // Latest review data from new review chart API
    const { data: reviewChartData, isLoading: reviewChartLoading } = useQuery({
        queryKey: ['finance-review-chart', userid],
        queryFn: async () => {
            const res = await fetch(`${BASE_URL}/finance/review-chart?userid=${userid}`, {
                credentials: 'include',
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to load review data');
            }

            return data;
        },
        enabled: !!userid,
        ...queryOptions,
    });

    const customersList = Array.isArray(customers) ? customers : customers?.data || [];
    const moderatorsList = Array.isArray(moderators) ? moderators : moderators?.data || [];
    const administratorsList = Array.isArray(administrators) ? administrators : administrators?.data || [];

    const propertiesList = Array.isArray(properties)
        ? properties
        : properties?.properties || properties?.data || [];

    const reservationsList = Array.isArray(reservations)
        ? reservations
        : reservations?.reservations || reservations?.data || [];

    const financeSummary = financeLedgerData?.summary || {
        totalRevenue: 0,
        totalOperatorEarning: 0,
        totalDepositPaid: 0,
        totalExpectedBalance: 0,
        totalCommission: 0,
        totalTransactions: 0,
        paidCount: 0,
        partiallyPaidCount: 0,
        cancelledCount: 0,
        expiredCount: 0,
    };

    const reviewSummary = reviewChartData?.summary || {
        totalReviews: 0,
        overallRating: 0,
    };

    const stats = useMemo(() => {
        return {
            totalUsers:
                customersList.length +
                moderatorsList.length +
                administratorsList.length,

            totalProperties: propertiesList.length,

            totalReservations: reservationsList.length,

            bookingRevenue: Number(financeSummary.totalRevenue || 0),
            operatorEarning: Number(financeSummary.totalOperatorEarning || 0),
            depositCollected: Number(financeSummary.totalDepositPaid || 0),
            pendingBalance: Number(financeSummary.totalExpectedBalance || 0),
            overallRating: Number(reviewSummary.overallRating || 0),
        };
    }, [
        customersList.length,
        moderatorsList.length,
        administratorsList.length,
        propertiesList.length,
        reservationsList.length,
        financeSummary.totalRevenue,
        financeSummary.totalOperatorEarning,
        financeSummary.totalDepositPaid,
        financeSummary.totalExpectedBalance,
        reviewSummary.overallRating,
    ]);

    const formatCurrency = (amount) => {
        const safeAmount = Number(amount || 0);
        return `MYR ${safeAmount.toFixed(2)}`;
    };

    const formatRating = (value) => {
        const safeValue = Number(value || 0);
        return `${safeValue.toFixed(1)}/5.0`;
    };

    const getNavigationPath = (path) => {
        switch (userGroup) {
            case 'Moderator':
                return `/moderator_dashboard${path}`;
            case 'Administrator':
                return `/administrator_dashboard${path}`;
            case 'Owner':
                return `/owner_dashboard${path}`;
            default:
                return `/moderator_dashboard${path}`;
        }
    };

    const isUserStatsLoading =
        customersLoading ||
        moderatorsLoading ||
        administratorsLoading;

    const goToFinancePage = () => {
        navigate(getNavigationPath('/finance'));
    };

    const cardData = [
        {
            title: 'Total Users',
            value: isUserStatsLoading ? '...' : stats.totalUsers,
            icon: <FiUsers />,
            iconClass: 'user-icon',
            onDetails: () => {
                if (userGroup === 'Administrator') {
                    navigate('/administrator_dashboard/roles');
                } else if (userGroup === 'Owner') {
                    navigate('/owner_dashboard/user-role-management');
                } else {
                    navigate(getNavigationPath('/customers'));
                }
            },
        },
        {
            title: 'Total Properties',
            value: propertiesLoading ? '...' : stats.totalProperties,
            icon: <FaBuilding />,
            iconClass: 'property-icon',
            onDetails: () => navigate(getNavigationPath('/property-listing')),
        },
        {
    title: 'Total Reservations',
    value: reservationsLoading ? '...' : stats.totalReservations,
    icon: <FiCalendar />,
    iconClass: 'reservation-icon',
    onDetails: () => {
        if (userGroup === 'Administrator') {
            navigate('/administrator_dashboard/stock-manager');
        } else if (userGroup === 'Moderator') {
            navigate('/moderator_dashboard/stock-manager');
        } else {
            navigate(getNavigationPath('/reservations'));
        }
    },
},
        {
            title: 'Booking Revenue',
            value: financeLedgerLoading ? '...' : formatCurrency(stats.bookingRevenue),
            icon: <FiDollarSign />,
            iconClass: 'revenue-icon',
            onDetails: goToFinancePage,
        },
        {
            title: 'Net Operator Earning',
            value: financeLedgerLoading ? '...' : formatCurrency(stats.operatorEarning),
            icon: <FaMoneyBillWave />,
            iconClass: 'earning-icon',
            onDetails: goToFinancePage,
        },
        {
            title: 'Deposit Collected',
            value: financeLedgerLoading ? '...' : formatCurrency(stats.depositCollected),
            icon: <FaReceipt />,
            iconClass: 'deposit-icon',
            onDetails: goToFinancePage,
        },
        {
            title: 'Pending Balance',
            value: financeLedgerLoading ? '...' : formatCurrency(stats.pendingBalance),
            icon: <FaHourglassHalf />,
            iconClass: 'balance-icon',
            onDetails: goToFinancePage,
        },
        {
            title: 'Customer Rating',
            value: reviewChartLoading ? '...' : formatRating(stats.overallRating),
            icon: <FaStar />,
            iconClass: 'satisfaction-icon',
            onDetails: goToFinancePage,
        },
    ];

    return (
        <div className="stats-grid">
            {cardData.map((card) => (
                <div className="dashboard-card" key={card.title}>
                    <div className="dashboard-card-header">
                        <span>{card.title}</span>
                        <div className={`dashboard-card-icon ${card.iconClass}`}>
                            {card.icon}
                        </div>
                    </div>

                    <div className="dashboard-card-value">
                        {card.value}
                    </div>

                    <button className="dashboard-card-btn" onClick={card.onDetails}>
                        View Details <FiArrowRight />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default DashboardCard;