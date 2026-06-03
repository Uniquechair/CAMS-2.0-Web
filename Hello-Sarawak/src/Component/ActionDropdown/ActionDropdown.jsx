import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import '../../Component/ActionDropdown/ActionDropdown.css';
import { FaEllipsisH } from 'react-icons/fa';

const ActionDropdown = ({ items, onAction, onClose = () => {} }) => {
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const closeDropdown = () => {
    setIsDropdownOpen(false);
    onClose();
  };

  const toggleDropdown = (event) => {
    event.stopPropagation();

    const buttonPosition = event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
const dropdownWidth = 155;

// More accurate menu height:
// item height 56px + top/bottom padding 16px
const dropdownHeight = items.length * 56 + 16;

let top = buttonPosition.bottom + 8;
let left = buttonPosition.left + buttonPosition.width / 2;

    // Prevent right overflow
    if (left + dropdownWidth / 2 > viewportWidth - 8) {
      left = viewportWidth - dropdownWidth / 2 - 8;
    }

    // Prevent left overflow
    if (left - dropdownWidth / 2 < 8) {
      left = dropdownWidth / 2 + 8;
    }

   // If not enough space below, show above the button
if (top + dropdownHeight > viewportHeight - 12) {
  top = buttonPosition.top - dropdownHeight - 8;
}

// If still too high, keep it inside screen
if (top < 12) {
  top = 12;
}

    setDropdownPosition({ top, left });
    setIsDropdownOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        closeDropdown();
      }
    };

    const handleScrollOrResize = () => {
      if (isDropdownOpen) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
}, [isDropdownOpen, onClose]);

  return (
    <>
      <button
        ref={buttonRef}
        className="actions-button"
        onClick={toggleDropdown}
        type="button"
      >
        <FaEllipsisH />
      </button>

      {isDropdownOpen &&
        ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            className="dropdown-menu-portal"
            style={{
              ...dropdownPosition,
              position: 'fixed',
              zIndex: 9999,
            }}
          >
            {items.map((item, index) => (
              <div
                key={index}
                className="dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(item.action);
                  closeDropdown();
                }}
              >
                <span className="dropdown-icon">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};

export default ActionDropdown;