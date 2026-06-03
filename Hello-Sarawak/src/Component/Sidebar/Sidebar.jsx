import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiLogOut, FiMenu } from 'react-icons/fi';
import { logoutUser } from '../../../Api/api';
import Toast from '../../Component/Toast/Toast';
import '../../Component/Sidebar/Sidebar.css';

const Sidebar = ({ title, links, isCollapsed, toggleSidebar }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
const [toastType, setToastType] = useState('');
const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const checkLoginStatus = async () => {
      const userid = localStorage.getItem('userid');
      if (userid) {
        try {
          const response = await fetch(`${API_URL}/checkStatus?userid=${userid}`);
          const data = await response.json();
          if (data.ustatus === 'login') {
            setIsLoggedIn(true);
          } else {
            setIsLoggedIn(false);
          }
        } catch (error) {
          console.error('Error fetching user status:', error);
        }
      } else {
        setIsLoggedIn(false);
      }
    };
    checkLoginStatus();
  }, []);

  const displayToast = (type, message) => {
  setToastType(type);
  setToastMessage(message);
  setShowToast(true);
  setTimeout(() => setShowToast(false), 3000);
};

useEffect(() => {
  const logoutToast = sessionStorage.getItem('logoutToast');

  if (logoutToast === 'true') {
    sessionStorage.removeItem('logoutToast');

    setTimeout(() => {
      displayToast('success', 'Logout successful');
    }, 300);
  }
}, []);

  const clearLoginStorage = () => {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userid');
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  localStorage.removeItem('usergroup');
  localStorage.removeItem('userGroup');
  localStorage.removeItem('uactivation');
  localStorage.removeItem('plainPassword');
  localStorage.removeItem('googleAccessToken');
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
};

const handleLogout = async () => {
  const userid =
    localStorage.getItem('userid') ||
    localStorage.getItem('userId');

  try {
    if (userid) {
      const response = await logoutUser(userid);

      if (response && typeof response.json === 'function') {
        const data = await response.json();

        if (!response.ok && data?.message) {
          console.warn('Backend logout warning:', data.message);
        }
      } else if (response?.success === false) {
        console.warn('Backend logout warning:', response);
      }
    }
  } catch (error) {
    console.error('Error during logout:', error);
  } finally {
  sessionStorage.setItem('logoutToast', 'true');

  clearLoginStorage();
  setIsLoggedIn(false);

  navigate('/login', { replace: true });
}
};

  return (
    <>
      <button className="menu-toggle" onClick={toggleSidebar}>
        <FiMenu />
      </button>
      <div className={`sidebar-wrapper ${isCollapsed ? 'collapsed' : 'expanded'}`}>
        <h2 className="sidebar-title">{title}</h2>
        <nav>
          <ul className="sideMenus">
            {links.map((link) => (
              <NavLink 
                key={link.path} 
                to={link.path} 
                className={({ isActive }) => (isActive ? 'menu-item active' : 'menu-item')}
                onClick={() => {
                  if (window.innerWidth <= 768 && !isCollapsed) {
                    toggleSidebar();
                  }
                }}
              >
                <span className="menu-icon">{link.icon}</span> {link.label}
              </NavLink>
            ))}
          </ul>
        </nav>
        {isLoggedIn && (
          <div className="logout-container">
            <button onClick={handleLogout} className="logout-item">
              <FiLogOut className="logout-icon" /> Logout
            </button>
          </div>
        )}
      </div>

      {showToast && <Toast type={toastType} message={toastMessage} />}
    </>
  );
};
export default Sidebar;
