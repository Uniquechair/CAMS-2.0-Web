import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    fetchUserData,
    fetchGoogleUserData,
    uploadAvatar,
    updateProfile
} from '../../../Api/api';
import Toast from '../Toast/Toast';
import {
    FaUser, FaLock, FaStar, FaRegStar, FaEye, FaEyeSlash,
    FaTrash, FaCheckCircle, FaTimesCircle, FaCamera, FaPalette
} from 'react-icons/fa';
import MFASetupModal from '../MFASetupModal/MFASetupModal';
import Loader from '../../Component/Loader/Loader';
import { CountryDropdown } from 'react-country-region-selector';
import eventBus from '../EventBus/Eventbus';
import Back_To_Top_Button from '../../Component/Back_To_Top_Button/Back_To_Top_Button';
import './FrontUserProfile.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.reviews)) return data.reviews;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.rows)) return data.rows;
    return [];
};

const THEMES = [
    {
        id: 'earthy',
        name: 'Earthy Gold (Smooth)',
        bg: 'linear-gradient(135deg, var(--accent-warm) 0%, var(--accent-gold) 100%)'
    },
    {
        id: 'woven',
        name: 'Rattan Weave',
        bg: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h10v10H0zm10 10h10v10H10z\' fill=\'%23ffffff\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E"), linear-gradient(135deg, #C0664A 0%, #D4A574 100%)'
    },
    {
        id: 'batik',
        name: 'Midnight Batik',
        bg: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.08\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E"), linear-gradient(135deg, #1A130B 0%, #4A3E32 100%)'
    },
    {
        id: 'river',
        name: 'River Currents',
        bg: 'url("data:image/svg+xml,%3Csvg width=\'12\' height=\'16\' viewBox=\'0 0 12 16\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M4 .99C4 .445 4.444 0 5 0c.552 0 1 .45 1 .99v4.02C6 5.555 5.556 6 5 6c-.552 0-1-.45-1-.99V.99zm6 8c0-.546.444-.99 1-.99.552 0 1 .45 1 .99v4.02c0 .546-.444.99-1 .99-.552 0-1-.45-1-.99v-4.02zM0 8c0-.546.444-.99 1-.99.552 0 1 .45 1 .99v4.02C2 12.555 1.556 13 1 13c-.552 0-1-.45-1-.99V8zm4 4c0-.546.444-.99 1-.99.552 0 1 .45 1 .99v4.02c0 .546-.444.99-1 .99-.552 0-1-.45-1-.99v-4.02z\' fill=\'%23ffffff\' fill-opacity=\'0.08\' fill-rule=\'evenodd\'/%3E%3C/svg%3E"), linear-gradient(135deg, #2C3E50 0%, #4CA1AF 100%)'
    },
    {
        id: 'rainforest',
        name: 'Rainforest Canopy',
        bg: 'url("data:image/svg+xml,%3Csvg width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M12 0l12 12-12 12L0 12z\' fill=\'%23ffffff\' fill-opacity=\'0.06\' fill-rule=\'evenodd\'/%3E%3C/svg%3E"), linear-gradient(135deg, #2D4A22 0%, #6B8E23 100%)'
    }
];

/* ── PASSWORD STRENGTH HELPERS ── */
const getPasswordStrength = (pw) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
};

const strengthMeta = [
    { label: '',            hint: '' },
    { label: 'Weak',        hint: 'Add uppercase letters, numbers or symbols' },
    { label: 'Fair',        hint: 'Getting better — try adding more variety' },
    { label: 'Strong',      hint: 'Great! One more type for maximum strength' },
    { label: 'Very strong', hint: 'Excellent password!' },
];

const FrontUserProfile = () => {
    const navigate = useNavigate();

    const userid    = localStorage.getItem('userid')    || localStorage.getItem('userId');
    const usergroup = localStorage.getItem('usergroup') || localStorage.getItem('userGroup');
    const username  = localStorage.getItem('username');
    const googleAccessToken = localStorage.getItem('googleAccessToken');

    const [userData, setUserData]           = useState({});
    const [originalUserData, setOriginalUserData] = useState({});
    const [previewAvatar, setPreviewAvatar] = useState('');
    const [savedAvatar, setSavedAvatar]     = useState('');
    const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
    const [avatarKey, setAvatarKey]         = useState(0);
    const [activeTab, setActiveTab]         = useState('personal');
    const [loading, setLoading]             = useState(false);

    const [showMFAModal, setShowMFAModal]           = useState(false);
    const [password, setPassword]                   = useState('');
    const [confirmPassword, setConfirmPassword]     = useState('');
    const [showPassword, setShowPassword]           = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [myReviews, setMyReviews]             = useState([]);
    const [bookingCount, setBookingCount]       = useState(0);
    const [reviewCount, setReviewCount]         = useState(0);
    const [isLoadingReviews, setIsLoadingReviews]   = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    const [toast, setToast] = useState({ show: false, type: '', message: '', id: 0 });
    const [activeTheme, setActiveTheme] = useState(THEMES[0]);

    const [isSavingPersonal, setIsSavingPersonal]   = useState(false);
    const [personalSaved, setPersonalSaved]         = useState(false);
    const [isSavingUsername, setIsSavingUsername]   = useState(false);
    const [usernameSaved, setUsernameSaved]         = useState(false);
    const [isSavingPassword, setIsSavingPassword]   = useState(false);
    const [passwordSaved, setPasswordSaved]         = useState(false);

    const personalFields = ['ufirstname', 'ulastname', 'uemail', 'uphoneno', 'udob', 'utitle', 'ugender', 'ucountry'];
    const hasPersonalChanges = personalFields.some((field) => userData[field] !== originalUserData[field]);
    const hasAvatarChange    = !!selectedAvatarFile;
    const canSavePersonal    = hasPersonalChanges || hasAvatarChange;
    const hasUsernameChange  = userData.username !== originalUserData.username;

    /* derived password strength */
    const pwStrength = getPasswordStrength(password);

    const displayToast = useCallback((type, message) => {
        const toastId = Date.now();
        setToast({ show: true, type, message, id: toastId });
        setTimeout(() => {
            setToast((cur) => cur.id !== toastId ? cur : { show: false, type: '', message: '', id: 0 });
        }, 5000);
    }, []);

    const getSafeImageSrc = (image) => {
        if (!image) return '';
        const clean = String(image).trim();
        if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
        if (clean.startsWith('data:image')) return clean;
        return `data:image/jpeg;base64,${clean}`;
    };

    const fetchProfileSummary = async () => {
        if (!userid) return { bookingCount: 0, reviewCount: 0 };
        const response = await fetch(`${API_BASE}/profile-summary/${userid}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load profile summary');
        const data = await response.json();
        return { bookingCount: Number(data.bookingCount || 0), reviewCount: Number(data.reviewCount || 0) };
    };

    const fetchMyReviews = async () => {
        if (!userid) return [];
        const response = await fetch(
            `${API_BASE}/user-reviews/${userid}?username=${encodeURIComponent(username || '')}`,
            { credentials: 'include' }
        );
        if (!response.ok) throw new Error('Failed to load reviews');
        const data = await response.json();
        return normalizeArray(data);
    };

    const loadInitialData = useCallback(async () => {
        if (!userid || String(usergroup || '').toLowerCase() !== 'customer') {
            displayToast('error', 'User not logged in');
            return;
        }
        setLoading(true);
        try {
            const [data, summary] = await Promise.all([fetchUserData(userid), fetchProfileSummary()]);
            setUserData(data || {});
            setOriginalUserData(data || {});
            setBookingCount(summary.bookingCount);
            setReviewCount(summary.reviewCount);

            let imageSrc = '';
            if (data?.uimage && data.uimage.length > 10) {
                imageSrc = getSafeImageSrc(data.uimage);
            } else if (googleAccessToken) {
                try {
                    const googleData = await fetchGoogleUserData(googleAccessToken);
                    if (googleData?.picture) imageSrc = googleData.picture;
                } catch { imageSrc = ''; }
            }
            setSavedAvatar(imageSrc);
            setPreviewAvatar(imageSrc);
            if (imageSrc) localStorage.setItem('uimage', imageSrc);
            else localStorage.removeItem('uimage');

            const savedThemeId = localStorage.getItem(`profile_theme_${userid}`);
            if (savedThemeId) {
                const found = THEMES.find((t) => t.id === savedThemeId);
                if (found) setActiveTheme(found);
            }
        } catch (error) {
            console.error(error);
            displayToast('error', 'Error fetching user data');
        } finally {
            setLoading(false);
        }
    }, [userid, usergroup, googleAccessToken, displayToast]);

    useEffect(() => { loadInitialData(); }, [loadInitialData]);

    useEffect(() => {
        const load = async () => {
            if (activeTab !== 'reviews' || !userid || String(usergroup || '').toLowerCase() !== 'customer') return;
            if (Array.isArray(myReviews) && myReviews.length > 0) return;
            setIsLoadingReviews(true);
            try {
                const reviews = await fetchMyReviews();
                setMyReviews(reviews);
                setReviewCount(reviews.length);
            } catch (error) {
                console.error(error);
                displayToast('error', 'Failed to load reviews.');
            } finally {
                setIsLoadingReviews(false);
            }
        };
        load();
    }, [activeTab, userid, usergroup, username, myReviews.length, displayToast]);

    const handleThemeChange = (theme) => {
        setActiveTheme(theme);
        localStorage.setItem(`profile_theme_${userid}`, theme.id);
        displayToast('success', `Theme updated to ${theme.name}`);
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { displayToast('error', 'Please select a valid image file.'); return; }
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const maxW = 300, maxH = 300;
            let w = img.width, h = img.height;
            if (w > maxW || h > maxH) {
                if (w > h) { h = Math.round(h * (maxW / w)); w = maxW; }
                else { w = Math.round(w * (maxH / h)); h = maxH; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            const resized = canvas.toDataURL('image/jpeg', 0.7);
            setSelectedAvatarFile(file);
            setPreviewAvatar(resized);
            setAvatarKey((prev) => prev + 1);
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); displayToast('error', 'Failed to preview this image.'); };
        img.src = objectUrl;
    };

    const handleUpdateProfile = async () => {
        const nameRegex  = /^[A-Za-z\s]+$/;
        const phoneRegex = /^[0-9]+$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        try {
            if (userData.ufirstname && !nameRegex.test(userData.ufirstname.trim()))
                throw new Error('First name should only contain letters and spaces');
            if (userData.ulastname && !nameRegex.test(userData.ulastname.trim()))
                throw new Error('Last name should only contain letters and spaces');
            if (userData.uemail && !emailRegex.test(userData.uemail.trim()))
                throw new Error('Please enter a valid email address');
            if (userData.uphoneno && !phoneRegex.test(String(userData.uphoneno).trim()))
                throw new Error('Phone number should contain only numbers');
            if (userData.udob && isNaN(Date.parse(userData.udob)))
                throw new Error('Please enter a valid date of birth');

            setIsSavingPersonal(true);
            const response = await updateProfile(userData);
            if (!response?.success) throw new Error(response?.message || 'Failed to update profile');

            let updatedData = { ...userData };
            let finalAvatar = savedAvatar;

            if (selectedAvatarFile) {
                const avatarResponse = await uploadAvatar(userid, selectedAvatarFile);
                try { updatedData = await fetchUserData(userid); } catch { updatedData = { ...userData }; }
                if (updatedData?.uimage && String(updatedData.uimage).length > 10)
                    finalAvatar = getSafeImageSrc(updatedData.uimage);
                else if (avatarResponse?.imageUrl) finalAvatar = getSafeImageSrc(avatarResponse.imageUrl);
                else if (avatarResponse?.data?.uimage) finalAvatar = getSafeImageSrc(avatarResponse.data.uimage);
                else if (avatarResponse?.uimage) finalAvatar = getSafeImageSrc(avatarResponse.uimage);
                else finalAvatar = previewAvatar;

                setSavedAvatar(finalAvatar);
                setPreviewAvatar(finalAvatar);
                setSelectedAvatarFile(null);
                setAvatarKey((prev) => prev + 1);
                localStorage.setItem('uimage', finalAvatar);
                eventBus.emit('avatarUpdated', finalAvatar);
                window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: finalAvatar }));
            }

            setUserData(updatedData || {});
            setOriginalUserData(updatedData || {});
            setPersonalSaved(true);
            displayToast('success', 'Changes saved successfully.');
            setTimeout(() => setPersonalSaved(false), 2500);
        } catch (error) {
            console.error('Update profile error:', error);
            displayToast('error', error.message || 'Failed to update profile');
        } finally {
            setIsSavingPersonal(false);
        }
    };

    const handleUpdateUsername = async () => {
        const usernameRegex = /^[a-zA-Z0-9]*$/;
        try {
            if (!userData.username?.trim()) throw new Error('Username cannot be empty');
            if (!usernameRegex.test(userData.username)) throw new Error('Username must only contain letters and numbers');
            setIsSavingUsername(true);
            const response = await updateProfile(userData);
            if (!response.success) throw new Error('Failed to update username');
            setOriginalUserData({ ...userData });
            localStorage.setItem('username', userData.username);
            setUsernameSaved(true);
            displayToast('success', 'Username updated successfully.');
            setTimeout(() => setUsernameSaved(false), 2500);
        } catch (error) {
            displayToast('error', error.message);
        } finally {
            setIsSavingUsername(false);
        }
    };

    const handleUpdatePassword = async () => {
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
        try {
            if (!password) throw new Error('Please enter a new password');
            if (password !== confirmPassword) throw new Error('Passwords do not match');
           if (!passwordRegex.test(password)) {
    throw new Error('Password must be at least 8 characters and include letters and numbers. Symbols are allowed.');
}
            setIsSavingPassword(true);
            const dataToUpdate = { ...userData, password };
            const response = await updateProfile(dataToUpdate);
            if (!response.success) throw new Error('Failed to update password');
            setPassword('');
            setConfirmPassword('');
            setPasswordSaved(true);
            displayToast('success', 'Password updated successfully.');
            setTimeout(() => setPasswordSaved(false), 2500);
        } catch (error) {
            displayToast('error', error.message);
        } finally {
            setIsSavingPassword(false);
        }
    };

    const cancelPersonalChanges = () => {
        setUserData({ ...originalUserData });
        setSelectedAvatarFile(null);
        setPreviewAvatar(savedAvatar);
        setAvatarKey((prev) => prev + 1);
    };

    const getDisplayImageSrc = (images) => {
        if (!images) return null;
        let firstImg = '';
        if (Array.isArray(images)) {
            firstImg = images[0];
        } else if (typeof images === 'string') {
            const clean = images.trim();
            try {
                const parsed = JSON.parse(clean);
                firstImg = Array.isArray(parsed) ? parsed[0] : clean;
            } catch {
                firstImg = clean.includes(',')
                    ? clean.split(',').map((i) => i.trim()).filter(Boolean)[0]
                    : clean;
            }
        }
        if (!firstImg) return null;
        return getSafeImageSrc(String(firstImg).replace(/['"]/g, '').trim());
    };

    const handlePropertyClick = (e, review) => {
        e.preventDefault();
        const targetPropertyId = review.propertyId;
        if (!targetPropertyId) { displayToast('error', 'This property is no longer available.'); return; }
        navigate(`/product/${targetPropertyId}`, {
            state: { propertyId: targetPropertyId, propertyDetails: review.fullPropertyDetails }
        });
    };

    const handleDeleteReview = async (idToDelete, propertyId) => {
        if (!window.confirm('Are you sure you want to delete your review?')) return;
        setIsSubmittingReview(true);
        try {
            const res = await fetch(
                `${API_BASE}/reviews/${idToDelete}?creatorUsername=${encodeURIComponent(username || '')}`,
                { method: 'DELETE', credentials: 'include' }
            );
            if (!res.ok) throw new Error('Failed to delete review');
            displayToast('success', 'Your review has been deleted.');
            setMyReviews((prev) => prev.filter((r) => r.id !== idToDelete));
            setReviewCount((prev) => Math.max(0, prev - 1));
            if (propertyId) localStorage.setItem(`deleted_review_${propertyId}_${userid}`, 'true');
        } catch (error) {
            console.error(error);
            displayToast('error', 'Failed to delete review.');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    /* ── Password strength bar component (inline) ── */
    const PasswordStrengthBar = () => {
        if (!password) return null;
        const meta = strengthMeta[pwStrength];
        return (
            <div className={`pwd-strength-wrap strength-${pwStrength}`}>
                <div className="pwd-bars">
                    <div className="pwd-bar" />
                    <div className="pwd-bar" />
                    <div className="pwd-bar" />
                    <div className="pwd-bar" />
                </div>
                <div className="pwd-meta-row">
                    <span className="pwd-label">{meta.label}</span>
                    {meta.hint && <span className="pwd-hint">{meta.hint}</span>}
                </div>
            </div>
        );
    };

    return (
        <div className="front-profile-page">
            {toast.show && (
                <Toast key={toast.id} type={toast.type} message={toast.message} />
            )}

            {loading ? (
                <div className="loader-box-b"><Loader /></div>
            ) : (
                <div className="profile-container-b">
                    {/* ── COVER ── */}
                    <div className="profile-cover-b" style={{ background: activeTheme.bg }}>
                        <div className="avatar-overlap-b">
                            {previewAvatar ? (
                                <img
                                    key={avatarKey}
                                    src={previewAvatar}
                                    alt="Profile"
                                    loading="lazy"
                                    decoding="async"
                                    onError={() => {
                                        setPreviewAvatar('');
                                        setSavedAvatar('');
                                        localStorage.removeItem('uimage');
                                    }}
                                />
                            ) : (
                                <div className="avatar-placeholder-b"><FaUser /></div>
                            )}
                            <button
                                className="avatar-edit-badge-b"
                                onClick={() => document.getElementById('av-up')?.click()}
                                title="Change avatar"
                            >
                                <FaCamera />
                            </button>
                            <input id="av-up" type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                        </div>
                    </div>

                    {/* ── HEADER ── */}
                    <div className="profile-header-b">
                        <div className="user-meta-b">
                            <h1>{userData.ufirstname} {userData.ulastname}</h1>
                            <p>{usergroup} · {userData.uemail}</p>
                        </div>
                        <div className="stat-cards-row-b">
                            <div className="stat-card-b"><h3>{bookingCount}</h3><p>Bookings</p></div>
                            <div className="stat-card-b"><h3>{reviewCount}</h3><p>Reviews</p></div>
                            <div className="stat-card-b"><h3>{userData.ucountry || '—'}</h3><p>Country</p></div>
                        </div>
                    </div>

                    {/* ── TABS ── */}
                    <div className="profile-tabs-b">
                        {[
                            { key: 'personal', icon: <FaUser />,  label: 'Personal' },
                            { key: 'security', icon: <FaLock />,  label: 'Security'  },
                            { key: 'reviews',  icon: <FaStar />,  label: 'Reviews'   },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                className={activeTab === tab.key ? 'active' : ''}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ── CONTENT ── */}
                    <div className="tab-content-area-b">
                        <AnimatePresence mode="wait">

                            {/* PERSONAL TAB */}
                            {activeTab === 'personal' && (
                                <motion.div
                                    key="personal"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.25 }}
                                    className="personal-grid-b"
                                >
                                    <div className="theme-selector-box">
                                        <div className="theme-header">
                                            <FaPalette /> <span>Profile Theme</span>
                                        </div>
                                        <div className="theme-options">
                                            {THEMES.map((theme) => (
                                                <button
                                                    key={theme.id}
                                                    className={`theme-btn ${activeTheme.id === theme.id ? 'selected' : ''}`}
                                                    style={{ background: theme.bg }}
                                                    onClick={() => handleThemeChange(theme)}
                                                    title={theme.name}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-grid-b">
                                        <div className="form-group-b">
                                            <label>First Name</label>
                                            <input className="input-global-b" type="text"
                                                value={userData.ufirstname || ''}
                                                onChange={(e) => setUserData({ ...userData, ufirstname: e.target.value })} />
                                        </div>
                                        <div className="form-group-b">
                                            <label>Last Name</label>
                                            <input className="input-global-b" type="text"
                                                value={userData.ulastname || ''}
                                                onChange={(e) => setUserData({ ...userData, ulastname: e.target.value })} />
                                        </div>
                                        <div className="form-group-b">
                                            <label>Email Address</label>
                                            <input className="input-global-b" type="email"
                                                value={userData.uemail || ''}
                                                onChange={(e) => setUserData({ ...userData, uemail: e.target.value })} />
                                        </div>
                                        <div className="form-group-b">
                                            <label>Phone Number</label>
                                            <input className="input-global-b" type="text"
                                                value={userData.uphoneno || ''}
                                                onChange={(e) => setUserData({ ...userData, uphoneno: e.target.value })} />
                                        </div>
                                        <div className="form-group-b">
                                            <label>Date of Birth</label>
                                            <input className="input-global-b" type="date"
                                                value={userData.udob ? String(userData.udob).split('T')[0] : ''}
                                                onChange={(e) => setUserData({ ...userData, udob: e.target.value })} />
                                        </div>
                                        <div className="form-group-b">
                                            <label>Country</label>
                                            <CountryDropdown className="select-global-b"
                                                value={userData.ucountry || ''}
                                                onChange={(val) => setUserData({ ...userData, ucountry: val })} />
                                        </div>
                                        <div className="form-group-b">
                                            <label>Title</label>
                                            <select className="select-global-b"
                                                value={userData.utitle || ''}
                                                onChange={(e) => setUserData({ ...userData, utitle: e.target.value })}>
                                                <option value="">Select Title</option>
                                                <option>Mr.</option>
                                                <option>Mrs.</option>
                                                <option>Ms.</option>
                                                <option>Miss</option>
                                                <option>Madam</option>
                                            </select>
                                        </div>
                                        <div className="form-group-b">
                                            <label>Gender</label>
                                            <select className="select-global-b"
                                                value={userData.ugender || ''}
                                                onChange={(e) => setUserData({ ...userData, ugender: e.target.value })}>
                                                <option value="">Select Gender</option>
                                                <option>Male</option>
                                                <option>Female</option>
                                                <option>Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="save-action-row-b">
                                        <button className="btn-cancel-global-b"
                                            onClick={cancelPersonalChanges}
                                            disabled={!canSavePersonal || isSavingPersonal}>
                                            Discard
                                        </button>
                                        <button className="btn-save-global-b"
                                            onClick={handleUpdateProfile}
                                            disabled={!canSavePersonal || isSavingPersonal}
                                            style={personalSaved ? { background: '#6B7B5E', color: '#fff', opacity: 1 } : {}}>
                                            {isSavingPersonal ? 'Saving...' : personalSaved ? '✓ Saved!' : 'Save Changes'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* SECURITY TAB */}
                            {activeTab === 'security' && (
                                <motion.div
                                    key="security"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.25 }}
                                    className="security-section-b"
                                >
                                    {/* USERNAME */}
                                    <div className="form-group-b" style={{ marginBottom: '20px' }}>
                                        <label>Username</label>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <input className="input-global-b" style={{ margin: 0 }}
                                                value={userData.username || ''}
                                                onChange={(e) => setUserData({ ...userData, username: e.target.value })} />
                                            <button className="btn-save-global-b"
                                                onClick={handleUpdateUsername}
                                                disabled={!hasUsernameChange || isSavingUsername}
                                                style={usernameSaved ? { background: '#6B7B5E', color: '#fff', opacity: 1 } : {}}>
                                                {isSavingUsername ? 'Saving...' : usernameSaved ? '✓ Saved!' : 'Save'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* CHANGE PASSWORD */}
                                    <div className="form-group-b" style={{ marginBottom: '20px' }}>
                                        <label>Change Password</label>

                                        <div className="form-grid-b" style={{ marginTop: '0' }}>
                                            {/* New Password field + strength bar */}
                                            <div>
                                                <div className="pass-input-wrap-b">
                                                    <input
                                                        className="input-global-b"
                                                        style={{ margin: 0 }}
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="New Password"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                    />
                                                    <button className="eye-btn-b" type="button"
                                                        onClick={() => setShowPassword(!showPassword)}>
                                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                                    </button>
                                                </div>

                                                {/* ── PASSWORD STRENGTH INDICATOR ── */}
                                                <PasswordStrengthBar />
                                            </div>

                                            {/* Confirm Password field */}
                                            <div className="pass-input-wrap-b">
                                                <input
                                                    className="input-global-b"
                                                    style={{ margin: 0 }}
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    placeholder="Confirm Password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                />
                                                <button className="eye-btn-b" type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                                </button>

                                                {/* Passwords match indicator */}
                                                {confirmPassword && (
                                                    <div className={`pwd-match-hint ${password === confirmPassword ? 'match' : 'no-match'}`}>
                                                        {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                                            <button className="btn-save-global-b"
                                                onClick={handleUpdatePassword}
                                                disabled={!password || isSavingPassword}
                                                style={passwordSaved ? { background: '#6B7B5E', color: '#fff', opacity: 1 } : {}}>
                                                {isSavingPassword ? 'Saving...' : passwordSaved ? '✓ Saved!' : 'Update Password'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* MFA CARD */}
                                    <div className="sec-card-b">
                                        <div className="sec-info-b">
                                            <h4>Two-Factor Authentication</h4>
                                            <p>Adds a verification step when you log in from a new device or location.</p>
                                        </div>
                                        <div className="sec-action-b">
                                            <span className={`mfa-status-b ${userData.mfa_enabled ? 'enabled' : 'disabled'}`}>
                                                {userData.mfa_enabled
                                                    ? <><FaCheckCircle /> Enabled</>
                                                    : <><FaTimesCircle /> Disabled</>}
                                            </span>
                                            <button className="btn-setup-b" onClick={() => setShowMFAModal(true)}>
                                                {userData.mfa_enabled ? 'Manage' : 'Enable'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* REVIEWS TAB */}
                            {activeTab === 'reviews' && (
                                <motion.div
                                    key="reviews"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.25 }}
                                    className="reviews-section-b"
                                >
                                    {isLoadingReviews ? (
                                        <div className="reviews-loading-b">Loading your reviews...</div>
                                    ) : !Array.isArray(myReviews) || myReviews.length === 0 ? (
                                        <div className="reviews-empty-b">
                                            <FaRegStar size={40} />
                                            <h3>No Reviews Yet</h3>
                                            <p>You haven't reviewed any properties yet. Head over to your Cart to review a past stay!</p>
                                        </div>
                                    ) : (
                                        <div className="reviews-list-b">
                                            {myReviews.map((review) => {
                                                const agodaScore = ((review.rating || 5) * 2).toFixed(1);
                                                const isExceptional = parseFloat(agodaScore) >= 9;
                                                const targetPropertyName =
                                                    review.propertyName || review.propertyname ||
                                                    review.propertyaddress || 'Unknown Property';
                                                const displaySrc = getDisplayImageSrc(review.propertyImage);

                                                return (
                                                    <div key={review.id} className="review-card-b">
                                                        <a href="#" className="rev-img-b"
                                                            onClick={(e) => handlePropertyClick(e, review)}>
                                                            {displaySrc
                                                                ? <img src={displaySrc} alt="Property" loading="lazy" decoding="async" />
                                                                : <div className="rev-img-placeholder-b">No Image</div>}
                                                        </a>

                                                        <div className="rev-body-b">
                                                            <div className="rev-header-b">
                                                                <div>
                                                                    <a href="#" className="rev-property-name-b"
                                                                        onClick={(e) => handlePropertyClick(e, review)}>
                                                                        {targetPropertyName}
                                                                    </a>
                                                                    <p className="rev-date-b">Posted on {review.datePosted}</p>
                                                                </div>
                                                                <div className="rev-score-wrap-b">
                                                                    <span className={`rev-label-b ${isExceptional ? 'exceptional' : 'excellent'}`}>
                                                                        {isExceptional ? 'Exceptional' : 'Excellent'}
                                                                    </span>
                                                                    <div className="agoda-badge-b">{agodaScore}</div>
                                                                </div>
                                                            </div>

                                                            <p className="rev-comment-b">"{review.comment}"</p>

                                                            <div className="rev-footer-b">
                                                                <div className="sub-scores-b">
                                                                    <span>Loc: <b>{review.location_score}</b></span>
                                                                    <span>Clean: <b>{review.cleanliness_score}</b></span>
                                                                    <span>Val: <b>{review.value_score}</b></span>
                                                                    <span>Fac: <b>{review.facilities_score}</b></span>
                                                                    <span>Svc: <b>{review.service_score}</b></span>
                                                                </div>
                                                                <button className="btn-delete-review-b"
                                                                    disabled={isSubmittingReview}
                                                                    onClick={() => handleDeleteReview(review.id, review.propertyId)}>
                                                                    <FaTrash /> Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </div>
            )}

            {showMFAModal && (
                <MFASetupModal
                    userid={userid}
                    onClose={() => setShowMFAModal(false)}
                    onComplete={() => { setShowMFAModal(false); loadInitialData(); }}
                />
            )}

            <Back_To_Top_Button />
        </div>
    );
};

export default FrontUserProfile;