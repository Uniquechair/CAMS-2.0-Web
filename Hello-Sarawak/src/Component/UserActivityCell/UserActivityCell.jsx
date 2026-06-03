import React, { useState, useEffect } from 'react';
import './UserActivityCell.css';

const UserActivityCell = ({ user }) => {
    const [avatarSrc, setAvatarSrc] = useState(null);

    const inlineDefaultAvatar =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAABWklEQVR4nO2XTU7DMBCFP9QNYt9DsOYKcBTYFWkJBwJOADQSEnCJ5iiFF6g7JJBQJazKghkndhzSpBJI9JNGipQZz/Nsx/Y4cMZx0ANmwBuwB1RD2QObYDAl3OFVg+PUxEtg6Bk0BR6Ad2CRaL8GxhHRUadjaRDVn8qBruPAPTCK9FVAp6m3rQNKC+edsKHWfuQ9JXVgDLwknEgZHGC0dwUOGtwBs7YdeAHukxxI4R+5a5tCpb1vO3KgqwW0AyXwSXUOc75kB96Ai0iYUu+b+UvtnQfnZwZZcl6wAG4qRBmyF52GDMn1/bHXv4n45sAV1cGSgnk4qcVJsglT+DWYtk/vPrRrMM4SME3cGZLtP2RIugYlKMmb1qgLTGg28oDqv5GTQsaxm1T/ftvVbI1xYAfcBZ1ezcYURrXzbsiBXyF3JtyEDtT/aEMcNEMuQ/tVYNYPDuTgG9hpqO1Kgrj9AAAAAElFTkSuQmCC';

    const statusMap = {
        login: 'status-login',
        logout: 'status-logout',
        registered: 'status-registered',
    };

    const getSafeImageSrc = (img) => {
        if (!img) return inlineDefaultAvatar;

        const clean = String(img).trim();

        if (!clean) return inlineDefaultAvatar;

        // Google avatar / normal image URL
        if (clean.startsWith('http://') || clean.startsWith('https://')) {
            return clean;
        }

        // Already complete base64 data image
        if (clean.startsWith('data:image')) {
            return clean;
        }

        // Raw base64 image from database
        return `data:image/jpeg;base64,${clean}`;
    };

    useEffect(() => {
        setAvatarSrc(getSafeImageSrc(user?.uimage));
    }, [user?.uimage]);

    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = inlineDefaultAvatar;
    };

    const statusClass = statusMap[user?.ustatus?.toLowerCase()] || 'status-logout';

    return (
        <div className="user-container">
            <div className="avatar-container">
                <img
                    src={avatarSrc || inlineDefaultAvatar}
                    alt={user?.username || 'Avatar'}
                    className="table-user-avatar"
                    onError={handleImageError}
                />
                <span className={`user-status-dot ${statusClass}`} />
            </div>
            <span className="table-user-username">{user?.username || 'N/A'}</span>
        </div>
    );
};

export default UserActivityCell;