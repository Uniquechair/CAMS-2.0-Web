import React, { useState, useMemo } from 'react';
import { fetchReservation } from '../../../../../Api/api';
import Filter from '../../../../Component/Filter/Filter';
import ActionDropdown from '../../../../Component/ActionDropdown/ActionDropdown';
import Modal from '../../../../Component/Modal/Modal';
import SearchBar from '../../../../Component/SearchBar/SearchBar';
import PaginatedTable from '../../../../Component/PaginatedTable/PaginatedTable';
import Status from '../../../../Component/Status/Status';
import { FaEye } from 'react-icons/fa';
import Toast from '../../../../Component/Toast/Toast';
import Alert from '../../../../Component/Alert/Alert';
import '../../../../Component/MainContent/MainContent.css';
import '../../../../Component/ActionDropdown/ActionDropdown.css';
import '../../../../Component/Modal/Modal.css';
import '../../../../Component/Filter/Filter.css';
import { useQuery } from '@tanstack/react-query';
import Loader from '../../../../Component/Loader/Loader';

const Reservations = () => {
    const [searchKey, setSearchKey] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [appliedFilters, setAppliedFilters] = useState({ status: 'All' });
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('');
    const [showToast, setShowToast] = useState(false);

    const displayToast = (type, message) => {
        setToastType(type);
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
    };

    const normalizeStatus = (status = '') => {
    const normalized = String(status || '')
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ');

    if (
        normalized === 'cancelled' ||
        normalized === 'canceled'
    ) {
        return 'canceled';
    }

    return normalized;
};

    const normalizeReservations = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.reservations)) return data.reservations;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.rows)) return data.rows;
        return [];
    };

    const getSafeFirstImage = (propertyimage) => {
        if (!propertyimage) return '';

        if (Array.isArray(propertyimage)) {
            return propertyimage[0] || '';
        }

        if (typeof propertyimage === 'string') {
            const cleanValue = propertyimage.trim();

            if (!cleanValue) return '';

            try {
                const parsed = JSON.parse(cleanValue);
                if (Array.isArray(parsed)) return parsed[0] || '';
            } catch (error) {
                // Keep normal string image value.
            }

           if (cleanValue.includes(',')) {
    return cleanValue.split(',').map((img) => img.trim()).filter(Boolean)[0] || '';
}
            return cleanValue;
        }

        return '';
    };

    const getImageSrc = (imageValue) => {
        if (!imageValue) return '';

        const cleanValue = String(imageValue).trim();

        if (cleanValue.startsWith('http')) return cleanValue;
        if (cleanValue.startsWith('data:image')) return cleanValue;

        return `data:image/jpeg;base64,${cleanValue}`;
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

    const formatName = (reservation) => {
        return `${reservation?.rcfirstname || ''} ${reservation?.rclastname || ''}`.trim() || 'N/A';
    };

    const {
    data: reservations = [],
    isLoading,
    isError,
    error,
    refetch,
} = useQuery({
        // Use different query key from Stock Manager to avoid cache conflict.
        queryKey: ['reservations-page-list'],
        queryFn: async () => {
            try {
                const reservationData = await fetchReservation();
                const list = normalizeReservations(reservationData);

                return list.map((reservation) => {
                    const reservationblocktime = new Date(reservation.reservationblocktime).getTime();
                    const currentDateTime = Date.now() + 8 * 60 * 60 * 1000;

                    if (
                        reservation.reservationstatus === 'Pending' &&
                        reservation.reservationblocktime &&
                        currentDateTime > reservationblocktime
                    ) {
                        return { ...reservation, reservationstatus: 'expired' };
                    }

                    return reservation;
                });
            } catch (fetchError) {
                console.error('Failed to fetch reservation details:', fetchError);
                throw new Error(`Failed to fetch reservations: ${fetchError.message}`);
            }
        },
        staleTime: 0,

// Always fetch latest reservation data
// whenever this page is opened.
refetchOnMount: 'always',

// Refresh if Admin / Moderator returns
// to this browser tab.
refetchOnWindowFocus: true,

refetchOnReconnect: true,

retry: 1,
        onError: (queryError) => {
            displayToast('error', queryError.message || 'Failed to load reservations');
        },
    });

   const handleApplyFilters = () => {
    setAppliedFilters({
        status: selectedStatus
    });

    // Get latest reservation status
    // before displaying the filter result.
    refetch();
};

    const filters = useMemo(() => [
        {
            name: 'status',
            label: 'Status',
            value: selectedStatus,
            onChange: setSelectedStatus,
         options: [
    { value: 'All', label: 'All Statuses' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Canceled', label: 'Canceled' },
    { value: 'Paid', label: 'Paid' },
    { value: 'Partially Paid', label: 'Partially Paid' },
    { value: 'Expired', label: 'Expired' },
],
        },
    ], [selectedStatus]);

    const displayLabels = {
        reservationid: 'Reservation ID',
        propertyaddress: 'Property Name',
        totalprice: 'Total Price',
        reservationstatus: 'Reservation Status',
        checkindatetime: 'Check-In Date',
        checkoutdatetime: 'Check-Out Date',
        request: 'Request',
        name: 'Customer Name',
        customerEmail: 'Customer Email',
        customerPhone: 'Customer Phone',
        images: 'Images',
    };

   const filteredReservations = useMemo(() => {
    const list = Array.isArray(reservations)
        ? reservations
        : [];

    const keyword =
        searchKey.trim().toLowerCase();

    const selectedStatusKey =
        normalizeStatus(
            appliedFilters.status
        );

    return list
        .filter((reservation) => {
            const reservationStatus =
                normalizeStatus(
                    reservation.reservationstatus ||
                    'Pending'
                );

            const statusMatch =
                selectedStatusKey === 'all' ||
                reservationStatus ===
                    selectedStatusKey;

            if (!statusMatch) {
                return false;
            }

            if (!keyword) {
                return true;
            }

            const searchableText = [
                reservation.reservationid,
                reservation.propertyaddress,
                reservation.totalprice,
                reservation.request,
                reservation.reservationstatus,
                formatDate(
                    reservation.checkindatetime
                ),
                formatDate(
                    reservation.checkoutdatetime
                ),
                reservation.rcfirstname,
                reservation.rclastname,
                reservation.rcemail,
                reservation.rcphone,
                reservation.rcphoneno,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchableText.includes(
                keyword
            );
        })

        // Newest reservation first
        .sort((a, b) => {
            const idA =
                Number(
                    a.reservationid || 0
                );

            const idB =
                Number(
                    b.reservationid || 0
                );

            return idB - idA;
        });

}, [
    reservations,
    appliedFilters.status,
    searchKey
]);

    const handleAction = (action, reservation) => {
        if (normalizeStatus(reservation.reservationstatus) === 'expired') {
            displayToast('error', 'Action cannot be performed. This reservation has expired.');
            return;
        }

        if (action === 'view') {
            setSelectedReservation({
                reservationid: reservation.reservationid || 'N/A',
                propertyaddress: reservation.propertyaddress || 'N/A',
                checkindatetime: formatDate(reservation.checkindatetime) || 'N/A',
                checkoutdatetime: formatDate(reservation.checkoutdatetime) || 'N/A',
                request: reservation.request || 'N/A',
                totalprice: reservation.totalprice ? `RM ${reservation.totalprice}` : 'N/A',
                name: formatName(reservation),
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
                reservationstatus: reservation.reservationstatus || 'N/A',

                // Only pass first image to modal to avoid heavy render.
                images: getSafeFirstImage(reservation.propertyimage)
                    ? [getSafeFirstImage(reservation.propertyimage)]
                    : [],
            });
        }
    };

    const reservationDropdownItems = useMemo(() => [
        { label: 'View Details', icon: <FaEye />, action: 'view' },
    ], []);

    const columns = useMemo(() => [
        { header: 'ID', accessor: 'reservationid' },
        {
            header: 'Image',
            accessor: 'propertyimage',
            render: (reservation) => {
                const firstImage = getSafeFirstImage(reservation.propertyimage);

                return firstImage ? (
                    <img
                        src={getImageSrc(firstImage)}
                        alt={reservation.propertyaddress || 'Property'}
                        loading="lazy"
                        decoding="async"
                        style={{
                            width: 70,
                            height: 70,
                            objectFit: 'cover',
                            borderRadius: '8px',
                        }}
                    />
                ) : (
                    <span>No Image</span>
                );
            },
        },
        { header: 'Property', accessor: 'propertyaddress' },
        {
            header: 'Name',
            accessor: 'name',
            render: (reservation) => formatName(reservation),
        },
        {
            header: 'Total Price',
            accessor: 'totalprice',
            render: (reservation) => `RM ${Number(reservation.totalprice || 0).toFixed(2)}`,
        },
        {
            header: 'Check-In Date',
            accessor: 'checkindatetime',
            render: (reservation) => formatDate(reservation.checkindatetime) || 'N/A',
        },
        {
            header: 'Check-Out Date',
            accessor: 'checkoutdatetime',
            render: (reservation) => formatDate(reservation.checkoutdatetime) || 'N/A',
        },
        {
            header: 'Status',
            accessor: 'reservationstatus',
            render: (reservation) => (
                <Status value={reservation.reservationstatus} />
            ),
        },
        {
            header: 'Actions',
            accessor: 'actions',
            render: (reservation) => (
                <ActionDropdown
                    items={reservationDropdownItems}
                    onAction={(action) => handleAction(action, reservation)}
                    onClose={() => {}}
                />
            ),
        },
    ], [reservationDropdownItems]);

    return (
        <div>
            {showToast && <Toast type={toastType} message={toastMessage} />}

            <div className="header-container">
                <div>
                    <h1 className="dashboard-page-title">Reservations</h1>
                    <p className="dashboard-page-description">
                        View and search customer reservation records, booking dates, payment status, and reservation details.
                    </p>
                </div>

                <SearchBar
                    value={searchKey}
                    onChange={(newValue) => setSearchKey(newValue)}
                    placeholder="Search reservation..."
                />
            </div>

            <Filter filters={filters} onApplyFilters={handleApplyFilters} />

            {isLoading && (
                <div className="loader-box">
                    <Loader />
                </div>
            )}

            {isError && (
                <Alert
                    type="error"
                    message={`Error: ${error?.message || 'Failed to load reservations'}`}
                />
            )}

            {!isLoading && !isError && (
                <PaginatedTable
    key={
        filteredReservations[0]
            ?.reservationid || 0
    }
    data={filteredReservations}
    columns={columns}
    rowKey="reservationid"
    enableCheckbox={false}
/>
            )}

            <Modal
                isOpen={!!selectedReservation}
                title={`Reservation ID: ${selectedReservation?.reservationid}`}
                data={selectedReservation || {}}
                labels={displayLabels}
                onClose={() => setSelectedReservation(null)}
            />
        </div>
    );
};

export default Reservations;