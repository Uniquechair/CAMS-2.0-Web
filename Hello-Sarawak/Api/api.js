const API_URL = import.meta.env.VITE_API_URL;
const getAuthFetchOptions = (options = {}) => {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('accessToken');

  return {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

const authFetch = async (url, options = {}) => {
  let response = await fetch(url, getAuthFetchOptions(options));

  if (response.status !== 401) {
    return response;
  }

  let errorBody = {};
  try {
    errorBody = await response.clone().json();
  } catch {
    errorBody = {};
  }

  if (errorBody.message !== 'Token expired.') {
    return response;
  }

  console.warn('Access token expired. Refreshing token...');

  const refreshResponse = await fetch(`${API_URL}/refresh-token`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!refreshResponse.ok) {
    console.error('Refresh token failed. Please login again.');
    return response;
  }

  return fetch(url, getAuthFetchOptions(options));
};



export const checkRegisterDuplicate = async ({ email, phoneNumber }) => {
  const response = await fetch(`${API_URL}/check-register-duplicate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
      email,
      phoneNumber
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Failed to check account details.');
    error.field = data.field || '';
    error.data = data;
    throw error;
  }

  return data;
};

//Register
export const signupUser = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    return response;
  } catch (error) {
    console.error('API error:', error);
    throw error; 
  }
};

// Login
export const loginUser = async (userData) => {
  try {
const response = await fetch(`${API_URL}/login`, {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(userData),
});

    return response;
  } catch (error) {
    console.error('API error:', error);
    throw error; 
  }
};

export const checkstatus = async (userid) => {
  try {
const response = await authFetch(
  `${API_URL}/checkStatus?userid=${encodeURIComponent(userid)}`,
  {
    method: 'GET',
  }
);

    return response;
  } catch (error) {
    console.error('API error:', error);
    throw error; 
  }
};
// Logout
export const logoutUser = async (userid) => {
  try {
const response = await authFetch(`${API_URL}/logout`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ userid }),
});

    const responseData = await response.json();
    return responseData;
  }catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Properties Listing
export const propertiesListing = async (propertyData) => {
  const usergroup = localStorage.getItem("usergroup");
  
  try {
    const response = await fetch(`${API_URL}/propertiesListing`, {
      method: 'POST',
      body: propertyData,
    });

    if(!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create property');
    }

    const responseData = await response.json();
    return responseData;
  }catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Fetch Properties (Product)
export const fetchProduct = async () => {
  const response = await fetch(`${API_URL}/product`, {
    method: 'GET',
    credentials: 'include',
    cache: 'default',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to fetch products');
  }

  return data.properties || data.data || data;
};

// Fetch Single Property Details with ALL images
export const fetchFullPropertyDetails = async (propertyid) => {
  if (!propertyid) {
    throw new Error('Property ID is required');
  }

  const response = await fetch(`${API_URL}/property/${encodeURIComponent(propertyid)}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to fetch full property details');
  }

  return data.property || data;
};



// Fetch Properties (Dashboard)
export const fetchPropertiesListingTable = async () => {
  const username = localStorage.getItem('username'); 
  
  try {
    if (!username) {
      throw new Error('Username is not found in localStorage. Please log in.');
    }

    const response = await authFetch(`${API_URL}/propertiesListingTable?username=${encodeURIComponent(username)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch properties');
    }

    const data = await response.json();
    return data; 
  } catch (error) {
    console.error('Error fetching properties', error);
    throw error;
  }
};

// Update Property
export const updateProperty = async (propertyData, propertyid) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");
  
  if (!propertyid || propertyid === 'undefined') {
    throw new Error('propertyid invalid');
  }
  
  try {
    const response = await fetch(`${API_URL}/propertiesListing/${propertyid}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`, {
      method: 'PUT',
      body: propertyData, 
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update property');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Update property status
export const updatePropertyStatus = async (propertyid, status) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");
  
  try {
    const response = await fetch(`${API_URL}/updatePropertyStatus/${propertyid}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyStatus: status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update property status');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Delete Property
export const deleteProperty = async (propertyid) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");
  
  try {
    const response = await fetch(`${API_URL}/removePropertiesListing/${propertyid}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete property');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Fetch Customers
export const fetchCustomers = async () => {
  const userid = localStorage.getItem("userid");
  
  try {
    const response = await authFetch(`${API_URL}/users/customers?userid=${userid}`);

    if (!response.ok) {
      throw new Error('Failed to fetch customers');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Fetch Owners
export const fetchOwners = async () => {
  try {
    const response = await fetch(`${API_URL}/users/owners`);

    if (!response.ok) {
      throw new Error('Failed to fetch owners');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Fetch Moderators
export const fetchModerators = async () => {
  const userid = localStorage.getItem("userid");
  
  try {
    const response = await authFetch(`${API_URL}/users/moderators?userid=${userid}`);

    if (!response.ok) {
      throw new Error('Failed to fetch moderators');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Fetch Operators
export const fetchOperators = async () => {
  try {
    const response = await authFetch(`${API_URL}/users/operators`);

    if (!response.ok) {
      throw new Error('Failed to fetch operators');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Fetch Administrator
export const fetchAdministrators = async () => {
  try {
   const response = await authFetch(`${API_URL}/users/administrators`);

    if (!response.ok) {
      throw new Error('Failed to fetch administrators');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Create Moderator
export const createModerator = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/users/createModerator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error('Failed to create moderator');
    }

    return response;
  } catch (error) {
    console.error('API error:', error);
    throw error; 
  }
};

// Update User
export const updateUser = async (userData, userid) => {
  try {
    const url = `${API_URL}/users/updateUser/${userid}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      try {
        const errorText = await response.text();
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          throw new Error(errorData.error || errorData.message || `Failed to update user (${response.status})`);
        } catch (jsonError) {
          // console.error('Response is not valid JSON:', jsonError);
          throw new Error(`Server error (${response.status}): ${errorText || response.statusText}`);
        }
      } catch (parseError) {
        // console.error('Error parsing response:', parseError);
        throw new Error(`Failed to update user: ${response.status} ${response.statusText}`);
      }
    }

    // Attempt to parse response as JSON, if fails return an empty success object
    try {
      const data = await response.json();
      return data;
    } catch (jsonError) {
      console.warn('Success response is not valid JSON, returning generic success object:', jsonError);
      return { success: true, message: 'Update successful' };
    }
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Remove User
export const removeUser = async (userid) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");
  
  try {
    const response = await fetch(`${API_URL}/users/removeUser/${userid}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete user');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Suspend User
export const suspendUser = async (userid) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");
  
  try {
    const response = await fetch(`${API_URL}/users/suspendUser/${userid}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`, {
      method: 'PUT',
    });

    if (!response.ok) {
      throw new Error('Failed to suspend user');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Activate User
export const activateUser = async (userid) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");
  
  try {
    const response = await fetch(`${API_URL}/users/activateUser/${userid}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`, {
      method: 'PUT',
    });

    if (!response.ok) {
      throw new Error('Failed to activate user');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Nodemailer For Contact Us
export const sendContactEmail = async (emailData) => {
  try {
    const response = await fetch(`${API_URL}/contact_us`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    return response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Booking Request Notification
export const requestBooking = async (reservationid) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");
  
  try {
    const response = await fetch(`${API_URL}/requestBooking/${reservationid}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if(!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send booking request notification');
    }

    return await response.json();
  }catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Booking Accepted Notification
export const acceptBooking = async (reservationid) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");
  
  try {
    const response = await fetch(`${API_URL}/accept_booking/${reservationid}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send booking accepted notification');
    }

    return await response.json();
  }catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Payment Reminder
export const sendPaymentReminders = async () => {
  try {
    const response = await fetch(`${API_URL}/send_payment_reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send payment reminders');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Suggest New Room
export const suggestNewRoom = async (propertyid, reservationid) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");
  
  try {
    const response = await fetch(`${API_URL}/suggestNewRoom/${propertyid}/${reservationid}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(responseData.message || 'Failed to send new room suggested notification');
    }

    return await response.json();
  } catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Property Listing Request Notification
export const propertyListingRequest = async (propertyid) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");
  
  try {
    const response = await fetch(`${API_URL}/propertyListingRequest/${propertyid}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if(!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send property listing request notification');
    }

    return await response.json();
  }catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Property Listing Request Accepted Notification
export const propertyListingAccept = async (propertyid) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");
  
  try {
    const response = await fetch(`${API_URL}/propertyListingAccept/${propertyid}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if(!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send property listing request accepted notification');
    }

    return await response.json();
  }catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Property Listing Request Rejected Notification
export const propertyListingReject = async (propertyid) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");
  
  try {
    const response = await fetch(`${API_URL}/propertyListingReject/${propertyid}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if(!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send property listing request rejected notification');
    }

    return await response.json();
  }catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Send Suggest Notification 
export const sendSuggestNotification = async (reservationid, selectedOperators) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");
  
  try {
    const response = await fetch(`${API_URL}/sendSuggestNotification/${reservationid}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userids: selectedOperators,  
    }),
    });

    if(!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send suggest notification');
    }

    return await response.json();
  } catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Send Picked Up Notification To Original Reservation Owner
export const sendPickedUpNotification = async (reservationid) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");
  
  try {
    const response = await fetch(`${API_URL}/sendPickedUpNotification/${reservationid}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if(!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send picked up notification');
    }

    return await response.json();
  } catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Send Suggested Room Rejected Message To Operators
export const rejectSuggestedRoom = async (propertyid) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");
  
  try {
    const response = await fetch(`${API_URL}/reject_suggested_room/${propertyid}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(responseData.message || 'Failed to send suggested room rejected notification');
    }

    return await response.json();
  } catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Store Reservation Data
export const createReservation = async (reservationData) => {
  const userid =
    reservationData.userid ||
    localStorage.getItem('userid') ||
    localStorage.getItem('userId');

  const creatorid =
    localStorage.getItem("userid") ||
    localStorage.getItem("userId");

  const creatorUsername = localStorage.getItem("username") || '';

  try {
    if (!userid) {
      throw new Error('User not logged in. Please log in to create a reservation.');
    }

    const reservationWithuserid = { ...reservationData, userid };

    const response = await fetch(
      `${API_URL}/reservation/${userid}?creatorid=${encodeURIComponent(creatorid || userid)}&creatorUsername=${encodeURIComponent(creatorUsername)}`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reservationWithuserid),
      }
    );

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    console.log('CREATE RESERVATION API RESPONSE:', {
      status: response.status,
      ok: response.ok,
      data,
      url: response.url
    });

    if (!response.ok) {
      const message =
        data.message ||
        data.error ||
        data.details ||
        `Failed to create reservation. Status: ${response.status}`;

      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    if (!data || !data.reservationid) {
      throw new Error('No valid reservation ID received from server');
    }

    return data;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Fetch all Reservations
export const fetchReservation = async () => {
  const username = localStorage.getItem('username');
  
  try {
    if (!username) {
      throw new Error('Username is not found in localStorage. Please log in.');
    }

const response = await authFetch(`${API_URL}/reservationTable?username=${encodeURIComponent(username)}`, {
  method: 'GET',
});

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.reservations;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Update reservation status
export const updateReservationStatus = async (
  reservationid,
  status,
  creatorid = '',
  creatorUsername = ''
) => {
  const userid =
    localStorage.getItem("userid") ||
    localStorage.getItem("userId");

  const isExpiredStatus =
    String(status || '').trim().toLowerCase() === 'expired';

  const finalCreatorId = isExpiredStatus
    ? ''
    : (creatorid || userid || '');

  const finalCreatorUsername = isExpiredStatus
    ? ''
    : (
        creatorUsername ||
        localStorage.getItem("username") ||
        ''
      );

  const query = new URLSearchParams();

  query.append('userid', userid || '');

  if (finalCreatorId) {
    query.append('creatorid', finalCreatorId);
  }

  if (finalCreatorUsername) {
    query.append('creatorUsername', finalCreatorUsername);
  }

  try {
    const response = await authFetch(
      `${API_URL}/updateReservationStatus/${reservationid}?${query.toString()}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationStatus: status }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update reservation status (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Cart
export const fetchCart = async () => {
  const userid =
    localStorage.getItem('userid') ||
    localStorage.getItem('userId');

  try {
    if (!userid) {
      throw new Error('User ID not found. Please login again.');
    }

    const response = await authFetch(
      `${API_URL}/cart?userid=${encodeURIComponent(userid)}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch reservations (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.reservations || [];
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Get property owner's PayPal ID
export const getPropertyOwnerPayPalId = async (propertyId) => {
  try {
    if (!propertyId) {
      throw new Error('Property ID is missing.');
    }

    const response = await authFetch(
      `${API_URL}/property/owner-paypal/${encodeURIComponent(propertyId)}`,
      {
        method: 'GET',
      }
    );

    const data = await response.json().catch(() => ({}));

    console.log('OWNER PAYPAL API RESPONSE:', {
      status: response.status,
      ok: response.ok,
      data,
    });

    if (!response.ok || data.success === false || data.authenticated === false) {
      const error = new Error(
        data.error ||
        data.message ||
        `Failed to fetch property owner PayPal ID (${response.status})`
      );

      error.status = response.status;
      error.data = data;
      throw error;
    }

    return {
      payPalId: data.payPalId || '',
      ownerName: data.ownerName || '',
      ownerEmail: data.ownerEmail || '',
      ownerPhone: data.ownerPhone || '',
      ownerGroup: data.ownerGroup || '',
    };
  } catch (error) {
    console.error('API error fetching PayPal ID:', error);
    throw error;
  }
};

// Remove Reservation
export const removeReservation = async (reservationid) => {
  const creatorid =
    localStorage.getItem("userid") ||
    localStorage.getItem("userId");

  const creatorUsername = localStorage.getItem("username") || '';

  try {
    const response = await authFetch(
      `${API_URL}/removeReservation/${reservationid}?creatorid=${encodeURIComponent(creatorid)}&creatorUsername=${encodeURIComponent(creatorUsername)}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete reservation (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Book & Pay Log
export const fetchBookLog = async (userid) => {
  try {
    const usergroup =
      localStorage.getItem('usergroup') ||
      localStorage.getItem('userGroup') ||
      '';

const response = await authFetch(
  `${API_URL}/users/booklog?userid=${encodeURIComponent(userid)}&usergroup=${encodeURIComponent(usergroup)}`,
  {
    method: 'GET',
  }
);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch book logs (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API error fetching book logs:', error);
    throw error;
  }
};

// Fetch Finance 
export const fetchFinance = async (userid) => {
  try {
      const response = await fetch(`${API_URL}/users/finance?userid=${userid}`);
      const data = await response.json();
      return data; 
  } catch (error) {
      console.error('API error:', error);
      throw error;
  }
};

// Fetch Occupancy Rate
export const fetchOccupancyRate = async (userid) => {
  try {
      const response = await fetch(`${API_URL}/users/occupancy_rate?userid=${userid}`);
      const data = await response.json();
      return data; 
  } catch (error) {
      console.error('API error:', error);
      throw error;
  }
};

// Fetch Reservation per Available Room
export const fetchRevPAR = async (userid) => {
  try {
      const response = await fetch(`${API_URL}/users/RevPAR?userid=${userid}`);
      const data = await response.json();
      return data; 
  } catch (error) {
      console.error('API error:', error);
      throw error;
  }
};

// Fetch Cancellation Rate
export const fetchCancellationRate = async (userid) => {
  try {
      const response = await fetch(`${API_URL}/users/cancellation_rate?userid=${userid}`);
      const data = await response.json();
      return data; 
  } catch (error) {
      console.error('API error:', error);
      throw error;
  }
};

// Fetch Customer Retention Rate
export const fetchCustomerRetentionRate = async (userid) => {
  try {
      const response = await fetch(`${API_URL}/users/customer_retention_rate?userid=${userid}`);
      const data = await response.json();
      return data; 
  } catch (error) {
      console.error('API error:', error);
      throw error;
  }
};

// Fetch Guest Satisfaction Score
export const fetchGuestSatisfactionScore = async (userid) => {
  try {
      const response = await fetch(`${API_URL}/users/guest_satisfaction_score?userid=${userid}`);
      const data = await response.json();
      return data; 
  } catch (error) {
      console.error('API error:', error);
      throw error;
  }
};

// Fetch Average Length of Stay
export const fetchALOS = async (userid) => {
  try {
      const response = await fetch(`${API_URL}/users/alos?userid=${userid}`);
      const data = await response.json();
      return data; 
  } catch (error) {
      console.error('API error:', error);
      throw error;
  }
};

// Get Properties Of Administrator For "Suggest"
export const getOperatorProperties = async (userid, reservationid) => {
  try {
    const response = await fetch(`${API_URL}/operatorProperties/${userid}/${reservationid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if(!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get properties');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Fetch normal user data
export const fetchUserData = async (userid) => {
  try {
const response = await authFetch(
  `${API_URL}/users/${encodeURIComponent(userid)}`,
  {
    method: 'GET',
  }
);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch user data (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
};

// Fetch google user data
export const fetchGoogleUserData = async (accessToken) => {
  try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`, {
          headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
          },
      });

      if (!response.ok) {
          throw new Error('Failed to fetch Google user data');
      }

      const profile = await response.json();
      return profile;
  } catch (error) {
      console.error("Error fetching Google user data:", error);
      return null;
  }
};

// Update user profile
export const updateProfile = async (userData) => {
  const creatorid =
    localStorage.getItem("userid") ||
    localStorage.getItem("userId");

  const creatorUsername = localStorage.getItem("username") || '';

  try {
    const safeUserid =
      userData.userid ||
      creatorid;

    if (!safeUserid) {
      throw new Error('User ID is missing');
    }

    const response = await authFetch(
      `${API_URL}/users/updateProfile/${safeUserid}?creatorid=${encodeURIComponent(creatorid || safeUserid)}&creatorUsername=${encodeURIComponent(creatorUsername)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          userid: safeUserid
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'Failed to update user profile');
    }

    return data;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Upload Avatar to Firebase Storage
export const uploadAvatar = async (userid, file) => {
  const creatorid =
    localStorage.getItem("userid") ||
    localStorage.getItem("userId");

  const creatorUsername = localStorage.getItem("username") || '';

  try {
    if (!userid) {
      throw new Error('User ID is missing');
    }

    if (!file) {
      throw new Error('Avatar image file is missing');
    }

    const formData = new FormData();
    formData.append('avatar', file);

    const response = await authFetch(
      `${API_URL}/users/uploadAvatar/${userid}?creatorid=${encodeURIComponent(creatorid || userid)}&creatorUsername=${encodeURIComponent(creatorUsername)}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'Failed to upload avatar');
    }

    return data;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Forgot Password
export const forgotPassword = async (email) => {
    try {
        const response = await fetch(`${API_URL}/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Reset password failed');
        }

        return data; 
    } catch (error) {
        console.error('Reset password request error:', error);
        throw error; 
    }
};

export const googleLogin = async (token) => {
  try {
    if (!token) {
      throw new Error("Google token is missing.");
    }

    const response = await fetch(`${API_URL}/google-login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json().catch(() => ({}));

    console.log("GOOGLE LOGIN API RESPONSE:", {
      status: response.status,
      ok: response.ok,
      data,
    });

    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Google Login Failed");
    }

    return data;
  } catch (error) {
    console.error("Error in Google Login:", error);
    throw error;
  }
};

// Google Map
export const getCoordinates = async (location) => {
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=AIzaSyCe27HezKpItahXjMFcWXf3LwFcjI7pZFk`);
  const data = await response.json();
  if (data.results && data.results.length > 0) {
    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  }
  throw new Error('Location not found');
};

// Assign Role
export const assignRole = async (userid, role) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");

  const res = await fetch(
    `${API_URL}/users/assignRole/${userid}/${role}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );

  const text = await res.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned unexpected response:\n${text}`);
  }

  if (!res.ok) {
    throw new Error(data.message || JSON.stringify(data));
  }

  return data;
};

// Fetch Audit Trails
export const auditTrails = async (userid) => {
  try {
const response = await authFetch(`${API_URL}/auditTrails?userid=${encodeURIComponent(userid)}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});
    if(!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch audit trails');
    }

    const data = await response.json();
    return data.auditTrails;
  }catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Submit a review for a property
export const submitReview = async (payload, creatorUsername) => {
  const usernameToUse =
    creatorUsername ||
    localStorage.getItem("username") ||
    '';

  const response = await fetch(
    `${API_URL}/reviews?creatorUsername=${encodeURIComponent(usernameToUse)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    }
  );

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.message || 'Failed to submit review');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

// Fetch reviews for a specific property
export const fetchReviews = async (propertyid) => {
  try {
    const response = await fetch(`${API_URL}/reviews/${propertyid}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch property reviews');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching property reviews:', error);
    throw error;
  }
};

export const fetchClusters = async () => {
  try {
    const response = await fetch(`${API_URL}/clusters`);
    return response.json();
  } catch (error) {
    console.error('Error fetching clusters:', error);
    throw error;
  }
};

// Fetch unique cluster names from the database
export const fetchClusterNames = async () => {
  try {
    const response = await fetch(`${API_URL}/clusters/names`);
    return response.json();
  } catch (error) {
    console.error('Error fetching cluster names:', error);
    throw error;
  }
};

// Fetch Suggested Reservations
export const suggestedReservations = async (userid) => {
  try {
const response = await authFetch(`${API_URL}/suggestedReservations/${encodeURIComponent(userid)}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch suggested reservations');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Fetch Published Reservations
export const publishedReservations = async (userid) => {
  try {
    const response = await fetch(`${API_URL}/publishedReservations/${userid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch published reservations');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Add a new cluster
export const addCluster = async (clusterData) => {
  try {
    const response = await fetch(`${API_URL}/clusters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clusterData),
    });

    return await response.json();
  } catch (error) {
    console.error('Error adding cluster:', error);
    throw error;
  }
};

// Update an existing cluster
export const updateCluster = async (clusterID, clusterData) => {
  try {
    const response = await fetch(`${API_URL}/clusters/${clusterID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clusterData),
    });

    return await response.json();
  } catch (error) {
    console.error('Error updating cluster:', error);
    throw error;
  }
};

// Delete a cluster
export const deleteCluster = async (clusterID) => {
  try {
    const response = await fetch(`${API_URL}/clusters/${clusterID}`, {
      method: 'DELETE',
    });

    return await response.json();
  } catch (error) {
    console.error('Error deleting cluster:', error);
    throw error;
  }
};

// Fetch Categories
export const fetchCategories = async () => {
  try {
    const response = await fetch(`${API_URL}/categories`);

    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }

    const data = await response.json();
    return data; 
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error; 
  }
};

// Fetch the current commission rate
export const fetchCommissionRate = async () => {
  try {
    const response = await fetch(`${API_URL}/commission?t=${Date.now()}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch commission (${response.status})`);
    }

    const data = await response.json();

    console.log("FETCH COMMISSION RATE RESPONSE:", data);

    const rate = Number(data.commission_rate);

    if (Number.isNaN(rate)) {
      return 0.07;
    }

    return rate;
  } catch (error) {
    console.error("Error fetching commission rate:", error);
    return 0.07;
  }
};

// Update the commission rate
export const updateCommissionRate = async (newRateDecimal, userid) => {
  try {
    const response = await authFetch(`${API_URL}/commission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        newRate: newRateDecimal,
        userid
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || "Failed to update commission rate");
    }

    return data;
  } catch (error) {
    console.error("Backend Error Details:", error);
    throw error;
  }
};

// Payment Successful Notification
export const paymentSuccess = async (reservationid) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");
  
  try {
    const response = await fetch(`${API_URL}/payment_success/${reservationid}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send payment successful notification');
    }

    return await response.json();
  }catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// ==========================================
// HOLIDAY MANAGER API CALLS
// ==========================================

// 1. Fetch official Sarawak holidays from backend API
export const fetchHolidaysFromApi = async (year) => {
  const response = await fetch(`${API_URL}/fetch-holidays/${year}`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to fetch Sarawak holidays'
    );
  }

  return Array.isArray(data.holidays) ? data.holidays : [];
};

// 2. Fetch saved Official Holidays from PostgreSQL Database
export const fetchHolidaysFromDb = async () => {
  const response = await fetch(`${API_URL}/manage-holidays`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to fetch saved holidays from database'
    );
  }

  return Array.isArray(data) ? data : [];
};

// 3. Save Official Holidays & Rates to PostgreSQL Database
export const saveHolidaysToDb = async (holidays) => {
  const response = await authFetch(`${API_URL}/manage-holidays`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ holidays }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to save holidays to database'
    );
  }

  return data;
};

// 4. Fetch saved Custom Festive Periods from PostgreSQL Database
export const fetchFestiveFromDb = async () => {
  const response = await fetch(`${API_URL}/manage-festive`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to fetch festive periods from database'
    );
  }

  return Array.isArray(data) ? data : [];
};

// 5. Save Custom Festive Periods & Rates to PostgreSQL Database
export const saveFestiveToDb = async (festivePeriods) => {
  const response = await authFetch(`${API_URL}/manage-festive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ festivePeriods }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to save festive periods to database'
    );
  }

  return data;
};

// ==========================================
// DYNAMIC PRICING API CALLS
// ==========================================

// 1. Fetch Global Pricing Settings
export const fetchPricingSettings = async () => {
    const response = await fetch(`${API_URL}/pricing-settings`);
    if (!response.ok) throw new Error('Failed to fetch pricing settings');
    return await response.json();
};

// 2. Save Global Pricing Settings
export const savePricingSettings = async (settings) => {
    const response = await fetch(`${API_URL}/pricing-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    });
    if (!response.ok) throw new Error('Failed to save pricing settings');
    return await response.json();
};

// 3. Customer Calculation Engine (Called from PropertyDetails & Cart)
export const calculateBookingPrice = async (checkInDate, checkOutDate, basePrice, propertyid) => {
    const response = await fetch(`${API_URL}/calculate-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ADDED: propertyid is now included in the JSON body sent to the server
        body: JSON.stringify({ checkInDate, checkOutDate, basePrice, propertyid }) 
    });
    if (!response.ok) throw new Error('Failed to calculate dynamic price');
    return await response.json();
};

// Updated checkDateOverlap in api.js
export const checkDateOverlap = async (propertyId, checkIn, checkOut) => {
  const creatorid = localStorage.getItem("userid");
  const creatorUsername = localStorage.getItem("username");

  try {
    const response = await fetch(
      `${API_URL}/check-date-overlap/${propertyId}?creatorid=${creatorid}&creatorUsername=${creatorUsername}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ propertyid: propertyId, checkIn, checkOut }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to check date overlap');
    }

    const data = await response.json();

    return {
      ...data,
      overlap: data.overlap === true || data.isOverlap === true,
      isOverlap: data.overlap === true || data.isOverlap === true,
      isBlackout: data.isBlackout === true
    };
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// ==========================================
// BLACKOUT DATES API CALLS
// ==========================================

// Fetch all blackout dates (Admin sees all, Moderator sees own)
export const fetchBlackoutDates = async () => {
const userid =
  localStorage.getItem('userid') ||
  localStorage.getItem('userId');
  const userGroup = localStorage.getItem('userGroup') || localStorage.getItem('usergroup') || '';

  try {
    const response = await fetch(
      `${API_URL}/blackouts?userid=${encodeURIComponent(userid)}&usergroup=${encodeURIComponent(userGroup)}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch blackout dates');
    }

    return await response.json();
  } catch (error) {
    console.error('API error fetching blackouts:', error);
    throw error;
  }
};

// Create a new blackout (Admin or Moderator)
export const createBlackout = async (blackoutData) => {
  const userid = localStorage.getItem('userid') || localStorage.getItem('userId') || '';
  const username = localStorage.getItem('username') || '';
  const userGroup = localStorage.getItem('userGroup') || localStorage.getItem('usergroup') || '';

  try {
    const response = await fetch(`${API_URL}/blackouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...blackoutData,
        property_name: blackoutData.propertyName || blackoutData.property_name,
        created_by_userid: userid,
        created_by_username: username,
        created_by_role: userGroup.toLowerCase().includes('admin') ? 'admin' : 'moderator',
      }),
    });

    const data = await response.json();

    if (response.status === 409) {
      return {
        isConflict: true,
        conflicts: data.conflicts || [],
        message: data.message || 'Conflict detected',
      };
    }

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create blackout');
    }

    return data;
  } catch (error) {
    console.error('API error creating blackout:', error);
    throw error;
  }
};

// Override (unblock) a moderator's blackout — Admin only
export const overrideBlackout = async (blackoutId, overrideReason) => {
  const userid = localStorage.getItem('userid') || localStorage.getItem('userId') || '';
  const username = localStorage.getItem('username') || '';
  const userGroup = localStorage.getItem('userGroup') || localStorage.getItem('usergroup') || '';

  try {
    const response = await fetch(`${API_URL}/blackouts/${blackoutId}/override`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        overrideReason,
        override_by_userid: userid,
        override_by_username: username,
        override_by_role: userGroup,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to override blackout');
    }

    return data;
  } catch (error) {
    console.error('API error overriding blackout:', error);
    throw error;
  }
};

export const deleteBlackout = async (blackoutId) => {
  const userid = localStorage.getItem('userid') || localStorage.getItem('userId') || '';
  const userGroup = localStorage.getItem('userGroup') || localStorage.getItem('usergroup') || '';

  try {
    const response = await authFetch(
      `${API_URL}/blackouts/${blackoutId}?userid=${encodeURIComponent(userid)}&usergroup=${encodeURIComponent(userGroup)}`,
      {
        method: 'DELETE',
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete blackout');
    }

    return data;
  } catch (error) {
    console.error('API error deleting blackout:', error);
    throw error;
  }
};

// Notification History Feature
// Fetch Notification
export const fetchNotifications = async (userid) => {
  try {
    const response = await fetch(`${API_URL}/notifications?userid=${userid}`);

    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Sync Booking Alert Notifications
export const syncBookingAlertNotifications = async (userid) => {
  const response = await fetch(`${API_URL}/notifications/sync-booking-alerts/${userid}`, {
    method: 'POST'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to sync booking alerts');
  }

  return data;
};

// Create Notification
export const createNotification = async (data) => {
  try {
    const response = await fetch(`${API_URL}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create notification');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Mark a Notification as Read
export const markNotificationAsRead = async (notificationid) => {
  try {
    const response = await fetch(`${API_URL}/notifications/${notificationid}/read`, {
      method: 'PUT',
    });

    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Mark All Notification as Read
export const markAllNotificationsAsRead = async (userid) => {
  try {
    const response = await fetch(`${API_URL}/notifications/read-all/${userid}`, {
      method: 'PUT',
    });

    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Submit FAQ Question - Customer / Moderator
export const submitSupportQuestion = async (formData) => {
  const response = await fetch(`${API_URL}/support-question`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Failed to submit question');
  }

  return data;
};


// Admin - Fetch all submitted customer/moderator questions
export const fetchSupportQuestions = async ({ role = 'all', status = 'all', search = '' } = {}) => {
  const params = new URLSearchParams();

  if (role) params.append('role', role);
  if (status) params.append('status', status);
  if (search) params.append('search', search);

  const response = await authFetch(`${API_URL}/admin/faq/questions?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Failed to fetch support questions');
  }

  return data;
};


// Admin - Fetch FAQ stats
export const fetchFaqStats = async () => {
  const response = await authFetch(`${API_URL}/admin/faq/stats`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Failed to fetch FAQ stats');
  }

  return data;
};


// Public Customer FAQ - Fetch published FAQs
export const fetchPublishedFaqs = async ({ category = 'all', search = '' } = {}) => {
  const params = new URLSearchParams();

  if (category) params.append('category', category);
  if (search) params.append('search', search);

  const response = await fetch(`${API_URL}/faqs?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Failed to fetch published FAQs');
  }

  return data;
};


// Admin - Fetch all published FAQs
export const fetchAdminPublishedFaqs = async () => {
  const response = await authFetch(`${API_URL}/admin/faq/published`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Failed to fetch admin published FAQs');
  }

  return data;
};


// Admin - Mark question as reviewed
export const reviewFaqQuestion = async (questionid, payload) => {
  const response = await authFetch(`${API_URL}/admin/faq/questions/${questionid}/review`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Failed to review FAQ question');
  }

  return data;
};


// Admin - Publish question to FAQ
export const publishFaqQuestion = async (questionid, payload) => {
  const response = await authFetch(`${API_URL}/admin/faq/questions/${questionid}/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Failed to publish FAQ question');
  }

  return data;
};


// Admin - Reject FAQ question
export const rejectFaqQuestion = async (questionid, payload) => {
  const response = await authFetch(`${API_URL}/admin/faq/questions/${questionid}/reject`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Failed to reject FAQ question');
  }

  return data;
};


// Admin - Hide/Delete published FAQ
export const deletePublishedFaq = async (faqid) => {
 const response = await authFetch(`${API_URL}/admin/faq/published/${faqid}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Failed to delete published FAQ');
  }

  return data;
};


export const replyFaqQuestionEmail = async (questionId, payload) => {
  const response = await authFetch(`${API_URL}/faq/questions/${questionId}/reply-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  console.log('FAQ REPLY EMAIL RESPONSE:', {
    status: response.status,
    ok: response.ok,
    data,
  });

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message ||
      data.error ||
      data.details ||
      'Failed to send FAQ reply email.'
    );
  }

  return data;
};