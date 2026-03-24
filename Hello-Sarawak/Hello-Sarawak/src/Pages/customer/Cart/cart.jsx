import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaArrowRight, FaShoppingCart, FaHistory, FaTrash, FaCreditCard, FaCalendarAlt, FaFilter, FaSort, FaExclamationCircle, FaPaypal, FaBed, FaStickyNote } from 'react-icons/fa';
import { removeReservation, updateReservationStatus, getPropertyOwnerPayPalId, fetchCart, paymentSuccess } from '../../../../Api/api';
import { Link } from 'react-router-dom';
import { AuthProvider } from '../../../Component/AuthContext/AuthContext';
import Navbar from '../../../Component/Navbar/navbar';
import Footer from '../../../Component/Footer/footer';
import Back_To_Top_Button from '../../../Component/Back_To_Top_Button/Back_To_Top_Button';
import TawkMessenger from '../../../Component/TawkMessenger/TawkMessenger';
import Toast from '../../../Component/Toast/Toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './cart.css';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const Cart = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('Latest');
  const [filterStatus, setFilterStatus] = useState('All status');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState(null);
  const [selectedReservationId, setSelectedReservationId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, loading, success, error
  const [paymentError, setPaymentError] = useState('');
  const [payPalClientId, setPayPalClientId] = useState(import.meta.env.VITE_PAYPAL_CLIENT_ID || 'AYJvR4a3Wr32N3bfYSsX1Am18FQhyXVhndhQUT2nmJ4I9GLmcL2kG5wIyt16IQ6EmP4xLj_SZtcdiaXF');
  const [propertyOwnerPayPalId, setPropertyOwnerPayPalId] = useState(null);
  const [propertyOwnerName, setPropertyOwnerName] = useState('');
  
  const userId = localStorage.getItem('userId');
  const usergroup = localStorage.getItem('usergroup');
  const taxRate = 0.10;

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState('');

  const queryClient = useQueryClient();

  const displayToast = (type, message) => {
    setToastType(type);
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  useEffect(() => {
    if (usergroup !== 'Customer') {
      queryClient.removeQueries({ queryKey: ['cart'] });
      queryClient.removeQueries({ queryKey: ['reservations'] });
    }
  }, [usergroup, queryClient]);

  const { data: reservations = [], isLoading: loading } = useQuery({
    queryKey: ['cart', usergroup, userId],
    queryFn: fetchCart,
    enabled: usergroup === 'Customer',
    onError: (error) => {
      console.error('Error fetching reservations:', error);
      displayToast('error', 'Failed to load your reservations. Please try again.');
    }
  });

  // FIXED: Optimistic UI Update for Instant Action (No Lag!)
  const updateStatusMutation = useMutation({
    mutationFn: ({ reservationId, status }) => updateReservationStatus(reservationId, status),
    onMutate: async ({ reservationId, status }) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ['cart', usergroup, userId] });
      
      // Snapshot the previous state
      const previousCart = queryClient.getQueryData(['cart', usergroup, userId]);
      
      // Instantly update the cart data on screen!
      queryClient.setQueryData(['cart', usergroup, userId], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(res => 
          res.reservationid === reservationId ? { ...res, reservationstatus: status } : res
        );
      });
      
      return { previousCart };
    },
    onSuccess: (_, variables) => {
      const statusMessages = {
        'Paid': 'Your reservation has been paid successfully.',
        'Canceled': 'Your reservation has been canceled.',
        'Pending': 'Your reservations have been checked out. Please wait for the response of the operators.'
      };
      displayToast('success', statusMessages[variables.status] || 'Status updated successfully.');
    },
    onError: (error, variables, context) => {
      // Revert UI on failure
      queryClient.setQueryData(['cart', usergroup, userId], context.previousCart);
      console.error(`Error updating reservation to ${variables.status}:`, error);
      displayToast('error', `Failed to update reservation. Please try again.`);
    },
    onSettled: () => {
      // Keep background in sync
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    }
  });

  // FIXED: Optimistic UI Update for Removal (No Lag!)
  const removeReservationMutation = useMutation({
    mutationFn: (reservationId) => removeReservation(reservationId),
    onMutate: async (reservationId) => {
      await queryClient.cancelQueries({ queryKey: ['cart', usergroup, userId] });
      const previousCart = queryClient.getQueryData(['cart', usergroup, userId]);
      
      // Instantly remove item from screen!
      queryClient.setQueryData(['cart', usergroup, userId], (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter(res => res.reservationid !== reservationId);
      });
      
      return { previousCart };
    },
    onSuccess: () => {
      displayToast('success', 'Reservation removed from your list.');
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['cart', usergroup, userId], context.previousCart);
      console.error('Error removing reservation:', error);
      displayToast('error', 'Failed to remove reservation. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    }
  });

  const fetchPropertyOwnerPayPalId = async (propertyId) => {
    try {
      setPaymentStatus('loading');
      const ownerData = await getPropertyOwnerPayPalId(propertyId);
      setPropertyOwnerPayPalId(ownerData.payPalId);
      setPropertyOwnerName(ownerData.ownerName);
      setPaymentStatus('idle');
      return ownerData.payPalId;
    } catch (error) {
      console.error('Error fetching property owner PayPal ID:', error);
      setPaymentStatus('error');
      setPaymentError('Failed to get payment information. Please try again.');
      return null;
    }
  };

  const handleSortChange = (event) => {
    setSortOrder(event.target.value);
  };  

  const handleFilterChange = (event) => {
    setFilterStatus(event.target.value);
    setCurrentPage(1); 
  };

  const confirmAction = (action, reservationId) => {
    setActionToConfirm(action);
    setSelectedReservationId(reservationId);
    setShowConfirmModal(true);
  };

  const executeAction = async () => {
    if (!actionToConfirm || (!selectedReservationId && actionToConfirm !== 'checkout')) return;
    
    try {
      switch(actionToConfirm) {
        case 'pay':
          const reservation = reservations.find(r => r.reservationid === selectedReservationId);
          setSelectedReservation(reservation);
          await fetchPropertyOwnerPayPalId(reservation.propertyid);
          setShowPaymentModal(true);
          break;
        case 'cancel':
          displayToast('success', 'Processing cancellation...');
          updateStatusMutation.mutate({ reservationId: selectedReservationId, status: 'Canceled' });
          break;
        case 'remove':
          displayToast('success', 'Removing...');
          removeReservationMutation.mutate(selectedReservationId);
          break;
        case 'checkout':
          handleCheckout();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Error executing ${actionToConfirm} action:`, error);
    } finally {
      // Closes instantly before API confirms, keeping UI snappy
      setShowConfirmModal(false);
      setActionToConfirm(null);
      setSelectedReservationId(null);
    }
  };

  const handleCheckout = async () => {
    try {
      const bookingReservations = reservations.filter(reservation => 
        reservation.reservationstatus === 'Booking');
      
      if (bookingReservations.length === 0) {
        displayToast('info', 'No bookings to checkout.');
        return;
      }
  
      await Promise.all(
        bookingReservations.map(async (reservation) => {
          updateStatusMutation.mutate({ 
            reservationId: reservation.reservationid, 
            status: 'Pending' 
          });
        })
      );
  
    } catch (error) {
      console.error('Error during checkout:', error);
      displayToast('error', 'Checkout process failed. Please try again.');
    }
  };

  const handlePayPalApprove = async (data, actions, reservationId) => {
    try {
      const details = await actions.order.capture();
      console.log('Payment completed successfully', details);
      
      updateStatusMutation.mutate({
        reservationId: selectedReservation.reservationid,
        status: 'Paid'
      });
      
      setShowPaymentModal(false);
      setSelectedReservation(null);

      await paymentSuccess(selectedReservation.reservationid);
      
      return true;
    } catch (error) {
      console.error('Error completing PayPal payment:', error);
      setPaymentError('Payment could not be processed. Please try again.');
      return false;
    }
  };

  const createOrder = (data, actions) => {
    if (!selectedReservation || !propertyOwnerPayPalId) {
      setPaymentError('Payment information not available. Please try again.');
      return Promise.reject('Invalid reservation or recipient information');
    }
    
    return actions.order.create({
      purchase_units: [
        {
          amount: {
            currency_code: 'MYR',
            value: selectedReservation.totalprice.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: 'MYR',
                value: (selectedReservation.totalprice * (1 - taxRate)).toFixed(2)
              },
              tax_total: {
                currency_code: 'MYR',
                value: (selectedReservation.totalprice * taxRate).toFixed(2)
              }
            }
          },
          description: `Reservation for ${selectedReservation.propertyaddress}`,
          reference_id: `reservation-${selectedReservation.reservationid}`,
          payee: {
            email_address: propertyOwnerPayPalId
          },
          items: [
            {
              name: `Reservation #${selectedReservation.reservationid}`,
              description: `Stay at ${selectedReservation.propertyaddress}`,
              unit_amount: {
                currency_code: 'MYR',
                value: (selectedReservation.totalprice * (1 - taxRate)).toFixed(2)
              },
              quantity: '1',
              category: 'DIGITAL_GOODS'
            }
          ]
        }
      ],
      application_context: {
        shipping_preference: 'NO_SHIPPING'
      }
    });
  };

  const handlePayPalError = (err) => {
    console.error('PayPal error:', err);
    setPaymentError('There was an error processing your payment. Please try again.');
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);
  const reservationsPerPage = 5;

  const sortedReservations = (() => {
    const sorted = [...reservations];
    if (sortOrder === 'Latest') {
      return sorted.reverse();
    } else if (sortOrder === 'Price High to Low') {
      return sorted.sort((a, b) => b.totalprice - a.totalprice);
    } else if (sortOrder === 'Price Low to High') {
      return sorted.sort((a, b) => a.totalprice - b.totalprice);
    }
    return sorted;
  })();

  const filteredReservations =
    filterStatus === 'All status'
      ? sortedReservations
      : sortedReservations.filter((reservation) => 
        reservation.reservationstatus === filterStatus
      );

  const indexOfLastReservation = currentPage * reservationsPerPage;
  const indexOfFirstReservation = indexOfLastReservation - reservationsPerPage;
  const currentReservations = filteredReservations.slice(indexOfFirstReservation, indexOfLastReservation);
  const totalPages = Math.ceil(filteredReservations.length / reservationsPerPage);

  const acceptedReservations = reservations.filter(reservation => 
    reservation.reservationstatus === 'Accepted');
  
  const finalTotal = acceptedReservations.reduce((acc, reservation) => 
    acc + reservation.totalprice, 0);
  
  const totalNights = acceptedReservations.reduce((acc, reservation) => {
    const checkIn = new Date(reservation.checkindatetime);
    const checkOut = new Date(reservation.checkoutdatetime);
    const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    return acc + days;
  }, 0);

  const parseReservationRequest = (request) => {
    if (!request) return { roomName: '', specialRequest: '' };
    let roomName = '';
    let specialRequest = '';
    
    if (request.includes('Room Selected:')) {
        const parts = request.split('Additional Requests:');
        roomName = parts[0].replace('Room Selected:', '').trim();
        if (parts.length > 1) {
            specialRequest = parts[1].trim();
        }
    } else {
        specialRequest = request;
    }
    return { roomName, specialRequest };
  };

  const StatusBadge = ({ status }) => {
    const getStatusIcon = (status) => {
      switch(status.toLowerCase()) {
        case 'pending': return <FaCalendarAlt />;
        case 'canceled': return <FaTrash />;
        case 'rejected': return <FaExclamationCircle />;
        case 'paid': return <FaCreditCard />;
        case 'accepted': return <FaCalendarAlt />;
        case 'expired': return <FaCalendarAlt />;
        default: return <FaExclamationCircle />;
      }
    };
    
    const getStatusClass = (status) => {
      switch(status.toLowerCase()) {
        case 'pending':
        case 'canceled':
        case 'rejected':
        case 'paid':
        case 'accepted':
        case 'expired':
          return `status-${status.toLowerCase()}`;
        default:
          return 'status-rejected';
      }
    };

    const getStatusText = (status) => {
      switch(status.toLowerCase()) {
        case 'pending':
        case 'canceled':
        case 'rejected':
        case 'paid':
        case 'accepted':
        case 'expired':
          return status;
        default:
          return 'Rejected';
      }
    };
    
    return (
      <span className={`status-badge ${getStatusClass(status)}`}>
        {getStatusIcon(status)} {getStatusText(status)}
      </span>
    );
  };

  const CartItemSkeleton = () => (
    <div className="cart-item skeleton">
      <div className="row align-items-center">
        <div className="cart-image skeleton-image"></div>
        <div className="col-md-6">
          <h5 className="skeleton-text"></h5>
          <p className="skeleton-text"></p>
          <p className="skeleton-text"></p>
          <p className="skeleton-text"></p>
        </div>
        <div className="cart-price">
          <p className="skeleton-text"></p>
          <div className="skeleton-button"></div>
        </div>
      </div>
    </div>
  );

  const ConfirmationModal = () => {
    if (!showConfirmModal) return null;
    
    let title = '';
    let message = '';
    
    switch(actionToConfirm) {
      case 'pay':
        title = 'Confirm Payment';
        message = 'Are you sure you want to proceed to payment for this reservation?';
        break;
      case 'cancel':
        title = 'Confirm Cancellation';
        message = 'Are you sure you want to cancel this reservation? This action cannot be undone.';
        break;
      case 'remove':
        title = 'Confirm Removal';
        message = 'Are you sure you want to remove this reservation from your list?';
        break;
      default:
        title = 'Confirm Action';
        message = 'Are you sure you want to proceed?';
    }
    
    return (
      <div className="modal-overlay_cart">
        <div className="modal-content">
          <h3>{title}</h3>
          <p>{message}</p>
          <div className="modal-actions">
            <button 
              className="modal-button modal-cancel" 
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </button>
            <button 
              className="modal-button modal-confirm" 
              onClick={executeAction}
              disabled={updateStatusMutation.isPending || removeReservationMutation.isPending}
            >
              {updateStatusMutation.isPending || removeReservationMutation.isPending ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PaymentModal = () => {
    if (!showPaymentModal || !selectedReservation) return null;
    
    return (
      <div className="modal-overlay payment-modal-overlay">
        <div className="modal-content payment-modal-content">
          <h3>Complete Payment</h3>
          <div className="payment-details">
            <div className="payment-property-info">
              <h4>{selectedReservation.propertyaddress}</h4>
              <p>Check-in: {new Date(selectedReservation.checkindatetime).toLocaleDateString()}</p>
              <p>Check-out: {new Date(selectedReservation.checkoutdatetime).toLocaleDateString()}</p>
              <p style={{ fontWeight: 'bold', marginTop: '10px' }}>Total Amount: RM {selectedReservation.totalprice.toFixed(2)}</p>
            </div>
            
            {paymentStatus === 'loading' ? (
              <div className="payment-loading">
                <p>Loading payment information...</p>
              </div>
            ) : paymentStatus === 'error' ? (
              <div className="payment-error">
                <p>{paymentError || 'An error occurred. Please try again.'}</p>
              </div>
            ) : (
              <div className="payment-methods">
                <div className="paypal-container">
                <PayPalScriptProvider options={{ 
                  "client-id": payPalClientId,
                  currency: "MYR",
                  intent: "capture",
                  components: "buttons", 
                  "disable-funding": "credit,card", 
                  "data-order-id": selectedReservation?.reservationid 
                }}>
                  <PayPalButtons
                    style={{
                      layout: "vertical",
                      color: "blue",
                      shape: "rect",
                      label: "pay"
                    }}
                    createOrder={createOrder}
                    onApprove={handlePayPalApprove}
                    onError={handlePayPalError}
                    onCancel={() => {
                      console.log('Payment canceled by user');
                      setPaymentError('Payment was canceled. You can try again when ready.');
                    }}
                  />
                </PayPalScriptProvider>
                  {paymentError && <p className="payment-error-message">{paymentError}</p>}
                </div>
              </div>
            )}
            
            <div className="modal-actions">
              <button 
                className="btn-payment-retry"
                onClick={() => fetchPropertyOwnerPayPalId(selectedReservation.propertyid)}
              >
                Retry
              </button>

              <button 
                className="modal-button modal-cancel" 
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedReservation(null);
                  setPaymentError('');
                  setPaymentStatus('idle');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CartItem = ({ reservation }) => {
    const { roomName, specialRequest } = parseReservationRequest(reservation.request);
    
    return (
      <div className="cart-item" key={reservation.reservationid}>
        <div className="row align-items-center">
          <div className="cart-image">
            {reservation.propertyimage ? (
              <img
                src={`data:image/jpeg;base64,${reservation.propertyimage[0]}`}
                alt={reservation.propertyaddress}
                loading="lazy"
              />
            ) : (
              <div className="placeholder-image">No Image</div>
            )}
          </div>
          <div className="col-md-6">
            <h4 style={{ marginBottom: '10px' }}>{reservation.propertyaddress}</h4>
            
            {roomName && (
              <div style={{ backgroundColor: '#e8f4fd', padding: '6px 12px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', marginBottom: '12px', border: '1px solid #cce5ff' }}>
                <FaBed style={{ color: '#007bff', marginRight: '8px' }} />
                <span style={{ fontWeight: '600', color: '#0056b3', fontSize: '14px' }}>{roomName}</span>
              </div>
            )}

            <p>
              <FaCalendarAlt className="icon-inline" /> 
              Arrival: {new Date(reservation.checkindatetime).toLocaleDateString()}
            </p>
            <p>
              <FaCalendarAlt className="icon-inline" /> 
              Departure: {new Date(reservation.checkoutdatetime).toLocaleDateString()}
            </p>
            <p>
            <FaCalendarAlt className="icon-inline" /> 
              Expired Date: {new Date(reservation.reservationblocktime).toLocaleDateString()}
            </p>
            <p style={{ marginTop: '8px' }}>Status: <StatusBadge status={reservation.reservationstatus} /></p>

            {specialRequest && specialRequest !== 'None' && (
              <p style={{ fontSize: '13px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                <FaStickyNote className="icon-inline" /> Note: {specialRequest}
              </p>
            )}
          </div>
          <div className="cart-price" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#333', fontWeight: 'bold' }}>RM {reservation.totalprice.toFixed(2)}</h3>
            <div className="cart-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              {reservation.reservationstatus === 'Accepted' && (
                <button
                  className="btn-action btn-pay"
                  onClick={() => confirmAction('pay', reservation.reservationid)}
                  disabled={updateStatusMutation.isPending}
                  style={{ width: '100%' }}
                >
                  <FaPaypal className="icon-inline" /> Pay Now
                </button>
              )}
              <button
                className="btn-action btn-cancel"
                onClick={() => confirmAction('cancel', reservation.reservationid)}
                disabled={updateStatusMutation.isPending || reservation.reservationstatus === 'Canceled' || reservation.reservationstatus === 'Paid'}
                style={{ width: '100%' }}
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="Cart_Container_Main">
        <AuthProvider>
          <Navbar />

          <br /><br /><br />
          
          {showToast && <Toast message={toastMessage} type={toastType} />}
          
          <ConfirmationModal />
          
          <PaymentModal />
          
          <div className="cart-section">
            <div className="reservation-container">
              <div className="section-header">
                <FaShoppingCart className="section-icon" />
                <h2>Your Cart</h2>
              </div>
              
              <div className="cart-row">
                <div className="cart-container">
                  {loading ? (
                    Array(2).fill().map((_, index) => <CartItemSkeleton key={index} />)
                  ) : acceptedReservations.length > 0 ? (
                    acceptedReservations.map((reservation) => (
                      <CartItem key={reservation.reservationid} reservation={reservation} />
                    ))
                  ) : (
                    <div className="empty-cart">
                      <div className="empty-cart-icon">
                        <FaShoppingCart />
                      </div>
                      <p className="empty-cart-text">Your cart is empty</p>
                      <p className="empty-cart-subtext">Add properties to your cart to see them here</p>
                      <Link to={'/product'}>
                        <button className="btn-browse">Browse Properties</button>
                      </Link>
                    </div>
                  )}
                </div>

                <div className="total-container">
                  <div className="cart-total">
                    <h4>Cart Summary</h4>
                    <div className="cart-summary-item">
                      <span>Total Properties:</span>
                      <span>{acceptedReservations.length}</span>
                    </div>
                    <div className="cart-summary-item">
                      <span>Total Nights:</span>
                      <span>{totalNights}</span>
                    </div>
                    <div className="cart-finaltotal" style={{ borderTop: '2px solid #eee', paddingTop: '15px', marginTop: '15px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Total (MYR):</span>
                      <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#007bff' }}>RM {finalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="cart-section">
            <div className="reservation-container">
              <div className="section-header">
                <FaHistory className="section-icon" />
                <h2>Reservations History</h2>
              </div>
              
              <div className="filter-cart">
                <div className="filter-item">
                  <label htmlFor="sortOrder">
                    <FaSort className="filter-icon" /> Sort By:
                  </label>
                  <select id="sortOrder" value={sortOrder} onChange={handleSortChange}>
                    <option value="Latest">Latest First</option>
                    <option value="Oldest">Oldest First</option>
                    <option value="Price High to Low">Price: High to Low</option>
                    <option value="Price Low to High">Price: Low to High</option>
                  </select>
                </div>

                <div className="filter-item">
                  <label htmlFor="filterStatus">
                    <FaFilter className="filter-icon" /> Filter By Status:
                  </label>
                  <select id="filterStatus" value={filterStatus} onChange={handleFilterChange}>
                    <option value="All status">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Canceled">Canceled</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Paid">Paid</option>
                    <option value="Accepted">Accepted</option>
                  </select>
                </div>
              </div>

              <div className="reservation-list">
                {loading ? (
                  Array(3).fill().map((_, index) => <CartItemSkeleton key={index} />)
                ) : currentReservations.length > 0 ? (
                  currentReservations.map((reservation) => {
                    const { roomName } = parseReservationRequest(reservation.request);
                    
                    return (
                      <div className="cart-reservation-item" key={reservation.reservationid}>
                        <div className="reservation-content">
                          <div className="reservation-image">
                            {reservation.propertyimage ? (
                              <img
                                src={`data:image/jpeg;base64,${reservation.propertyimage[0]}`}
                                alt={reservation.propertyaddress}
                                loading="lazy"
                              />
                            ) : (
                              <div className="placeholder-image">No Image</div>
                            )}
                          </div>
                          
                          <div className="reservations-content" style={{ padding: '15px', width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h5 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 'bold' }}>{reservation.propertyaddress}</h5>
                                
                                {roomName && (
                                  <div style={{ backgroundColor: '#e8f4fd', padding: '4px 10px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', marginBottom: '12px', border: '1px solid #cce5ff', fontSize: '13px' }}>
                                      <FaBed style={{ color: '#007bff', marginRight: '6px' }} />
                                      <span style={{ fontWeight: '600', color: '#0056b3' }}>{roomName}</span>
                                  </div>
                                )}
                                
                                <p>
                                  <FaCalendarAlt className="icon-inline" /> 
                                  Check-in: {new Date(reservation.checkindatetime).toLocaleDateString()}
                                </p>
                                <p>
                                  <FaCalendarAlt className="icon-inline" /> 
                                  Check-out: {new Date(reservation.checkoutdatetime).toLocaleDateString()}
                                </p>
                                <p>
                                  <FaCalendarAlt className="icon-inline" /> 
                                  Expired Date: {new Date(reservation.reservationblocktime).toLocaleDateString()}
                                </p>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <h4 style={{ color: '#333', fontWeight: 'bold', marginBottom: '10px' }}>RM {reservation.totalprice.toFixed(2)}</h4>
                                <StatusBadge status={reservation.reservationstatus} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-reservations">
                    <div className="empty-cart-icon">
                      <FaHistory />
                    </div>
                    <p className="empty-cart-text">No reservations found</p>
                    <p className="empty-cart-subtext">
                      {filterStatus !== 'All status' 
                        ? `No reservations with status "${filterStatus}"`
                        : "You don't have any reservations yet"}
                    </p>
                  </div>
                )}
              </div>
            
            {currentReservations.length > 0 && (
              <div className="pagination-controls">
                <button
                  className="pagination-button"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  <FaArrowLeft/>
                </button>
                {[...Array(totalPages)].map((_, index) => {
                  const pageNum = index + 1;

                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={index}
                        className={`pagination-button ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={currentPage === pageNum}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    (pageNum === currentPage - 2 && currentPage > 3) ||
                    (pageNum === currentPage + 2 && currentPage < totalPages - 2)
                  ) {
                    return <span key={index} className="pagination-ellipsis">...</span>;
                  }
                  return null;
                })}
                <button
                  className="pagination-button"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <FaArrowRight/>
                </button>
              </div>
            )}
          </div>
        </div>
        <Back_To_Top_Button />
        <Footer />
        <TawkMessenger />
        </AuthProvider>
        </div>
    </div>
  );
};

export default Cart;