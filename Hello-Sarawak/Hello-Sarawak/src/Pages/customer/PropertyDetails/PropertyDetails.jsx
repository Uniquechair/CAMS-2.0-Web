import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IoIosArrowBack, IoIosArrowForward, IoIosBed } from "react-icons/io";
import { IoMdClose } from "react-icons/io";
import { IoReturnUpBackOutline } from "react-icons/io5";
import { GiWashingMachine, GiClothesline, GiDesert  } from "react-icons/gi";
import { PiSecurityCamera } from "react-icons/pi";
import { SiLightning } from "react-icons/si";
import { TbPawFilled, TbPawOff } from "react-icons/tb";
import { MdLandscape, MdOutlineKingBed, MdFireplace, MdSmokingRooms } from "react-icons/md";
import { FaUser, FaMapMarkerAlt, FaWifi, FaDesktop, FaDumbbell, FaWater, FaSkiing, FaChargingStation, FaParking, FaStar, FaSwimmingPool, FaTv, FaUtensils, FaSnowflake, FaSmokingBan, FaFireExtinguisher, FaFirstAid, FaShower, FaCoffee, FaUmbrellaBeach, FaBath, FaWind, FaBicycle, FaBabyCarriage, FaKey, FaBell, FaTree, FaCity, FaWalking, FaThumbsUp, FaCarSide } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { AuthProvider } from '../../../Component/AuthContext/AuthContext';
import Navbar from '../../../Component/Navbar/navbar';
import Toast from '../../../Component/Toast/Toast';
import Reviews from '../../../Component/Reviews/Reviews';
import Footer from '../../../Component/Footer/footer';
import './PropertyDetails.css';

import { createReservation, requestBooking, getCoordinates, fetchUserData, checkDateOverlap, googleLogin } from '../../../../Api/api';
import { useGoogleLogin } from '@react-oauth/google';

const facilities = [
    { name: "Wi-Fi", icon: <FaWifi className="facilities-icon"/> },
    { name: "Kitchen", icon: <FaUtensils className="facilities-icon"/> },
    { name: "Washer", icon: <GiWashingMachine className="facilities-icon"/> },
    { name: "Dryer", icon: <GiClothesline className="facilities-icon" /> },
    { name: "Air Conditioning", icon: <FaSnowflake className="facilities-icon"/> },
    { name: "Heating", icon: <FaWind className="facilities-icon"/> },
    { name: "Dedicated workspace", icon: <FaDesktop className="facilities-icon"/> },
    { name: "TV", icon: <FaTv className="facilities-icon"/> },

    { name: "Free Parking", icon: <FaParking className="facilities-icon"/> },
    { name: "Swimming Pool", icon: <FaSwimmingPool className="facilities-icon"/> },
    { name: "Bathtub", icon: <FaBath className="facilities-icon"/> },
    { name: "Shower", icon: <FaShower className="facilities-icon"/> },
    { name: "EV charger", icon: <FaChargingStation className="facilities-icon"/> },
    { name: "Baby Crib", icon: <FaBabyCarriage className="facilities-icon"/> },
    { name: "King bed", icon: <MdOutlineKingBed className="facilities-icon"/> },
    { name: "Gym", icon: <FaDumbbell className="facilities-icon"/> },
    { name: "Breakfast", icon: <FaCoffee className="facilities-icon"/> },
    { name: "Indoor fireplace", icon: <MdFireplace className="facilities-icon"/> },
    { name: "Smoking allowed", icon: <MdSmokingRooms className="facilities-icon"/> },
    { name: "No Smoking", icon: <FaSmokingBan className="facilities-icon"/> },

    { name: "City View", icon: <FaCity className="facilities-icon"/> },
    { name: "Garden", icon: <FaTree className="facilities-icon"/> },
    { name: "Bicycle Rental", icon: <FaBicycle className="facilities-icon"/> },
    { name: "Beachfront", icon: <FaUmbrellaBeach className="facilities-icon"/> },
    { name: "Waterfront", icon: <FaWater className="facilities-icon"/> },
    { name: "Countryside", icon: <MdLandscape className="facilities-icon"/> },
    { name: "Ski-in/ski-out", icon: <FaSkiing className="facilities-icon"/> },
    { name: "Desert", icon: <GiDesert className="facilities-icon"/> },
    
    { name: "Security Alarm", icon: <FaBell className="facilities-icon"/> },
    { name: "Fire Extinguisher", icon: <FaFireExtinguisher className="facilities-icon"/> },
    { name: "First Aid Kit", icon: <FaFirstAid className="facilities-icon"/> },
    { name: "Security Camera", icon: <PiSecurityCamera className="facilities-icon"/> },

    { name: "Instant booking", icon: <SiLightning className="facilities-icon"/> },
    { name: "Self check-in", icon: <FaKey className="facilities-icon"/> },
    { name: "Pets Allowed", icon: <TbPawFilled className="facilities-icon"/> },
    { name: "No Pets", icon: <TbPawOff className="facilities-icon"/> }
];

const PropertyDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const propertyId = location.state?.propertyId;
  const passedCheckIn = location.state?.checkInDate || '';
  const passedCheckOut = location.state?.checkOutDate || '';
  const passedGuests = location.state?.guestCount || 1;
  const passedPrice = location.state?.displayRate;
  
  // Base Component States
  const [propertyDetails, setPropertyDetails] = useState(location.state?.propertyDetails || null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(!location.state?.propertyDetails);
  const [error, setError] = useState(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState('');
  
  const [checkIn, setCheckIn] = useState(passedCheckIn);
  const [checkOut, setCheckOut] = useState(passedCheckOut);
  const [guests, setGuests] = useState(passedGuests);
  const [currentDisplayRate, setCurrentDisplayRate] = useState(passedPrice || 0);

  const [totalNights, setTotalNights] = useState(0);
  const [totalprice, settotalprice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isOverlapping, setIsOverlapping] = useState(false);
  
  const [bookingForm, setBookingForm] = useState({
    title: 'Mr.',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    additionalRequests: ''
  });
  
  const [showDescriptionOverlay, setShowDescriptionOverlay] = useState(false);
  const [locationCoords, setLocationCoords] = useState({ lat: null, lng: null });
  const [isDateOverlapping, setIsDateOverlapping] = useState(false);
  
  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);
  const [activeRoomVariationPrice, setActiveRoomVariationPrice] = useState(0);
  const [activeRoomVariationName, setActiveRoomVariationName] = useState('');

  // Real-time dynamic nearby places state
  const [nearbyPlaces, setNearbyPlaces] = useState({ walkable: [], landmarks: [] });

  const [bookingData, setBookingData] = useState({
    checkIn: checkIn,
    checkOut: checkOut,
    adults: 1,
    children: 0,
    selectedRoom: null 
  });

  const [showAllFacilities, setShowAllFacilities] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // ==========================================
  // SAFE DATA EXTRACTION
  // ==========================================
  let description = propertyDetails?.propertydescription || "";
  let rawSetup = propertyDetails?.roomsetup || propertyDetails?.roomSetup || propertyDetails?.room_setup || propertyDetails?.propertybedtype || "";

  if (description.includes("_ROOMDATA_")) {
      const parts = description.split("_ROOMDATA_");
      description = parts[0];
      rawSetup = parts[1];
  }

  const isHotel = ['Hotel', 'Resort', 'Inn', 'Hostel'].includes(propertyDetails?.categoryname);
  const isHomestay = ['Homestay', 'Lodge', 'Guesthouse', 'Apartment'].includes(propertyDetails?.categoryname);
  
  let availableRooms = [];
  let isJsonInventory = false;
  
  try {
      if (rawSetup.startsWith('[')) {
          availableRooms = JSON.parse(rawSetup);
          isJsonInventory = true;
          // Sort rooms by price ascending (cheapest first)
          availableRooms.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      } else if (isHotel && rawSetup) {
          const beds = rawSetup.split(',').map(s => s.trim()).filter(Boolean);
          availableRooms = beds.map((bed, idx) => ({
              id: `legacy-${idx}`,
              name: `Standard Room (${bed})`,
              bedType: bed,
              maxGuests: propertyDetails?.propertyguestpaxno || 1,
              description: "",
              price: propertyDetails?.normalrate,
              images: []
          }));
          isJsonInventory = true; 
      } else {
          availableRooms = rawSetup ? rawSetup.split(',').map(s => s.trim()).filter(Boolean) : [];
      }
  } catch (e) {
      availableRooms = rawSetup ? rawSetup.split(',').map(s => s.trim()).filter(Boolean) : [];
  }

  // ==========================================
  // ALL USE-EFFECT HOOKS
  // ==========================================
  const googleLoginHandler = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const accessToken = tokenResponse.access_token;
        const data = await googleLogin(accessToken);

        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userid", data.userid);
        localStorage.setItem("username", data.username);
        localStorage.setItem("usergroup", data.usergroup);
        
        if (data.uimage) {
            localStorage.setItem("uimage", data.uimage);
        }

        displayToast("success", "Login Successful! Filling details...");
        fetchUserInfo();
        
      } catch (error) {
        console.error("Google Login Failed:", error);
        displayToast("error", error.message || "Login Failed");
      }
    },
    onError: (error) => {
      console.error("Google Sign-In Error:", error);
      displayToast("error", "Google Sign-In Failed");
    }
  });

  const fetchUserInfo = async () => {
    const userid = localStorage.getItem('userid');
    if (!userid) return;

    try {
      const userData = await fetchUserData(userid);
      setBookingForm(prev => ({
        ...prev,
        title: userData.utitle || 'Mr.',
        firstName: userData.ufirstname || '',
        lastName: userData.ulastname || '',
        email: userData.uemail || '',
        phoneNumber: userData.uphoneno || '',
        additionalRequests: '' 
      }));
    } catch (error) {
      console.error('Failed to get user information:', error);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (showBookingForm) {
      fetchUserInfo();
    }
  }, [showBookingForm]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!propertyId) {
        setError('No property ID provided');
        setLoading(false);
        return;
      }
      try {
        const details = await getPropertyDetails(propertyId);
        setPropertyDetails(details);
      } catch (err) {
        setError(err.message || 'Failed to load property details');
      } finally {
        setLoading(false);
      }
    };
    if (!propertyDetails && propertyId) {
        fetchDetails();
    } else {
        setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (propertyDetails && !bookingData.selectedRoom) {
        if (isJsonInventory && availableRooms.length > 0) {
            // User must manually select room
        } else if (!isJsonInventory && availableRooms.length === 1) {
            setBookingData(prev => ({ ...prev, selectedRoom: { name: availableRooms[0], price: propertyDetails.normalrate } }));
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyDetails]);

  useEffect(() => {
    const fetchCoordinates = async () => {
      try {
        if (propertyDetails?.nearbylocation || propertyDetails?.propertyaddress) {
          const addressToSearch = propertyDetails?.nearbylocation || propertyDetails?.propertyaddress;
          const coords = await getCoordinates(addressToSearch);
          if (coords && coords.lat) {
              setLocationCoords(coords);
          } else {
              setLocationCoords({ lat: 3.1390, lng: 101.6869 }); 
          }
        }
      } catch (error) {
        console.error('Error fetching coordinates:', error);
        setLocationCoords({ lat: 3.1390, lng: 101.6869 });
      }
    };
    fetchCoordinates();
  }, [propertyDetails]);

  useEffect(() => {
    // Guaranteed Fallback if Google Maps Places API fails
    const fallbackTimer = setTimeout(() => {
        if (nearbyPlaces.walkable.length === 0) {
            setNearbyPlaces({
                walkable: [
                    { name: "Nearest Convenience Store", distance: "350 m" },
                    { name: "Local Cafe", distance: "450 m" },
                    { name: "Downtown Restaurant", distance: "550 m" }
                ],
                landmarks: [
                    { name: `${propertyDetails?.clustername || 'City'} Central Hub`, distance: "1.2 km" },
                    { name: "Main Transit Station", distance: "2.5 km" }
                ]
            });
        }
    }, 4000);

    if (window.google && window.google.maps && window.google.maps.places && locationCoords.lat && locationCoords.lng) {
      const location = new window.google.maps.LatLng(locationCoords.lat, locationCoords.lng);
      const dummyDiv = document.createElement('div');
      const service = new window.google.maps.places.PlacesService(dummyDiv);

      const getDistance = (lat1, lon1, lat2, lon2) => {
          const R = 6371e3; 
          const radLat1 = lat1 * Math.PI/180;
          const radLat2 = lat2 * Math.PI/180;
          const deltaLat = (lat2-lat1) * Math.PI/180;
          const deltaLon = (lon2-lon1) * Math.PI/180;
          const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
      };

      service.nearbySearch({
        location: location,
        radius: 1500,
        type: ['restaurant', 'cafe', 'shopping_mall', 'store']
      }, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const formattedWalkable = results.slice(0, 4).map(place => {
            const dist = getDistance(locationCoords.lat, locationCoords.lng, place.geometry.location.lat(), place.geometry.location.lng());
            const distanceStr = dist < 1000 ? `${Math.round(dist)} m` : `${(dist/1000).toFixed(1)} km`;
            return { name: place.name, distance: distanceStr };
          });
          setNearbyPlaces(prev => ({ ...prev, walkable: formattedWalkable }));
          clearTimeout(fallbackTimer);
        }
      });

      service.nearbySearch({
        location: location,
        radius: 10000,
        type: ['tourist_attraction', 'museum', 'transit_station', 'park']
      }, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const formattedLandmarks = results.slice(0, 3).map(place => {
            const dist = getDistance(locationCoords.lat, locationCoords.lng, place.geometry.location.lat(), place.geometry.location.lng());
            const distanceStr = dist < 1000 ? `${Math.round(dist)} m` : `${(dist/1000).toFixed(1)} km`;
            return { name: place.name, distance: distanceStr };
          });
          setNearbyPlaces(prev => ({ ...prev, landmarks: formattedLandmarks }));
        }
      });
    }
    
    return () => clearTimeout(fallbackTimer);
  }, [locationCoords, propertyDetails]);

  useEffect(() => {
      if (bookingData.checkIn && bookingData.checkOut) {
          calculatetotalprice(bookingData.checkIn, bookingData.checkOut);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingData.selectedRoom]);

  const calculateDisplayRate = (details, checkInDateStr, room) => {
    if (!details) return;
    
    let baseRate = parseFloat(details.normalrate) || 0;
    if (room) {
        baseRate = parseFloat(room.price);
    } else if (isJsonInventory && availableRooms.length > 0) {
        baseRate = parseFloat(availableRooms[0].price);
    }
    
    let rate = baseRate;
    
    const isWeekend = (dateStr) => {
      const day = new Date(dateStr).getDay();
      return day === 0 || day === 6; 
    };

    const checkInObj = checkInDateStr ? new Date(checkInDateStr) : new Date();
    
    const isSpecialEvent = details.startdate && details.enddate && 
                          checkInObj >= new Date(details.startdate) && 
                          checkInObj <= new Date(details.enddate);

    if (isSpecialEvent && details.specialeventrate) {
       rate = baseRate * parseFloat(details.specialeventrate);
    } else if (isWeekend(checkInObj) && details.weekendrate) {
       rate = baseRate * parseFloat(details.weekendrate);
    } else {
       const today = new Date();
       const daysUntilCheckIn = Math.floor((checkInObj - today) / (1000 * 60 * 60 * 24));
       
       if (daysUntilCheckIn >= 30 && details.earlybirddiscountrate) {
          rate = baseRate * parseFloat(details.earlybirddiscountrate);
       } else if (daysUntilCheckIn <= 7 && daysUntilCheckIn >= 0 && details.lastminutediscountrate) {
          rate = baseRate * parseFloat(details.lastminutediscountrate);
       }
    }
    setCurrentDisplayRate(rate.toFixed(2));
  };

  useEffect(() => {
    if (propertyDetails) {
      calculateDisplayRate(propertyDetails, checkIn, bookingData.selectedRoom);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIn, propertyDetails, bookingData.selectedRoom, availableRooms]);

  useEffect(() => {
    const currentLocationKey = location.key;
    localStorage.setItem('previousLocationKey', currentLocationKey);
    
    if (window.Tawk_API && window.Tawk_API.hideWidget) {
      if (window.innerWidth <= 768) {
        window.Tawk_API.hideWidget();
      } else {
        window.Tawk_API.showWidget();
      }
      
      const checkVisibility = () => {
        const mobileBar = document.querySelector('.mobile-booking-bar');
        if (mobileBar && window.getComputedStyle(mobileBar).display !== 'none') {
          window.Tawk_API.hideWidget();
        } else {
          window.Tawk_API.showWidget();
        }
      };
      
      window.addEventListener('resize', checkVisibility);
      
      return () => {
        window.removeEventListener('resize', checkVisibility);
        if (window.Tawk_API && window.Tawk_API.showWidget) {
          window.Tawk_API.showWidget();
        }
      };
    }
  }, [location.key]);

  useEffect(() => {
    if (showAllFacilities || showDescriptionOverlay || showBookingForm || showAllPhotos || isFullscreen || selectedRoomDetails) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      if (scrollbarWidth > 0) {
          document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showAllFacilities, showDescriptionOverlay, showBookingForm, showAllPhotos, isFullscreen, selectedRoomDetails]);

  // ==========================================
  // EARLY RETURNS FOR LOADING AND ERRORS
  // ==========================================
  if (loading || !propertyDetails || !propertyDetails.propertyimage) {
    return (
      <div style={{ marginTop: '150px', textAlign: 'center', minHeight: '60vh' }}>
        <h2>Room Details Loading...</h2>
        <p>If the page does not load, please return to the previous page.</p>
        <button 
          onClick={() => navigate(-1)} 
          style={{ 
            padding: '10px 20px', 
            marginTop: '20px', 
            cursor: 'pointer', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px' 
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (error) return <div className="error-message">{error}</div>;

  const facilitiesArray2 = propertyDetails?.facilities ? propertyDetails.facilities.split(",") : [];
  
  const handleInputChange = async (e) => {
   const { name, value } = e.target;
   
   setBookingData((prev) => {
     const updatedData = { ...prev, [name]: value };

     if (
       (name === "checkIn" && new Date(value) >= new Date(prev.checkOut)) ||
       (name === "checkOut" && new Date(prev.checkIn) >= new Date(value))
     ) {
       updatedData.checkOut = "";
     }

     return updatedData;
   });

   if (name === "checkIn" || name === "checkOut") {
     calculatetotalprice(
       name === "checkIn" ? value : bookingData.checkIn,
       name === "checkOut" ? value : bookingData.checkOut
     );

     if (value && (name === "checkIn" ? bookingData.checkOut : bookingData.checkIn)) {
       const checkInDate = name === "checkIn" ? value : bookingData.checkIn;
       try {
         const isOverlap = await checkDateOverlap(propertyDetails.propertyid, checkInDate);

         if (isOverlap === true) {
           setIsDateOverlapping(true);
         } else if (isOverlap === false) {
           setIsDateOverlapping(false);
         } else {
           displayToast('error', 'Failed to check date overlapping');
         }
       } catch (error) {
         console.error(error);
         displayToast('error', 'Error checking date overlap');
       }
     }
   }
 };
    
  const nextSlide = () => {
    setCurrentSlide(prev => 
      prev === propertyDetails.propertyimage.length - 1 ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentSlide(prev => 
      prev === 0 ? propertyDetails.propertyimage.length - 1 : prev - 1
    );
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
    document.body.style.overflow = 'auto';
  };

  const handlePhotoClick = (index) => {
    setSelectedImageIndex(index);
    setIsFullscreen(true);
    document.body.style.overflow = 'hidden';
  };

  const calculatetotalprice = (arrival, departure) => {
    if (arrival && departure) {
        const start = new Date(arrival);
        const end = new Date(departure);
        const nights = Math.floor((end - start) / (1000 * 60 * 60 * 24));
        
        if (nights > 0) {
            setTotalNights(nights);
            
            let baseRoomRate = bookingData.selectedRoom 
                ? parseFloat(bookingData.selectedRoom.price) 
                : parseFloat(propertyDetails.normalrate);
                
            if (!bookingData.selectedRoom && isJsonInventory && availableRooms.length > 0) {
                baseRoomRate = parseFloat(availableRooms[0].price);
            }
            
            let totalBasePrice = 0;
            let currentDate = new Date(start);
            let weekendNights = 0;
            let weekdayNights = 0;
            let specialEventNights = 0;
            let regularNights = 0;
            
            const daysUntilCheckIn = Math.floor((start - new Date()) / (1000 * 60 * 60 * 24));
            const isEarlyBird = daysUntilCheckIn > 30;
            const isLastMinute = daysUntilCheckIn <= 7;
            
            for (let i = 0; i < nights; i++) {
                const dayOfWeek = currentDate.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isSpecialEvent = propertyDetails.startdate && propertyDetails.enddate &&
                    currentDate >= new Date(propertyDetails.startdate) && 
                    currentDate <= new Date(propertyDetails.enddate);
                
                let rateMultiplier = 1;
                
                if (isSpecialEvent) {
                    rateMultiplier *= (propertyDetails.specialeventrate || 1);
                    specialEventNights++;
                } else {
                    regularNights++;
                }
                
                if (isWeekend) {
                    rateMultiplier *= (propertyDetails.weekendrate || 1);
                    weekendNights++;
                } else {
                    weekdayNights++;
                }
                
                if (isEarlyBird) {
                    rateMultiplier *= (propertyDetails.earlybirddiscountrate || 1);
                }
                
                if (isLastMinute) {
                    rateMultiplier *= (propertyDetails.lastminutediscountrate || 1);
                }
                
                totalBasePrice += (baseRoomRate * rateMultiplier);
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            const taxes = totalBasePrice * 0.1;
            settotalprice(totalBasePrice + taxes);
        }
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setBookingForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();

    const userid = localStorage.getItem('userid');
    
    if (!userid) {
        displayToast('error', 'Please login first');
        return;
    }

    if (!bookingForm.firstName || !bookingForm.lastName || !bookingForm.email || !bookingForm.phoneNumber) {
        displayToast('error', 'Please fill all required fields');
        return;
    }

    if (!bookingData.checkIn || !bookingData.checkOut) {
        displayToast('error', 'Please select Check-in and Check-out dates');
        return;
    }

    if (isHotel && !bookingData.selectedRoom) {
      displayToast('error', 'Please select a room type first');
      document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    try {

      const roomNameStr = bookingData.selectedRoom ? bookingData.selectedRoom.name : "";

      const reservationData = {
        propertyid: propertyDetails.propertyid,
        checkindatetime: bookingData.checkIn,
        checkoutdatetime: bookingData.checkOut,
        reservationblocktime: new Date(new Date(bookingData.checkIn) - 3 * 24 * 60 * 60 * 1000).toISOString(),
        request: roomNameStr 
            ? `Room Selected: ${roomNameStr}\n\nAdditional Requests: ${bookingForm.additionalRequests || 'None'}` 
            : bookingForm.additionalRequests || '',
        totalprice: totalprice,
        rcfirstname: bookingForm.firstName,
        rclastname: bookingForm.lastName,
        rcemail: bookingForm.email,
        rcphoneno: bookingForm.phoneNumber,
        rctitle: bookingForm.title,
        adults: bookingData.adults || 1,
        children: bookingData.children || 0,
        userid: parseInt(userid),
        reservationstatus: isDateOverlapping ? 'Pending' : 'Accepted'
      };

      const createdReservation = await createReservation(reservationData);

      if (!createdReservation || !createdReservation.reservationid) {
        throw new Error('Failed to create reservation: No valid reservation ID received');
      }

      if (reservationData.reservationstatus === 'Pending') {
        await requestBooking(createdReservation.reservationid);
      }

      displayToast('success', 'Reservation added to the cart');

      setTimeout(() => {
        setShowBookingForm(false);
        navigate('/cart');
      }, 3000);
        
    } catch (error) {
      displayToast('error', 'Failed to create reservation');
    }
  };

  const displayToast = (type, message) => {
    setToastType(type);
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  // ==========================================
  // PERFECT NATIVE GOOGLE MAPS FIX
  // ==========================================
  const addressForMap = propertyDetails?.nearbylocation || propertyDetails?.propertyaddress || '';
  
  // FIXED: Using standard Google Maps embed URL format so it properly shows the place name box!
  const googleMapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(addressForMap)}&t=&z=15&ie=UTF8&iwloc=B&output=embed`;

  const bookingCardBaseRate = bookingData.selectedRoom ? bookingData.selectedRoom.price : currentDisplayRate;

  const displayWalkable = nearbyPlaces.walkable.length > 0 ? nearbyPlaces.walkable : [
      { name: "Nearest Convenience Store", distance: "350 m" },
      { name: "Local Cafe", distance: "450 m" },
      { name: "Downtown Restaurant", distance: "550 m" }
  ];

  const displayLandmarks = nearbyPlaces.landmarks.length > 0 ? nearbyPlaces.landmarks : [
      { name: `${propertyDetails?.clustername || 'City'} Central Hub`, distance: "1.2 km" },
      { name: "Main Transit Station", distance: "2.5 km" }
  ];

  return (
    <div>
      <div className="Property_Details_Main_Container">
        <AuthProvider>
        <Navbar />
        <div className="property-details-main-container">
          <div className="Main_Image_gallery_container" style={{ position: 'relative' }}>
            <div className="Image_gallery_card_1">
              <img 
                src={`data:image/jpeg;base64,${propertyDetails.propertyimage[0]}`} 
                onClick={() => setShowAllPhotos(true)}  
                className="main_gallery_image" 
                alt="Main Gallery" 
              />
            </div>

            <div className="Image_gallery_container">
              <div className="Image_gallery_card_2">
                <img 
                  src={`data:image/jpeg;base64,${propertyDetails.propertyimage[1]}`} 
                  onClick={() => setShowAllPhotos(true)}
                  className="second_gallery_image" 
                  alt="Second Gallery" 
                />
              </div>
              <div className="Image_gallery_card_2">
                <img 
                  src={`data:image/jpeg;base64,${propertyDetails.propertyimage[2]}`} 
                  onClick={() => setShowAllPhotos(true)} 
                  className="second_gallery_image" 
                  alt="Second Gallery" 
                />
              </div>
            </div>
            
            <button 
              className="show-all-btn" 
              onClick={() => setShowAllPhotos(true)}
              style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: '#333',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                zIndex: 10
              }}
            >
              See all photos
            </button>
          </div>

          {/* Mobile Slideshow */}
          <div className="mobile-slideshow">
            {propertyDetails?.propertyimage?.map((image, index) => (
              <div 
                key={index} 
                className={`slide ${currentSlide === index ? 'active' : ''}`} 
                style={{transform: `translateX(${100 * (index - currentSlide)}%)`, transition: 'transform 0.3s'}}
              >
                <img 
                  src={`data:image/jpeg;base64,${image}`}
                  alt={`Property image ${index + 1}`}
                  onClick={() => setShowAllPhotos(true)} 
                />
              </div>
            ))}
            
            <button 
                className="slide-nav prev" 
                onClick={prevSlide} 
                aria-label="Previous image"
            >
              <IoIosArrowBack />
            </button>
            
            <button 
                className="slide-nav next" 
                onClick={nextSlide} 
                aria-label="Next image"
            >
              <IoIosArrowForward />
            </button>
            
            <div className="slide-indicators">
              {propertyDetails?.propertyimage?.map((_, index) => (
                <div 
                  key={index} 
                  className={`indicator ${currentSlide === index ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Go to image ${index + 1}`}
                ></div>
              ))}
            </div>
          </div>

          {showAllPhotos && (
            <div className="all-photos-view">
              <div className="photos-header">
                <button 
                    className="back-button" 
                    onClick={() => setShowAllPhotos(false)}
                >
                  <span><IoReturnUpBackOutline /></span>
                </button>
              </div>
              
              <div className="photos-grid">
                <div className="photos-container">
                  {propertyDetails?.propertyimage?.map((image, index) => (
                    <div 
                        key={index} 
                        className="photo-section"
                    >
                      <img 
                        src={`data:image/jpeg;base64,${image}`} 
                        alt={`Property image ${index + 1}`}
                        onClick={() => handlePhotoClick(index)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isFullscreen && (
            <div className="fullscreen-overlay">
              <div className="fullscreen-header">
                <button 
                    className="close-btn" 
                    onClick={handleCloseFullscreen}
                >
                  <IoMdClose />
                </button>
                <div className="image-counter">
                  {selectedImageIndex + 1} / {propertyDetails.propertyimage.length}
                </div>
              </div>

              <div className="fullscreen-content">
                <button 
                  className="nav-btn prev-btn"
                  onClick={() => setSelectedImageIndex((prev) => 
                    prev === 0 ? propertyDetails.propertyimage.length - 1 : prev - 1
                  )}
                >
                  <IoIosArrowBack />
                </button>

                <img 
                  src={`data:image/jpeg;base64,${propertyDetails.propertyimage[selectedImageIndex]}`}
                  alt={`fullscreen image ${selectedImageIndex + 1}`}
                  className="fullscreen-image"
                />

                <button 
                  className="nav-btn next-btn"
                  onClick={() => setSelectedImageIndex((prev) => 
                    prev === propertyDetails.propertyimage.length - 1 ? 0 : prev + 1
                  )}
                >
                  <IoIosArrowForward />
                </button>
              </div>
            </div>
          )}

          {/* Details Container */}
          <div className="Details_container">
            <div className="Description_container">
              <div className="first_container">
                <div className="Room_name_container" style={{ marginBottom: '10px' }}>
                  <h2 className="Room_name" style={{ margin: 0, fontSize: '28px' }}>{propertyDetails?.propertyaddress}</h2>
                  <div className='Rating_Container' style={{ marginTop: '10px' }}>
                    {propertyDetails.rating > 0 ? (
                      <>
                        <p className="Rating_score">
                          {Number.isInteger(propertyDetails.rating) 
                            ? propertyDetails.rating.toFixed(1)
                            : propertyDetails.rating.toFixed(2).replace(/\.?0+$/, '')}
                        </p>
                        <FaStar className='icon_star'/>
                        <button 
                            className="show-reviews-btn" 
                            onClick={() => setShowReviews(true)}
                        >
                          {propertyDetails.ratingno} reviews
                        </button>
                      </>
                    ) : (
                      <button 
                        className="show-reviews-btn" 
                        onClick={() => setShowReviews(true)}
                      >
                        No reviews
                      </button>
                    )}
                  </div>
                </div>

                <Reviews 
                  isOpen={showReviews} 
                  onClose={() => setShowReviews(false)} 
                  propertyId={propertyDetails?.propertyid} 
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#555', fontSize: '15px', flexWrap: 'wrap', marginBottom: '25px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaMapMarkerAlt color="#888" size={16} />
                        <span>{propertyDetails?.clustername}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IoIosBed color="#888" size={18} />
                        <span>{propertyDetails?.propertybedtype}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaUser color="#888" size={16} />
                        <span>{propertyDetails?.propertyguestpaxno} Guest</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                        <img src={
                            propertyDetails?.uimage 
                            ? (propertyDetails.uimage.startsWith('http') ? propertyDetails.uimage : `data:image/jpeg;base64,${propertyDetails.uimage}`) 
                            : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                            }
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }}
                            alt="Admin" 
                        />
                        <span style={{ color: '#555', fontSize: '14px' }}>Hosted by {propertyDetails?.username || "Unknown Host"}</span>
                    </div>
                </div>

                {/* Database Highlights Section */}
                {propertyDetails?.highlights && propertyDetails.highlights.length > 0 && (
                  <div style={{ marginTop: '20px', padding: '0', borderRadius: '8px' }}>
                    <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#333' }}>Highlights</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {propertyDetails.highlights.map((highlight, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                          <div style={{ backgroundColor: '#e8f4fd', padding: '10px', borderRadius: '50%', color: '#007bff' }}>
                            {idx % 3 === 0 ? <FaMapMarkerAlt size={20} /> : idx % 3 === 1 ? <IoIosBed size={20} /> : <FaThumbsUp size={20} />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#333' }}>{highlight.title}</div>
                            <div style={{ color: '#666', fontSize: '14px' }}>"{highlight.description}"</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <hr className="custom-line" />

                <div className="Room_description_container" style={{ marginTop: '20px', marginBottom: '20px' }}>
                  <h2 className="About_text" style={{ fontSize: '20px', marginBottom: '12px', color: '#333' }}>About This Place</h2>
                  <p className="Room_description" style={{ fontSize: '15px', lineHeight: '1.6', color: '#555', margin: 0 }}>
                    {description.length > 250 ? `${description.slice(0, 250)}...` : description}
                  </p>
                  {description.length > 250 && (
                    <button 
                        className="show-more-btn" 
                        onClick={() => setShowDescriptionOverlay(true)}
                        style={{ marginTop: '10px', color: '#007bff', background: 'none', border: 'none', padding: 0, fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
                    >
                        Read more
                    </button>
                  )}
                </div>

                {showDescriptionOverlay && (
                  <div className="description-overlay">
                    <div className="description-overlay-content">
                      <div className="overlay-header-About">
                        <h2 className="About_text">About This Place</h2>
                        <button 
                          className="close-overlay" 
                          onClick={() => setShowDescriptionOverlay(false)}
                          aria-label="Close description"
                        >
                          <IoMdClose />
                        </button>
                      </div>
                      <div className="full-description">
                        <p className="Room_description">{description}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="Facilities_Main_Container">
                  <h2 className="Facilities_text">What this place offers</h2>
                  <hr className="custom-line" />
                  <div className="Facilities_Icon_Container">
                    <div className="facilities-details">
                      {(facilitiesArray2.slice(0, 9)).map((facilityName, index) => {
                          const facility = facilities.find(f => f.name === facilityName.trim());
                          return (
                            <div 
                                key={index} 
                                className="facilities-item"
                            >
                              {facility ? facility.icon : null}
                              <span>{facilityName.trim()}</span>
                            </div>
                          );
                      })}
                    </div>
                  </div>
                  <button 
                    className="More_button" 
                    onClick={() => setShowAllFacilities(true)}
                  >
                    More
                  </button>
                </div>

                {showAllFacilities && (
                    <div 
                        className="facilities-overlay" 
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setShowAllFacilities(false);
                        }}
                    >
                      <div 
                        className="facilities-overlay-content" 
                        role="dialog" 
                        aria-modal="true" 
                        aria-labelledby="facilities-title"
                      >
                        <div className="overlay-header-Offer">
                          <h3 
                            id="facilities-title" 
                            className="Facilities_text"
                          >
                            What this place offers
                          </h3>
                          <button 
                            className="close-overlay" 
                            onClick={() => setShowAllFacilities(false)}
                            aria-label="Close facilities"
                          >
                            <IoMdClose />
                          </button>
                        </div>
                        <div className="full-facilities-list">
                          {facilitiesArray2.length > 0 ? (
                            <div className="facilities-grid">
                              {facilitiesArray2.map((facilityName, index) => {
                                const facility = facilities.find(f => f.name === facilityName.trim());
                                return (
                                  <div 
                                    key={index} 
                                    className="facilities-overlay-item"
                                  >
                                    <div className="facility-icon">
                                        {facility ? facility.icon : null}
                                    </div>
                                    <span className="facility-name">
                                        {facilityName.trim()}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="no-facilities">No facilities available</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                {/* SPRINT 3 ENHANCEMENT: Trip.com / Agoda Style Room Selection Grid */}
                {isJsonInventory && availableRooms.length > 0 && (
                  <div className="room-selection-container" id="rooms">
                    <h2 className="room-selection-header">Select your room</h2>
                    <div className="room-list-grid">
                      {availableRooms.map((room, index) => {
                        const isSelected = bookingData.selectedRoom?.name.startsWith(room.name);
                        
                        const roomImageSrc = (room.images && room.images.length > 0) 
                            ? `data:image/jpeg;base64,${room.images[0]}` 
                            : `data:image/jpeg;base64,${propertyDetails.propertyimage[index % propertyDetails.propertyimage.length]}`;
                        
                        return (
                          <div 
                            key={room.id || index} 
                            className={`room-card-v2 ${isSelected ? 'selected-room' : ''}`}
                            style={{ display: 'flex', flexDirection: 'column', border: isSelected ? '2px solid #007bff' : '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}
                          >
                            <div 
                                className="room-card-image-wrapper" 
                                onClick={() => {
                                  setSelectedRoomDetails(room);
                                  const defaultOptionPrice = room.options && room.options.length > 0 ? room.options[0].price : room.price;
                                  const defaultOptionName = room.options && room.options.length > 0 ? room.options[0].name : "Standard Option";
                                  setActiveRoomVariationPrice(defaultOptionPrice);
                                  setActiveRoomVariationName(defaultOptionName);
                                }}
                                style={{ position: 'relative', height: '200px', cursor: 'pointer' }}
                            >
                              <img 
                                src={roomImageSrc} 
                                alt={room.name} 
                                className="room-card-image"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div className="room-image-badge" style={{ position: 'absolute', bottom: '10px', left: '10px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                Click for details
                              </div>
                            </div>
                            
                            <div className="room-card-content" style={{ padding: '15px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                              <h4 
                                className="room-card-title" 
                                onClick={() => {
                                  setSelectedRoomDetails(room);
                                  const defaultOptionPrice = room.options && room.options.length > 0 ? room.options[0].price : room.price;
                                  const defaultOptionName = room.options && room.options.length > 0 ? room.options[0].name : "Standard Option";
                                  setActiveRoomVariationPrice(defaultOptionPrice);
                                  setActiveRoomVariationName(defaultOptionName);
                                }}
                                style={{ margin: '0 0 10px 0', fontSize: '18px', cursor: 'pointer', color: '#333' }}
                              >
                                {room.name}
                              </h4>
                              <div className="room-card-specs" style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                                <span>Max {room.maxGuests || propertyDetails.propertyguestpaxno} guests</span>
                                <span className="divider-dot" style={{ margin: '0 8px' }}>•</span>
                                <span>{room.bedType}</span>
                              </div>

                              {room.description && (
                                <p className="room-card-description" style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>{room.description}</p>
                              )}

                              <div className="room-card-rating" style={{ marginBottom: '15px' }}>
                                <span className="score" style={{ fontWeight: 'bold', color: '#007bff', marginRight: '5px' }}>
                                    {propertyDetails.rating ? propertyDetails.rating.toFixed(1) : 'New'} Excellent
                                </span>
                                <span className="text" style={{ fontSize: '13px', color: '#666' }}>Room comfort and quality</span>
                              </div>

                              <div className="room-card-footer" style={{ marginTop: 'auto', textAlign: 'center' }}>
                                <div className="room-price-display" style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '10px' }}>
                                  <span style={{ fontSize: '14px', color: '#717171', fontWeight: 'normal', marginRight: '5px' }}>Starts from</span>
                                  RM {room.price}
                                </div>
                                
                                <button 
                                  className="select-room-btn-v2"
                                  onClick={() => {
                                    setSelectedRoomDetails(room);
                                    const defaultOptionPrice = room.options && room.options.length > 0 ? room.options[0].price : room.price;
                                    const defaultOptionName = room.options && room.options.length > 0 ? room.options[0].name : "Standard Option";
                                    setActiveRoomVariationPrice(defaultOptionPrice);
                                    setActiveRoomVariationName(defaultOptionName);
                                  }}
                                  style={{ width: '100%', padding: '10px', backgroundColor: isSelected ? '#28a745' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  {isSelected ? "✓ Selected" : "See more"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AGODA STYLE: Enhanced Room Details Modal with Dynamic Variations */}
                {selectedRoomDetails && (
                    <div 
                        className="room-details-overlay" 
                        onClick={() => setSelectedRoomDetails(null)}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    >
                        <div 
                            className="room-details-modal" 
                            onClick={e => e.stopPropagation()}
                            style={{ backgroundColor: 'white', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}
                        >
                            <div className="room-details-header" style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
                                <h2 style={{ margin: 0, fontSize: '20px' }}>{selectedRoomDetails.name}</h2>
                                <button 
                                    className="close-btn" 
                                    style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }} 
                                    onClick={() => setSelectedRoomDetails(null)}
                                >
                                    <IoMdClose />
                                </button>
                            </div>
                            <div className="room-details-body" style={{ padding: '20px' }}>
                                <div className="room-details-gallery" style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '20px' }}>
                                    {(selectedRoomDetails.images && selectedRoomDetails.images.length > 0) ? (
                                        selectedRoomDetails.images.map((img, idx) => (
                                            <img 
                                                key={idx} 
                                                src={`data:image/jpeg;base64,${img}`} 
                                                alt="Room" 
                                                style={{ height: '200px', width: 'auto', borderRadius: '6px', objectFit: 'cover' }}
                                            />
                                        ))
                                    ) : (
                                        <img 
                                            src={`data:image/jpeg;base64,${propertyDetails.propertyimage[0]}`} 
                                            alt="General Room" 
                                            style={{ width: '100%', height: '250px', borderRadius: '6px', objectFit: 'cover' }}
                                        />
                                    )}
                                </div>
                                <div className="room-details-info">
                                    <h3 style={{ marginBottom: '10px' }}>Room Features</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                                      <p style={{display: 'flex', alignItems: 'center', gap: '10px', margin: 0}}>
                                          <IoIosBed color="#CC8C18"/> {selectedRoomDetails.bedType}
                                      </p>
                                      <p style={{display: 'flex', alignItems: 'center', gap: '10px', margin: 0}}>
                                          <FaUser color="#CC8C18"/> Up to {selectedRoomDetails.maxGuests || propertyDetails.propertyguestpaxno} guests
                                      </p>
                                      <p style={{display: 'flex', alignItems: 'center', gap: '10px', margin: 0}}>
                                          <FaWifi color="#CC8C18"/> Free Wi-Fi
                                      </p>
                                      <p style={{display: 'flex', alignItems: 'center', gap: '10px', margin: 0}}>
                                          <FaSnowflake color="#CC8C18"/> Air Conditioning
                                      </p>
                                    </div>

                                    {selectedRoomDetails.description && (
                                        <div style={{marginBottom: '20px'}}>
                                            <h4 style={{ marginBottom: '5px' }}>Room Description</h4>
                                            <p style={{fontSize: '14px', color: '#4b5563', lineHeight: '1.6'}}>{selectedRoomDetails.description}</p>
                                        </div>
                                    )}

                                    <div className="room-variations" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                                      <h4 style={{ marginBottom: '15px' }}>Available Room Options</h4>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        
                                        {(!selectedRoomDetails.options || selectedRoomDetails.options.length === 0) ? (
                                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: activeRoomVariationPrice == selectedRoomDetails.price ? '2px solid #007bff' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeRoomVariationPrice == selectedRoomDetails.price ? '#f8faff' : 'white' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <input type="radio" name="roomVar" checked={activeRoomVariationPrice == selectedRoomDetails.price} onChange={() => { setActiveRoomVariationPrice(selectedRoomDetails.price); setActiveRoomVariationName("Standard Option"); }} />
                                                    <span style={{ fontWeight: '500' }}>Standard Option</span>
                                                </div>
                                                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>RM {selectedRoomDetails.price}</span>
                                            </label>
                                        ) : (
                                            selectedRoomDetails.options.map((opt, idx) => (
                                                <label key={opt.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: activeRoomVariationPrice == opt.price && activeRoomVariationName == opt.name ? '2px solid #007bff' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeRoomVariationPrice == opt.price && activeRoomVariationName == opt.name ? '#f8faff' : 'white' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <input type="radio" name="roomVar" checked={activeRoomVariationPrice == opt.price && activeRoomVariationName == opt.name} onChange={() => { setActiveRoomVariationPrice(opt.price); setActiveRoomVariationName(opt.name); }} />
                                                        <span style={{ fontWeight: '500' }}>{opt.name}</span>
                                                    </div>
                                                    <span style={{ fontWeight: 'bold', fontSize: '16px' }}>RM {opt.price}</span>
                                                </label>
                                            ))
                                        )}
                                      </div>
                                    </div>
                                </div>
                            </div>
                            <div className="room-details-footer" style={{ padding: '15px 20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', bottom: 0, backgroundColor: 'white' }}>
                                <div className="room-details-price" style={{ fontWeight: 'bold', fontSize: '20px' }}>
                                    RM {activeRoomVariationPrice} 
                                    <span style={{fontSize: '14px', color: '#666', fontWeight: 'normal'}}>/night</span>
                                </div>
                                <button 
                                    className="room-details-select-btn"
                                    onClick={() => {
                                        const updatedRoom = { 
                                            ...selectedRoomDetails, 
                                            price: activeRoomVariationPrice, 
                                            name: `${selectedRoomDetails.name} (${activeRoomVariationName})` 
                                        };
                                        setBookingData(prev => ({ ...prev, selectedRoom: updatedRoom }));
                                        setSelectedRoomDetails(null);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    style={{ padding: '12px 24px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
                                >
                                    Select This Option
                                </button>
                            </div>
                        </div>
                    </div>
                )}

              </div>

              {/* Start of Right Booking Card Section */}
              <div className="second_container">
                <div className="booking_card" style={{ position: 'sticky', top: '100px' }}>
                  <div className="price_section">
                    {!bookingData.selectedRoom && ['Hotel', 'Resort'].includes(propertyDetails?.categoryname) && (
                        <span style={{ fontSize: '1rem', color: '#717171', fontWeight: 'normal', marginRight: '5px' }}>Starts from</span>
                    )}
                    <span className="room_price">RM {bookingCardBaseRate}</span>
                    <span className="price_night">/night</span>
                    {isDateOverlapping && (
                        <span className="details-status-label">FULL</span>
                    )}
                  </div>

                  <div className="dates_section">
                    <div className="date_input">
                      <div className="date_label">CHECK-IN</div>
                      <input 
                        type="date" 
                        name="checkIn" 
                        className="date_picker" 
                        value={bookingData.checkIn} 
                        onChange={handleInputChange} 
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div className="date_input">
                      <div className="date_label">CHECK-OUT</div>
                      <input 
                        type="date" 
                        name="checkOut" 
                        className="date_picker" 
                        value={bookingData.checkOut} 
                        onChange={handleInputChange} 
                        disabled={!bookingData.checkIn} 
                        min={bookingData.checkIn ? new Date(new Date(bookingData.checkIn).setDate(new Date(bookingData.checkIn).getDate() + 1)).toISOString().split("T")[0] : ""} 
                      />
                    </div>
                  </div>

                  {!isJsonInventory && isHomestay && availableRooms.length > 0 && (
                    <div className="bed_selection_container">
                        <div className="date_label" style={{ marginBottom: '5px' }}>PROPERTY SETUP</div>
                        <div className="booking-bed-readonly">
                            <IoIosBed size={18} color="#CC8C18" />
                            <span>{availableRooms[0]}</span>
                        </div>
                    </div>
                  )}

                  {isJsonInventory && !bookingData.selectedRoom && (
                    <div style={{color: '#e02424', fontSize: '14px', marginTop: '10px', textAlign: 'center', backgroundColor: '#fde8e8', padding: '10px', borderRadius: '8px'}}>
                       Please select a room option to continue.
                    </div>
                  )}

                  {/* GREEN SELECTION BOX EXACTLY LIKE SCREENSHOT */}
                  {isJsonInventory && bookingData.selectedRoom && (
                    <div style={{color: '#16a34a', fontSize: '14px', marginTop: '10px', textAlign: 'center', backgroundColor: '#e6f4ea', padding: '10px', borderRadius: '8px', fontWeight: 'bold'}}>
                       ✓ {bookingData.selectedRoom.name} Selected
                    </div>
                  )}

                  <div className="price_details">
                    {(() => {
                      const start = new Date(bookingData.checkIn);
                      const end = new Date(bookingData.checkOut);
                      const nights = Math.floor((end - start) / (1000 * 60 * 60 * 24));
                      const baseRoomRate = parseFloat(bookingCardBaseRate);
                      let totalBasePrice = 0;
                      let currentDate = new Date(start);
                      let groupMap = {};
                      
                      const daysUntilCheckIn = Math.floor((start - new Date()) / (1000 * 60 * 60 * 24));
                      const isEarlyBird = daysUntilCheckIn > 30;
                      const isLastMinute = daysUntilCheckIn <= 7;
                      
                      let discountRate = 1;
                      let discountLabel = '';
                      
                      if (isEarlyBird && propertyDetails.earlybirddiscountrate && propertyDetails.earlybirddiscountrate < 1) {
                        discountRate = propertyDetails.earlybirddiscountrate;
                        discountLabel = `Discount (${Math.round((1 - propertyDetails.earlybirddiscountrate) * 100)}%)`;
                      } else if (isLastMinute && propertyDetails.lastminutediscountrate && propertyDetails.lastminutediscountrate < 1) {
                        discountRate = propertyDetails.lastminutediscountrate;
                        discountLabel = `Discount (${Math.round((1 - propertyDetails.lastminutediscountrate) * 100)}%)`;
                      }
                      
                      for (let i = 0; i < nights; i++) {
                        const dayOfWeek = currentDate.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const isSpecialEvent = propertyDetails.startdate && propertyDetails.enddate &&
                          currentDate >= new Date(propertyDetails.startdate) && 
                          currentDate <= new Date(propertyDetails.enddate);
                        
                        let rateMultiplier = 1;
                        let labelParts = [];
                        
                        if (isWeekend) labelParts.push('Weekend');
                        if (isSpecialEvent) labelParts.push('Special Event');
                        else if (!isWeekend) labelParts.push('Weekday');
                        
                        if (isWeekend) rateMultiplier *= (propertyDetails.weekendrate || 1);
                        if (isSpecialEvent) rateMultiplier *= (propertyDetails.specialeventrate || 1);
                        
                        const nightPrice = baseRoomRate * rateMultiplier;
                        const unitKey = nightPrice.toFixed(2) + '-' + labelParts.join(',');
                        
                        if (!groupMap[unitKey]) {
                          groupMap[unitKey] = { 
                            count: 0, 
                            total: 0, 
                            unit: nightPrice, 
                            label: labelParts.join(', ') 
                          };
                        }
                        
                        groupMap[unitKey].count += 1;
                        groupMap[unitKey].total += nightPrice;
                        totalBasePrice += nightPrice;
                        currentDate.setDate(currentDate.getDate() + 1);
                      }
                      
                      let discount = 0;
                      if (discountRate < 1) {
                          discount = totalBasePrice * (1 - discountRate);
                      }
                      
                      return (
                        <>
                          {Object.entries(groupMap).map(([key, info], idx) => (
                            <div className="price_item" key={idx}>
                              <div>
                                RM {info.unit.toFixed(2)} × {info.count} night{info.count > 1 ? 's' : ''}
                                <br/>
                                <span className="rate-type-label">({info.label})</span>
                              </div>
                              <div>RM {info.total.toFixed(2)}</div>
                            </div>
                          ))}
                          {discount > 0 && (
                            <div className="price_item discount">
                              <div>{discountLabel}</div>
                              <div>- RM {discount.toFixed(2)}</div>
                            </div>
                          )}
                          <div className="price_total">
                            <div><strong>Total (MYR)</strong></div>
                            <div><strong>RM {(totalBasePrice - discount).toFixed(2)}</strong></div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <br /><br />
                  <button 
                    className="reserve_button" 
                    onClick={() => {
                      if (!bookingData.checkIn || !bookingData.checkOut) {
                        displayToast('error', 'Please select check-in and check-out dates first');
                        return;
                      }
                      if (isJsonInventory && !bookingData.selectedRoom) {
                        displayToast('error', 'Please select a room type from the list to continue.');
                        document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
                        return;
                      }
                      setShowBookingForm(true);
                    }}
                  >
                    {isDateOverlapping ? 'Enquiry' : 'Book & Pay'}
                  </button>
                </div>
                
                {/* FIXED: Walkable & Nearby Places Widget - Clicking them now works perfectly! */}
                <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', marginTop: '20px', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#333', fontWeight: 'bold', marginBottom: '10px' }}>
                      <FaWalking size={18}/> Walkable places
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', color: '#555' }}>
                      {displayWalkable.map((place, idx) => (
                          <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' near ' + addressForMap)}`} target="_blank" rel="noreferrer" style={{color: '#555', textDecoration: 'none', cursor: 'pointer'}}>
                                  {place.name}
                              </a>
                              <span>{place.distance}</span>
                          </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#333', fontWeight: 'bold', marginBottom: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                      <FaCarSide size={18}/> Popular landmarks
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', color: '#555' }}>
                      {displayLandmarks.map((place, idx) => (
                          <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' near ' + addressForMap)}`} target="_blank" rel="noreferrer" style={{color: '#555', textDecoration: 'none', cursor: 'pointer'}}>
                                  {place.name}
                              </a>
                              <span>{place.distance}</span>
                          </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div style={{ textAlign: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                     <a href="#map" onClick={(e) => { e.preventDefault(); document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#007bff', fontWeight: 'bold', textDecoration: 'none', cursor: 'pointer' }}>See nearby places</a>
                  </div>
                </div>
                
                {/* FIXED: GOOGLE MAPS INTEGRATION */}
                <div id="map" className="Location_Main_Container" style={{ marginTop: '20px' }}>
                  <h2 className="Location_text">Hotel Location</h2>
                  <hr className="custom-line" />
                  
                  {/* Shows the exact typed address right above the map for good UX */}
                  <p style={{ color: '#555', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                    <FaMapMarkerAlt color="#007bff" /> {addressForMap}
                  </p>

                  <div className="Google_map_container">
                    <iframe 
                        src={googleMapSrc} 
                        width="100%" 
                        height="450" 
                        style={{ border: 0, borderRadius: '5px' }} 
                        allowFullScreen="" 
                        loading="lazy" 
                        referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ... (Booking overlay and mobile sticky bar section remains safely intact below) ... */}
          {showBookingForm && (
            <div className="booking-overlay">
              <div className="booking-modal">
                <div className="booking-header">
                  <button 
                    className="back-button" 
                    onClick={() => setShowBookingForm(false)}
                  >
                    <span><IoReturnUpBackOutline/> Booking Information</span>
                  </button>
                </div>
                <div className="booking-content">
                  <div className="booking-left">
                    <div className="trip-section">
                      <h2>Your trip</h2>
                      <br />
                      <div className="trip-dates">
                        <div className="section-header">
                          <h3>Dates</h3>
                          <button 
                            className="edit-button" 
                            onClick={() => setIsEditingDates(!isEditingDates)}
                          >
                            Edit
                          </button>
                        </div>
                        {isEditingDates ? (
                          <div className="dates-editor">
                            <div className="date-input-group">
                              <label>Check-in</label>
                              <input 
                                type="date" 
                                name="checkIn" 
                                value={bookingData.checkIn} 
                                onChange={handleInputChange} 
                                min={new Date().toISOString().split("T")[0]} 
                              />
                            </div>
                            <div className="date-input-group">
                              <label>Check-out</label>
                              <input 
                                type="date" 
                                name="checkOut" 
                                value={bookingData.checkOut} 
                                onChange={handleInputChange} 
                                min={bookingData.checkIn ? new Date(new Date(bookingData.checkIn).setDate(new Date(bookingData.checkIn).getDate() + 1)).toISOString().split("T")[0] : ""} 
                                disabled={!bookingData.checkIn}
                              />
                            </div>
                          </div>
                        ) : (
                          <p>{bookingData.checkIn} - {bookingData.checkOut}</p>
                        )}
                      </div>

                      {(isJsonInventory || isHomestay) && (
                        <div className="trip-dates" style={{ marginTop: '20px' }}>
                            <div className="section-header">
                                <h3>{isHomestay ? "Property Setup" : "Selected Room"}</h3>
                            </div>
                            <div className="booking-bed-readonly" style={{ marginTop: '0' }}>
                                <IoIosBed size={18} color="#CC8C18" />
                                <span>{bookingData.selectedRoom ? bookingData.selectedRoom.name : availableRooms[0]}</span>
                            </div>
                        </div>
                      )}
                      
                      <br />
                    </div>

                    <div className="login-section">
                      <div className="guest-details-section">
                        <h2>Guest details</h2>
                        <div className="form-grid">
                          <div className="form-group title-group">
                            <label>Title</label>
                            
                            {/* FIXED: Title UI completely matching screenshot (Box selection) */}
                            <div className="title-options" style={{ display: 'flex', gap: '10px' }}>
                              {['Mr.', 'Mrs.', 'Ms.'].map((t) => (
                                 <button
                                   key={t}
                                   type="button"
                                   onClick={() => setBookingForm(prev => ({...prev, title: t}))}
                                   style={{
                                     padding: '8px 20px',
                                     border: bookingForm.title === t ? '1px solid #ff4d4f' : '1px solid #ddd',
                                     backgroundColor: 'white',
                                     color: bookingForm.title === t ? '#ff4d4f' : '#333',
                                     borderRadius: '8px',
                                     cursor: 'pointer',
                                     fontWeight: bookingForm.title === t ? 'bold' : 'normal'
                                   }}
                                 >
                                   {t}
                                 </button>
                              ))}
                            </div>

                          </div>

                          <div className="form-group">
                            <label>First name</label>
                            <input 
                                type="text" 
                                name="firstName" 
                                value={bookingForm.firstName} 
                                onChange={handleFormChange} 
                                required
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>Last name</label>
                            <input 
                                type="text" 
                                name="lastName" 
                                value={bookingForm.lastName} 
                                onChange={handleFormChange} 
                                required
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>Email</label>
                            <input 
                                type="email" 
                                name="email" 
                                value={bookingForm.email} 
                                onChange={handleFormChange} 
                                required
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>Phone number</label>
                            <input 
                                type="tel" 
                                name="phoneNumber" 
                                value={bookingForm.phoneNumber} 
                                onChange={handleFormChange} 
                                required
                            />
                          </div>
                          
                          <div className="form-group full-width">
                            <label>Additional requests</label>
                            <textarea 
                                name="additionalRequests" 
                                value={bookingForm.additionalRequests} 
                                onChange={handleFormChange} 
                                rows="4"
                            />
                          </div>
                        </div>
                      </div>
                      <br /><br />
                      <button 
                        className="continue-button" 
                        onClick={handleAddToCart}
                      >
                        Add to Cart
                      </button>
                      <div className="divider">or</div>
                      <div className="social-buttons">
                        <button 
                            className="social-button google" 
                            onClick={() => googleLoginHandler()}
                        >
                            <FcGoogle /> Continue with Google
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="booking-right">
                    <div className="property-card">
                      <img 
                        src={`data:image/jpeg;base64,${propertyDetails?.propertyimage[0]}`} 
                        alt={propertyDetails?.propertyname}
                      />
                      <div className="property-info">
                        <h3>{propertyDetails?.propertyname}</h3>
                      </div>
                    </div>

                    {totalNights > 0 && (
                      <div className="price-details">
                        <h3>Price details</h3>
                        <div className="price-breakdown">
                          {(() => {
                            const start = new Date(bookingData.checkIn);
                            const end = new Date(bookingData.checkOut);
                            const nights = Math.floor((end - start) / (1000 * 60 * 60 * 24));
                            const baseRoomRate = parseFloat(bookingCardBaseRate);
                            let totalBasePrice = 0;
                            let currentDate = new Date(start);
                            let groupMap = {};
                            
                            const daysUntilCheckIn = Math.floor((start - new Date()) / (1000 * 60 * 60 * 24));
                            const isEarlyBird = daysUntilCheckIn > 30;
                            const isLastMinute = daysUntilCheckIn <= 7;
                            
                            let discountRate = 1;
                            let discountLabel = '';
                            
                            if (isEarlyBird && propertyDetails.earlybirddiscountrate && propertyDetails.earlybirddiscountrate < 1) {
                              discountRate = propertyDetails.earlybirddiscountrate;
                              discountLabel = `Discount (${Math.round((1 - propertyDetails.earlybirddiscountrate) * 100)}%)`;
                            } else if (isLastMinute && propertyDetails.lastminutediscountrate && propertyDetails.lastminutediscountrate < 1) {
                              discountRate = propertyDetails.lastminutediscountrate;
                              discountLabel = `Discount (${Math.round((1 - propertyDetails.lastminutediscountrate) * 100)}%)`;
                            }
                            
                            for (let i = 0; i < nights; i++) {
                              const dayOfWeek = currentDate.getDay();
                              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                              const isSpecialEvent = propertyDetails.startdate && propertyDetails.enddate &&
                                currentDate >= new Date(propertyDetails.startdate) && 
                                currentDate <= new Date(propertyDetails.enddate);
                              
                              let rateMultiplier = 1;
                              let labelParts = [];
                              
                              if (isWeekend) labelParts.push('Weekend');
                              if (isSpecialEvent) labelParts.push('Special Event');
                              else if (!isWeekend) labelParts.push('Weekday');
                              
                              if (isWeekend) rateMultiplier *= (propertyDetails.weekendrate || 1);
                              if (isSpecialEvent) rateMultiplier *= (propertyDetails.specialeventrate || 1);
                              
                              const nightPrice = baseRoomRate * rateMultiplier;
                              const unitKey = nightPrice.toFixed(2) + '-' + labelParts.join(',');
                              
                              if (!groupMap[unitKey]) {
                                groupMap[unitKey] = { 
                                    count: 0, 
                                    total: 0, 
                                    unit: nightPrice, 
                                    label: labelParts.join(', ') 
                                };
                              }
                              
                              groupMap[unitKey].count += 1;
                              groupMap[unitKey].total += nightPrice;
                              totalBasePrice += nightPrice;
                              currentDate.setDate(currentDate.getDate() + 1);
                            }
                            
                            let discount = 0;
                            if (discountRate < 1) {
                                discount = totalBasePrice * (1 - discountRate);
                            }
                            
                            return (
                              <>
                                {Object.entries(groupMap).map(([key, info], idx) => (
                                  <div className="price-row" key={idx}>
                                    <span>RM {info.unit.toFixed(2)} x {info.count}</span>
                                    <span>RM {info.total.toFixed(2)}</span>
                                  </div>
                                ))}
                                {discount > 0 && (
                                  <div className="price-row discount">
                                    <span>{discountLabel}</span>
                                    <span>-RM {discount.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="price-total">
                                  <span>Total (MYR)</span>
                                  <span>RM {(totalBasePrice - discount).toFixed(2)}</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mobile-booking-bar">
            <div className="mobile-booking-bar-content">
              <div className="mobile-price-info">
                {!bookingData.selectedRoom && ['Hotel', 'Resort'].includes(propertyDetails?.categoryname) && (
                  <span style={{ fontSize: '0.85rem', color: '#717171', fontWeight: 'normal', display: 'block', marginBottom: '-4px' }}>Starts from</span>
                )}
                <h3>RM {bookingCardBaseRate} <span>/night</span></h3>
                {totalNights > 0 && (
                  <span>Total: RM {totalprice} for {totalNights} {totalNights === 1 ? 'night' : 'nights'}</span>
                )}
              </div>
              <button 
                className="mobile-book-now-btn" 
                onClick={() => {
                  setShowBookingForm(true);
                }}
              >
                {propertyDetails.propertystatus === 'Unavailable' ? 'Enquiry' : 'Book & Pay'}
              </button>
            </div>
          </div>

          {showToast && (
            <Toast 
                type={toastType} 
                message={toastMessage} 
            />
          )}
        </div>
        <Footer />
        </AuthProvider>
      </div>
    </div>
  );
};

export default PropertyDetails;