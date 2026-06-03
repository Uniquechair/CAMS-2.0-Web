import React, { useState, useRef } from 'react';
import { fetchPropertiesListingTable } from '../../../../../Api/api';
import { useQuery } from '@tanstack/react-query';
import Modal from '../../../../Component/Modal/Modal';
import SearchBar from '../../../../Component/SearchBar/SearchBar';
import Filter from '../../../../Component/Filter/Filter';
import PaginatedTable from '../../../../Component/PaginatedTable/PaginatedTable';
import Toast from '../../../../Component/Toast/Toast';
import Loader from '../../../../Component/Loader/Loader';
import Status from '../../../../Component/Status/Status';
import { FaEye } from 'react-icons/fa';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import '../../../../Component/MainContent/MainContent.css';

const getSafeImageSrc = (image) => {
    if (!image) return '';

    const cleanImage = String(image).trim();

    if (cleanImage.startsWith('http://') || cleanImage.startsWith('https://')) {
        return cleanImage;
    }

    if (cleanImage.startsWith('data:image')) {
        return cleanImage;
    }

    return `data:image/jpeg;base64,${cleanImage}`;
};

const getSafeImageArray = (images) => {
    if (!images) return [];

    if (Array.isArray(images)) {
        return images.filter(Boolean);
    }

    if (typeof images === 'string') {
        const cleanValue = images.trim();

        if (!cleanValue) return [];

        try {
            const parsed = JSON.parse(cleanValue);

            if (Array.isArray(parsed)) {
                return parsed.filter(Boolean);
            }
        } catch (error) {
            return cleanValue
                .split(',')
                .map((img) => img.trim())
                .filter(Boolean);
        }

        return [cleanValue];
    }

    return [];
};

const ImageCarousel = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) {
        return <span style={{ color: '#888' }}>No Image Available</span>;
    }

    const nextSlide = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const prevSlide = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                height: '250px',
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '10px',
                backgroundColor: '#f0f0f0',
            }}
        >
            <img
                src={getSafeImageSrc(images[currentIndex])}
                alt={`Slide ${currentIndex + 1}`}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                }}
            />

            {images.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={prevSlide}
                        style={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(255,255,255,0.8)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            fontSize: '18px',
                            color: '#333',
                        }}
                    >
                        <IoIosArrowBack />
                    </button>

                    <button
                        type="button"
                        onClick={nextSlide}
                        style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(255,255,255,0.8)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            fontSize: '18px',
                            color: '#333',
                        }}
                    >
                        <IoIosArrowForward />
                    </button>

                    <div
                        style={{
                            position: 'absolute',
                            bottom: '15px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(0,0,0,0.8)',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '15px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            letterSpacing: '1px',
                        }}
                    >
                        {currentIndex + 1} / {images.length}
                    </div>
                </>
            )}
        </div>
    );
};

const PropertyListing = () => {
    const [searchKey, setSearchKey] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [appliedFilters, setAppliedFilters] = useState({ status: 'All' });
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastType, setToastType] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const toastTimerRef = useRef(null);

    const username = localStorage.getItem('username') || '';
    const usergroup = localStorage.getItem('usergroup') || '';
    const userid = localStorage.getItem('userid') || '';

    const propertyQueryKey = [
        'properties-listing',
        usergroup,
        userid,
        username,
        page,
        pageSize,
    ];

    const { data, isLoading, isFetching, error } = useQuery({
        queryKey: propertyQueryKey,
        queryFn: () => fetchPropertiesListingTable(page, pageSize),
        enabled: !!username && !!usergroup,
        placeholderData: (previousData) => previousData,
        select: (data) => {
            const validProps = (data?.properties || []).filter(
                (property) => property.propertyid !== undefined
            );

            const sortedProps = [...validProps].sort(
                (a, b) => parseInt(b.propertyid, 10) - parseInt(a.propertyid, 10)
            );

            return {
                properties: sortedProps,
                totalCount: data?.totalCount || sortedProps.length,
            };
        },
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
    });

    const properties = data?.properties || [];
    const totalCount = data?.totalCount || properties.length;

    const displayToast = (type, message, isSticky = false) => {
        setToastType(type);
        setToastMessage(message);
        setShowToast(true);

        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
            toastTimerRef.current = null;
        }

        if (!isSticky) {
            toastTimerRef.current = setTimeout(() => {
                setShowToast(false);
            }, 5000);
        }
    };

    const formatPrice = (value) => {
        const num = parseFloat(value);

        if (Number.isNaN(num)) return 'N/A';

        return num.toFixed(2);
    };

    const parseRoomDetails = (property) => {
        let rawDesc = property.propertydescription || 'N/A';
        let finalDesc = rawDesc;
        let roomsList = [];

        if (property.room_details) {
            if (typeof property.room_details === 'string') {
                try {
                    roomsList = JSON.parse(property.room_details);
                } catch (e) {
                    console.error('Error parsing room_details string:', e);
                }
            } else if (Array.isArray(property.room_details)) {
                roomsList = property.room_details;
            }
        }

        if (rawDesc.includes('_ROOMDATA_')) {
            const parts = rawDesc.split('_ROOMDATA_');
            finalDesc = parts[0];

            if (!roomsList || roomsList.length === 0) {
                try {
                    roomsList = JSON.parse(parts[1]);
                } catch (e) {
                    console.error('Error parsing legacy room data:', e);
                }
            }
        }

        return {
            finalDesc,
            roomsList: Array.isArray(roomsList) ? roomsList : [],
        };
    };

    const buildDescriptionForModal = (property) => {
        const { finalDesc, roomsList } = parseRoomDetails(property);

        if (roomsList && roomsList.length > 0) {
            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        marginTop: '5px',
                    }}
                >
                    {finalDesc && !String(finalDesc).includes('_ROOMDATA_') && (
                        <div
                            style={{
                                fontSize: '14px',
                                color: '#4a5568',
                                lineHeight: '1.6',
                                whiteSpace: 'pre-wrap',
                                backgroundColor: '#f8fafc',
                                padding: '15px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                            }}
                        >
                            {finalDesc}
                        </div>
                    )}

                    <div
                        style={{
                            fontWeight: 'bold',
                            fontSize: '16px',
                            color: '#2d3748',
                            borderBottom: '2px solid #e2e8f0',
                            paddingBottom: '8px',
                            marginTop: '10px',
                        }}
                    >
                        Room Inventory & Packages
                    </div>

                    {roomsList.map((room, index) => (
                        <div
                            key={room.id || index}
                            style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '15px',
                                backgroundColor: '#fff',
                                marginBottom: '5px',
                            }}
                        >
                            <div
                                style={{
                                    fontWeight: 'bold',
                                    color: '#2b6cb0',
                                    fontSize: '16px',
                                    marginBottom: '10px',
                                }}
                            >
                                {room.name || `Room ${index + 1}`}
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '10px',
                                    fontSize: '14px',
                                    color: '#4a5568',
                                    marginBottom: '10px',
                                }}
                            >
                                <div>
                                    <strong>Bed:</strong> {room.bedType || 'N/A'}
                                </div>
                                <div>
                                    <strong>Base Price:</strong> RM {room.price || 'N/A'}
                                </div>
                                <div>
                                    <strong>Guests:</strong> Max {room.maxGuests || 'N/A'}
                                </div>
                                <div>
                                    <strong>Quantity:</strong> {room.quantity || room.qty || 1}
                                </div>
                            </div>

                            {room.description && (
                                <div
                                    style={{
                                        fontSize: '13px',
                                        color: '#4a5568',
                                        marginBottom: '10px',
                                        backgroundColor: '#f8fafc',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid #edf2f7',
                                    }}
                                >
                                    <strong>Description:</strong> {room.description}
                                </div>
                            )}

                            {room.options && room.options.length > 0 && (
                                <>
                                    <hr
                                        style={{
                                            borderTop: '1px dashed #cbd5e0',
                                            margin: '12px 0',
                                        }}
                                    />

                                    <div
                                        style={{
                                            fontWeight: 'bold',
                                            fontSize: '14px',
                                            color: '#2d3748',
                                            marginBottom: '8px',
                                        }}
                                    >
                                        Variations:
                                    </div>

                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            paddingLeft: '10px',
                                        }}
                                    >
                                        {room.options.map((option, optIndex) => (
                                            <div
                                                key={option.id || optIndex}
                                                style={{
                                                    fontSize: '14px',
                                                    color: '#4a5568',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    flexWrap: 'wrap',
                                                }}
                                            >
                                                <span>• {option.name || 'Package'}:</span>
                                                <span
                                                    style={{
                                                        fontWeight: 'bold',
                                                        color: '#38a169',
                                                        marginLeft: '6px',
                                                    }}
                                                >
                                                    RM {option.price || 'N/A'}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '12px',
                                                        color: '#718096',
                                                        marginLeft: '10px',
                                                    }}
                                                >
                                                    (Qty: {option.quantity || option.qty || 1})
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            );
        }

        if (typeof finalDesc === 'string' && finalDesc.includes('_ROOMDATA_')) {
            return finalDesc.split('_ROOMDATA_')[0];
        }

        return finalDesc;
    };

    const handleAction = (action, property) => {
        if (action === 'view') {
            setSelectedProperty({
                galleryWidget: (
                    <ImageCarousel images={getSafeImageArray(property.propertyimage)} />
                ),
                propertyid: property.propertyid || 'N/A',
                propertyname: property.propertyaddress || 'N/A',
                clustername: property.clustername || 'N/A',
                categoryname: property.categoryname || 'N/A',
                propertyprice: property.normalrate
                    ? `RM ${formatPrice(property.normalrate)}`
                    : 'N/A',
                propertydiscount:
                    parseFloat(property.propertydiscount || 0) > 0
                        ? `RM ${formatPrice(property.propertydiscount)}`
                        : 'None',
                propertyquantity: property.quantity || '1',
                propertylocation: property.nearbylocation || 'N/A',
                propertyguestpaxno: property.propertyguestpaxno || 'N/A',
                propertystatus: property.propertystatus || 'N/A',
                propertybedtype: property.propertybedtype || 'N/A',
                propertydescription: buildDescriptionForModal(property),
                username: property.username || 'N/A',
            });
        }
    };

    const handleApplyFilters = () => {
        setAppliedFilters({ status: selectedStatus });
        setPage(1);
    };

    const filters = [
        {
            name: 'status',
            label: 'Status',
            value: selectedStatus,
            onChange: setSelectedStatus,
            options: [
                { value: 'All', label: 'All Statuses' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Available', label: 'Available' },
                { value: 'Unavailable', label: 'Unavailable' },
            ],
        },
    ];

    const displayLabels = {
        galleryWidget: ' ',
        propertyid: 'PID',
        propertyname: 'Property Name',
        clustername: 'Cluster Name',
        categoryname: 'Category Name',
        propertyprice: 'Starting Price',
        propertydiscount: 'Flat Discount',
        propertyquantity: 'Total Quantity',
        propertylocation: 'Property Location',
        propertyguestpaxno: 'Guest Capacity',
        propertystatus: 'Property Status',
        propertybedtype: 'Bed Type',
        propertydescription: 'Description',
        username: 'Operator Name',
    };

    const filteredProperties = properties.filter((property) => {
        const statusMatch =
            appliedFilters.status === 'All' ||
            String(property.propertystatus || 'Pending').toLowerCase() ===
                appliedFilters.status.toLowerCase();

        const searchText = [
            property.propertyid,
            property.propertyaddress,
            property.clustername,
            property.categoryname,
            property.username,
            property.normalrate,
            property.propertystatus,
        ]
            .join(' ')
            .toLowerCase();

        return statusMatch && searchText.includes(searchKey.toLowerCase());
    });

    const columns = [
        { header: 'PID', accessor: 'propertyid' },
        {
            header: 'Image',
            accessor: 'propertyimage',
            render: (property) => {
                const images = getSafeImageArray(property.propertyimage);
                const firstImage = images[0];

                return firstImage ? (
                    <img
                        src={getSafeImageSrc(firstImage)}
                        alt={property.propertyaddress || 'Property'}
                        style={{
                            width: 80,
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: '6px',
                        }}
                    />
                ) : (
                    <span>No Image</span>
                );
            },
        },
        { header: 'Name', accessor: 'propertyaddress' },
        {
            header: 'Price(RM)',
            accessor: 'normalrate',
            render: (property) => formatPrice(property.normalrate),
        },
        { header: 'Cluster', accessor: 'clustername' },
        {
            header: 'Status',
            accessor: 'propertystatus',
            render: (property) => (
                <Status value={property.propertystatus || 'Pending'} />
            ),
        },
{
    header: 'Actions',
    accessor: 'actions',
    render: (property) => (
        <button
            type="button"
            onClick={() => handleAction('view', property)}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #d8e0ea',
                backgroundColor: '#ffffff',
                color: '#34495e',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                minWidth: '120px',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.borderColor = '#b8c4d3';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#d8e0ea';
            }}
        >
            <FaEye />
            View Details
        </button>
    ),
},
    ];

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const handlePageSizeChange = (newPageSize) => {
        setPageSize(newPageSize);
        setPage(1);
    };

    if (!username || !usergroup) {
        return (
            <div className="error-message">
                Please log in again. Username or user role is missing.
            </div>
        );
    }

    return (
        <div>
            <div className="header-container">
                <div>
                    <h1 className="dashboard-page-title">Property Listings</h1>
                    <p className="dashboard-page-description">
                        View all property listings, check property details, and monitor listing status in one place.
                    </p>
                </div>

                <SearchBar
                    value={searchKey}
                    onChange={(newValue) => setSearchKey(newValue)}
                    placeholder="Search properties..."
                />
            </div>

            <Filter filters={filters} onApplyFilters={handleApplyFilters} />

            {isLoading ? (
                <div className="loader-box">
                    <Loader />
                </div>
            ) : error ? (
                <div className="error-message">
                    Error loading properties. Please check backend /propertiesListingTable for Owner role.
                </div>
            ) : (
                <>
                    {isFetching && (
                        <div
                            style={{
                                fontSize: '13px',
                                color: '#718096',
                                marginBottom: '10px',
                            }}
                        >
                            Refreshing property list...
                        </div>
                    )}

                    <PaginatedTable
                        data={filteredProperties}
                        columns={columns}
                        rowKey="propertyid"
                        currentPage={page}
                        pageSize={pageSize}
                        totalCount={filteredProperties.length || totalCount}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                    />
                </>
            )}

            <Modal
                isOpen={!!selectedProperty}
                title="Property Details"
                data={selectedProperty || {}}
                labels={displayLabels}
                onClose={() => setSelectedProperty(null)}
            />

            {showToast && <Toast type={toastType} message={toastMessage} />}
        </div>
    );
};

export default PropertyListing;