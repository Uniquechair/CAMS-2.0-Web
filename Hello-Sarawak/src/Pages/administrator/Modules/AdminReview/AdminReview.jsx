import React, { useState, useEffect } from 'react';
import {
    FaReply,
    FaBuilding,
    FaUserCircle,
    FaQuoteLeft,
    FaFilter,
    FaArrowLeft,
    FaArrowRight,
    FaTimes,
    FaEdit,
    FaTrash,
    FaCheck,
    FaSearch,
    FaSortAmountDown,
} from 'react-icons/fa';
import Toast from '../../../../Component/Toast/Toast';
import './AdminReview.css';

const AdminReview = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');

    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastType, setToastType] = useState('');

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [sortOrder, setSortOrder] = useState('latest');

    const [currentPage, setCurrentPage] = useState(1);
    const reviewsPerPage = 10;

    const adminId = localStorage.getItem('userid') || localStorage.getItem('userId');

    const displayToast = (type, message) => {
        setToastType(type);
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const fetchAdminReviews = async () => {
        setLoading(true);

        try {
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
            const response = await fetch(`${API_BASE}/owner-reviews/${adminId}`);

            if (response.ok) {
                const data = await response.json();
                setReviews(Array.isArray(data) ? data : []);
            } else {
                displayToast('error', 'Failed to load reviews.');
            }
        } catch (error) {
            displayToast('error', 'Server error. Could not connect.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (adminId) fetchAdminReviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adminId]);

    useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate, searchKeyword, sortOrder]);

    const handleReplySubmit = async (reviewId) => {
        if (!replyText.trim()) {
            displayToast('error', 'Reply cannot be empty.');
            return;
        }

        try {
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

            const response = await fetch(`${API_BASE}/reviews/${reviewId}/reply`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner_reply: replyText }),
            });

            if (response.ok) {
                displayToast('success', 'Reply saved successfully!');
                setReplyingTo(null);
                setReplyText('');
                fetchAdminReviews();
            } else {
                displayToast('error', 'Failed to save reply.');
            }
        } catch (error) {
            displayToast('error', 'Error connecting to server.');
        }
    };

    const handleDeleteReply = async (reviewId) => {
        if (!window.confirm('Delete your reply?')) return;

        try {
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

            const response = await fetch(`${API_BASE}/reviews/${reviewId}/reply`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner_reply: null }),
            });

            if (response.ok) {
                displayToast('success', 'Reply deleted.');
                fetchAdminReviews();
            } else {
                displayToast('error', 'Failed to delete reply.');
            }
        } catch (error) {
            displayToast('error', 'Error deleting reply.');
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm('Are you sure you want to permanently delete this customer review?')) return;

        try {
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

            const response = await fetch(`${API_BASE}/reviews/${reviewId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                displayToast('success', 'Review deleted completely.');
                fetchAdminReviews();
            } else {
                displayToast('error', 'Failed to delete review.');
            }
        } catch (error) {
            displayToast('error', 'Error connecting to server.');
        }
    };

    const clearFilters = () => {
        setStartDate('');
        setEndDate('');
        setSearchKeyword('');
        setSortOrder('latest');
        setCurrentPage(1);
    };

    const getPropertyName = (review) => {
        return review.propertyname || review.propertyaddress || '';
    };

    const getCustomerName = (review) => {
        return review.reviewer_name || review.username || 'Guest';
    };

    const filteredReviews = reviews.filter((review) => {
        const keyword = searchKeyword.trim().toLowerCase();

        const propertyName = getPropertyName(review).toLowerCase();
        const customerName = getCustomerName(review).toLowerCase();
        const reviewText = String(review.review || '').toLowerCase();

        const matchesSearch =
            !keyword ||
            propertyName.includes(keyword) ||
            customerName.includes(keyword) ||
            reviewText.includes(keyword);

        const reviewDate = new Date(review.reviewdate);
        reviewDate.setHours(0, 0, 0, 0);

        let matchesDate = true;

        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;

            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);

            if (start && end) {
                matchesDate = reviewDate >= start && reviewDate <= end;
            } else if (start) {
                matchesDate = reviewDate >= start;
            } else if (end) {
                matchesDate = reviewDate <= end;
            }
        }

        return matchesSearch && matchesDate;
    });

    const sortedReviews = [...filteredReviews].sort((a, b) => {
        const dateA = new Date(a.reviewdate).getTime();
        const dateB = new Date(b.reviewdate).getTime();

        if (sortOrder === 'oldest') {
            return dateA - dateB;
        }

        return dateB - dateA;
    });

    const totalPages = Math.ceil(sortedReviews.length / reviewsPerPage);
    const indexOfLastReview = currentPage * reviewsPerPage;
    const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
    const currentReviews = sortedReviews.slice(indexOfFirstReview, indexOfLastReview);

    const handlePreviousPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

    const renderMiniScoreBar = (label, score5) => {
        const score = score5 || 5;
        const score10 = (score * 2).toFixed(1);
        const percentage = (score / 5) * 100;

        return (
            <div className="compact-score-row" title={`${label}: ${score10}/10`}>
                <span className="compact-score-label">{label.substring(0, 3)}</span>
                <div className="compact-score-bar-bg">
                    <div className="compact-score-bar-fill" style={{ width: `${percentage}%` }}></div>
                </div>
            </div>
        );
    };

    const hasActiveFilters = startDate || endDate || searchKeyword || sortOrder !== 'latest';

    return (
        <div className="admin-review-management">
            <div className="header-container">
                <h1 className="dashboard-page-title">Manage Customer Reviews</h1>
            </div>

            <p className="admin-review-subtitle">
                Moderate feedback, reply to guests, and monitor your property scores.
            </p>

            {showToast && <Toast message={toastMessage} type={toastType} />}

            <div className="admin-review-main-content">
                {!loading && reviews.length > 0 && (
                    <div className="admin-review-filters">
                        <div className="filter-title">
                            <FaFilter /> Filter Reviews
                        </div>

                        <div className="filter-controls review-filter-grid">
                            <div className="review-search-group">
                                <label>Search:</label>
                                <div className="review-search-input-wrap">
                                    <FaSearch />
                                    <input
                                        type="text"
                                        value={searchKeyword}
                                        onChange={(e) => setSearchKeyword(e.target.value)}
                                        placeholder="Search property name or customer name..."
                                    />
                                </div>
                            </div>

                            <div className="date-input-group">
                                <label>From:</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    max={endDate || undefined}
                                />
                            </div>

                            <div className="date-input-group">
                                <label>To:</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate || undefined}
                                />
                            </div>

                            <div className="date-input-group">
                                <label>Sort:</label>
                                <div className="review-sort-select-wrap">
                                    <FaSortAmountDown />
                                    <select
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                    >
                                        <option value="latest">Latest First</option>
                                        <option value="oldest">Oldest First</option>
                                    </select>
                                </div>
                            </div>

                            {hasActiveFilters && (
                                <button
                                    className="clear-filter-btn"
                                    onClick={clearFilters}
                                    title="Clear Filters"
                                >
                                    <FaTimes /> Clear
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="admin-loading-spinner">
                        <div className="spinner"></div>
                        <p>Fetching your property reviews...</p>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="admin-empty-state">
                        <FaBuilding size={40} color="#cbd5e1" style={{ marginBottom: '15px' }} />
                        <h3>No Customer Feedback Yet</h3>
                        <p>Reviews for properties you've created will appear here once guests check out.</p>
                    </div>
                ) : sortedReviews.length === 0 ? (
                    <div className="admin-empty-state">
                        <FaFilter size={40} color="#cbd5e1" style={{ marginBottom: '15px' }} />
                        <h3>No Reviews Found</h3>
                        <p>No reviews match your search or selected filters.</p>
                        <button className="clear-filter-btn-large" onClick={clearFilters}>
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <div className="admin-reviews-list">
                        <div className="results-count">
                            Showing {indexOfFirstReview + 1}-{Math.min(indexOfLastReview, sortedReviews.length)} of {sortedReviews.length} reviews
                        </div>

                        {currentReviews.map((review) => {
                            const overallScore10 = ((review.rating || 5) * 2).toFixed(1);
                            const isExceptional = parseFloat(overallScore10) >= 9.0;
                            const propertyName = getPropertyName(review);
                            const customerName = getCustomerName(review);

                            return (
                                <div key={review.reviewid} className="sleek-review-card">
                                    <div className="sleek-score-section">
                                        <div className={`sleek-big-score ${isExceptional ? 'exceptional' : ''}`}>
                                            {overallScore10}
                                        </div>

                                        <div className="sleek-score-label">
                                            {isExceptional ? 'Exceptional' : 'Excellent'}
                                        </div>

                                        <div className="sleek-subscores">
                                            {renderMiniScoreBar('Loc', review.location_score)}
                                            {renderMiniScoreBar('Cln', review.cleanliness_score)}
                                            {renderMiniScoreBar('Val', review.value_score)}
                                            {renderMiniScoreBar('Fac', review.facilities_score)}
                                            {renderMiniScoreBar('Svc', review.service_score)}
                                        </div>
                                    </div>

                                    <div className="sleek-content-section">
                                        <div className="sleek-header">
                                            <div className="sleek-user-info">
                                                {review.reviewer_image ? (
                                                    <img
                                                        src={
                                                            review.reviewer_image.startsWith('http')
                                                                ? review.reviewer_image
                                                                : `data:image/jpeg;base64,${review.reviewer_image}`
                                                        }
                                                        alt="avatar"
                                                    />
                                                ) : (
                                                    <FaUserCircle size={20} color="#a0aec0" />
                                                )}

                                                <span className="sleek-guest-name">
                                                    {customerName}
                                                </span>

                                                <span className="sleek-meta-text">
                                                    reviewed <strong>{propertyName}</strong>
                                                </span>
                                            </div>

                                            <div className="sleek-date">
                                                {new Date(review.reviewdate).toLocaleDateString('en-GB', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </div>
                                        </div>

                                        <div className="sleek-comment">
                                            <FaQuoteLeft className="sleek-quote-icon" />
                                            <p>{review.review}</p>
                                        </div>

                                        <div className="sleek-reply-area">
                                            {review.owner_reply ? (
                                                <div className="sleek-existing-reply">
                                                    <div className="reply-top">
                                                        <span className="reply-badge">
                                                            <FaCheck /> Your Reply
                                                        </span>

                                                        <div className="reply-actions-mini">
                                                            <button
                                                                title="Edit Your Reply"
                                                                onClick={() => {
                                                                    setReplyingTo(review.reviewid);
                                                                    setReplyText(review.owner_reply);
                                                                }}
                                                            >
                                                                <FaEdit />
                                                            </button>

                                                            <button
                                                                title="Delete Your Reply"
                                                                onClick={() => handleDeleteReply(review.reviewid)}
                                                                className="danger-text"
                                                            >
                                                                <FaTrash />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {replyingTo === review.reviewid ? (
                                                        <div className="sleek-reply-input">
                                                            <textarea
                                                                value={replyText}
                                                                onChange={(e) => setReplyText(e.target.value)}
                                                                autoFocus
                                                            />

                                                            <div className="sleek-edit-actions">
                                                                <button
                                                                    className="btn-cancel-sm"
                                                                    onClick={() => {
                                                                        setReplyingTo(null);
                                                                        setReplyText('');
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </button>

                                                                <button
                                                                    className="btn-save-sm"
                                                                    onClick={() => handleReplySubmit(review.reviewid)}
                                                                >
                                                                    Update Reply
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p>{review.owner_reply}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="sleek-new-reply">
                                                    {replyingTo === review.reviewid ? (
                                                        <div className="sleek-reply-input">
                                                            <textarea
                                                                placeholder="Type your response to the guest..."
                                                                value={replyText}
                                                                onChange={(e) => setReplyText(e.target.value)}
                                                                autoFocus
                                                            />

                                                            <div className="sleek-edit-actions">
                                                                <button
                                                                    className="btn-cancel-sm"
                                                                    onClick={() => {
                                                                        setReplyingTo(null);
                                                                        setReplyText('');
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </button>

                                                                <button
                                                                    className="btn-save-sm"
                                                                    onClick={() => handleReplySubmit(review.reviewid)}
                                                                >
                                                                    Send Reply
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            className="sleek-btn-reply"
                                                            onClick={() => {
                                                                setReplyingTo(review.reviewid);
                                                                setReplyText('');
                                                            }}
                                                        >
                                                            <FaReply /> Write a reply
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="sleek-actions-section">
                                        <button
                                            className="sleek-action-btn delete"
                                            title="Delete Customer Review"
                                            onClick={() => handleDeleteReview(review.reviewid)}
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {totalPages > 1 && (
                            <div className="review-pagination-controls">
                                <button
                                    className="review-pagination-button"
                                    onClick={handlePreviousPage}
                                    disabled={currentPage === 1}
                                >
                                    <FaArrowLeft />
                                </button>

                                {[...Array(totalPages)].map((_, index) => {
                                    const pageNum = index + 1;

                                    if (
                                        pageNum === 1 ||
                                        pageNum === totalPages ||
                                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                    ) {
                                        return (
                                            <button
                                                key={index}
                                                className={`review-pagination-button ${currentPage === pageNum ? 'active' : ''}`}
                                                onClick={() => handlePageChange(pageNum)}
                                                disabled={currentPage === pageNum}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    }

                                    if (
                                        (pageNum === currentPage - 2 && currentPage > 3) ||
                                        (pageNum === currentPage + 2 && currentPage < totalPages - 2)
                                    ) {
                                        return (
                                            <span key={index} className="pagination-dots">
                                                ...
                                            </span>
                                        );
                                    }

                                    return null;
                                })}

                                <button
                                    className="review-pagination-button"
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                >
                                    <FaArrowRight />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminReview;