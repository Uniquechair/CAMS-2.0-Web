import React, { useState, useEffect } from 'react';
import { fetchPropertiesListingTable, updatePropertyStatus, deleteProperty, propertyListingAccept, propertyListingReject, fetchReservation } from '../../../../../Api/api';
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
import '../../../../Component/MainContent/MainContent.css';
import '../Property Listing/PropertyListing.css';

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
    
    const { data, isLoading, error } = useQuery({
        queryKey: ['properties', page, pageSize, appliedFilters],
        queryFn: () => fetchPropertiesListingTable(page, pageSize, appliedFilters.status !== 'All' ? appliedFilters.status : undefined),
        select: (data) => {
            const validProps = (data?.properties || []).filter(property => property.propertyid !== undefined);
            const sortedProps = validProps.sort((a, b) => parseInt(b.propertyid) - parseInt(a.propertyid));
            return {
                properties: sortedProps,
                totalCount: data?.totalCount || 0
            };
        },
        staleTime: 30 * 60 * 1000,
        refetchInterval: 1000,
    });

    const properties = data?.properties || [];
    const totalCount = data?.totalCount || 0;

    const displayToast = (type, message) => {
        setToastType(type);
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
    };

    const acceptMutation = useMutation({
        mutationFn: async (propertyId) => {
            return updatePropertyStatus(propertyId, 'Pending');
        },
        onSuccess: (_, propertyId) => {
            queryClient.invalidateQueries({ queryKey: ['properties'] });
        },
        onError: (error) => {
            console.error('Failed to accept property', error);
        }
    });

    const rejectMutation = useMutation({
        mutationFn: async (propertyId) => {
            await propertyListingReject(propertyId);
            return updatePropertyStatus(propertyId, 'Unavailable');
        },
        onSuccess: (_, propertyId) => {
            queryClient.invalidateQueries({ queryKey: ['properties'] });
        },
        onError: (error) => {
            console.error('Failed to reject property', error);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (propertyId) => {
            return deleteProperty(propertyId);
        },
        onSuccess: () => {
            displayToast('success', 'Property deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['properties'] });
        },
        onError: (error) => {
            console.error('Failed to delete property', error);
        },
        onSettled: () => {
            setIsDialogOpen(false);
            setPropertyToDelete(null);
        }
    });

    const handleAction = async (action, property) => {
        try {
            if (action === 'view') {
                
                // BEAUTIFUL DECODER FOR VIEW DETAILS (Works for both Admin and Moderator)
                let rawDesc = property.propertydescription || 'N/A';
                let finalDesc = rawDesc;

                if (rawDesc.includes("_ROOMDATA_")) {
                    const parts = rawDesc.split("_ROOMDATA_");
                    const cleanDesc = parts[0]; 
                    
                    try {
                        const roomsList = JSON.parse(parts[1]);
                        
                        finalDesc = (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ fontSize: '15px', color: '#444', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '10px' }}>
                                    {cleanDesc}
                                </div>
                                
                                <div style={{ fontWeight: 'bold', fontSize: '18px', borderBottom: '2px solid #eaeaea', paddingBottom: '8px', color: '#333' }}>
                                    Room Configurations
                                </div>
                                
                                {roomsList.map((r, i) => (
                                    <div key={i} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fcff' }}>
                                        <div style={{ fontWeight: 'bold', color: '#0056b3', fontSize: '16px', marginBottom: '12px' }}>
                                            {r.name}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px', color: '#555' }}>
                                            <div><strong>Bed:</strong> {r.bedType}</div>
                                            <div><strong>Guests:</strong> Max {r.maxGuests}</div>
                                            <div style={{ gridColumn: 'span 2' }}><strong>Base Price:</strong> RM {r.price}</div>
                                        </div>

                                        {r.options && r.options.length > 0 && (
                                            <div style={{ marginTop: '12px', borderTop: '1px dashed #ccc', paddingTop: '12px' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333', marginBottom: '6px' }}>Variations:</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '10px' }}>
                                                    {r.options.map((o, idx) => (
                                                        <div key={idx} style={{ fontSize: '14px', color: '#555' }}>
                                                            • {o.name}: <span style={{ fontWeight: 'bold', color: '#28a745' }}>RM {o.price}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        );
                    } catch(e) {
                        console.error("Error parsing room data for view details", e);
                        finalDesc = cleanDesc; 
                    }
                }

                setSelectedProperty({
                    propertyid: property.propertyid || 'N/A',
                    propertyname: property.propertyaddress || 'N/A',
                    clustername: property.clustername || 'N/A',
                    categoryname: property.categoryname || 'N/A',
                    propertyprice: property.normalrate || 'N/A',
                    propertylocation: property.nearbylocation || 'N/A',
                    propertyguestpaxno: property.propertyguestpaxno || 'N/A',
                    propertystatus: property.propertystatus || 'N/A',
                    propertybedtype: property.propertybedtype || 'N/A',
                    propertydescription: finalDesc, 
                    images: property.propertyimage || [],
                    username: property.username || 'N/A',
                });
            } else if (action === 'edit') {
                if (property.propertystatus === 'Available') {
                    displayToast('error', 'You need to disable the property first before editing.');
                    return;
                }
                setEditProperty({ ...property });
                setIsPropertyFormOpen(true);
            } else if (action === 'enable') {
                displayToast('success', 'Processing request...');
                await acceptMutation.mutateAsync(property.propertyid);
                displayToast('success', 'Property Enabled Successfully');
            } else if (action === 'disable') {
                displayToast('success', 'Processing request...');
                await rejectMutation.mutateAsync(property.propertyid);
                displayToast('success', 'Property Disabled Successfully');
            } else if (action === 'delete') {
                if (property.propertystatus === 'Unavailable' && property.username === username) {
                    setPropertyToDelete(property.propertyid);
                    setIsDialogOpen(true);
                } else {
                    displayToast('error', 'You do not have permission to delete this property.');
                }
            } 
        } catch (error) {
            console.error('Error handling action:', error);
            displayToast('error', 'An error occurred while processing your request.');
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

            const reservationsQuery = await queryClient.fetchQuery({
                queryKey: ['reservations', propertyToDelete],
                queryFn: fetchReservation
            });
            
            const hasReservation = reservationsQuery.some(reservation => reservation.propertyid === propertyToDelete);

            if (hasReservation) {
                displayToast('error', 'This property has an existing reservation and cannot be deleted.');
                setIsDialogOpen(false);
                setPropertyToDelete(null);
                return;
            }

            displayToast('success', 'Processing deletion...');
            await deleteMutation.mutateAsync(propertyToDelete);
        } catch (error) {
            console.error('Failed to delete property:', error);
            displayToast('error', 'Failed to delete property. Please try again.');
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
        propertyid: "PID",
        propertyname: "Property Name",
        clustername: "Cluster Name",
        categoryname: "Category Name",
        propertyprice: "Property Price",
        propertylocation: "Property Location",
        propertyguestpaxno: "Guest Capacity",
        propertystatus: "Property Status",
        propertybedtype: "Bed Type",
        propertydescription: "Description",
        images: "Images",
        username: "Operator Name"
    };

    const username = localStorage.getItem('username');
    const usergroup = localStorage.getItem('usergroup');

    const filteredProperties = properties.filter((property) => {
        if (usergroup === 'Moderator' && property.username !== username) {
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

    const propertyDropdownItems = (property, username, usergroup) => {
        const isModerator = usergroup === 'Moderator';
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
                    { label: 'Disable', icon: <FaTimes />, action: 'disable' },
                ];
            } else if (propertystatus === 'Unavailable') {
                return [
                    { label: 'View Details', icon: <FaEye />, action: 'view' },
                    { label: 'Edit', icon: <FaEdit />, action: 'edit' },
                    { label: 'Enable', icon: <FaCheck />, action: 'enable' },
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
            render: (property) => (
                property.propertyimage && property.propertyimage.length > 0 ? (
                    <img
                        src={`data:image/jpeg;base64,${property.propertyimage[0]}`}
                        alt={property.propertyname}
                        style={{ width: 80, height: 80 }}
                    />
                ) : (
                    <span>No Image</span>
                )
            ),
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
                <h1 className="dashboard-page-title">Property Listings</h1>
                <SearchBar value={searchKey} onChange={(newValue) => setSearchKey(newValue)} placeholder="Search properties..." />
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
                title={'Property Details'}
                data={selectedProperty || {}}
                labels={displayLabels}
                onClose={() => setSelectedProperty(null)}
            />

            {isPropertyFormOpen && (
                <PropertyForm
                    initialData={editProperty}
                    onSubmit={async () => {
                        setIsPropertyFormOpen(false);
                        displayToast('success', 'Processing request...'); 
                        
                        try {
                            await queryClient.invalidateQueries({ queryKey: ['properties'] });
                            displayToast('success', editProperty ? 'Property updated successfully' : 'Property created successfully');
                            
                            if (!editProperty) {
                                setPage(1); 
                            }
                        } catch (error) {
                            displayToast('error', 'Failed to refresh properties.');
                        }
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