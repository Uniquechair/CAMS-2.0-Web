import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { FaBars, FaTimes, FaUserCircle, FaBell } from "react-icons/fa";
import { logoutUser, fetchUserData, fetchNotifications, syncBookingAlertNotifications } from '../../../Api/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DefaultAvatar from '../../../src/public/avatar.png';
import eventBus from '../EventBus/Eventbus';
import { useAuth } from '../AuthContext/AuthContext';
import ImageSlider from '../ImageSlider/ImageSlider';
import Toast from '../Toast/Toast';
import './navbar.css';

function Navbar() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const location = useLocation();
    const { isLoggedIn, userAvatar, userID, logout, updateAvatar } = useAuth();
    const [isScrolled, setIsScrolled] = useState(false);

    // Pages that get the transparent-on-top navbar
    const transparentPages = ['/', '/home', '/about_us', '/about_sarawak'];
    const isTransparentPage = transparentPages.includes(location.pathname);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [navbarNotifications, setNavbarNotifications] = useState([]);

    // Notification states
    const [showNotifications, setShowNotifications] = useState(false);

    // Toast states
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('');
    const [showToast, setShowToast] = useState(false);

    // Ref for the notification container to detect outside clicks
    const notificationRef = React.useRef(null);

    // React Query for user data with polling
    const { data: userData, isLoading: isUserLoading } = useQuery({
        queryKey: ['userData', userID],
        queryFn: () => fetchUserData(userID),
        enabled: !!isLoggedIn && !!userID,
        staleTime: 0, // Don't cache the data
        refetchInterval: 5000, // Check every 5 seconds
        refetchIntervalInBackground: true, // Continue checking even when tab is not active
    });

    // Derived state
    const isCustomer = userData?.usergroup === "Customer";

    // Notification functions
    const toggleNotifications = () => {
        setShowNotifications(!showNotifications);
    };

    const closeNotifications = () => {
        setShowNotifications(false);
    };

    // Function to display toast messages
    const displayToast = (type, message) => {
        setToastType(type);
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000); // Hide toast after 5 seconds
    };

    useEffect(() => {
        const logoutToast = sessionStorage.getItem('logoutToast');

        if (logoutToast === 'true') {
            sessionStorage.removeItem('logoutToast');

            setTimeout(() => {
            displayToast('success', 'Logout successful');
            }, 300);
        }
    }, [location.pathname]);


    // Effect to close notifications when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                closeNotifications();
            }
        };

        if (showNotifications) {
            // Attach the event listener
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            // Remove the event listener if the dropdown is already closed
            document.removeEventListener('mousedown', handleClickOutside);
        }

        // Cleanup function to remove the event listener
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showNotifications]); // Re-run the effect when showNotifications changes

    useEffect(() => {
        const loadNavbarNotifications = async () => {
            try {
                if (!userID) return;

                await syncBookingAlertNotifications(userID);
                const data = await fetchNotifications(userID);

                setNavbarNotifications(data || []);
            } catch (err) {
                console.error('Failed to load navbar notifications:', err);
                setNavbarNotifications([]);
            }
        };

        if (isLoggedIn && userID && isCustomer) {
            loadNavbarNotifications();

            const interval = setInterval(loadNavbarNotifications, 600000);

            return () => clearInterval(interval);
        }
    }, [userID, isLoggedIn, isCustomer]);

    const unreadNotifications = navbarNotifications.filter((n) => !n.isread);
    const latestNotifications = navbarNotifications.slice(0, 5);

    // Check for inactive user and handle logout
    useEffect(() => {
        const checkInactiveStatus = async () => {
            if (userData?.uactivation === "Inactive" && isLoggedIn) {
                try {
                    await handleLogout();
                } catch (error) {
                }
            }
        };

        checkInactiveStatus();
    }, [userData?.uactivation, isLoggedIn]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const offcanvasElement = document.getElementById('offcanvasNavbar');

        if (!offcanvasElement) return;

        const handleShow = () => {
            // Storing Scroll Position
            const currentPosition = window.pageYOffset;
            setScrollPosition(currentPosition);

            // Add No Scroll
            document.body.classList.add('no-scroll');

            document.body.style.top = `-${currentPosition}px`;
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        };

        //Remove No Scroll When Close The Menu
        const handleHide = () => {
            const savedPosition = scrollPosition;

            document.body.classList.remove('no-scroll');
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';

            window.scrollTo(0, savedPosition);
        };

        offcanvasElement.addEventListener('show.bs.offcanvas', handleShow);
        offcanvasElement.addEventListener('hide.bs.offcanvas', handleHide);

        return () => {
            offcanvasElement.removeEventListener('show.bs.offcanvas', handleShow);
            offcanvasElement.removeEventListener('hide.bs.offcanvas', handleHide);
        };
    }, [scrollPosition]);

    useEffect(() => {
        const initOffcanvas = () => {
            if (typeof bootstrap !== 'undefined') {
                const offcanvasElement = document.getElementById('offcanvasNavbar');
                if (offcanvasElement) {
                    const bsOffcanvas = new bootstrap.Offcanvas(offcanvasElement, {
                        backdrop: true,
                        scroll: false
                    });
                }
            }
        };

        const bootstrapReady = setInterval(() => {
            if (typeof bootstrap !== 'undefined') {
                initOffcanvas();
                clearInterval(bootstrapReady);
            }
        }, 100);

        return () => clearInterval(bootstrapReady);
    }, []);

useEffect(() => {
    const handleAvatarUpdate = (newAvatar) => {
        const cleanAvatar = newAvatar ? String(newAvatar).trim() : '';

        updateAvatar(cleanAvatar);

        if (cleanAvatar) {
            localStorage.setItem('uimage', cleanAvatar);
        } else {
            localStorage.removeItem('uimage');
        }

        queryClient.invalidateQueries({ queryKey: ['userData', userID] });
    };

    const handleWindowAvatarUpdate = (event) => {
        handleAvatarUpdate(event.detail);
    };

    eventBus.on('avatarUpdated', handleAvatarUpdate);
    window.addEventListener('avatarUpdated', handleWindowAvatarUpdate);

    return () => {
        eventBus.off('avatarUpdated', handleAvatarUpdate);
        window.removeEventListener('avatarUpdated', handleWindowAvatarUpdate);
    };
}, [updateAvatar, userID, queryClient]);

   useEffect(() => {
    const getSafeImageSrc = (img) => {
        if (!img) return '';

        const clean = String(img).trim();

        if (clean.startsWith('http://') || clean.startsWith('https://')) {
            return clean;
        }

        if (clean.startsWith('data:image')) {
            return clean;
        }

        return `data:image/jpeg;base64,${clean}`;
    };
if (userData?.uimage && String(userData.uimage).length > 10) {
    const avatarUrl = getSafeImageSrc(userData.uimage);
    updateAvatar(avatarUrl);
    localStorage.setItem('uimage', avatarUrl);
} else {
    localStorage.removeItem('uimage');
    updateAvatar('');
}
}, [userData, updateAvatar]);

const clearLoginStorage = () => {
  localStorage.removeItem('userId');
  localStorage.removeItem('userid');
  localStorage.removeItem('username');
  localStorage.removeItem('usergroup');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('uactivation');
  localStorage.removeItem('uimage');
  localStorage.removeItem('plainPassword');
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('googleAccessToken');

  sessionStorage.removeItem('activeSession');
};


useEffect(() => {
  const hasSavedLogin = localStorage.getItem('isLoggedIn') === 'true';
  const hasActiveSession = sessionStorage.getItem('activeSession') === 'true';

  if (hasSavedLogin && !hasActiveSession) {
    clearLoginStorage();
    logout();

    const publicPages = ['/', '/login', '/register', '/about_us', '/about_sarawak', '/customer-faq'];

    if (!publicPages.includes(location.pathname)) {
      navigate('/login', { replace: true });
    }
  }
}, []);

const handleLogout = async () => {
  try {
    const googleToken = localStorage.getItem('googleAccessToken');

    if (googleToken) {
      fetch(`https://accounts.google.com/o/oauth2/revoke?token=${googleToken}`, {
        method: 'POST'
      }).catch((error) => {
        console.warn('Google token revoke failed:', error);
      });
    }

    if (userID) {
      await logoutUser(userID);
    }
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    sessionStorage.setItem('logoutToast', 'true');

    clearLoginStorage();
    logout();

    navigate('/', { replace: true });
  }
};

   const handleImageError = (e) => {
    e.currentTarget.src = DefaultAvatar;
};

    const closeOffcanvas = () => {
        if (typeof bootstrap !== 'undefined') {
            const offcanvasElement = document.getElementById('offcanvasNavbar');
            if (offcanvasElement) {
                const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement);
                if (bsOffcanvas) bsOffcanvas.hide();
            }
        }
    };

    // Check if the current path matches the nav link
    const isActive = (path) => {
        return location.pathname === path;
    };


    return (
        <div>
            <Helmet>
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/npm/bootstrap/dist/css/bootstrap.min.css"
                />
                <script
                    src="https://cdn.jsdelivr.net/npm/bootstrap/dist/js/bootstrap.bundle.min.js"
                    defer
                />
            </Helmet>

            <div className="container_navbar">
                <nav className={`navbar navbar-expand-lg${isTransparentPage && !isScrolled ? ' navbar-transparent' : ''}${isTransparentPage && isScrolled ? ' navbar-scrolled-solid' : ''}`}>
                    <Link to="/" className="navbar-brand-link">
                        <h1 className="navbar_brand">Hello Sarawak</h1>
                    </Link>

                    <div className="offcanvas offcanvas-end" tabIndex="-1" id="offcanvasNavbar" aria-labelledby="offcanvasNavbarLabel">
                        <div className="offcanvas-header">
                            <h2 className="offcanvas-title" id="offcanvasNavbarLabel">Hello Sarawak</h2>
                            <button type="button" className="close-btn" data-bs-dismiss="offcanvas" aria-label="Close">
                                <FaTimes className="icon_close" />
                            </button>
                        </div>
                        <div className="offcanvas-body">
                            <ul className="navbar-nav">
                                <li className="nav-item">
                                    <Link
                                        className={`nav-link ${isActive(isLoggedIn ? '/home' : '/') ? 'active' : ''}`}
                                        to={isLoggedIn ? '/home' : '/'}
                                        onClick={closeOffcanvas}
                                    >
                                        Home
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link
                                        className={`nav-link ${isActive('/product') ? 'active' : ''}`}
                                        to="/product"
                                        onClick={closeOffcanvas}
                                    >
                                        Stay
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link
                                        className={`nav-link ${isActive('/Cart') ? 'active' : ''}`}
                                        to="/Cart"
                                        onClick={closeOffcanvas}
                                    >
                                        Cart
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link
                                        className={`nav-link ${isActive('/about_us') ? 'active' : ''}`}
                                        to="/about_us"
                                        onClick={closeOffcanvas}
                                    >
                                        About Us
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link
                                        className={`nav-link ${isActive('/about_sarawak') ? 'active' : ''}`}
                                        to="/about_sarawak"
                                        onClick={closeOffcanvas}
                                    >
                                        About Sarawak
                                    </Link>
                                </li>

                                <li className="nav-item">
                                <Link
                                    className={`nav-link ${isActive('/customer-faq') ? 'active' : ''}`}
                                    to="/customer-faq"
                                    onClick={closeOffcanvas}
                                >
                                    FAQ
                                </Link>
                            </li>

                                {/* Mobile login/profile/logout options */}
                                {isLoggedIn && isCustomer ? (
                                    <>
                                        <li className="nav-item mobile-auth-item">
                                            <Link
                                                className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
                                                to="/profile"
                                                onClick={closeOffcanvas}
                                            >
                                                My Profile
                                            </Link>
                                        </li>
                                        <li className="nav-item mobile-auth-item">
                                            <span
                                                className="nav-link mobile-auth-link"
                                                onClick={() => {
                                                    closeOffcanvas();
                                                    handleLogout();
                                                }}
                                            >
                                                Logout
                                            </span>
                                        </li>
                                    </>
                                ) : (
                                    <li className="nav-item mobile-auth-item">
                                        <Link
                                            className={`nav-link ${isActive('/login') ? 'active' : ''}`}
                                            to="/login"
                                            onClick={closeOffcanvas}
                                        >
                                            Login
                                        </Link>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>

                    <div className="nav-actions">
                        {isLoggedIn && isCustomer && !isUserLoading ? (
                            <>
                                {/* Notification Bell Icon */}
                                <div className="nav-notification-container">
                                    <FaBell className='nav-notification_icon' onClick={toggleNotifications} />
                                    {/* Notification count badge */}
                                    {unreadNotifications.length > 0 && (
                                        <span className="notification-count-badge">
                                            {unreadNotifications.length > 99 ? '99+' : unreadNotifications.length}
                                        </span>
                                    )}

                                    {showNotifications && (
                                        <div className="nav-notification-overlay" ref={notificationRef}>
                                            <div className="nav-notification-content">
                                                <div className="nav-notification-header">
                                                    <h3>Notifications</h3>
                                                    <button className="Notify-close-btn" onClick={closeNotifications}>×</button>
                                                </div>

                                                <div className="nav-notification-list">
                                                    {latestNotifications.length === 0 ? (
                                                        <div className="nav-notification-item">
                                                            <div className="nav-notification-text">
                                                                <p>No new notifications</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        latestNotifications.map((item) => (
                                                            <div
                                                                className={`nav-notification-item ${!item.isread ? 'unread' : ''}`}
                                                                key={item.notificationid}
                                                                onClick={() => {
                                                                    closeNotifications();
                                                                    navigate('/notifications');
                                                                }}
                                                            >
                                                                <div className="nav-notification-dot"></div>
                                                                <div className="nav-notification-text">
                                                                    <p>{item.notificationtitle}</p>
                                                                    <span className="nav-notification-time">
                                                                        {item.notificationmessage}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                                <div className="nav-notification-footer">
                                                    <button 
                                                        className="nav-view-all-btn"
                                                        onClick={() => {
                                                            closeNotifications(); // Close the dropdown menu
                                                            navigate('/notifications'); 
                                                        }}
                                                    >
                                                        View All
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* User Avatar */}
                                <button
                                    className="user-icon-button"
                                    onClick={() => navigate('/profile')}
                                    aria-label="User Profile"
                                >
                                    {userAvatar ? (
                                        <img
                                            src={userAvatar}
                                            alt="User Avatar"
                                            onError={handleImageError}
                                            key={userAvatar}
                                        />
                                    ) : (
                                        <FaUserCircle className="default-avatar" />
                                    )}
                                </button>
                            </>
                        ) : null}

                        {isLoggedIn && isCustomer ? (
                            <button onClick={handleLogout} className="auth-button logout-button">
                                Logout
                            </button>
                        ) : (
                            <Link to="/login" className="auth-button login-button">
                                Login
                            </Link>
                        )}

                        <button
                            className="navbar-toggler"
                            type="button"
                            data-bs-toggle="offcanvas"
                            data-bs-target="#offcanvasNavbar"
                            aria-controls="offcanvasNavbar"
                            aria-label="Toggle navigation"
                        >
                            <FaBars className="icon_navbar" />
                        </button>
                    </div>
                </nav>
            </div>

            {/* Render Toast component */}
            {showToast && <Toast type={toastType} message={toastMessage} />}
        </div>
    );
}

export default Navbar;