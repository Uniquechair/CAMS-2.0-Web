import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './AdminFAQ.css';
import "../../../../Component/MainContent/MainContent.css";

import {
  fetchSupportQuestions,
  fetchFaqStats,
  fetchAdminPublishedFaqs,
  reviewFaqQuestion,
  publishFaqQuestion,
  rejectFaqQuestion,
  deletePublishedFaq,
  replyFaqQuestionEmail,
} from '../../../../../Api/api';

const FAQ_CATEGORIES = [
  { value: 'account', label: 'Account & Login' },
  { value: 'browse', label: 'Browse & Properties' },
  { value: 'booking', label: 'Booking' },
  { value: 'payment', label: 'Payment' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'properties', label: 'Property Management' },
  { value: 'reservations', label: 'Reservations' },
  { value: 'finance', label: 'Finance & Logs' },
];

const PAGE_SIZE = 6;

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
    <path d="M3 16v5h5" />
    <path d="M3 12A9 9 0 0 1 18.5 5.7L21 8" />
    <path d="M21 8V3h-5" />
  </svg>
);

const EmptyIcon = () => (
  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    <path d="M8 9h8" />
    <path d="M8 13h5" />
  </svg>
);

const getStatusLabel = (status = '') => {
  const value = String(status).toLowerCase();

  if (value === 'pending') return 'Pending';
  if (value === 'reviewed') return 'Reviewed';
  if (value === 'published') return 'Published';
  if (value === 'rejected') return 'Rejected';

  return status || 'Unknown';
};

const getRoleLabel = (role = '') => {
  const value = String(role).toLowerCase();

  if (value === 'customer') return 'Customer';
  if (value === 'moderator') return 'Moderator';

  return role || 'User';
};

const getCategoryLabel = (category = '') => {
  const found = FAQ_CATEGORIES.find((item) => item.value === category);
  return found ? found.label : category || 'Others';
};

const formatDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const paginateItems = (items, page, pageSize = PAGE_SIZE) => {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

const getTotalPages = (items, pageSize = PAGE_SIZE) => {
  return Math.max(1, Math.ceil(items.length / pageSize));
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="admin-faq-pagination">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>

      <div className="admin-faq-page-numbers">
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            className={currentPage === page ? 'active' : ''}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
};

export default function AdminFAQ() {
  const [activeTab, setActiveTab] = useState('incoming');

  const [questions, setQuestions] = useState([]);
  const [historyQuestions, setHistoryQuestions] = useState([]);
  const [publishedFaqs, setPublishedFaqs] = useState([]);

  const [stats, setStats] = useState({
    pending: 0,
    reviewed: 0,
    published: 0,
    customer: 0,
    moderator: 0,
  });

  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [draftCategory, setDraftCategory] = useState('booking');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [incomingPage, setIncomingPage] = useState(1);
  const [publishedPage, setPublishedPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const adminUserId = localStorage.getItem('userid');

  const showMessage = (type, text) => {
    setMessage({ type, text });

    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 3500);
  };

  const loadFaqData = useCallback(async () => {
    setLoading(true);

    try {
      const [questionRes, historyRes, statsRes, publishedRes] = await Promise.all([
        fetchSupportQuestions({
          role: roleFilter,
          status: statusFilter === 'all' ? 'all' : statusFilter,
          search,
        }),
        fetchSupportQuestions({
          role: 'all',
          status: 'all',
          search,
        }),
        fetchFaqStats(),
        fetchAdminPublishedFaqs(),
      ]);

      const fetchedQuestions = questionRes?.questions || [];
      console.log('FAQ FILTER DEBUG:', {
  roleFilter,
  statusFilter,
  fetchedQuestions: fetchedQuestions.map((q) => ({
    id: q.id,
    status: q.status,
    question: q.question,
    createdat: q.createdat,
  })),
});
      const fetchedHistory = historyRes?.questions || [];
      const fetchedPublished = publishedRes?.faqs || [];
      const fetchedStats = statsRes?.stats || {};

      setQuestions(fetchedQuestions);
      setHistoryQuestions(fetchedHistory);
      setPublishedFaqs(fetchedPublished);

      setStats({
        pending: Number(fetchedStats.pending || 0),
        reviewed: Number(fetchedStats.reviewed || 0),
        published: Number(fetchedStats.published || fetchedPublished.length || 0),
        customer: Number(fetchedStats.customer || 0),
        moderator: Number(fetchedStats.moderator || 0),
      });

      setSelectedQuestion((currentSelected) => {
        if (!currentSelected) return null;

        const updatedSelected = fetchedHistory.find(
          (item) => String(item.id) === String(currentSelected.id)
        );

        if (!updatedSelected) {
          setDraftAnswer('');
          setDraftCategory('booking');
          return null;
        }

        setDraftAnswer(updatedSelected.adminanswer || '');
        setDraftCategory(updatedSelected.category || 'booking');

        return updatedSelected;
      });
    } catch (error) {
      showMessage('error', error.message || 'Failed to load FAQ data.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, search]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      loadFaqData();
      setIncomingPage(1);
      setPublishedPage(1);
      setHistoryPage(1);
    }, 350);

    return () => clearTimeout(delaySearch);
  }, [loadFaqData]);

  const filteredPublishedFaqs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return publishedFaqs.filter((faq) => {
      if (!keyword) return true;

      return (
        String(faq.question || '').toLowerCase().includes(keyword) ||
        String(faq.answer || '').toLowerCase().includes(keyword) ||
        String(faq.category || '').toLowerCase().includes(keyword)
      );
    });
  }, [publishedFaqs, search]);

const incomingQuestions = useMemo(() => {
  const selectedStatusFilter = String(statusFilter || 'all').toLowerCase().trim();

  return [...questions]
    .filter((item) => {
      const status = String(item.status || '').toLowerCase().trim();

      if (selectedStatusFilter === 'pending') {
        return status === 'pending';
      }

      if (selectedStatusFilter === 'reviewed') {
        return status === 'reviewed';
      }

      return status === 'pending' || status === 'reviewed';
    })
    .sort((a, b) => {
      const statusA = String(a.status || '').toLowerCase().trim();
      const statusB = String(b.status || '').toLowerCase().trim();

      const priority = {
        pending: 1,
        reviewed: 2,
      };

      const priorityA = priority[statusA] || 99;
      const priorityB = priority[statusB] || 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const dateA = new Date(a.createdat || 0).getTime();
      const dateB = new Date(b.createdat || 0).getTime();

      return dateB - dateA;
    });
}, [questions, statusFilter]);

  const incomingTotalPages = getTotalPages(incomingQuestions);
  const publishedTotalPages = getTotalPages(filteredPublishedFaqs);
  const historyTotalPages = getTotalPages(historyQuestions);

  const paginatedQuestions = useMemo(() => {
    return paginateItems(incomingQuestions, incomingPage);
  }, [incomingQuestions, incomingPage]);

  const paginatedPublishedFaqs = useMemo(() => {
    return paginateItems(filteredPublishedFaqs, publishedPage);
  }, [filteredPublishedFaqs, publishedPage]);

  const paginatedHistoryQuestions = useMemo(() => {
    return paginateItems(historyQuestions, historyPage);
  }, [historyQuestions, historyPage]);

  const handleSelectQuestion = (question) => {
    const status = String(question.status || '').toLowerCase().trim();

    if (status === 'pending' || status === 'reviewed') {
      setActiveTab('incoming');
    } else {
      setActiveTab('history');
    }

    setSelectedQuestion(question);
    setDraftAnswer(question.adminanswer || '');
    setDraftCategory(question.category || 'booking');
  };

const handleReplyByEmail = async () => {
  if (!selectedQuestion) return;

  if (!selectedQuestion.email) {
    showMessage('error', 'This user does not have an email address.');
    return;
  }

  if (!draftAnswer.trim()) {
    showMessage('error', 'Please write an admin answer before sending email.');
    return;
  }

  const confirmSend = window.confirm(
    `Send this answer to ${selectedQuestion.email}?`
  );

  if (!confirmSend) return;

  setActionLoading(true);

  try {
    await replyFaqQuestionEmail(selectedQuestion.id, {
      answer: draftAnswer.trim(),
      repliedBy: adminUserId,
    });

    showMessage('success', 'Reply email sent to user successfully.');

    await loadFaqData();
  } catch (error) {
    showMessage('error', error.message || 'Failed to send reply email.');
  } finally {
    setActionLoading(false);
  }
};

  const handleMarkReviewed = async () => {
    if (!selectedQuestion) return;

    if (!draftAnswer.trim()) {
      showMessage('error', 'Please write an admin answer before marking as reviewed.');
      return;
    }

    setActionLoading(true);

    try {
      await reviewFaqQuestion(selectedQuestion.id, {
        adminanswer: draftAnswer.trim(),
        reviewedBy: adminUserId,
      });

     showMessage('success', 'Question marked as reviewed.');

setSelectedQuestion(null);
setDraftAnswer('');
setDraftCategory('booking');

if (statusFilter === 'pending') {
  setStatusFilter('pending');
}

await loadFaqData();
    } catch (error) {
      showMessage('error', error.message || 'Failed to mark question as reviewed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedQuestion) return;

    if (!draftAnswer.trim()) {
      showMessage('error', 'Please write an answer before publishing.');
      return;
    }

    if (String(selectedQuestion.status).toLowerCase() === 'published') {
      showMessage('error', 'This question has already been published.');
      return;
    }

    setActionLoading(true);

    try {
      await publishFaqQuestion(selectedQuestion.id, {
        answer: draftAnswer.trim(),
        category: draftCategory,
        publishedBy: adminUserId,
      });

      showMessage('success', 'FAQ published successfully.');
      setActiveTab('published');
      setSelectedQuestion(null);
      setDraftAnswer('');
      setDraftCategory('booking');
      await loadFaqData();
    } catch (error) {
      showMessage('error', error.message || 'Failed to publish FAQ.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedQuestion) return;

    const confirmReject = window.confirm('Are you sure you want to reject this question?');

    if (!confirmReject) return;

    setActionLoading(true);

    try {
      await rejectFaqQuestion(selectedQuestion.id, {
        reviewedBy: adminUserId,
      });

      showMessage('success', 'Question rejected successfully.');
      setSelectedQuestion(null);
      setDraftAnswer('');
      setDraftCategory('booking');
      await loadFaqData();
    } catch (error) {
      showMessage('error', error.message || 'Failed to reject question.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePublished = async (faqid) => {
    const confirmDelete = window.confirm(
      'Remove this FAQ from customer/moderator pages? The original question history will still remain for admin review.'
    );

    if (!confirmDelete) return;

    setActionLoading(true);

    try {
      await deletePublishedFaq(faqid);
      showMessage('success', 'FAQ removed from public pages. Question history is still kept.');
      await loadFaqData();
    } catch (error) {
      showMessage('error', error.message || 'Failed to remove published FAQ.');
    } finally {
      setActionLoading(false);
    }
  };

const closeHistoryDetail = () => {
  setSelectedQuestion(null);
  setDraftAnswer('');
  setDraftCategory('booking');
};
  const selectedStatus = String(selectedQuestion?.status || '').toLowerCase().trim();
  const isSelectedFinalStatus = selectedStatus === 'published' || selectedStatus === 'rejected';

  return (
    <div className="admin-faq-page">
    <section className="admin-faq-hero">
  <div>
    <h1 className="dashboard-page-title">FAQ Management</h1>
    <p className="dashboard-page-description">
      Review customer and moderator questions, publish useful answers, and keep a full question history for future checking.
    </p>
  </div>

  <button type="button" className="admin-faq-refresh-btn" onClick={loadFaqData} disabled={loading}>
    <RefreshIcon />
    {loading ? 'Refreshing...' : 'Refresh'}
  </button>
</section>

      {message.text && (
        <div className={`admin-faq-alert ${message.type}`}>
          {message.text}
        </div>
      )}

      <section className="admin-faq-stats-grid">
        <div className="admin-faq-stat-card pending">
          <span>Pending Review</span>
          <strong>{stats.pending}</strong>
        </div>

        <div className="admin-faq-stat-card reviewed">
          <span>Reviewed</span>
          <strong>{stats.reviewed}</strong>
        </div>

        <div className="admin-faq-stat-card published">
          <span>Published FAQs</span>
          <strong>{stats.published}</strong>
        </div>

        <div className="admin-faq-stat-card customer">
          <span>Customer Questions</span>
          <strong>{stats.customer}</strong>
        </div>

        <div className="admin-faq-stat-card moderator">
          <span>Moderator Questions</span>
          <strong>{stats.moderator}</strong>
        </div>
      </section>

      <section className="admin-faq-toolbar">
        <div className="admin-faq-tabs">
          <button
            type="button"
            className={activeTab === 'incoming' ? 'active' : ''}
            onClick={() => {
              setActiveTab('incoming');
              setSelectedQuestion(null);
            }}
          >
            Incoming Questions
          </button>

          <button
            type="button"
            className={activeTab === 'published' ? 'active' : ''}
            onClick={() => {
              setActiveTab('published');
              setSelectedQuestion(null);
            }}
          >
            Published FAQ
          </button>

          <button
            type="button"
            className={activeTab === 'history' ? 'active' : ''}
            onClick={() => {
              setActiveTab('history');
              setSelectedQuestion(null);
            }}
          >
            Question History
          </button>
        </div>

        <div className="admin-faq-search-box">
          <SearchIcon />
          <input
            type="text"
            placeholder={
              activeTab === 'published'
                ? 'Search published FAQ...'
                : 'Search question, name, email, category...'
            }
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {search && (
            <button type="button" onClick={() => setSearch('')}>
              ×
            </button>
          )}
        </div>
      </section>

      {activeTab === 'incoming' && (
        <section className="admin-faq-main-layout">
          <div className="admin-faq-left-panel">
            <div className="admin-faq-filter-row">
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="all">All Roles</option>
                <option value="customer">Customer</option>
                <option value="moderator">Moderator</option>
              </select>

              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All Incoming</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
              </select>
            </div>

            <div className="admin-faq-question-list">
              {loading ? (
                <div className="admin-faq-empty compact">
                  <div className="admin-faq-spinner" />
                  <h3>Loading questions...</h3>
                  <p>Please wait while the latest submissions are loaded.</p>
                </div>
              ) : paginatedQuestions.length === 0 ? (
                <div className="admin-faq-empty compact">
                  <EmptyIcon />
                  <h3>No incoming questions found</h3>
                  <p>Pending and reviewed questions will appear here.</p>
                </div>
              ) : (
                paginatedQuestions.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`admin-faq-question-card ${selectedQuestion?.id === item.id ? 'selected' : ''}`}
                    onClick={() => handleSelectQuestion(item)}
                  >
                    <div className="admin-faq-question-card-top">
                      <span className={`admin-faq-role-badge ${String(item.role).toLowerCase()}`}>
                        {getRoleLabel(item.role)}
                      </span>

                      <span className={`admin-faq-status-badge ${String(item.status).toLowerCase()}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </div>

                    <h3>{item.question}</h3>

                    <div className="admin-faq-question-meta">
                      <span>{item.name}</span>
                      <span>•</span>
                      <span>{getCategoryLabel(item.category)}</span>
                    </div>

                    <p className="admin-faq-question-date">
                      Submitted: {formatDate(item.createdat)}
                    </p>
                  </button>
                ))
              )}
            </div>

            <Pagination
              currentPage={incomingPage}
              totalPages={incomingTotalPages}
              onPageChange={setIncomingPage}
            />
          </div>

          <div className="admin-faq-right-panel">
            {!selectedQuestion ? (
              <div className="admin-faq-empty large">
                <EmptyIcon />
                <h3>Select a question to review</h3>
                <p>Choose one pending or reviewed question from the left panel.</p>
              </div>
            ) : (
              <div className="admin-faq-detail-card">
                <div className="admin-faq-detail-header">
                  <div>
                    <span className={`admin-faq-role-badge ${String(selectedQuestion.role).toLowerCase()}`}>
                      {getRoleLabel(selectedQuestion.role)}
                    </span>

                    <span className={`admin-faq-status-badge ${String(selectedQuestion.status).toLowerCase()}`}>
                      {getStatusLabel(selectedQuestion.status)}
                    </span>
                  </div>

                  <small>{formatDate(selectedQuestion.createdat)}</small>
                </div>

                <h2>Question Details</h2>

                <div className="admin-faq-info-grid">
                  <div>
                    <label>Name</label>
                    <p>{selectedQuestion.name || '-'}</p>
                  </div>

                  <div>
                    <label>Email</label>
                    <p>{selectedQuestion.email || '-'}</p>
                  </div>

                  <div>
                    <label>Role</label>
                    <p>{getRoleLabel(selectedQuestion.role)}</p>
                  </div>

                  <div>
                    <label>Category</label>
                    <p>{getCategoryLabel(selectedQuestion.category)}</p>
                  </div>
                </div>

                <div className="admin-faq-form-group">
                  <label>User Question</label>
                  <div className="admin-faq-readonly-box">
                    {selectedQuestion.question}
                  </div>
                </div>

                {selectedQuestion.attachmentname && (
                  <div className="admin-faq-attachment-box">
                    <strong>Attachment:</strong>
                    <span>{selectedQuestion.attachmentname}</span>
                    <small>{selectedQuestion.attachmenttype || 'File uploaded'}</small>
                  </div>
                )}

                <div className="admin-faq-form-group">
                  <label>Publish Category</label>
                  <select value={draftCategory} onChange={(event) => setDraftCategory(event.target.value)}>
                    {FAQ_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-faq-form-group">
                  <label>Admin Answer</label>
                  <textarea
                    rows="8"
                    placeholder="Write a clear answer. This answer can be published to the FAQ page for other users."
                    value={draftAnswer}
                    onChange={(event) => setDraftAnswer(event.target.value)}
                  />
                  <small>
                    Removing published FAQ later will only hide it from public pages. The question history will remain here.
                  </small>
                </div>

                {isSelectedFinalStatus && (
                  <div className={`admin-faq-status-note ${selectedStatus}`}>
                    {selectedStatus === 'published'
                      ? 'This question has already been published. It is kept in Question History for admin reference.'
                      : 'This question has been rejected. It is kept in Question History for admin reference.'}
                  </div>
                )}

                <div className="admin-faq-actions">
                  <button
                    type="button"
                    className="admin-faq-btn reject"
                    onClick={handleReject}
                    disabled={actionLoading || selectedStatus === 'rejected' || selectedStatus === 'published'}
                  >
                    Reject
                  </button>

                 <button
                  type="button"
                  className="admin-faq-btn secondary"
                  onClick={handleMarkReviewed}
                  disabled={actionLoading || selectedStatus === 'published' || selectedStatus === 'rejected'}
                >
                  Mark Reviewed
                </button>

                <button
                  type="button"
                  className="admin-faq-btn email"
                  onClick={handleReplyByEmail}
                  disabled={
                    actionLoading ||
                    selectedStatus === 'published' ||
                    selectedStatus === 'rejected' ||
                    !selectedQuestion.email
                  }
                >
                  Reply User by Email
                </button>

                <button
                  type="button"
                  className="admin-faq-btn primary"
                  onClick={handlePublish}
                  disabled={actionLoading || selectedStatus === 'published' || selectedStatus === 'rejected'}
                >
                  Publish to FAQ
                </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'published' && (
        <section className="admin-faq-published-section">
          {loading ? (
            <div className="admin-faq-empty">
              <div className="admin-faq-spinner" />
              <h3>Loading published FAQs...</h3>
            </div>
          ) : paginatedPublishedFaqs.length === 0 ? (
            <div className="admin-faq-empty">
              <EmptyIcon />
              <h3>No published FAQs found</h3>
              <p>Published FAQs will appear here after admin publishes useful answers.</p>
            </div>
          ) : (
            paginatedPublishedFaqs.map((faq) => (
              <article key={faq.id} className="admin-faq-published-card">
                <div className="admin-faq-published-top">
                  <div>
                    <span className="admin-faq-category-badge">
                      {getCategoryLabel(faq.category)}
                    </span>

                    {faq.sourcerole && (
                      <span className={`admin-faq-role-badge ${String(faq.sourcerole).toLowerCase()}`}>
                        Source: {getRoleLabel(faq.sourcerole)}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="admin-faq-btn danger small"
                    onClick={() => handleDeletePublished(faq.id)}
                    disabled={actionLoading}
                  >
                    Remove from Public
                  </button>
                </div>

                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>

                <footer>
                  Published: {formatDate(faq.createdat)}
                </footer>
              </article>
            ))
          )}

          <Pagination
            currentPage={publishedPage}
            totalPages={publishedTotalPages}
            onPageChange={setPublishedPage}
          />
        </section>
      )}

    {activeTab === 'history' && (
  <section className="admin-faq-history-section">
    {loading ? (
      <div className="admin-faq-empty">
        <div className="admin-faq-spinner" />
        <h3>Loading question history...</h3>
      </div>
    ) : paginatedHistoryQuestions.length === 0 ? (
      <div className="admin-faq-empty">
        <EmptyIcon />
        <h3>No question history found</h3>
        <p>Customer and moderator questions will appear here after submission.</p>
      </div>
    ) : (
      <>
        <div className="admin-faq-history-layout">
          <div className="admin-faq-history-list">
            {paginatedHistoryQuestions.map((item) => (
              <article
                key={item.id}
                className={`admin-faq-history-card ${selectedQuestion?.id === item.id ? 'selected' : ''}`}
              >
                <div className="admin-faq-history-top">
                  <div>
                    <span className={`admin-faq-role-badge ${String(item.role).toLowerCase()}`}>
                      {getRoleLabel(item.role)}
                    </span>

                    <span className={`admin-faq-status-badge ${String(item.status).toLowerCase()}`}>
                      {getStatusLabel(item.status)}
                    </span>

                    <span className="admin-faq-category-badge">
                      {getCategoryLabel(item.category)}
                    </span>
                  </div>

                  <small>{formatDate(item.createdat)}</small>
                </div>

                <h3>{item.question}</h3>

                <div className="admin-faq-history-meta">
                  <span>{item.name || '-'}</span>
                  <span>{item.email || '-'}</span>
                </div>

                {item.adminanswer && (
                  <div className="admin-faq-history-answer">
                    <strong>Admin Answer</strong>
                    <p>{item.adminanswer}</p>
                  </div>
                )}

                <button
                  type="button"
                  className="admin-faq-btn secondary small"
                  onClick={() => handleSelectQuestion(item)}
                >
                  View Details
                </button>
              </article>
            ))}
          </div>

          {selectedQuestion && (
            <aside className="admin-faq-history-detail">
              <div className="admin-faq-history-detail-top">
                <div>
                  <span className={`admin-faq-role-badge ${String(selectedQuestion.role).toLowerCase()}`}>
                    {getRoleLabel(selectedQuestion.role)}
                  </span>

                  <span className={`admin-faq-status-badge ${String(selectedQuestion.status).toLowerCase()}`}>
                    {getStatusLabel(selectedQuestion.status)}
                  </span>
                </div>

                <button type="button" onClick={closeHistoryDetail}>
                  ×
                </button>
              </div>

              <h2>Question Details</h2>

              <div className="admin-faq-info-grid">
                <div>
                  <label>Name</label>
                  <p>{selectedQuestion.name || '-'}</p>
                </div>

                <div>
                  <label>Email</label>
                  <p>{selectedQuestion.email || '-'}</p>
                </div>

                <div>
                  <label>Role</label>
                  <p>{getRoleLabel(selectedQuestion.role)}</p>
                </div>

                <div>
                  <label>Category</label>
                  <p>{getCategoryLabel(selectedQuestion.category)}</p>
                </div>
              </div>

              <div className="admin-faq-form-group">
                <label>User Question</label>
                <div className="admin-faq-readonly-box">
                  {selectedQuestion.question}
                </div>
              </div>

              <div className="admin-faq-form-group">
                <label>Admin Answer</label>
                <div className="admin-faq-readonly-box">
                  {selectedQuestion.adminanswer || 'No admin answer yet.'}
                </div>
              </div>

              <p className="admin-faq-history-detail-note">
                This record is kept for admin reference. Published and rejected questions will not appear in Incoming Questions.
              </p>
            </aside>
          )}
        </div>

        <Pagination
          currentPage={historyPage}
          totalPages={historyTotalPages}
          onPageChange={setHistoryPage}
        />
      </>
    )}
  </section>
)}
     
    </div>
  );
}