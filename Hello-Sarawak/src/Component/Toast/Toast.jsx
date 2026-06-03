import React, { useState } from 'react';
import './Toast.css';

import { TiTick } from "react-icons/ti";
import { IoWarning, IoCloseCircleOutline } from "react-icons/io5";
import { IoClose } from "react-icons/io5";

const toastDetails = {
  success: {
    icon: <TiTick />,
    label: 'Success',
  },
  error: {
    icon: <IoClose />,
    label: 'Error',
  },
  warning: {
    icon: <IoWarning />,
    label: 'Warning',
  },
};

const Toast = ({ type, message }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  if (!type) return null;

  const { icon, label } = toastDetails[type] || {};

  const closeToast = () => {
    setIsClosing(true);
    setTimeout(() => setIsVisible(false), 300);
  };

  return (
    isVisible && (
      <div className="toast-wrapper">
        <li className={`toast ${type} ${isClosing ? 'hide' : ''}`}>

          {/* Icon */}
          <div className="toast-icon-wrap">
            {icon}
          </div>

          {/* Text */}
          <div className="toast-body">
            <span className="toast-title">{label}</span>
            <span className="toast-message">{message}</span>
          </div>

          {/* Close */}
          <IoCloseCircleOutline
            className="close_toast_button"
            onClick={closeToast}
          />

        </li>
      </div>
    )
  );
};

export default Toast;