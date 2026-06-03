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
import { FaEye, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io"; 
import '../../../../Component/MainContent/MainContent.css';
import '../Property Listing/PropertyListing.css';

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

// BEAUTIFUL IMAGE SLIDER COMPONENT FOR THE MODAL
const ImageCarousel = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) return <span style={{ color: '#888' }}>No Image Available</span>;

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
    
    const queryClient = useQueryClient();
    
    const toastTimerRef = useRef(null);
    
const username = localStorage.getItem('username') || '';
const usergroup = localStorage.getItem('usergroup') || '';
const userid = localStorage.getItem('userid') || '';

const propertyQueryKey = ['properties-listing', usergroup, userid, username, page, pageSize];

const { data, isLoading, isFetching, error } = useQuery({
    queryKey: propertyQueryKey,
    queryFn: () => fetchPropertiesListingTable(page, pageSize),
    enabled: !!username && !!usergroup,
    placeholderData: (previousData) => previousData,
    select: (data) => {
        const validProps = (data?.properties || []).filter(
            property => property.propertyid !== undefined
        );

        const sortedProps = [...validProps].sort(
            (a, b) => parseInt(b.propertyid) - parseInt(a.propertyid)
        );

        return {
            properties: sortedProps,
            totalCount: data?.totalCount || sortedProps.length
        };
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
});

    const properties = data?.properties || [];
    const totalCount = data?.totalCount || 0;

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

const acceptMutation = useMutation({
    mutationFn: async (propertyId) => {
        // Accept API should handle:
        // 1. Updating property status to Available
        // 2. Sending only the accepted notification
        return propertyListingAccept(propertyId);
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
        queryClient.invalidateQueries({ queryKey: ['properties-listing'] });
        queryClient.invalidateQueries({ queryKey: ['product-properties'] });

        displayToast('success', 'Property accepted successfully');
    },
});

const rejectMutation = useMutation({
    mutationFn: async (propertyId) => {
        // Reject API should handle:
        // 1. Updating property status to Unavailable
        // 2. Sending only the rejected notification
        return propertyListingReject(propertyId);
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
        queryClient.invalidateQueries({ queryKey: ['properties-listing'] });
        queryClient.invalidateQueries({ queryKey: ['product-properties'] });

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
           queryClient.invalidateQueries({ queryKey: ['product-properties'] });
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
           queryClient.invalidateQueries({ queryKey: ['product-properties'] });
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
                    prop => prop.propertyid !== propertyId
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
          queryClient.invalidateQueries({ queryKey: ['product-properties'] });
        displayToast('success', 'Property deleted successfully');
    },
    onSettled: () => {
        setIsDialogOpen(false);
        setPropertyToDelete(null);
    },
});

    const handleAction = async (action, property) => {
        try {
            if (action === 'view') {
                
                let rawDesc = property.propertydescription || 'N/A';
                let finalDesc = rawDesc;
                let rawSetup = property.room_details || property.roomsetup || "";

                if (rawDesc.includes("_ROOMDATA_")) {
                    const parts = rawDesc.split("_ROOMDATA_");
                    finalDesc = parts[0]; 
                    rawSetup = parts[1];  
                }

                let roomsList = [];
                try {
                    if (typeof rawSetup === 'object' && rawSetup !== null) {
                        roomsList = rawSetup;
                    } else if (typeof rawSetup === 'string' && rawSetup.startsWith('[')) {
                        roomsList = JSON.parse(rawSetup);
                    } else if (['Hotel', 'Resort', 'Inn', 'Hostel'].includes(property.categoryname) && property.propertybedtype) {
                        const beds = property.propertybedtype.split(',').map(s => s.trim()).filter(Boolean);
                        roomsList = beds.map((bed, idx) => ({
                            id: `legacy-${idx}`, name: bed, bedType: bed, maxGuests: property.propertyguestpaxno || 1, description: "", price: property.normalrate, quantity: 1, images: [], options: []
                        }));
                    }
                } catch (e) {
                    console.error("Error parsing rooms:", e);
                }

                // If this is a Hotel with rooms, format it beautifully!
                if (roomsList.length > 0) {
                    finalDesc = (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '5px' }}>
                            {finalDesc && !finalDesc.includes("_ROOMDATA_") && (
                                <div style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.6', whiteSpace: 'pre-wrap', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    {finalDesc}
                                </div>
                            )}
                            
                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#2d3748', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginTop: '10px' }}>
                                Room Inventory & Packages
                            </div>
                            
                            {roomsList.map((r, i) => (
                                <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', backgroundColor: '#fff', marginBottom: '5px' }}>
                                    <div style={{ fontWeight: 'bold', color: '#2b6cb0', fontSize: '16px', marginBottom: '10px' }}>
                                        {r.name}
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px', color: '#4a5568', marginBottom: '10px' }}>
                                        <div><strong>Bed:</strong> {r.bedType}</div>
                                        <div><strong>Base Price:</strong> RM {r.price}</div>
                                        <div><strong>Guests:</strong> Max {r.maxGuests}</div>
                                        <div><strong>Quantity:</strong> {r.quantity || 1}</div>
                                    </div>

                                    {r.description && (
                                        <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '10px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #edf2f7' }}>
                                            <strong>Description:</strong> {r.description}
                                        </div>
                                    )}

                                    {/* Format exactly like user's screenshot */}
                                    {r.options && r.options.length > 0 && (
                                        <>
                                            <hr style={{ borderTop: '1px dashed #cbd5e0', margin: '12px 0' }} />
                                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#2d3748', marginBottom: '8px' }}>
                                                Variations:
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '10px' }}>
                                                {r.options.map((o, idx) => (
                                                    <div key={idx} style={{ fontSize: '14px', color: '#4a5568', display: 'flex', alignItems: 'center' }}>
                                                        <span>• {o.name}: </span>
                                                        <span style={{ fontWeight: 'bold', color: '#38a169', marginLeft: '6px' }}>RM {o.price}</span>
                                                        <span style={{ fontSize: '12px', color: '#718096', marginLeft: '10px' }}>(Qty: {o.quantity || 1})</span>
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

                setSelectedProperty({
                    galleryWidget: <ImageCarousel images={getSafeImageArray(property.propertyimage)} />,
                    propertyid: property.propertyid || 'N/A',
                    propertyname: property.propertyaddress || 'N/A',
                    clustername: property.clustername || 'N/A',
                    categoryname: property.categoryname || 'N/A',
                    propertyprice: property.normalrate ? `RM ${property.normalrate}` : 'N/A',
                    propertydiscount: property.propertydiscount > 0 ? `RM ${property.propertydiscount}` : 'None',
                    instantpaymentdiscount: property.instantpaymentrate
                        ? `${(parseFloat(property.instantpaymentrate) * 100).toFixed(0)}%`
                        : '0%',
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
        galleryWidget: " ", 
        propertyid: "PID",
        propertyname: "Property Name", 
        clustername: "Cluster Name",
        categoryname: "Category Name",
        propertyprice: "Starting Price",
        propertydiscount: "Flat Discount (Override)", 
        instantpaymentdiscount: "Instant Payment Discount Rate",
        propertyquantity: "Total Base Quantity",
        propertylocation: "Property Location",
        propertyguestpaxno: "Guest Capacity",
        propertystatus: "Property Status",
        propertybedtype: "Bed Type",
        propertydescription: "Description",
        username: "Operator Name"
    };

    const filteredProperties = properties.filter((property) => {

        const statusMatch =
            appliedFilters.status === 'All' ||
            (property.propertystatus ?? 'Pending').toLowerCase() === appliedFilters.status.toLowerCase();

        const searchInFields =
            `${property.propertyid} ${property.propertyaddress} ${property.clustername} ${property.normalrate} ${property.propertystatus}`
                .toLowerCase()
                .includes(searchKey.toLowerCase());

        return statusMatch && searchInFields;
    });

    const propertyDropdownItems = (property, username, usergroup) => {
        const isOwner = property.username === username;
        const isModerator = usergroup === 'Moderator';
        const isAdmin = usergroup === 'Administrator';

        const { propertystatus } = property;
        
        if (isModerator) {
            if (propertystatus === 'Pending') {
                return [
                    { label: 'View Details', icon: <FaEye />, action: 'view' },
                ];
            } else if (propertystatus === 'Available') {
                return [
                    { label: 'View Details', icon: <FaEye />, action: 'view' },
                    { label: 'Edit', icon: <FaEdit />, action: 'edit' },
                ];
            } else if (propertystatus === 'Unavailable') {
                return [
                    { label: 'View Details', icon: <FaEye />, action: 'view' },
                    { label: 'Edit', icon: <FaEdit />, action: 'edit' },
                ];
            }
        }

        if (isAdmin) {
            if (!isOwner) {
                // Admin managing moderator's property
               if (
    property.username !== username &&
    String(property.username || '').toLowerCase().includes('admin')
) {
                    return [{ label: 'View Details', icon: <FaEye />, action: 'view' }];
                }
                if (propertystatus === 'Pending') {
                    return [
                        { label: 'View Details', icon: <FaEye />, action: 'view' },
                        { label: 'Accept', icon: <FaCheck />, action: 'accept' },
                        { label: 'Reject', icon: <FaTimes />, action: 'reject' },
                    ];
                } else if (propertystatus === 'Available') {
                    return [
                        { label: 'View Details', icon: <FaEye />, action: 'view' },
                        { label: 'Disable', icon: <FaTimes />, action: 'disable' },
                    ];
                } else if (propertystatus === 'Unavailable') {
                    return [
                        { label: 'View Details', icon: <FaEye />, action: 'view' },
                        { label: 'Enable', icon: <FaCheck />, action: 'enable' },
                    ];
                }
            } else {
                // Admin managing their own property
                if (propertystatus === 'Available') {
                    return [
                        { label: 'View Details', icon: <FaEye />, action: 'view' },
                        { label: 'Edit', icon: <FaEdit />, action: 'edit' },
                        { label: 'Disable', icon: <FaTimes />, action: 'disable' },
                    ];
                } else if (propertystatus === 'Unavailable') {
                    return [
                        { label: 'View Details', icon: <FaEye />, action: 'view' },
                        { label: 'Edit', icon: <FaEdit />, action: 'edit' },
                        { label: 'Enable', icon: <FaCheck />, action: 'enable' },
                        { label: 'Delete', icon: <FaTrash />, action: 'delete' },
                    ];
                }
            }
        }

        return [{ label: 'View Details', icon: <FaEye />, action: 'view' }];
    };

    

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
            alt={property.propertyname || 'Property'}
            style={{
                width: 80,
                height: 80,
                objectFit: 'cover',
                borderRadius: '6px'
            }}
        />
    ) : (
        <span>No Image</span>
    );
},
        },
        { header: 'Name', accessor: 'propertyaddress' },
        { header: 'Price', accessor: 'normalrate' },
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
            View, manage, and update property listings, including property status, details, pricing, and availability.
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
                    totalCount={totalCount}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                />
            )}

            <Modal
                isOpen={!!selectedProperty}
                title={'Property Details'}
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

                                queryClient.invalidateQueries({
                                    queryKey: ['properties-listing'],
                                });

                                queryClient.invalidateQueries({
                                    queryKey: ['product-properties'],
                                });

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