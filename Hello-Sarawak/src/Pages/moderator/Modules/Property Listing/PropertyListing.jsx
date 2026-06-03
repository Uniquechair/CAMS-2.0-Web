import React, { useState, useRef } from 'react';
import { fetchPropertiesListingTable, updatePropertyStatus, deleteProperty, propertyListingAccept, propertyListingReject } from '../../../../../Api/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ActionDropdown from '../../../../Component/ActionDropdown/ActionDropdown';
import Modal from '../../../../Component/Modal/Modal';
import PropertyForm from '../../../../Component/PropertyForm/PropertyForm';
import SearchBar from '../../../../Component/SearchBar/SearchBar';
import Filter from '../../../../Component/Filter/Filter';
import PaginatedTable from '../../../../Component/PaginatedTable/PaginatedTable';
import Toast from '../../../../Component/Toast/Toast';
import Alert from '../../../../Component/Alert/Alert';
import Loader from '../../../../Component/Loader/Loader';
import Status from '../../../../Component/Status/Status';
import { FaEye, FaEdit, FaTrash, FaCheck, FaTimes, FaUser } from 'react-icons/fa';
import { IoIosArrowBack, IoIosArrowForward, IoIosBed } from 'react-icons/io';
import '../../../../Component/MainContent/MainContent.css';
import '../Property Listing/PropertyListing.css';

// BEAUTIFUL IMAGE SLIDER COMPONENT FOR THE MODAL (ROOMS)
const RoomCardImageSlider = ({ images, fallbackImage, width = '100%', height = '200px' }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const displayImages = images && images.length > 0 ? images : [fallbackImage];

    if (!displayImages || displayImages.length === 0 || !displayImages[0]) {
        return (
            <div
                style={{
                    width,
                    height,
                    backgroundColor: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#a0aec0',
                }}
            >
                No Image
            </div>
        );
    }

    const nextSlide = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
    };

    const prevSlide = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
    };

    return (
        <div style={{ position: 'relative', width, height, borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
            <img
                src={getSafeImageSrc(displayImages[currentIndex])}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt="Room"
            />
            {displayImages.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={prevSlide}
                        style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', padding: 0, zIndex: 2 }}
                    >
                        <IoIosArrowBack size={16} color="#333" />
                    </button>
                    <button
                        type="button"
                        onClick={nextSlide}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', padding: 0, zIndex: 2 }}
                    >
                        <IoIosArrowForward size={16} color="#333" />
                    </button>
                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.65)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', pointerEvents: 'none', backdropFilter: 'blur(4px)' }}>
                        {currentIndex + 1}/{displayImages.length}
                    </div>
                </>
            )}
        </div>
    );
};

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

// MAIN PROPERTY IMAGE CAROUSEL
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
        <div style={{ position: 'relative', width: '100%', height: '250px', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px', backgroundColor: '#f0f0f0' }}>
            <img
                src={getSafeImageSrc(images[currentIndex])}
                alt={`Slide ${currentIndex + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {images.length > 1 && (
                <>
                    <button type="button" onClick={prevSlide} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', fontSize: '18px', color: '#333' }}>
                        <IoIosArrowBack />
                    </button>
                    <button type="button" onClick={nextSlide} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', fontSize: '18px', color: '#333' }}>
                        <IoIosArrowForward />
                    </button>
                    <div style={{ position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '4px 12px', borderRadius: '15px', fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px' }}>
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
    const [editProperty, setEditProperty] = useState(null);
    const [isPropertyFormOpen, setIsPropertyFormOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastType, setToastType] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [propertyToDelete, setPropertyToDelete] = useState(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Track expanded descriptions for room cards inside modal
    const [expandedRoomDesc, setExpandedRoomDesc] = useState({});

    const queryClient = useQueryClient();
    const toastTimerRef = useRef(null);

    const username = localStorage.getItem('username') || '';
    const usergroup = localStorage.getItem('usergroup') || '';
    const userid = localStorage.getItem('userid') || '';

    const propertyQueryKey = ['properties-listing', usergroup, userid, username, page, pageSize];

    const { data, isLoading, error } = useQuery({
        queryKey: propertyQueryKey,
        queryFn: () => fetchPropertiesListingTable(page, pageSize),
        enabled: !!username && !!usergroup,
        placeholderData: (previousData) => previousData,
        select: (data) => {
            const validProps = (data?.properties || []).filter(
                (property) => property.propertyid !== undefined
            );

            const sortedProps = [...validProps].sort(
                (a, b) => parseInt(b.propertyid) - parseInt(a.propertyid)
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

    const displayToast = (type, message, isSticky = false) => {
        setToastType(type);
        setToastMessage(message);
        setShowToast(true);

        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
            toastTimerRef.current = null;
        }

        if (!isSticky) {
            toastTimerRef.current = setTimeout(() => setShowToast(false), 5000);
        }
    };

    const updatePropertyInCache = (propertyId, updates) => {
        queryClient.setQueryData(propertyQueryKey, (oldData) => {
            if (!oldData) return oldData;

            return {
                ...oldData,
                properties: (oldData.properties || []).map((prop) =>
                    prop.propertyid === propertyId
                        ? { ...prop, ...updates }
                        : prop
                ),
            };
        });
    };

    const invalidateProductCache = () => {
      queryClient.invalidateQueries({ queryKey: ['product-properties'] });
    };

    const acceptMutation = useMutation({
        mutationFn: async (propertyId) => {
            const result = await updatePropertyStatus(propertyId, 'Available');

            propertyListingAccept(propertyId).catch((err) => {
                console.error('Accept notification failed:', err);
            });

            return result;
        },
        onMutate: async (propertyId) => {
            await queryClient.cancelQueries({ queryKey: propertyQueryKey });

            const previousData = queryClient.getQueryData(propertyQueryKey);
            updatePropertyInCache(propertyId, { propertystatus: 'Available' });

            return { previousData };
        },
        onError: (error, propertyId, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(propertyQueryKey, context.previousData);
            }

            displayToast('error', error.message || 'Failed to accept property.');
        },
        onSuccess: () => {
            invalidateProductCache();
            displayToast('success', 'Property accepted successfully');
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async (propertyId) => {
            const result = await updatePropertyStatus(propertyId, 'Unavailable');

            propertyListingReject(propertyId).catch((err) => {
                console.error('Reject notification failed:', err);
            });

            return result;
        },
        onMutate: async (propertyId) => {
            await queryClient.cancelQueries({ queryKey: propertyQueryKey });

            const previousData = queryClient.getQueryData(propertyQueryKey);
            updatePropertyInCache(propertyId, { propertystatus: 'Unavailable' });

            return { previousData };
        },
        onError: (error, propertyId, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(propertyQueryKey, context.previousData);
            }

            displayToast('error', error.message || 'Failed to reject property.');
        },
        onSuccess: () => {
            invalidateProductCache();
            displayToast('success', 'Property rejected successfully');
        },
    });

    const enableStatusMutation = useMutation({
        mutationFn: async (propertyId) => {
            return updatePropertyStatus(propertyId, 'Available');
        },
        onMutate: async (propertyId) => {
            await queryClient.cancelQueries({ queryKey: propertyQueryKey });

            const previousData = queryClient.getQueryData(propertyQueryKey);
            updatePropertyInCache(propertyId, { propertystatus: 'Available' });

            return { previousData };
        },
        onError: (error, propertyId, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(propertyQueryKey, context.previousData);
            }

            displayToast('error', error.message || 'Failed to enable property.');
        },
        onSuccess: () => {
            invalidateProductCache();
            displayToast('success', 'Property enabled successfully');
        },
    });

    const disableStatusMutation = useMutation({
        mutationFn: async (propertyId) => {
            return updatePropertyStatus(propertyId, 'Unavailable');
        },
        onMutate: async (propertyId) => {
            await queryClient.cancelQueries({ queryKey: propertyQueryKey });

            const previousData = queryClient.getQueryData(propertyQueryKey);
            updatePropertyInCache(propertyId, { propertystatus: 'Unavailable' });

            return { previousData };
        },
        onError: (error, propertyId, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(propertyQueryKey, context.previousData);
            }

            displayToast('error', error.message || 'Failed to disable property.');
        },
        onSuccess: () => {
            invalidateProductCache();
            displayToast('success', 'Property disabled successfully');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (propertyId) => {
            return deleteProperty(propertyId);
        },
        onMutate: async (propertyId) => {
            await queryClient.cancelQueries({ queryKey: propertyQueryKey });

            const previousData = queryClient.getQueryData(propertyQueryKey);

            queryClient.setQueryData(propertyQueryKey, (oldData) => {
                if (!oldData) return oldData;

                return {
                    ...oldData,
                    properties: (oldData.properties || []).filter(
                        (prop) => prop.propertyid !== propertyId
                    ),
                    totalCount: Math.max(0, (oldData.totalCount || 0) - 1),
                };
            });

            return { previousData };
        },
        onError: (error, propertyId, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(propertyQueryKey, context.previousData);
            }

            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                'Failed to delete property. Please try again.';

            displayToast('error', errorMessage);
        },
        onSuccess: () => {
            invalidateProductCache();
            displayToast('success', 'Property deleted successfully');
        },
        onSettled: () => {
            setIsDialogOpen(false);
            setPropertyToDelete(null);
        },
    });

    const toggleRoomDesc = (roomId) => {
        setExpandedRoomDesc((prev) => ({ ...prev, [roomId]: !prev[roomId] }));
    };

    const handleAction = async (action, property) => {
        try {
            if (action === 'view') {
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
                    } else {
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
                            console.error('Error parsing legacy room data', e);
                        }
                    }
                }

                // --- BEAUTIFUL 2-COLUMN ROOM GRID FOR THE MODAL ---
                if (roomsList && roomsList.length > 0) {
                    finalDesc = (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '5px' }}>
                            {finalDesc && !finalDesc.includes('_ROOMDATA_') && (
                                <div style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.6', whiteSpace: 'pre-wrap', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    {finalDesc}
                                </div>
                            )}

                            <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#2d3748', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginTop: '15px' }}>
                                Room Inventory & Packages
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
                                {roomsList.map((r, i) => {
                                    const roomId = r.id || i;
                                    const isExpanded = expandedRoomDesc[roomId];
                                    const descText = r.description || '';
                                    const shouldTruncate = descText.length > 100;

                                    return (
                                        <div key={roomId} style={{ display: 'flex', flexDirection: 'column', border: '1px solid #d1d5db', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', height: '100%' }}>
                                            {/* Room Main Info */}
                                            <div style={{ backgroundColor: '#fafafa', padding: '15px', borderBottom: '1px solid #d1d5db', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <RoomCardImageSlider
                                                    images={r.images}
                                                    fallbackImage={Array.isArray(property.propertyimage) ? property.propertyimage[0] : (typeof property.propertyimage === 'string' ? property.propertyimage.split(',')[0] : '')}
                                                    width="100%"
                                                    height="220px"
                                                />

                                                <div style={{ marginTop: '10px' }}>
                                                    <h3 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '18px', lineHeight: '1.2' }}>{r.name}</h3>
                                                    <div style={{ display: 'flex', gap: '12px', color: '#4a5568', fontSize: '13px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><IoIosBed color="#d97706" size={16} /> {r.bedType}</span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FaUser color="#d97706" size={14} /> Max {r.maxGuests}</span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ fontWeight: 'bold', color: '#3182ce' }}>Qty:</span> {r.quantity || 1}</span>
                                                    </div>
                                                    <p style={{ fontSize: '13px', color: '#718096', margin: 0, lineHeight: '1.5' }}>
                                                        {isExpanded || !shouldTruncate ? descText : `${descText.substring(0, 100)}...`}
                                                        {shouldTruncate && (
                                                            <span
                                                                onClick={(e) => { e.preventDefault(); toggleRoomDesc(roomId); }}
                                                                style={{ color: '#3182ce', cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold' }}
                                                            >
                                                                {isExpanded ? 'Show less' : 'Read more'}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Room Packages */}
                                            <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#fafafa', flexGrow: 1 }}>
                                                <div style={{ padding: '10px 15px', backgroundColor: '#edf2f7', borderBottom: '1px solid #d1d5db', fontWeight: 'bold', color: '#4a5568', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    Rate Packages
                                                </div>
                                                <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {/* Base Rate */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff' }}>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold', color: '#2d3748', fontSize: '14px' }}>Standard Rate</div>
                                                            <div style={{ fontSize: '12px', color: '#38a169', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><FaCheck size={10} /> Base Room</div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1a202c' }}>RM {r.price}</div>
                                                        </div>
                                                    </div>

                                                    {/* Variations */}
                                                    {r.options && r.options.length > 0 && r.options.map((o, idx) => (
                                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                                                            <div>
                                                                <div style={{ fontWeight: 'bold', color: '#2b6cb0', fontSize: '14px' }}>{o.name}</div>
                                                                <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>Qty: {o.quantity || 1}</div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1a202c' }}>RM {o.price}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                } else if (typeof finalDesc === 'string' && finalDesc.includes('_ROOMDATA_')) {
                    finalDesc = finalDesc.split('_ROOMDATA_')[0];
                }

                setSelectedProperty({
                    galleryWidget: <ImageCarousel images={getSafeImageArray(property.propertyimage)} />,
                    propertyid: property.propertyid || 'N/A',
                    propertyname: property.propertyaddress || 'N/A',
                    clustername: property.clustername || 'N/A',
                    categoryname: property.categoryname || 'N/A',
                    propertyprice: property.normalrate ? `RM ${property.normalrate}` : 'N/A',
                    propertydiscount: property.propertydiscount > 0 ? `RM ${property.propertydiscount}` : 'None',
                    propertyquantity: property.quantity || '1',
                    propertylocation: property.nearbylocation || 'N/A',
                    propertyguestpaxno: property.propertyguestpaxno || 'N/A',
                    propertystatus: property.propertystatus || 'N/A',
                    propertybedtype: property.propertybedtype || 'N/A',
                    propertydescription: finalDesc,
                    username: property.username || 'N/A',
                });
            } else if (action === 'edit') {
                if (property.propertystatus === 'Available') {
                    displayToast('error', 'You need to disable the property first before editing.');
                    return;
                }

                setEditProperty({ ...property });
                setIsPropertyFormOpen(true);
            } else if (action === 'accept') {
                displayToast('info', 'Accepting property...', true);
                await acceptMutation.mutateAsync(property.propertyid);
            } else if (action === 'reject') {
                displayToast('info', 'Rejecting property...', true);
                await rejectMutation.mutateAsync(property.propertyid);
            } else if (action === 'enable') {
                displayToast('info', 'Enabling property...', true);
                await enableStatusMutation.mutateAsync(property.propertyid);
            } else if (action === 'disable') {
                displayToast('info', 'Disabling property...', true);
                await disableStatusMutation.mutateAsync(property.propertyid);
            } else if (action === 'delete') {
                if (
                    property.propertystatus === 'Unavailable' &&
                    String(property.username || '').trim().toLowerCase() === String(username || '').trim().toLowerCase()
                ) {
                    setPropertyToDelete(property.propertyid);
                    setIsDialogOpen(true);
                } else {
                    displayToast('error', 'You do not have permission to delete this property.');
                }
            }
        } catch (error) {
            console.error('Error handling action:', error);

            if (
                action !== 'accept' &&
                action !== 'reject' &&
                action !== 'enable' &&
                action !== 'disable'
            ) {
                displayToast('error', error.message || 'An error occurred while processing your request.');
            }
        }
    };

    const handleDeleteProperty = async () => {
        try {
            const property = properties.find((prop) => prop.propertyid === propertyToDelete);

            if (!property) {
                displayToast('error', 'Property not found. Please refresh the page and try again.');
                setIsDialogOpen(false);
                setPropertyToDelete(null);
                return;
            }

            if (property.propertystatus !== 'Unavailable') {
                displayToast('error', 'Only unavailable properties can be deleted.');
                setIsDialogOpen(false);
                setPropertyToDelete(null);
                return;
            }

            displayToast('info', 'Deleting property...', true);
            await deleteMutation.mutateAsync(propertyToDelete);
        } catch (error) {
            console.error('Failed to delete property:', error);
            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                'Failed to delete property. Please try again.';

            displayToast('error', errorMessage);
            setIsDialogOpen(false);
            setPropertyToDelete(null);
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
        propertydiscount: 'Flat Discount (Override)',
        propertylocation: 'Property Location',
        propertyguestpaxno: 'Guest Capacity',
        propertystatus: 'Property Status',
        propertybedtype: 'Bed Type',
        propertydescription: 'Description',
        username: 'Operator Name',
    };

    const filteredProperties = properties.filter((property) => {
        if (usergroup === 'Moderator' && String(property.username || '').trim().toLowerCase() !== String(username || '').trim().toLowerCase()) {
            return false;
        }

        const statusMatch =
            appliedFilters.status === 'All' ||
            (property.propertystatus ?? 'Pending').toLowerCase() === appliedFilters.status.toLowerCase();

        const searchInFields =
            `${property.propertyid} ${property.propertyaddress} ${property.clustername} ${property.normalrate} ${property.propertystatus}`
                .toLowerCase()
                .includes(searchKey.toLowerCase());

        return statusMatch && searchInFields;
    });

    const propertyDropdownItems = (property, currentUsername, currentUsergroup) => {
        const isModerator = currentUsergroup === 'Moderator';
        const { propertystatus } = property;

        if (isModerator) {
            if (propertystatus === 'Pending') {
                return [
                    { label: 'View Details', icon: <FaEye />, action: 'view' },
                ];
            }

            if (propertystatus === 'Available') {
                return [
                    { label: 'View Details', icon: <FaEye />, action: 'view' },
                    { label: 'Edit', icon: <FaEdit />, action: 'edit' },
                    { label: 'Disable', icon: <FaTimes />, action: 'disable' },
                ];
            }

            if (propertystatus === 'Unavailable') {
                return [
                    { label: 'View Details', icon: <FaEye />, action: 'view' },
                    { label: 'Edit', icon: <FaEdit />, action: 'edit' },
                    { label: 'Enable', icon: <FaCheck />, action: 'enable' },
                    { label: 'Delete', icon: <FaTrash />, action: 'delete' },
                ];
            }
        }

        return [{ label: 'View Details', icon: <FaEye />, action: 'view' }];
    };

    const columns = [
        { header: 'ID', accessor: 'propertyid' },
        {
            header: 'Image',
            accessor: 'propertyimage',
            render: (property) => {
                const images = getSafeImageArray(property.propertyimage);
                const firstImage = images[0];

                return firstImage ? (
                    <img
                        src={getSafeImageSrc(firstImage)}
                        alt={property.propertyname || property.propertyaddress || 'Property'}
                        style={{
                            width: 80,
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: '4px',
                        }}
                    />
                ) : (
                    <span>No Image</span>
                );
            },
        },
        { header: 'Name', accessor: 'propertyaddress' },
        { header: 'Price(RM)', accessor: 'normalrate' },
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
                <ActionDropdown
                    items={propertyDropdownItems(property, username, usergroup)}
                    onAction={(action) => handleAction(action, property)}
                />
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

    return (
        <div>
            <div className="header-container">
                <div>
                    <h1 className="dashboard-page-title">Property Listings</h1>
                    <p className="dashboard-page-description">
                        Create, view, update, enable, disable, and manage property listings with their status, pricing, rooms, and availability details.
                    </p>
                </div>

                <SearchBar
                    value={searchKey}
                    onChange={(newValue) => setSearchKey(newValue)}
                    placeholder="Search properties..."
                />
            </div>

            <Filter filters={filters} onApplyFilters={handleApplyFilters} />

            <button
                className="create-property-button"
                onClick={() => {
                    setEditProperty(null);
                    setIsPropertyFormOpen(true);
                }}
            >
                Create New Property
            </button>

            {isLoading ? (
                <div className="loader-box">
                    <Loader />
                </div>
            ) : error ? (
                <div className="error-message">
                    Error loading properties. Please try again.
                </div>
            ) : (
                <PaginatedTable
                    data={filteredProperties}
                    columns={columns}
                    rowKey="propertyid"
                    currentPage={page}
                    pageSize={pageSize}
                    totalCount={filteredProperties.length}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                />
            )}

            <Modal
                isOpen={!!selectedProperty}
                title="Property Details"
                data={selectedProperty || {}}
                labels={displayLabels}
                onClose={() => setSelectedProperty(null)}
            />

            {isPropertyFormOpen && (
                <PropertyForm
                    initialData={editProperty}
                    onSubmit={async () => {
                        const wasEditing = !!editProperty;

                        setIsPropertyFormOpen(false);
                        setEditProperty(null);

                        if (!wasEditing) {
                            setPage(1);
                        }

                        queryClient.invalidateQueries({ queryKey: ['properties-listing'] });
                       queryClient.invalidateQueries({ queryKey: ['product-properties'] });

                        displayToast(
                            'success',
                            wasEditing ? 'Property updated successfully' : 'Property created successfully'
                        );
                    }}
                    onClose={() => setIsPropertyFormOpen(false)}
                />
            )}

            <Alert
                isOpen={isDialogOpen}
                title="Confirm Delete"
                message="Are you sure you want to delete this property?"
                onConfirm={handleDeleteProperty}
                onCancel={() => setIsDialogOpen(false)}
            />

            {showToast && <Toast type={toastType} message={toastMessage} />}
        </div>
    );
};

export default PropertyListing;
