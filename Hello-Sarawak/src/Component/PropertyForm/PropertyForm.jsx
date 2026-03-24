import React, { useState, useEffect, useRef } from "react";
import { GiWashingMachine, GiClothesline, GiDesert  } from "react-icons/gi";
import { PiSecurityCamera } from "react-icons/pi";
import { SiLightning } from "react-icons/si";
import { TbPawFilled, TbPawOff } from "react-icons/tb";
import { MdLandscape, MdOutlineKingBed, MdFireplace, MdSmokingRooms, MdKeyboardArrowDown, MdKeyboardArrowUp} from "react-icons/md";
import { FaWifi, FaDesktop, FaDumbbell, FaWater, FaSkiing, FaChargingStation, FaParking, FaSwimmingPool, FaTv, FaUtensils, FaSnowflake, FaSmokingBan, FaFireExtinguisher, FaFirstAid, FaShower, FaCoffee, FaUmbrellaBeach, FaBath, FaWind, FaBicycle, FaBabyCarriage, FaKey, FaBell, FaTree, FaCity } from "react-icons/fa";
import { propertiesListing, updateProperty, propertyListingRequest, fetchClusters, fetchUserData } from "../../../Api/api";
import Toast from "../Toast/Toast";
import "./PropertyForm.css";
import { useQuery } from '@tanstack/react-query';

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;

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
                0.9
            );
        };
        img.onerror = (error) => reject(error);

        const reader = new FileReader();
        reader.onload = (e) => (img.src = e.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

const PropertyForm = ({ initialData, onSubmit, onClose }) => {
    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

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
        "Resort",
        "Hotel",
        "Homestay",
        "Lodge",
        "Inn",
        "Guesthouse",
        "Apartment",
        "Hostel"
    ];

    const [formData, setFormData] = useState({
        username: "",
        propertyPrice: "1", 
        propertyAddress: "",
        nearbyLocation: "",
        propertyDescription: "",
        facilities: [],
        propertyImage: [],
        clusterName: "",
        categoryName: "",
        weekendRate: "1",
        specialEventRate: "1",
        specialEventStartDate: "",
        specialEventEndDate: "",
        earlyBirdDiscountRate: "1",
        lastMinuteDiscountRate: "1"
    });

    const [rooms, setRooms] = useState([{
        id: Date.now(),
        name: '',
        maxGuests: '',
        bedType: '',
        price: '',
        description: '',
        images: [],
        options: []
    }]);

    const [removedImages, setRemovedImages] = useState([]);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState("");
    const [selectedFacilities, setSelectedFacilities] = useState([]);
    const [isSpecialEventEnabled, setIsSpecialEventEnabled] = useState(false);
    const fileInputRef = useRef(null);
    const locationInputRef = useRef(null);
    const [showMoreAmenities, setShowMoreAmenities] = useState(false);
    
    // NEW: Loading State to prevent UI Freeze
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const userid = localStorage.getItem("userid");
    
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
        if (rooms.length > 0) {
            const lowestPrice = Math.min(...rooms.map(r => parseFloat(r.price) || Infinity));
            if (lowestPrice !== Infinity) {
                setFormData(prev => ({ ...prev, propertyPrice: lowestPrice > 0 ? lowestPrice : "1" }));
            }
        }
    }, [rooms]);

    useEffect(() => {
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
            if (desc.includes("_ROOMDATA_")) {
                const parts = desc.split("_ROOMDATA_");
                desc = parts[0];
                try {
                    parsedRooms = JSON.parse(parts[1]);
                } catch (e) {
                    console.error("Error parsing rooms:", e);
                }
            }

            if (parsedRooms.length > 0) {
                setRooms(parsedRooms);
            }
            
            setFormData({
                username: initialData.username || "",
                propertyPrice: initialData.normalrate || "1",
                propertyAddress: initialData.propertyaddress || "",
                nearbyLocation: initialData.nearbylocation || "",
                propertyDescription: desc,
                facilities: facilitiesArray,
                propertyImage: initialData.propertyimage || [],
                clusterName: initialData.clustername || "",
                categoryName: initialData.categoryname || "",
                weekendRate: initialData.weekendrate || "1",
                specialEventRate: initialData.specialeventrate || "1",
                specialEventStartDate: formatDate(initialData.startdate),
                specialEventEndDate: formatDate(initialData.enddate),
                earlyBirdDiscountRate: initialData.earlybirddiscountrate || "1",
                lastMinuteDiscountRate: initialData.lastminutediscountrate || "1"
            });
            
            setIsSpecialEventEnabled(!!(initialData.startdate && initialData.enddate));
            setSelectedFacilities(facilitiesArray);
        } else {
            setFormData(prev => ({
                ...prev,
                username: localStorage.getItem("username") || "",
            }));
            setSelectedFacilities([]);
        }
    }, [initialData]);

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
                if (place && place.formatted_address) {
                    setFormData((prev) => ({ ...prev, nearbyLocation: place.formatted_address }));
                }
            });
        }
    }, []);

    const addRoom = () => {
        setRooms([...rooms, { id: Date.now(), name: '', maxGuests: '', bedType: '', price: '', description: '', images: [], options: [] }]);
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
                const newOptions = [...(r.options || []), { id: Date.now(), name: '', price: '' }];
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

    const handleRoomImageUpload = async (roomId, e) => {
        const newFiles = Array.from(e.target.files);
        const imageFiles = newFiles.filter((file) => file.type.startsWith('image/'));

        if (imageFiles.length < newFiles.length) {
            setToastMessage('Only image files are allowed. Non-image files ignored.');
            setToastType('warning');
            setShowToast(true);
        }

        try {
            const resizedFiles = await Promise.all(
                imageFiles.map((file) => resizeImage(file, MAX_WIDTH, MAX_HEIGHT))
            );
            
            setRooms(prev => prev.map(r => 
                r.id === roomId ? { ...r, images: [...(r.images || []), ...resizedFiles] } : r
            ));
        } catch (error) {
            console.error('Error handling room images:', error);
            setToastMessage('Error processing room images.');
            setToastType('error');
            setShowToast(true);
        }
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
                return prev.includes("No Smoking")
                    ? prev.filter(name => name !== "No Smoking").concat(facilityName)
                    : prev.includes(facilityName)
                        ? prev.filter(name => name !== facilityName)
                        : [...prev, facilityName];
            } else if (facilityName === "No Smoking") {
                return prev.includes("Smoking allowed")
                    ? prev.filter(name => name !== "Smoking allowed").concat(facilityName)
                    : prev.includes(facilityName)
                        ? prev.filter(name => name !== facilityName)
                        : [...prev, facilityName];
            }
            
            if (facilityName === "Pets Allowed") {
                return prev.includes("No Pets")
                    ? prev.filter(name => name !== "No Pets").concat(facilityName)
                    : prev.includes(facilityName)
                        ? prev.filter(name => name !== facilityName)
                        : [...prev, facilityName];
            } else if (facilityName === "No Pets") {
                return prev.includes("Pets Allowed")
                    ? prev.filter(name => name !== "Pets Allowed").concat(facilityName)
                    : prev.includes(facilityName)
                        ? prev.filter(name => name !== facilityName)
                        : [...prev, facilityName];
            }
            
            return prev.includes(facilityName)
                ? prev.filter((name) => name !== facilityName)
                : [...prev, facilityName];
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'specialEventStartDate' || name === 'specialEventEndDate') {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
            return;
        }
        
        const numValue = parseFloat(value);
        
        if (name === 'weekendRate') {
            if (numValue < 1.0 || numValue > 2.0) {
                setToastMessage("Weekend rate multiplier must be between 1.0 and 2.0");
                setToastType("error");
                setShowToast(true);
                return;
            }
        }
        
        setFormData(prev => ({
            ...prev,
            [name]: numValue >= 0 ? numValue : value
        }));
    };

    const handleFileChange = async (e) => {
        const newFiles = Array.from(e.target.files);
        const imageFiles = newFiles.filter((file) => file.type.startsWith('image/'));

        if (imageFiles.length < newFiles.length) {
            setToastMessage('Only image files are allowed. Non-image files have been ignored.');
            setToastType('warning');
            setShowToast(true);
        }

        try {
            const resizedFiles = await Promise.all(
                imageFiles.map((file) => resizeImage(file, MAX_WIDTH, MAX_HEIGHT))
            );
            setFormData((prev) => ({
                ...prev,
                propertyImage: [...prev.propertyImage, ...resizedFiles],
            }));
        } catch (error) {
            console.error('Error resizing images:', error);
            setToastMessage('Error resizing images. Please try again.');
            setToastType('error');
            setShowToast(true);
        }
    };

    const handleRemoveImage = (index) => {
        setFormData((prev) => {
            const updatedImages = [...prev.propertyImage];
            const removedImage = updatedImages.splice(index, 1)[0];
            if (!(removedImage instanceof File)) {
                setRemovedImages((prevRemoved) => [...prevRemoved, removedImage]);
            }
            return { ...prev, propertyImage: updatedImages };
        });
    };

    const toggleSpecialEvent = () => {
        setIsSpecialEventEnabled(!isSpecialEventEnabled);
        if (!isSpecialEventEnabled) {
            setFormData(prev => ({
                ...prev,
                specialEventStartDate: "",
                specialEventEndDate: ""
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.propertyImage.length < 4) {
            setToastMessage("Please upload at least 4 main property images.");
            setToastType("error");
            setShowToast(true);
            return;
        }

        for (let i = 0; i < rooms.length; i++) {
            if (!rooms[i].name || !rooms[i].price || !rooms[i].maxGuests || !rooms[i].bedType || !rooms[i].description) {
                setToastMessage(`Room Type ${i + 1} is missing information. All fields are required.`);
                setToastType("error");
                setShowToast(true);
                return;
            }
            if (!rooms[i].images || rooms[i].images.length === 0) {
                setToastMessage(`Room Type ${i + 1} must have at least one image uploaded.`);
                setToastType("error");
                setShowToast(true);
                return;
            }

            if (rooms[i].options && rooms[i].options.length > 0) {
                for (let j = 0; j < rooms[i].options.length; j++) {
                    const opt = rooms[i].options[j];
                    if (!opt.name || !opt.price) {
                        setToastMessage(`Room Type ${i + 1}: Variation name and price are required.`);
                        setToastType("error");
                        setShowToast(true);
                        return;
                    }
                    if (parseFloat(opt.price) < parseFloat(rooms[i].price)) {
                        setToastMessage(`Room Type ${i + 1}: Variation '${opt.name}' price (RM ${opt.price}) cannot be lower than the base room price (RM ${rooms[i].price}).`);
                        setToastType("error");
                        setShowToast(true);
                        return;
                    }
                }
            }
        }

        // TRIGGER LOADING STATE HERE
        setIsSubmitting(true);

        try {
            const processedRooms = await Promise.all(rooms.map(async (room) => {
                const base64Images = await Promise.all((room.images || []).map(async (img) => {
                    if (img instanceof File) {
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result.split(',')[1]);
                            reader.readAsDataURL(img);
                        });
                    }
                    return img; 
                }));
                return { ...room, images: base64Images };
            }));

            const data = new FormData();
            data.append("username", formData.username);
            data.append("propertyPrice", formData.propertyPrice); 
            data.append("propertyAddress", formData.propertyAddress);
            data.append("nearbyLocation", formData.nearbyLocation);

            data.append("propertyDescription", `${formData.propertyDescription}_ROOMDATA_${JSON.stringify(processedRooms)}`);
            
            const totalPax = rooms.reduce((sum, r) => sum + (parseInt(r.maxGuests) || 0), 0);
            data.append("propertyGuestPaxNo", totalPax || 1);
            data.append("propertyBedType", rooms.map(r => r.name).join(', ') || "Standard");
            
            data.append("facilities", selectedFacilities.join(","));
            data.append("clusterName", formData.clusterName);
            data.append("categoryName", formData.categoryName);
            
            if (initialData) {
                data.append("creatorid", localStorage.getItem("userid"));
                data.append("creatorUsername", localStorage.getItem("username"));
            }

            data.append("weekendRate", formData.weekendRate || "1");
            data.append("specialEventRate", formData.specialEventRate || "1");
            data.append("isSpecialEventEnabled", isSpecialEventEnabled);
            
            if (isSpecialEventEnabled) {
                data.append("specialEventStartDate", formData.specialEventStartDate || "");
                data.append("specialEventEndDate", formData.specialEventEndDate || "");
            }
            
            data.append("earlyBirdDiscountRate", formData.earlyBirdDiscountRate || "1");
            data.append("lastMinuteDiscountRate", formData.lastMinuteDiscountRate || "1");

            if (!initialData) {
                data.append("propertyStatus", "Pending");
            }

            formData.propertyImage.forEach((file) => {
                if (file instanceof File) {
                    data.append("propertyImage", file);
                }
            });
            data.append("removedImages", JSON.stringify(removedImages));

            let response;
            let propertyId;
            
            if (initialData) {
                propertyId = initialData.propertyid || initialData.propertyID;
                if (!propertyId) {
                    throw new Error('Property ID is required for update');
                }
                response = await updateProperty(data, propertyId);
            } else {
                const usergroup = localStorage.getItem("usergroup");

                if (usergroup === "Administrator") {
                    response = await propertiesListing(data);
                    propertyId = response.propertyid;
                } else if (usergroup === "Moderator") {
                    response = await propertiesListing(data);
                    propertyId = response.propertyid;
                    await propertyListingRequest(propertyId);
                }
            }
           
            if (response && response.message) {
                // We let PropertyListing handle the toast so the UI closes smoothly
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
            propertyPrice: "1",
            propertyAddress: "",
            nearbyLocation: "",
            propertyDescription: "",
            facilities: [],
            propertyImage: [],
            clusterName: "",
            categoryName: "",
            weekendRate: "1",
            specialEventRate: "1",
            specialEventStartDate: "",
            specialEventEndDate: "",
            earlyBirdDiscountRate: "1",
            lastMinuteDiscountRate: "1"
        });
        setRooms([{ id: Date.now(), name: '', maxGuests: '', bedType: '', price: '', description: '', images: [], options: [] }]);
        setRemovedImages([]);
        setSelectedFacilities([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const imageInfoText = 
        formData.propertyImage.length > 0 
            ? "The first image will be the main display image." 
            : "";

    const getImageLabel = (index) =>
        index === 0 ? "Main Image" : index <= 2 ? "Secondary Image" : "Additional Image";

    const getLabelStyle = (index) => ({
        backgroundColor: index === 0 ? '#4CAF50' : index <= 2 ? '#2196F3' : '#9E9E9E',
        color: 'white',
    });

    return (
        <div className="property-form-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="property-form-content">
                <div className="property-form-header">
                    <h1>{initialData ? "Edit Property" : "Create a New Property"}</h1>
                    <div className="property-form-header-buttons">
                        <button onClick={onClose} className="property-form-close-button" disabled={isSubmitting}>×</button>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="property-form-listing-form">
                    <div className="property-form-section full-width">
                        <h3>Property Details</h3>
                        <div className="property-form-details-grid">
                            <div className="property-form-group">
                                <label>Username:</label>
                                <input type="text" name="username" value={formData.username} readOnly required />
                            </div>
                            <div className="property-form-group">
                                <label>Name:</label>
                                <input
                                    type="text"
                                    name="propertyAddress"
                                    value={formData.propertyAddress}
                                    onChange={handleChange}
                                    placeholder="e.g. Property"
                                    required
                                />
                            </div>
                            
                            <div className="property-form-group">
                                <label>Cluster (City):</label>
                                <select 
                                    name="clusterName" 
                                    value={formData.clusterName} 
                                    onChange={handleChange} 
                                    required
                                >
                                    <option value="">Select Cluster</option>
                                    {clusters.map((clusterName, index) => (
                                        <option key={index} value={clusterName}>
                                            {clusterName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="property-form-group">
                                <label>Category:</label>
                                <select name="categoryName" value={formData.categoryName} onChange={handleChange} required>
                                    <option value="">Select Category</option>
                                    {categories.map((category) => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="property-form-group">
                                <label>Location:</label>
                                <input
                                    type="text"
                                    name="nearbyLocation"
                                    value={formData.nearbyLocation}
                                    onChange={handleChange}
                                    placeholder="e.g. No.123, Lorong 1, Jalan ABC, Kuching"
                                    required
                                    ref={locationInputRef}
                                />
                            </div>
                            <div className="property-form-group full-width">
                                <label>Property Description:</label>
                                <textarea
                                    name="propertyDescription"
                                    value={formData.propertyDescription}
                                    onChange={handleChange}
                                    placeholder="e.g. This Property Has Good View"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="property-form-section full-width">
                        <h3>Property Setup (Rooms)</h3>
                        <p style={{marginBottom: '15px', color: '#666', fontSize: '14px'}}>
                            Add all available rooms/units here. The system will automatically calculate your Starting Price based on the cheapest room you add!
                        </p>
                        
                        {rooms.map((room, index) => (
                            <div key={room.id} className="room-setup-card" style={{border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginBottom: '15px', backgroundColor: '#fafafa'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                                    <h4 style={{margin: 0}}>Room Type {index + 1}</h4>
                                    {rooms.length > 1 && (
                                        <button type="button" onClick={() => removeRoom(room.id)} style={{background: '#ff4d4f', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'}}>Remove</button>
                                    )}
                                </div>
                                <div className="property-form-details-grid">
                                    <div className="property-form-group">
                                        <label>Room Name:</label>
                                        <input type="text" value={room.name} onChange={(e) => handleRoomChange(room.id, 'name', e.target.value)} placeholder="e.g. Deluxe Ocean View" required />
                                    </div>
                                    <div className="property-form-group">
                                        <label>Max Guests:</label>
                                        <input type="number" min="1" value={room.maxGuests} onChange={(e) => handleRoomChange(room.id, 'maxGuests', e.target.value)} placeholder="e.g. 2" required />
                                    </div>
                                    <div className="property-form-group">
                                        <label>Bed Configuration:</label>
                                        <input type="text" value={room.bedType} onChange={(e) => handleRoomChange(room.id, 'bedType', e.target.value)} placeholder="e.g. 1 King Bed" required />
                                    </div>
                                    <div className="property-form-group">
                                        <label>Base Price per night (MYR):</label>
                                        <input type="number" min="1" value={room.price} onChange={(e) => handleRoomChange(room.id, 'price', e.target.value)} placeholder="e.g. 150" required />
                                    </div>
                                    <div className="property-form-group full-width">
                                        <label>Room Description:</label>
                                        <textarea value={room.description} onChange={(e) => handleRoomChange(room.id, 'description', e.target.value)} placeholder="Specific details about this room" rows="2" required />
                                    </div>

                                    <div className="property-form-group full-width" style={{ backgroundColor: '#f8fbff', padding: '20px', borderRadius: '8px', border: '1px dashed #007bff' }}>
                                        <label style={{ color: '#007bff', fontWeight: 'bold', fontSize: '16px', marginBottom: '8px', display: 'block' }}>Available Room Options / Variations (Optional):</label>
                                        <p style={{fontSize: '13px', color: '#666', marginBottom: '15px'}}>Add variations for this room (e.g., "Standard (No Window)", "City View"). If left empty, only the base room price will be shown to the customer.</p>
                                        
                                        {room.options && room.options.map((opt, optIdx) => (
                                            <div key={opt.id} style={{ display: 'flex', gap: '15px', marginBottom: '15px', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 2 }}>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Option Name (e.g. With Window & City View)" 
                                                        value={opt.name} 
                                                        onChange={(e) => handleRoomOptionChange(room.id, opt.id, 'name', e.target.value)} 
                                                        style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px' }} 
                                                        required 
                                                    />
                                                </div>
                                                <div style={{ flex: 1, position: 'relative' }}>
                                                    <input 
                                                        type="number" 
                                                        placeholder="Price (MYR)" 
                                                        min={room.price || 1} 
                                                        value={opt.price} 
                                                        onChange={(e) => handleRoomOptionChange(room.id, opt.id, 'price', e.target.value)} 
                                                        style={{ width: '100%', padding: '12px', border: '1px solid #73d13d', borderRadius: '6px', outlineColor: '#52c41a' }} 
                                                        required 
                                                    />
                                                    {opt.price && parseFloat(opt.price) < parseFloat(room.price || 0) && (
                                                        <span style={{color: '#ff4d4f', fontSize: '12px', position: 'absolute', bottom: '-18px', left: '0'}}>
                                                            Price must be ≥ RM {room.price}
                                                        </span>
                                                    )}
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeRoomOption(room.id, opt.id)} 
                                                    style={{ background: '#ff4d4f', color: 'white', border: 'none', padding: '12px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    X
                                                </button>
                                            </div>
                                        ))}
                                        <button 
                                            type="button" 
                                            onClick={() => addRoomOption(room.id)} 
                                            style={{ background: '#52c41a', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', marginTop: '5px' }}
                                        >
                                            + Add Variation
                                        </button>
                                    </div>
                                    
                                    <div className="property-form-group full-width">
                                        <label>Upload Room Images:</label>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            multiple 
                                            onChange={(e) => handleRoomImageUpload(room.id, e)} 
                                            required={!(room.images && room.images.length > 0)} 
                                        />
                                        <div className="property-form-existing-images-container" style={{marginTop: '10px'}}>
                                            {room.images && room.images.map((image, imgIdx) => (
                                                <div key={imgIdx} className="property-form-image-item">
                                                    <div className="property-form-image-label" style={getLabelStyle(imgIdx)}>
                                                        {getImageLabel(imgIdx)}
                                                    </div>
                                                    {image instanceof File ? (
                                                        <img src={URL.createObjectURL(image)} alt="Room" />
                                                    ) : (
                                                        <img src={`data:image/jpeg;base64,${image}`} alt="Room" />
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="property-form-remove-image-btn"
                                                        onClick={() => removeRoomImage(room.id, imgIdx)}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        <button type="button" onClick={addRoom} style={{background: '#1890ff', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>
                            + Add Another Room Type
                        </button>
                    </div>
                    
                    <div className="property-form-section full-width">
                        <h3>Dynamic Pricing</h3>
                        <div className="property-form-pricing-grid">
                            <div className="property-form-group">
                                <label>Weekend Rate Multiplier:</label>
                                <input
                                    type="number"
                                    name="weekendRate"
                                    value={formData.weekendRate}
                                    onChange={handleChange}
                                    min="1"
                                    max="2"
                                    step="0.1"
                                />
                                <small className="property-form-help-text">
                                    Rate for bookings made in weekends.
                                </small>
                                <div className="property-form-rate-preview">
                                    Weekend starting price: MYR {(parseFloat(formData.propertyPrice || 0) * parseFloat(formData.weekendRate)).toFixed(2)}
                                </div>
                            </div>
                            
                            <div className="property-form-group">
                                <div className="property-form-label-with-toggle">
                                    <label>Special Event Rate:</label>
                                    <div className="property-form-special-event-toggle">
                                        <label className="property-form-switch">
                                            <input
                                                type="checkbox"
                                                checked={isSpecialEventEnabled}
                                                onChange={toggleSpecialEvent}
                                            />
                                            <span className="property-form-slider"></span>
                                        </label>
                                        <span className="property-form-toggle-label">
                                            {isSpecialEventEnabled ? "Enabled" : "Disabled"}
                                        </span>
                                    </div>
                                </div>
                                <input
                                    type="number"
                                    name="specialEventRate"
                                    value={formData.specialEventRate}
                                    onChange={handleChange}
                                    min="1"
                                    max="2"
                                    step="0.01"
                                />
                                <small className="property-form-help-text">Rate for special events during selected period.</small>
                                <div className="property-form-rate-preview">
                                    Special Event starting price: MYR {(parseFloat(formData.propertyPrice || 0) * parseFloat(formData.specialEventRate)).toFixed(2)}
                                </div>
                            </div>

                            {isSpecialEventEnabled && (
                                <>
                                    <div className="property-form-group">
                                        <label>Special Event Date Range:</label>
                                        <div className="date-input-group">
                                            <label>Start Date:</label>
                                            <input
                                                type="date"
                                                name="specialEventStartDate"
                                                value={formData.specialEventStartDate}
                                                onChange={handleChange}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="date-input"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="property-form-group">
                                        <label>Special Event Date Range:</label>
                                        <div className="date-input-group">
                                            <label>End Date:</label>
                                            <input
                                                type="date"
                                                name="specialEventEndDate"
                                                value={formData.specialEventEndDate}
                                                onChange={handleChange}
                                                min={formData.specialEventStartDate || new Date().toISOString().split('T')[0]}
                                                className="date-input"
                                                required
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                            
                            <div className="property-form-group">
                                <label>Early Bird Discount Rate:</label>
                                <input
                                    type="number"
                                    name="earlyBirdDiscountRate"
                                    value={formData.earlyBirdDiscountRate}
                                    onChange={handleChange}
                                    min="0.1"
                                    max="1"
                                    step="0.01"
                                />
                                <small className="property-form-help-text">
                                    Discount rate for bookings made more than 30 days in advance. 
                                </small>
                                <div className="property-form-rate-preview">
                                    Early Bird starting price: MYR {(parseFloat(formData.propertyPrice || 0) * parseFloat(formData.earlyBirdDiscountRate)).toFixed(2)}
                                </div>
                            </div>
                            
                            <div className="property-form-group">
                                <label>Last Minute Discount Rate:</label>
                                <input
                                    type="number"
                                    name="lastMinuteDiscountRate"
                                    value={formData.lastMinuteDiscountRate}
                                    onChange={handleChange}
                                    min="0.1"
                                    max="1"
                                    step="0.01"
                                />
                                <small className="property-form-help-text">
                                    Discount rate for bookings made 7 days or less before check-in. 
                                </small>
                                <div className="property-form-rate-preview">
                                    Last Minute Discount starting price: MYR {(parseFloat(formData.propertyPrice || 0) * parseFloat(formData.lastMinuteDiscountRate)).toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="property-form-section full-width">
                        <h3>Facilities</h3>
                        <div className="property-form-filter-section">
                            <div className="property-form-essentials-section">
                                <h5>Essentials</h5>
                                <div className="property-form-amenities-grid">
                                    {predefinedFacilities
                                        .filter(facility => facility.category === "essentials")
                                        .map((facility) => (
                                            <div
                                                key={facility.name}
                                                className={`property-form-amenity-item ${selectedFacilities.includes(facility.name) ? 'selected' : ''}`}
                                                onClick={() => toggleFacility(facility.name)}
                                            >
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
                                            {predefinedFacilities
                                                .filter(facility => facility.category === "features")
                                                .map((facility) => (
                                                    <div
                                                        key={facility.name}
                                                        className={`property-form-amenity-item ${selectedFacilities.includes(facility.name) ? 'selected' : ''}`}
                                                        onClick={() => toggleFacility(facility.name)}
                                                    >
                                                        <span className="property-form-amenity-icon">{facility.icon}</span>
                                                        <span className="property-form-amenity-text">{facility.name}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    <div className="property-form-location-section">
                                        <h5>Location</h5>
                                        <div className="property-form-amenities-grid">
                                            {predefinedFacilities
                                                .filter(facility => facility.category === "location")
                                                .map((facility) => (
                                                    <div
                                                        key={facility.name}
                                                        className={`property-form-amenity-item ${selectedFacilities.includes(facility.name) ? 'selected' : ''}`}
                                                        onClick={() => toggleFacility(facility.name)}
                                                    >
                                                        <span className="property-form-amenity-icon">{facility.icon}</span>
                                                        <span className="property-form-amenity-text">{facility.name}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    <div className="property-form-safety-section">
                                        <h5>Safety</h5>
                                        <div className="property-form-amenities-grid">
                                            {predefinedFacilities
                                                .filter(facility => facility.category === "safety")
                                                .map((facility) => (
                                                    <div
                                                        key={facility.name}
                                                        className={`property-form-amenity-item ${selectedFacilities.includes(facility.name) ? 'selected' : ''}`}
                                                        onClick={() => toggleFacility(facility.name)}
                                                    >
                                                        <span className="property-form-amenity-icon">{facility.icon}</span>
                                                        <span className="property-form-amenity-text">{facility.name}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    <div className="property-form-booking-section">
                                        <h5>Booking Options</h5>
                                        <div className="property-form-amenities-grid">
                                            {predefinedFacilities
                                                .filter(facility => facility.category === "booking")
                                                .map((facility) => (
                                                    <div
                                                        key={facility.name}
                                                        className={`property-form-amenity-item ${selectedFacilities.includes(facility.name) ? 'selected' : ''}`}
                                                        onClick={() => toggleFacility(facility.name)}
                                                    >
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
                    
                    <div className="property-form-section full-width">
                        <h3>Main Property Images</h3>
                        <div className="property-form-group">
                            <label>Upload Images:</label>
                            <input
                                type="file"
                                name="propertyImage"
                                accept="image/*"
                                onChange={handleFileChange}
                                ref={fileInputRef}
                                multiple
                            />
                            {formData.propertyImage.length < 4 && (
                                <div className="property-form-validation-warning">
                                    Minimum 4 images required ({formData.propertyImage.length}/4 uploaded)
                                </div>
                            )}
                            {formData.propertyImage.length > 0 && (
                                <div className="property-form-info-text">
                                    {imageInfoText}
                                </div>
                            )}
                        </div>
                        <div className="property-form-existing-images-container">
                            {formData.propertyImage.map((image, index) => (
                                <div key={index} className="property-form-image-item">
                                    <div className="property-form-image-label" style={getLabelStyle(index)}>
                                        {getImageLabel(index)}
                                    </div>
                                    {image instanceof File ? (
                                        <img src={URL.createObjectURL(image)} alt="Property" />
                                    ) : (
                                        <img src={`data:image/jpeg;base64,${image}`} alt="Property" />
                                    )}
                                    <button
                                        type="button"
                                        className="property-form-remove-image-btn"
                                        onClick={() => handleRemoveImage(index)}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="property-form-button-group">
                        <button type="button" onClick={handleReset} className="property-form-reset-button" disabled={isSubmitting}>
                            Reset
                        </button>
                        
                        {/* CHANGED: Dynamic button text to prevent freeze perception */}
                        <button type="submit" className="property-form-submit-button" disabled={isSubmitting}>
                            {isSubmitting ? "Processing... Please wait" : (initialData ? "Update Property" : "Create Property")}
                        </button>
                    </div>
                </form>
                {showToast && <Toast type={toastType} message={toastMessage} />}
            </div>
        </div>
    );
};

export default PropertyForm;