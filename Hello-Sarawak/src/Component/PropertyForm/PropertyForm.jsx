import React, { useState, useEffect, useRef } from "react";
import { GiWashingMachine, GiClothesline, GiDesert  } from "react-icons/gi";
import { PiSecurityCamera } from "react-icons/pi";
import { SiLightning } from "react-icons/si";
import { TbPawFilled, TbPawOff } from "react-icons/tb";
import { MdLandscape, MdOutlineKingBed, MdFireplace, MdSmokingRooms, MdKeyboardArrowDown, MdKeyboardArrowUp} from "react-icons/md";
import { FaWifi, FaDesktop, FaDumbbell, FaWater, FaSkiing, FaChargingStation, FaParking, FaSwimmingPool, FaTv, FaUtensils, FaSnowflake, FaSmokingBan, FaFireExtinguisher, FaFirstAid, FaShower, FaCoffee, FaUmbrellaBeach, FaBath, FaWind, FaBicycle, FaBabyCarriage, FaKey, FaBell, FaTree, FaCity } from "react-icons/fa";
import { propertiesListing, updateProperty, propertyListingRequest, fetchClusters, fetchUserData, fetchCommissionRate } from "../../../Api/api";
import Toast from "../Toast/Toast";
import "./PropertyForm.css";
import { useQuery } from '@tanstack/react-query';

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 800;

const resizeImage = (file, maxWidth, maxHeight) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    const resizedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(resizedFile);
                },
                'image/jpeg',
                    0.5
            );
        };
        img.onerror = (error) => reject(error);

        const reader = new FileReader();
        reader.onload = (e) => (img.src = e.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

const getImageSrc = (image) => {
    if (!image) return "";

    if (image instanceof File) {
        return URL.createObjectURL(image);
    }

    if (typeof image !== "string") return "";

    if (image.startsWith("http://") || image.startsWith("https://")) {
        return image;
    }

    if (image.startsWith("data:image")) {
        return image;
    }

    return `data:image/jpeg;base64,${image}`;
};

const PropertyForm = ({ initialData, onSubmit, onClose }) => {

    const predefinedFacilities = [
        { name: "Wi-Fi", icon: <FaWifi />, category: "essentials" },
        { name: "Kitchen", icon: <FaUtensils />, category: "essentials" },
        { name: "Washer", icon: <GiWashingMachine />, category: "essentials" },
        { name: "Dryer", icon: <GiClothesline />, category: "essentials" },
        { name: "Air Conditioning", icon: <FaSnowflake />, category: "essentials" },
        { name: "Heating", icon: <FaWind />, category: "essentials" },
        { name: "Dedicated workspace", icon: <FaDesktop />, category: "essentials" },
        { name: "TV", icon: <FaTv />, category: "essentials" },

        { name: "Free Parking", icon: <FaParking />, category: "features" },
        { name: "Swimming Pool", icon: <FaSwimmingPool />, category: "features" },
        { name: "Bathtub", icon: <FaBath />, category: "features" },
        { name: "Shower", icon: <FaShower className="facilities-icon"/> },
        { name: "EV charger", icon: <FaChargingStation />, category: "features" },
        { name: "Baby Crib", icon: <FaBabyCarriage />, category: "features" },
        { name: "King bed", icon: <MdOutlineKingBed />, category: "features" },
        { name: "Gym", icon: <FaDumbbell />, category: "features" },
        { name: "Breakfast", icon: <FaCoffee />, category: "features" },
        { name: "Indoor fireplace", icon: <MdFireplace />, category: "features" },
        { name: "Smoking allowed", icon: <MdSmokingRooms />, category: "features" },
        { name: "No Smoking", icon: <FaSmokingBan />, category: "features" },

        { name: "City View", icon: <FaCity />, category: "location" },
        { name: "Garden", icon: <FaTree />, category: "location" },
        { name: "Bicycle Rental", icon: <FaBicycle />, category: "location" },
        { name: "Beachfront", icon: <FaUmbrellaBeach />, category: "location" },
        { name: "Waterfront", icon: <FaWater />, category: "location" },
        { name: "Countryside", icon: <MdLandscape />, category: "location" },
        { name: "Ski-in/ski-out", icon: <FaSkiing />, category: "location" },
        { name: "Desert", icon: <GiDesert />, category: "location" },
        
        { name: "Security Alarm", icon: <FaBell />, category: "safety" },
        { name: "Fire Extinguisher", icon: <FaFireExtinguisher />, category: "safety" },
        { name: "First Aid Kit", icon: <FaFirstAid />, category: "safety" },
        { name: "Security Camera", icon: <PiSecurityCamera />, category: "safety" },

        { name: "Instant booking", icon: <SiLightning />, category: "booking" },
        { name: "Self check-in", icon: <FaKey />, category: "booking" },
        { name: "Pets Allowed", icon: <TbPawFilled />, category: "booking" },
        { name: "No Pets", icon: <TbPawOff />, category: "booking" },
    ];

   const categories = [
    "Resort", "Hotel", "Homestay", "Kampungstay", "Lodge", 
    "Inn", "Guesthouse", "Apartment", "Hostel"
];

    const [formData, setFormData] = useState({
        username: "",
        propertyPrice: "", 
        propertyQuantity: "1", 
        propertyGuestPaxNo: "1", 
        propertyBedType: "", 
        propertyAddress: "",
        nearbyLocation: "",
        latitude: "", 
        longitude: "", 
        propertyDescription: "",
        facilities: [],
        propertyImage: [],
        clusterName: "",
        categoryName: "",
        propertyDiscount: "0",
        downPaymentRate: "0.3",
        totalAmountDiscountRate: "0.9",
        daysBeforePaying: "3",
        daysBeforePayingUnit: "days"
    });

    const [rooms, setRooms] = useState([{
        id: Date.now(), name: '', maxGuests: '', bedType: '', price: '', quantity: '1', description: '', images: [], options: []
    }]);

    const [removedImages, setRemovedImages] = useState([]);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState("");
    const [selectedFacilities, setSelectedFacilities] = useState([]);
    const fileInputRef = useRef(null);
const locationInputRef = useRef(null);
const hasInitialized = useRef(false); // ← ADD THIS
    const [showMoreAmenities, setShowMoreAmenities] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const userid = localStorage.getItem("userid");
    
const {
    data: dynamicCommissionRate = 0.07,
    isLoading: isCommissionLoading,
    isFetching: isCommissionFetching,
} = useQuery({
    queryKey: ['property-form-commission-rate'],
    queryFn: fetchCommissionRate,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 1,
});

    const isHotelType = ['Hotel', 'Resort', 'Inn', 'Hostel'].includes(formData.categoryName);

    const basePrice = parseFloat(formData.propertyPrice || 0);
    const commissionFee = basePrice * dynamicCommissionRate;
    const finalPriceWithCommission = basePrice + commissionFee;

    const { data: userData } = useQuery({
        queryKey: ['user', userid],
        queryFn: () => fetchUserData(userid),
        enabled: !!userid
    });
    
    const { data: clustersData = [] } = useQuery({
        queryKey: ['clusters'],
        queryFn: fetchClusters,
    });
    
    const clusters = clustersData.map(cluster => cluster.clustername || '');

    useEffect(() => {
        if (isHotelType && rooms.length > 0) {
            const validPrices = rooms.map(r => parseFloat(r.price)).filter(p => !isNaN(p) && p > 0);
            if (validPrices.length > 0) {
                const lowestPrice = Math.min(...validPrices);
                setFormData(prev => ({ ...prev, propertyPrice: lowestPrice.toString() }));
            } else {
                setFormData(prev => ({ ...prev, propertyPrice: "" }));
            }
        }
    }, [rooms, isHotelType]);

    useEffect(() => {
    hasInitialized.current = false;
}, [initialData]);

 useEffect(() => {
    if (initialData && (isCommissionLoading || isCommissionFetching)) return;
    if (initialData && hasInitialized.current) return;  

    if (initialData) {
            let facilitiesArray = [];
            
            if (initialData.facilities) {
                if (typeof initialData.facilities === 'string') {
                    facilitiesArray = initialData.facilities.trim() 
                        ? initialData.facilities.split(",").map(facility => facility.trim())
                        : [];
                } else if (Array.isArray(initialData.facilities)) {
                    facilitiesArray = initialData.facilities;
                }
            }

            let desc = initialData.propertydescription || "";
            let parsedRooms = [];
            
            if (initialData.room_details) {
                if (typeof initialData.room_details === 'string') {
                    try { 
                        parsedRooms = JSON.parse(initialData.room_details); 
                    } catch (e) {
                        console.error("Error parsing room_details string:", e);
                    }
                } else {
                    parsedRooms = initialData.room_details;
                }
            } 
            
            // Clean up legacy room data from description if it exists
            if (desc.includes("_ROOMDATA_")) {
                const parts = desc.split("_ROOMDATA_");
                desc = parts[0];
                if (!parsedRooms || parsedRooms.length === 0) {
                    try {
                        parsedRooms = JSON.parse(parts[1]);
                    } catch (e) {
                        console.error("Error parsing legacy rooms:", e);
                    }
                }
            }

            if (parsedRooms && parsedRooms.length > 0) {
                const sanitizedRooms = parsedRooms.map(r => {
                    const storedFinalRoomPrice = parseFloat(r.price !== undefined ? r.price : (initialData.normalrate || 0));
const storedPrice = storedFinalRoomPrice / (1 + dynamicCommissionRate);

                    const sanitizedOptions = (r.options || []).map(opt => {
                        const storedOptFinalPrice = parseFloat(opt.price || 0);
const storedOptPrice = storedOptFinalPrice / (1 + dynamicCommissionRate);
                        return { 
                            ...opt, 
                            price: storedOptPrice,
                            quantity: opt.quantity !== undefined && opt.quantity !== null && opt.quantity !== '' ? opt.quantity : '1'
                        };
                    });

                    return {
                        ...r,
                        quantity: r.quantity !== undefined ? r.quantity : '1',
                        price: storedPrice,
                        options: sanitizedOptions
                    };
                });
                setRooms(sanitizedRooms);
            }
            
           const storedFinalPrice = parseFloat(initialData.normalrate || "1");
const storedBasePrice = storedFinalPrice / (1 + dynamicCommissionRate);

            setFormData({
                username: initialData.username || "",
                propertyPrice: storedBasePrice.toFixed(2),
                propertyQuantity: initialData.quantity || "1",
                propertyGuestPaxNo: initialData.propertyguestpaxno || "1",
                propertyBedType: initialData.propertybedtype || "",
                propertyAddress: initialData.propertyaddress || "",
                nearbyLocation: initialData.nearbylocation || "",
                latitude: initialData.latitude || "", 
                longitude: initialData.longitude || "", 
                propertyDescription: desc,
                facilities: facilitiesArray,
                propertyImage: initialData.propertyimage || [],
                clusterName: initialData.clustername || "",
                categoryName: initialData.categoryname || "",
                propertyDiscount: initialData.propertydiscount || "0",
                downPaymentRate: initialData.downpaymentrate || "0.3",
                totalAmountDiscountRate: initialData.totalAmountDiscountRate
                    ? (1 - parseFloat(initialData.totalAmountDiscountRate)).toFixed(2)
                    : "0.9",
                // detect unit from stored fractional-days value
                daysBeforePaying: (() => {
                    const v = parseFloat(initialData.daysbeforepaying || 3);
                    if (v < 1/24) return Math.round(v * 1440).toString();
                    if (v < 1) return Math.round(v * 24).toString();
                    return v.toString();
                })(),
                daysBeforePayingUnit: (() => {
                    const v = parseFloat(initialData.daysbeforepaying || 3);
                    if (v < 1/24) return "minutes";
                    if (v < 1) return "hours";
                    return "days";
                })() 
            });
            
            setSelectedFacilities(facilitiesArray);
                hasInitialized.current = true; 

        } else {

            setFormData(prev => ({
                ...prev,
                username: localStorage.getItem("username") || "",
            }));
            setSelectedFacilities([]);
        }
   }, [initialData, dynamicCommissionRate, isCommissionLoading, isCommissionFetching]);

    useEffect(() => {
        if (userData && clustersData.length > 0 && !initialData) {
            const userClusterId = userData.clusterid;
            if (userClusterId) {
                const userCluster = clustersData.find(
                    cluster => cluster.clusterid?.toString() === userClusterId.toString()
                );
                if (userCluster) {
                    setFormData(prev => ({
                        ...prev,
                        clusterName: userCluster.clustername
                    }));
                }
            }
        }
    }, [userData, clustersData, initialData]);

    useEffect(() => {
        if (window.google && locationInputRef.current) {
            const autocomplete = new window.google.maps.places.Autocomplete(locationInputRef.current);
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                
                if (place) {
                    let finalLocation = place.formatted_address || "";
                    if (place.name && finalLocation && !finalLocation.includes(place.name)) {
                        finalLocation = `${place.name}, ${finalLocation}`;
                    } else if (place.name && !finalLocation) {
                        finalLocation = place.name;
                    }

                    const lat = place.geometry?.location?.lat() || "";
                    const lng = place.geometry?.location?.lng() || "";

                    setFormData((prev) => ({ 
                        ...prev, 
                        nearbyLocation: finalLocation,
                        latitude: lat,
                        longitude: lng
                    }));
                }
            });
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const numValue = parseFloat(value);
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'propertyPrice' || name === 'propertyQuantity' || name === 'propertyGuestPaxNo') 
                ? (numValue >= 0 ? numValue : value) 
                : value
        }));
    };

    const addRoom = () => {
        setRooms([...rooms, { id: Date.now(), name: '', maxGuests: '', bedType: '', price: '', quantity: '1', description: '', images: [], options: [] }]);
    };

    const removeRoom = (id) => {
        if (rooms.length > 1) {
            setRooms(rooms.filter(r => r.id !== id));
        } else {
            setToastMessage('You must have at least one room type.');
            setToastType('error');
            setShowToast(true);
        }
    };

    const handleRoomChange = (id, field, value) => {
        let finalValue = value;
        if (field === 'name' || field === 'bedType') {
            finalValue = value.replace(
                /\w\S*/g,
                (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
        }
        setRooms(rooms.map(r => r.id === id ? { ...r, [field]: finalValue } : r));
    };

    const addRoomOption = (roomId) => {
        setRooms(rooms.map(r => {
            if (r.id === roomId) {
                const newOptions = [...(r.options || []), { id: Date.now(), name: '', price: '', quantity: '1' }];
                return { ...r, options: newOptions };
            }
            return r;
        }));
    };

    const removeRoomOption = (roomId, optionId) => {
        setRooms(rooms.map(r => {
            if (r.id === roomId) {
                return { ...r, options: r.options.filter(o => o.id !== optionId) };
            }
            return r;
        }));
    };

    const handleRoomOptionChange = (roomId, optionId, field, value) => {
        let finalValue = value;
        if (field === 'name') {
            finalValue = value.replace(
                /\w\S*/g,
                (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
        }
        setRooms(rooms.map(r => {
            if (r.id === roomId) {
                const newOptions = r.options.map(o => o.id === optionId ? { ...o, [field]: finalValue } : o);
                return { ...r, options: newOptions };
            }
            return r;
        }));
    };

    const handleFileChange = async (e) => {
        const newFiles = Array.from(e.target.files);
        const imageFiles = newFiles.filter((file) => file.type.startsWith('image/'));

        if (imageFiles.length < newFiles.length) {
            setToastMessage('Only image files are allowed.'); setToastType('warning'); setShowToast(true);
        }
        try {
            const resizedFiles = await Promise.all(imageFiles.map((file) => resizeImage(file, MAX_WIDTH, MAX_HEIGHT)));
            setFormData((prev) => ({ ...prev, propertyImage: [...prev.propertyImage, ...resizedFiles] }));
        } catch (error) { setToastMessage('Error resizing images.'); setToastType('error'); setShowToast(true); }
    };

    const handleRemoveImage = (index) => {
        setFormData((prev) => {
            const updatedImages = [...prev.propertyImage];
            const removedImage = updatedImages.splice(index, 1)[0];
            if (!(removedImage instanceof File)) setRemovedImages((prevRemoved) => [...prevRemoved, removedImage]);
            return { ...prev, propertyImage: updatedImages };
        });
    };

    const handleRoomImageUpload = async (roomId, e) => {
        const newFiles = Array.from(e.target.files);
        const imageFiles = newFiles.filter((file) => file.type.startsWith('image/'));
        try {
            const resizedFiles = await Promise.all(imageFiles.map((file) => resizeImage(file, MAX_WIDTH, MAX_HEIGHT)));
            setRooms(prev => prev.map(r => r.id === roomId ? { ...r, images: [...(r.images || []), ...resizedFiles] } : r));
        } catch (error) { setToastMessage('Error processing room images.'); setToastType('error'); setShowToast(true); }
    };

    const removeRoomImage = (roomId, imageIndex) => {
        setRooms(rooms.map(r => {
            if (r.id === roomId) {
                const newImages = [...r.images];
                newImages.splice(imageIndex, 1);
                return { ...r, images: newImages };
            }
            return r;
        }));
    };

    const toggleFacility = (facilityName) => {
        setSelectedFacilities((prev) => {
            if (facilityName === "Smoking allowed") {
                return prev.includes("No Smoking") ? prev.filter(name => name !== "No Smoking").concat(facilityName) : prev.includes(facilityName) ? prev.filter(name => name !== facilityName) : [...prev, facilityName];
            } else if (facilityName === "No Smoking") {
                return prev.includes("Smoking allowed") ? prev.filter(name => name !== "Smoking allowed").concat(facilityName) : prev.includes(facilityName) ? prev.filter(name => name !== facilityName) : [...prev, facilityName];
            }
            if (facilityName === "Pets Allowed") {
                return prev.includes("No Pets") ? prev.filter(name => name !== "No Pets").concat(facilityName) : prev.includes(facilityName) ? prev.filter(name => name !== facilityName) : [...prev, facilityName];
            } else if (facilityName === "No Pets") {
                return prev.includes("Pets Allowed") ? prev.filter(name => name !== "Pets Allowed").concat(facilityName) : prev.includes(facilityName) ? prev.filter(name => name !== facilityName) : [...prev, facilityName];
            }
            return prev.includes(facilityName) ? prev.filter((name) => name !== facilityName) : [...prev, facilityName];
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.propertyImage.length < 4) {
            setToastMessage("Please upload at least 4 main property images."); setToastType("error"); setShowToast(true); return;
        }

        if (!isHotelType && (!formData.propertyPrice || formData.propertyPrice <= 0)) {
            setToastMessage("Please enter a valid base price."); setToastType("error"); setShowToast(true); return;
        }

        if (isHotelType) {
            for (let i = 0; i < rooms.length; i++) {
                // FIXED: Adjusted validation to cleanly handle string zeroes and valid numbers
                if (!rooms[i].name || rooms[i].price === '' || rooms[i].price === undefined || rooms[i].price === null || isNaN(rooms[i].price) || !rooms[i].maxGuests || !rooms[i].bedType || !rooms[i].description || !rooms[i].quantity) {
                    setToastMessage(`Room Type ${i + 1} is missing information or quantity.`); setToastType("error"); setShowToast(true); return;
                }
                if (!rooms[i].images || rooms[i].images.length === 0) {
                    setToastMessage(`Room Type ${i + 1} must have at least one image.`); setToastType("error"); setShowToast(true); return;
                }
                if (rooms[i].options && rooms[i].options.length > 0) {
                    for (let j = 0; j < rooms[i].options.length; j++) {
                        const opt = rooms[i].options[j];
                        // FIXED: Added safe null/empty string checking for variation properties
                        if (!opt.name || opt.price === '' || opt.price === undefined || opt.price === null || isNaN(opt.price) || !opt.quantity) {
                            setToastMessage(`Room Type ${i + 1}: Package name, price, and quantity are required.`); setToastType("error"); setShowToast(true); return;
                        }
                        if (parseFloat(opt.price) < parseFloat(rooms[i].price)) {
                            setToastMessage(`Variation price cannot be lower than base room price.`); setToastType("error"); setShowToast(true); return;
                        }
                    }
                }
            }
        }

        setIsSubmitting(true);

        try {
            console.log("PROPERTY PRICE DEBUG BEFORE SUBMIT:", {
    inputBasePrice: formData.propertyPrice,
    frontendCommissionRate: dynamicCommissionRate,
    frontendFinalPrice: (
        parseFloat(formData.propertyPrice || 0) +
        parseFloat(formData.propertyPrice || 0) * dynamicCommissionRate
    ).toFixed(2),
});
            const data = new FormData();
            data.append("username", formData.username);
            data.append("propertyPrice", formData.propertyPrice); 
            data.append("propertyAddress", formData.propertyAddress);
            data.append("nearbyLocation", formData.nearbyLocation);
            data.append("facilities", selectedFacilities.join(","));
            data.append("clusterName", formData.clusterName);
            data.append("categoryName", formData.categoryName);
            data.append("propertyDiscount", formData.propertyDiscount || "0");
            data.append("downPaymentRate", formData.downPaymentRate || "0.3");
            data.append("totalAmountDiscountRate", formData.totalAmountDiscountRate || "0.9");
            const rawVal = parseFloat(formData.daysBeforePaying || "3");
            const daysVal = formData.daysBeforePayingUnit === "minutes"
                ? rawVal / 1440
                : formData.daysBeforePayingUnit === "hours"
                ? rawVal / 24
                : rawVal;
            data.append("daysBeforePaying", daysVal.toString());

            if (formData.latitude && formData.longitude) {
                data.append("latitude", formData.latitude);
                data.append("longitude", formData.longitude);
            }

           if (isHotelType) {
    let roomImageFileIndex = 0;

    const processedRooms = rooms.map((room, roomIndex) => {
        const roomImageRefs = (room.images || []).map((img) => {
            if (img instanceof File) {
                const ref = `__ROOM_IMAGE_${roomImageFileIndex}__`;

                data.append("roomImages", img);
                data.append(
                    "roomImageMap",
                    JSON.stringify({
                        index: roomImageFileIndex,
                        roomIndex,
                        ref,
                        originalName: img.name
                    })
                );

                roomImageFileIndex += 1;
                return ref;
            }

            return img;
        });

        const processedOptions = (room.options || []).map((opt) => {
            const optionBasePrice = parseFloat(opt.price || 0);
            const optionFinalPrice = optionBasePrice + (optionBasePrice * dynamicCommissionRate);

            return { 
                id: opt.id,
                name: opt.name, 
                price: parseFloat(optionFinalPrice.toFixed(2)),
                quantity: opt.quantity 
            };
        });

        const roomBasePrice = parseFloat(room.price || 0);
        const roomFinalPrice = roomBasePrice + (roomBasePrice * dynamicCommissionRate);

        return { 
            ...room, 
            price: parseFloat(roomFinalPrice.toFixed(2)),
            images: roomImageRefs,
            options: processedOptions 
        };
    });

    const totalPax = rooms.reduce((sum, r) => sum + (parseInt(r.maxGuests) || 0), 0);
    
    const totalQuantity = rooms.reduce((sum, r) => {
        const baseRoomQty = parseInt(r.quantity) || 0;
        const optionsQty = (r.options || []).reduce((optSum, o) => optSum + (parseInt(o.quantity) || 0), 0);
        return sum + baseRoomQty + optionsQty;
    }, 0); 
    
    data.append("propertyGuestPaxNo", totalPax || 1);
    data.append("propertyBedType", rooms.map(r => r.name).join(', ') || "Standard");
    data.append("quantity", totalQuantity);
    
    const roomsJson = JSON.stringify(processedRooms);
    data.append("propertyDescription", formData.propertyDescription);
    data.append("room_details", roomsJson); 
        }
            else {
                data.append("propertyGuestPaxNo", formData.propertyGuestPaxNo);
                data.append("propertyBedType", formData.propertyBedType);
                data.append("quantity", formData.propertyQuantity);
                data.append("propertyDescription", formData.propertyDescription);
                data.append("room_details", JSON.stringify([])); 
            }

            if (initialData) {
                data.append("creatorid", localStorage.getItem("userid"));
                data.append("creatorUsername", localStorage.getItem("username"));
            } else {
                data.append("propertyStatus", "Pending");
            }

            formData.propertyImage.forEach((file) => {
                if (file instanceof File) data.append("propertyImage", file);
            });
            data.append("removedImages", JSON.stringify(removedImages));

            let response;
            let propertyId;
            
           if (initialData) {
    propertyId = initialData.propertyid || initialData.propertyID;
    response = await updateProperty(data, propertyId);
} else {
    const usergroup = localStorage.getItem("usergroup");

    if (usergroup === "Administrator") {
        response = await propertiesListing(data);
    } else if (usergroup === "Moderator") {
        response = await propertiesListing(data);
        propertyId = response.propertyid;

        propertyListingRequest(propertyId).catch((err) => {
            console.error("Property listing request email failed:", err);
        });
    }
}

if (response && response.message) {
    onSubmit();
}
        } catch (error) {
            console.error("Error submitting form:", error);
            setToastMessage(error.message || "Error submitting form. Please try again.");
            setToastType("error");
            setShowToast(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setFormData({
            username: localStorage.getItem("username") || "",
            propertyPrice: "",
            propertyQuantity: "1",
            propertyGuestPaxNo: "1",
            propertyBedType: "",
            propertyAddress: "",
            nearbyLocation: "",
            latitude: "", longitude: "", 
            propertyDescription: "",
            facilities: [], propertyImage: [], clusterName: "", categoryName: "", propertyDiscount: "0",
            downPaymentRate: "0.3",
            totalAmountDiscountRate: "0.9",
            daysBeforePaying: "3",
            daysBeforePayingUnit: "days"
        });
        setRooms([{ id: Date.now(), name: '', maxGuests: '', bedType: '', price: '', quantity: '1', description: '', images: [], options: [] }]);
        setRemovedImages([]);
        setSelectedFacilities([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const imageInfoText = formData.propertyImage.length > 0 ? "The first image will be the main display image." : "";
    const getImageLabel = (index) => index === 0 ? "Main Image" : index <= 2 ? "Secondary Image" : "Additional Image";
    const getLabelStyle = (index) => ({
        backgroundColor: index === 0 ? '#4CAF50' : index <= 2 ? '#2196F3' : '#9E9E9E', color: 'white',
    });

    return (
        <div className="property-form-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="property-form-content">
                <div className="property-form-header">
                    <h1>{initialData ? "Edit Property" : "Create a New Property"}</h1>
                    <div className="property-form-header-buttons">
                        <button onClick={onClose} className="property-form-close-button" disabled={isSubmitting || isCommissionLoading || isCommissionFetching}>×</button>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="property-form-listing-form">
                    
                    {/* --- 1. BASIC DETAILS --- */}
                    <div className="property-form-section full-width">
                        <h3>1. Basic Details</h3>
                        <div style={{ backgroundColor: '#e6f7ff', padding: '12px 15px', borderRadius: '6px', color: '#0056b3', fontSize: '13px', marginBottom: '15px', border: '1px solid #bae7ff' }}>
                            💡 <strong>Tip:</strong> Selecting 'Homestay' or 'Apartment' keeps things simple for a single unit. Selecting 'Hotel' or 'Resort' unlocks the advanced Room & Package builder.
                        </div>
                        <div className="property-form-details-grid">
                            <div className="property-form-group">
                                <label>Category:</label>
                                <select name="categoryName" value={formData.categoryName} onChange={handleChange} required>
                                    <option value="">Select Category First</option>
                                    {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div className="property-form-group">
                                <label>Property Name:</label>
                                <input type="text" name="propertyAddress" value={formData.propertyAddress} onChange={handleChange} placeholder="e.g. The Grand Hotel" required />
                            </div>
                            <div className="property-form-group">
                                <label>Cluster (City Region):</label>
                                <select name="clusterName" value={formData.clusterName} onChange={handleChange} required>
                                    <option value="">Select Cluster</option>
                                    {clusters.map((c, i) => <option key={i} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="property-form-group">
                                <label>Exact Location / Address:</label>
                                <input type="text" name="nearbyLocation" value={formData.nearbyLocation} onChange={handleChange} placeholder="e.g. No.123, Jalan ABC" required ref={locationInputRef} />
                            </div>
                        </div>
                    </div>

                    {/* --- 2. DYNAMIC PROPERTY SETUP --- */}
                    {formData.categoryName !== "" && (
                        <>
                            {!isHotelType ? (
                                /* HOMESTAY SETUP */
                                <div className="property-form-section full-width" style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <h3 style={{color: '#2b6cb0', marginBottom: '15px'}}>2. Property Setup (Whole Unit)</h3>
                                    <div style={{ backgroundColor: '#e6f7ff', padding: '12px 15px', borderRadius: '6px', color: '#0056b3', fontSize: '13px', marginBottom: '15px', border: '1px solid #bae7ff' }}>
                                        💡 <strong>How it works:</strong> Guests will book the entire property. Just enter the total capacity, the beds available, and your nightly price.
                                    </div>
                                    
                                    <div className="property-form-details-grid" style={{ alignItems: 'flex-start' }}>
                                        {/* Left Side Inputs */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            <div className="property-form-group" style={{ margin: 0 }}>
                                                <label>Total Max Guests:</label>
                                                <input type="number" name="propertyGuestPaxNo" value={formData.propertyGuestPaxNo} onChange={handleChange} min="1" placeholder="e.g. 4" required />
                                            </div>
                                            <div className="property-form-group" style={{ margin: 0 }}>
                                                <label>Bed Configuration:</label>
                                                <input type="text" name="propertyBedType" value={formData.propertyBedType} onChange={handleChange} placeholder="e.g. 2 Queen Beds, 1 Sofa Bed" required />
                                            </div>
                                            <div className="property-form-group" style={{ margin: 0 }}>
                                                <label>Quantity (How many identical units do you have?):</label>
                                                <input type="number" name="propertyQuantity" value={formData.propertyQuantity} onChange={handleChange} min="1" required />
                                            </div>
                                        </div>
                                        
                                        {/* Right Side Commission UI  */}
                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', backgroundColor: '#fff', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                            <label style={{ color: '#2c5282', fontWeight: 'bold', display: 'block', marginBottom: '10px', fontSize: '14px' }}>Base Price per Night (MYR):</label>
                                            <input 
                                                type="number" 
                                                name="propertyPrice" 
                                                value={formData.propertyPrice} 
                                                onChange={handleChange} 
                                                min="1" 
                                                 step="0.01"
                                                style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e0', borderRadius: '6px', fontSize: '15px', marginBottom: '15px' }}
                                                required 
                                            />
                                            <p style={{ fontSize: '13px', color: '#718096', margin: '0 0 15px 0', lineHeight: '1.5' }}>
                                                A platform commission fee of <strong>{(dynamicCommissionRate * 100).toFixed(0)}%</strong> will be applied automatically.
                                            </p>
                                            
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#718096', marginBottom: '8px' }}>
                                                <span>Base Earnings:</span>
                                                <span>MYR {basePrice.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#e53e3e', marginBottom: '15px' }}>
                                                <span>Platform Commission ({(dynamicCommissionRate * 100).toFixed(0)}%):</span>
                                                <span>+ MYR {commissionFee.toFixed(2)}</span>
                                            </div>
                                            
                                            <div style={{ borderTop: '1px dashed #cbd5e0', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: '#2b6cb0', fontWeight: 'bold' }}>
                                                <span>Final Price Displayed to Guest:</span>
                                                <span>MYR {finalPriceWithCommission.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* HOTEL SETUP */
                                <div className="property-form-section full-width">
                                    <h3 style={{color: '#007bff'}}>2. Room Inventory & Packages</h3>
                                    <div style={{ backgroundColor: '#e6f7ff', padding: '12px 15px', borderRadius: '6px', color: '#0056b3', fontSize: '13px', marginBottom: '15px', border: '1px solid #bae7ff' }}>
                                        💡 <strong>How Hotel Inventory Works:</strong> First, add your physical rooms (e.g., "Standard Room"). Then, you can add "Packages" (like adding Breakfast or City Views) to that room. The system will automatically calculate your starting price based on the cheapest option!
                                    </div>
                                    
                                    {rooms.map((room, index) => {
                                        const roomBasePrice = parseFloat(room.price || 0);
                                        const roomCommFee = roomBasePrice * dynamicCommissionRate;
                                        const roomFinalPrice = roomBasePrice + roomCommFee;

                                        return (
                                        <div key={room.id} className="room-setup-card" style={{border: '2px solid #e2e8f0', padding: '20px', borderRadius: '8px', marginBottom: '15px', backgroundColor: '#f8fafc'}}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px'}}>
                                                <h4 style={{margin: 0, color: '#2b6cb0', fontSize: '18px'}}>Room {index + 1}</h4>
                                                {rooms.length > 1 && <button type="button" onClick={() => removeRoom(room.id)} style={{background: '#e53e3e', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>Remove Room</button>}
                                            </div>
                                            
                                            <div className="property-form-details-grid" style={{ alignItems: 'flex-start' }}>
                                                {/* Left Side Inputs - Added OR fallbacks to prevent empty values */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                    <div className="property-form-group" style={{ margin: 0 }}>
                                                        <label>Room Name:</label>
                                                        <input type="text" value={room.name || ''} onChange={(e) => handleRoomChange(room.id, 'name', e.target.value)} placeholder="e.g. Standard Room" required />
                                                    </div>
                                                    <div className="property-form-group" style={{ margin: 0 }}>
                                                        <label>Max Guests:</label>
                                                        <input type="number" min="1" value={room.maxGuests || ''} onChange={(e) => handleRoomChange(room.id, 'maxGuests', e.target.value)} placeholder="e.g. 2" required />
                                                    </div>
                                                    <div className="property-form-group" style={{ margin: 0 }}>
                                                        <label>Bed Configuration:</label>
                                                        <input type="text" value={room.bedType || ''} onChange={(e) => handleRoomChange(room.id, 'bedType', e.target.value)} placeholder="e.g. 1 King Bed" required />
                                                    </div>
                                                    <div className="property-form-group" style={{ margin: 0 }}>
                                                        <label>Quantity for Standard Rate:</label>
                                                        <small style={{display: 'block', color: '#666', fontSize: '11px', marginBottom: '4px'}}>How many physical rooms of this exact type do you have?</small>
                                                        <input type="number" min="1" value={room.quantity || ''} onChange={(e) => handleRoomChange(room.id, 'quantity', e.target.value)} required />
                                                    </div>
                                                </div>

                                                {/* Right Side Commission UI (From Screenshot) */}
                                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', backgroundColor: '#fff', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                    <label style={{ color: '#2c5282', fontWeight: 'bold', display: 'block', marginBottom: '10px', fontSize: '14px' }}>Standard Rate (Room Only) Price:</label>
                                                    <input 
                                                        type="number" 
                                                        min="1" 
                                                         step="0.01"
                                                        value={room.price || ''} 
                                                        onChange={(e) => handleRoomChange(room.id, 'price', e.target.value)} 
                                                        style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e0', borderRadius: '6px', fontSize: '15px', marginBottom: '15px' }}
                                                        required 
                                                    />
                                                    <p style={{ fontSize: '13px', color: '#718096', margin: '0 0 15px 0', lineHeight: '1.5' }}>
                                                        A platform commission fee of <strong>{(dynamicCommissionRate * 100).toFixed(0)}%</strong> will be applied automatically.
                                                    </p>
                                                    
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#718096', marginBottom: '8px' }}>
                                                        <span>Base Earnings:</span>
                                                        <span>MYR {roomBasePrice.toFixed(2)}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#e53e3e', marginBottom: '15px' }}>
                                                        <span>Platform Commission ({(dynamicCommissionRate * 100).toFixed(0)}%):</span>
                                                        <span>+ MYR {roomCommFee.toFixed(2)}</span>
                                                    </div>
                                                    
                                                    <div style={{ borderTop: '1px dashed #cbd5e0', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: '#2b6cb0', fontWeight: 'bold' }}>
                                                        <span>Final Price Displayed to Guest:</span>
                                                        <span>MYR {roomFinalPrice.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="property-form-group full-width" style={{ marginTop: '15px' }}>
                                                <label>Room Description:</label>
                                                <textarea value={room.description || ''} onChange={(e) => handleRoomChange(room.id, 'description', e.target.value)} placeholder="Specific details about this room..." rows="2" required />
                                            </div>

                                            <div className="property-form-group full-width" style={{marginTop: '10px'}}>
                                                <label style={{fontSize: '13px', color: '#555', fontWeight: 'bold'}}>Main Room Images:</label>
                                                <input type="file" accept="image/*" multiple onChange={(e) => handleRoomImageUpload(room.id, e)} required={!(room.images && room.images.length > 0)} />
                                                <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px'}}>
                                                    {room.images && room.images.map((image, imgIdx) => (
                                                        <div key={imgIdx} style={{position: 'relative', border: '1px solid #ddd', padding: '2px', borderRadius: '4px'}}>
                                                            <img
                                                                src={getImageSrc(image)}
                                                                alt="Room"
                                                                style={{
                                                                    width: '60px',
                                                                    height: '60px',
                                                                    objectFit: 'cover',
                                                                    borderRadius: '2px'
                                                                }}
                                                            />                                                           
                                                             <button type="button" onClick={() => removeRoomImage(room.id, imgIdx)} style={{position: 'absolute', top: '-6px', right: '-6px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer'}}>×</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* --- BEAUTIFUL VARIATION SECTION (NO IMAGES) --- */}
                                            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px dashed #cbd5e0', marginTop: '20px' }}>
                                                <label style={{ color: '#2b6cb0', fontWeight: 'bold', fontSize: '15px', marginBottom: '8px', display: 'block' }}>Optional Packages / Variations:</label>
                                                <div style={{ backgroundColor: '#e6f7ff', padding: '10px 12px', borderRadius: '6px', color: '#0056b3', fontSize: '12px', marginBottom: '15px', border: '1px solid #bae7ff' }}>
                                                    💡 <strong>Package Tip:</strong> Add variations like "With Breakfast". Each package requires its own dedicated quantity representing how many of these deals you want to sell.
                                                </div>
                                                
                                                {room.options && room.options.map((opt, optIdx) => (
                                                    <div key={opt.id || optIdx} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px', padding: '15px', border: '1px solid #edf2f7', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                            <div style={{ flex: 2 }}>
                                                                <label style={{ fontSize: '12px', color: '#555', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Package Name:</label>
                                                                <input type="text" placeholder="e.g. With Breakfast" value={opt.name || ''} onChange={(e) => handleRoomOptionChange(room.id, opt.id, 'name', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e0', borderRadius: '6px' }} required />
                                                            </div>
                                                            <div style={{ flex: 1, position: 'relative' }}>
                                                                <label style={{ fontSize: '12px', color: '#555', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Base Price (MYR):</label>
                                                                <input type="number" placeholder="Total Price" min={room.price || 1} step="0.01" value={opt.price !== undefined ? opt.price : ''} onChange={(e) => handleRoomOptionChange(room.id, opt.id, 'price', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #48bb78', borderRadius: '6px', outlineColor: '#38a169' }} required />
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <label style={{ fontSize: '12px', color: '#555', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Quantity:</label>
                                                                <input type="number" min="1" placeholder="Qty" value={opt.quantity !== undefined ? opt.quantity : '1'} onChange={(e) => handleRoomOptionChange(room.id, opt.id, 'quantity', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e0', borderRadius: '6px' }} required />
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                                                                <button type="button" onClick={() => removeRoomOption(room.id, opt.id)} style={{ background: '#e53e3e', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => addRoomOption(room.id)} style={{ background: '#48bb78', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>+ Add Package</button>
                                            </div>
                                        </div>
                                        );
                                    })}
                                    <button type="button" onClick={addRoom} style={{background: '#3182ce', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%'}}>+ Add Another Room Type</button>
                                    
                                    <div style={{ backgroundColor: '#ebf8ff', padding: '15px', borderRadius: '8px', border: '1px solid #90cdf4', marginTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2b6cb0', fontWeight: 'bold' }}>
                                            <span>Starting Price Displayed to Guest (Calculated from cheapest room incl. fee):</span>
                                            <span>MYR {finalPriceWithCommission.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* --- 3. GENERAL DESCRIPTION --- */}
                    <div className="property-form-section full-width">
                        <h3>3. General Property Description</h3>
                        <div style={{ backgroundColor: '#e6f7ff', padding: '12px 15px', borderRadius: '6px', color: '#0056b3', fontSize: '13px', marginBottom: '15px', border: '1px solid #bae7ff' }}>
                            💡 <strong>Tip:</strong> Sell the experience! Mention nearby attractions, the overall vibe, and why guests love staying here.
                        </div>
                        <textarea name="propertyDescription" value={formData.propertyDescription} onChange={handleChange} placeholder="General description about the entire property (location, vibe, overall experience)..." rows="4" style={{width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '14px', fontFamily: 'inherit'}} required />
                    </div>

                    {/* --- 4. DISCOUNT SETTINGS --- */}
                    <div className="property-form-section full-width">
                        <h3>4. Discount Settings</h3>
                        <div style={{ backgroundColor: '#e6f7ff', padding: '12px 15px', borderRadius: '6px', color: '#0056b3', fontSize: '13px', marginBottom: '15px', border: '1px solid #bae7ff' }}>
                            💡 <strong>How it works:</strong> This is a special flat discount deducted from your final nightly rate. For example, if your room is RM 100 and you enter '10' here, the guest only pays RM 90. Leave as 0 if you don't want to offer a discount.
                        </div>
                        <div className="property-form-pricing-grid">
                            <div className="property-form-group" style={{ backgroundColor: '#fffcf0', padding: '15px', borderRadius: '8px', border: '1px solid #f6e05e' }}>
                                <label style={{ color: '#b7791f' }}>Flat Discount Amount (MYR):</label>
                                <input type="number" name="propertyDiscount" value={formData.propertyDiscount} onChange={handleChange} min="0" step="0.01" style={{ borderColor: '#ecc94b' }} />
                            </div>
                        </div>
                    </div>
                    
                    {/* --- 5. FACILITIES --- */}
                    <div className="property-form-section full-width">
                        <h3>5. Facilities</h3>
                        <div className="property-form-filter-section">
                            <div className="property-form-essentials-section">
                                <h5>Essentials</h5>
                                <div className="property-form-amenities-grid">
                                    {predefinedFacilities.filter(facility => facility.category === "essentials").map((facility) => (
                                        <div key={facility.name} className={`property-form-amenity-item ${selectedFacilities.includes(facility.name) ? 'selected' : ''}`} onClick={() => toggleFacility(facility.name)}>
                                            <span className="property-form-amenity-icon">{facility.icon}</span>
                                            <span className="property-form-amenity-text">{facility.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {!showMoreAmenities && (
                                <button type="button" className="property-form-show-more-button" onClick={() => setShowMoreAmenities(true)}>
                                    Show more <MdKeyboardArrowDown />
                                </button>
                            )}

                            {showMoreAmenities && (
                                <>
                                    <div className="property-form-features-section">
                                        <h5>Features</h5>
                                        <div className="property-form-amenities-grid">
                                            {predefinedFacilities.filter(facility => facility.category === "features").map((facility) => (
                                                <div key={facility.name} className={`property-form-amenity-item ${selectedFacilities.includes(facility.name) ? 'selected' : ''}`} onClick={() => toggleFacility(facility.name)}>
                                                    <span className="property-form-amenity-icon">{facility.icon}</span>
                                                    <span className="property-form-amenity-text">{facility.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="property-form-location-section">
                                        <h5>Location</h5>
                                        <div className="property-form-amenities-grid">
                                            {predefinedFacilities.filter(facility => facility.category === "location").map((facility) => (
                                                <div key={facility.name} className={`property-form-amenity-item ${selectedFacilities.includes(facility.name) ? 'selected' : ''}`} onClick={() => toggleFacility(facility.name)}>
                                                    <span className="property-form-amenity-icon">{facility.icon}</span>
                                                    <span className="property-form-amenity-text">{facility.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="property-form-safety-section">
                                        <h5>Safety</h5>
                                        <div className="property-form-amenities-grid">
                                            {predefinedFacilities.filter(facility => facility.category === "safety").map((facility) => (
                                                <div key={facility.name} className={`property-form-amenity-item ${selectedFacilities.includes(facility.name) ? 'selected' : ''}`} onClick={() => toggleFacility(facility.name)}>
                                                    <span className="property-form-amenity-icon">{facility.icon}</span>
                                                    <span className="property-form-amenity-text">{facility.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="property-form-booking-section">
                                        <h5>Booking Options</h5>
                                        <div className="property-form-amenities-grid">
                                            {predefinedFacilities.filter(facility => facility.category === "booking").map((facility) => (
                                                <div key={facility.name} className={`property-form-amenity-item ${selectedFacilities.includes(facility.name) ? 'selected' : ''}`} onClick={() => toggleFacility(facility.name)}>
                                                    <span className="property-form-amenity-icon">{facility.icon}</span>
                                                    <span className="property-form-amenity-text">{facility.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button type="button" className="property-form-show-less-button" onClick={() => setShowMoreAmenities(false)}>
                                        Show less <MdKeyboardArrowUp />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* --- 6. MAIN IMAGES --- */}
                    <div className="property-form-section full-width">
                        <h3>6. Main Property Images</h3>
                        <div style={{ backgroundColor: '#e6f7ff', padding: '12px 15px', borderRadius: '6px', color: '#0056b3', fontSize: '13px', marginBottom: '15px', border: '1px solid #bae7ff' }}>
                            💡 <strong>Tip:</strong> These represent the whole property (outside building, lobby, main pool, etc). Make sure your first image is bright and welcoming—it will be the main display image!
                        </div>
                        <div className="property-form-group">
                            <input type="file" name="propertyImage" accept="image/*" onChange={handleFileChange} ref={fileInputRef} multiple />
                            {formData.propertyImage.length < 4 && (
                                <div className="property-form-validation-warning">Minimum 4 images required ({formData.propertyImage.length}/4 uploaded)</div>
                            )}
                        </div>
                        <div className="property-form-existing-images-container">
                            {formData.propertyImage.map((image, index) => (
                                <div key={index} className="property-form-image-item">
                                    <div className="property-form-image-label" style={getLabelStyle(index)}>{getImageLabel(index)}</div>
                                    <img src={getImageSrc(image)} alt="Property" />
                                    <button type="button" className="property-form-remove-image-btn" onClick={() => handleRemoveImage(index)}>×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* --- PAYMENT SETTING --- */}
                    <div className="property-form-section full-width">
                        <h3>7. Payment Settings</h3>
                        <div style={{ backgroundColor: '#e6f7ff', padding: '12px 15px', borderRadius: '6px', color: '#0056b3', fontSize: '13px', marginBottom: '15px', border: '1px solid #bae7ff' }}>
                            <strong>Tip:</strong> These settings control how guests can pay instantly via PayPal. Set down payment rate to 0 to disable instant pay for this property.
                        </div>

                        <div className="property-form-details-grid">
                            <div className="property-form-group">
                                <label>Down Payment Rate (0 = disabled):</label>
                                <input type="number" name="downPaymentRate" value={formData.downPaymentRate} onChange={handleChange} min="0" max="1" step="0.01" />
                                <small className="property-form-help-text">e.g. 0.5 = 50% down payment required</small>
                                <div className="property-form-rate-preview">Down Payment: {(parseFloat(formData.downPaymentRate || 0) * 100).toFixed(0)}%</div>
                            </div>
                            <div className="property-form-group">
                                <label>Instant Pay Discount Rate:</label>
                                <input type="number" name="totalAmountDiscountRate" value={formData.totalAmountDiscountRate} onChange={handleChange} min="0.1" max="1" step="0.01" />
                                <small className="property-form-help-text">e.g. 0.9 = 10% discount for paying instantly</small>
                                <div className="property-form-rate-preview">Discount: {((1 - parseFloat(formData.totalAmountDiscountRate || 0.9)) * 100).toFixed(0)}%</div>
                            </div>
                            <div className="property-form-group">
                                <label>Days Before Check-in Payment Deadline:</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', width: '100%' }}>
                                    <input
                                        type="number"
                                        name="daysBeforePaying"
                                        value={formData.daysBeforePaying}
                                        onChange={handleChange}
                                        min="1"
                                        step="1"
                                        style={{ 
                                            flex: '2',
                                            minWidth: '80px',
                                            padding: '10px', 
                                            fontSize: '14px', 
                                            border: '1px solid #cbd5e0', 
                                            borderRadius: '6px'
                                        }}
                                    />
                                    <select
                                        name="daysBeforePayingUnit"
                                        value={formData.daysBeforePayingUnit}
                                        onChange={handleChange}
                                        style={{ padding: '8px', border: '3px solid #cbd5e0', borderRadius: '6px', fontSize: '14px' }}
                                    >
                                        <option value="minutes">Minutes</option>
                                        <option value="hours">Hours</option>
                                        <option value="days">Days</option>
                                    </select>
                                </div>
                                <small className="property-form-help-text">
                                    How long before check-in must full payment be made
                                </small>
                                <div className="property-form-rate-preview">
                                    Deadline: {formData.daysBeforePaying || "3"} {formData.daysBeforePayingUnit} before check-in
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="property-form-button-group">
                        <button type="button" onClick={handleReset} className="property-form-reset-button" disabled={isSubmitting}>Reset</button>
                        <button
                            type="submit"
                            className="property-form-submit-button"
                            disabled={isSubmitting || isCommissionLoading || isCommissionFetching}
                        >
                            {isSubmitting
                            ? "Processing... Please wait"
                           : (isCommissionLoading || isCommissionFetching)
                                ? "Loading latest commission..."
                            : initialData
                            ? "Update Property"
                            : "Publish Property"}
                        </button>
                    </div>  
                </form>
                {showToast && <Toast type={toastType} message={toastMessage} />}
            </div>
        </div>
    );
};

export default PropertyForm;