import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../../../Component/Navbar/navbar';
import Footer from '../../../Component/Footer/footer';
import Back_To_Top_Button from '../../../Component/Back_To_Top_Button/Back_To_Top_Button';
import AskQuestionForm from './AskQuestionForm.jsx';
import './CustomerFAQ.css';
import { AuthProvider } from '../../../Component/AuthContext/AuthContext';
import { fetchPublishedFaqs } from '../../../../Api/api';

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const ChevronDown = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const catIcon = (id, color) => {
  const paths = {
    account: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    browse: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </>
    ),
    booking: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
    payment: (
      <>
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </>
    ),
    notifications: (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
    reviews: (
      <>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </>
    ),
  };

  return (
    <svg className="faq-topic-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[id] || paths.account}
    </svg>
  );
};

const faqCategories = [
  {
    id: 'account',
    label: 'Account & Login',
    subtitle: 'Registration, signing in, and managing your credentials.',
  },
  {
    id: 'browse',
    label: 'Browse & Properties',
    subtitle: 'Finding the right place to stay in Sarawak.',
  },
  {
    id: 'booking',
    label: 'Booking',
    subtitle: 'How bookings work — from adding to cart to managing your reservations.',
  },
  {
    id: 'payment',
    label: 'Payment',
    subtitle: 'Paying for your booking securely.',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    subtitle: 'Room suggestions and booking alerts via the bell icon.',
  },
  {
    id: 'reviews',
    label: 'Reviews',
    subtitle: 'Writing, editing, and viewing your property reviews.',
  },
];

const defaultFaqs = [
  {
    id: 'acc1',
    category: 'account',
    q: 'How do I create a new account?',
    a: "Go to the Login page and click Sign Up. Fill in your first name, last name, username, email address, phone number, and password, then click Sign Up to submit. Your account will be created and ready to use immediately.",
    tip: "💡 Make sure your email address is valid because you'll need it to receive booking confirmations and password resets.",
  },
  {
    id: 'acc2',
    category: 'account',
    q: 'How do I log in to my account?',
    a: "Navigate to the Login page, enter your email or username and password, then click Login. You'll be redirected to the homepage upon success. You can also sign in using your Google account by clicking the Google button on the login page.",
  },
  {
    id: 'acc4',
    category: 'account',
    q: 'How do I reset my password if I forgot it?',
    a: 'On the Login page, click Forgot Password. Enter your registered email address and click Send New Password. A new temporary password will be sent to your email inbox.',
    tip: "⚠️ Check your spam or junk folder if you don't see the email within a few minutes.",
  },
  {
    id: 'brw1',
    category: 'browse',
    q: 'How do I find available properties?',
    a: 'There are two ways to browse properties:\n1. Go to the Homepage, locate the interactive Sarawak map, click on a region/location, and press Find Stays. Then enter your check-in and check-out dates.\n2. Go directly to the Rooms page, enter your check-in and check-out dates, and view all matching properties.',
    isList: true,
  },
  {
    id: 'brw4',
    category: 'browse',
    q: 'What do greyed-out dates on the calendar mean?',
    a: 'Greyed-out dates are blackout dates. These are periods when the property is unavailable for booking, such as maintenance, private events, or holidays. You cannot select these dates when making a booking.',
  },
  {
    id: 'bkg1',
    category: 'booking',
    q: 'How do I book a room that is available?',
    a: '1. Select a property and open its details page.\n2. Confirm your check-in and check-out dates and check the total price.\n3. Click Book and Pay, then Add to Cart.\nYour booking will be added to your Cart with a status of Accepted.',
    isList: true,
  },
  {
    id: 'bkg2',
    category: 'booking',
    q: 'What happens when a room is fully booked?',
    a: 'If a room is fully booked for your selected dates, click Enquiry or Waitlist instead. Your booking will be added to the Cart with a Pending status and a request will be sent to the property moderator. The moderator may suggest an alternative room for you.',
  },
  {
    id: 'pay1',
    category: 'payment',
    q: 'How do I pay for my booking?',
    a: 'Go to Cart and find a reservation with Accepted status. Click Pay Now. A payment form will appear. Click Pay with PayPal to be redirected to the PayPal gateway, where you can complete the transaction securely.',
  },
  {
    id: 'pay3',
    category: 'payment',
    q: 'What is a checkout timer?',
    a: 'Once you initiate checkout, a timer starts counting down. If the timer expires before you complete payment, your booking will be automatically cancelled and removed from your cart. Make sure to complete payment before the timer runs out.',
  },
  {
    id: 'not2',
    category: 'notifications',
    q: 'What is a room suggestion notification?',
    a: "If your booking request was for a fully booked room, the moderator may suggest an alternative available room. You'll receive a notification in your bell icon showing the suggested property's address, check-in and check-out dates, and total price.",
  },
  {
    id: 'rev1',
    category: 'reviews',
    q: 'How do I write a review?',
    a: 'You can only review a property after your check-out date. Go to Cart, then Reservations History. Find the completed booking and click Write/View Review. Fill in the form with your ratings and comments, then click Submit Review.',
  },
];

const QUICK_PICK_IDS = ['brw4', 'bkg1', 'pay1'];

const normalizeCustomerCategory = (category = '') => {
  const value = String(category || '').toLowerCase().trim();

  if (value === 'account') return 'account';
  if (value === 'browse') return 'browse';
  if (value === 'booking') return 'booking';
  if (value === 'payment') return 'payment';
  if (value === 'notifications') return 'notifications';
  if (value === 'reviews') return 'reviews';

  return null;
};

export default function CustomerFAQ() {
  const [activeCategory, setActiveCategory] = useState('booking');
  const [searchQuery, setSearchQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [feedbackState, setFeedbackState] = useState({});

  const [showSupportForm, setShowSupportForm] = useState(false);
  const [publishedFaqs, setPublishedFaqs] = useState([]);

 

  useEffect(() => {
    const loadPublishedFaqs = async () => {
      try {
        const result = await fetchPublishedFaqs({
          category: 'all',
          search: '',
        });

        const backendFaqs = result?.faqs || [];

        const formattedFaqs = backendFaqs
          .map((faq) => {
            const normalizedCategory = normalizeCustomerCategory(faq.category);

            if (!normalizedCategory) {
              return null;
            }

            return {
              id: `published-${faq.id || faq.faqid || faq.questionid}`,
              category: normalizedCategory,
              q: faq.q || faq.question || '',
              a: faq.a || faq.answer || '',
              sourceRole: faq.sourcerole || faq.sourceRole || '',
              isPublished: true,
            };
          })
          .filter(Boolean);

        setPublishedFaqs(formattedFaqs);
      } catch (error) {
        // Keep default FAQs visible if published FAQs cannot be loaded.
      }
    };

    loadPublishedFaqs();
  }, []);

  const faqs = useMemo(() => {
    const existingQuestions = new Set(
      defaultFaqs.map((faq) => faq.q.toLowerCase().trim())
    );

    const uniquePublishedFaqs = publishedFaqs.filter((faq) => {
      const questionText = String(faq.q || '').toLowerCase().trim();
      return questionText && !existingQuestions.has(questionText);
    });

    return [...uniquePublishedFaqs, ...defaultFaqs];
  }, [publishedFaqs]);

  const activeCat = faqCategories.find((cat) => cat.id === activeCategory);

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (query) {
      return faqs.filter((faq) => {
        return (
          faq.q.toLowerCase().includes(query) ||
          faq.a.toLowerCase().includes(query)
        );
      });
    }

    return faqs.filter((faq) => faq.category === activeCategory);
  }, [searchQuery, activeCategory, faqs]);

  const quickPicks = faqs.filter((faq) => QUICK_PICK_IDS.includes(faq.id));

  const catCount = (catId) => {
    return faqs.filter((faq) => faq.category === catId).length;
  };

  const selectCategory = (catId) => {
    setActiveCategory(catId);
    setSearchQuery('');
    setOpenId(null);
  };

 

  const scrollToForm = () => {
    setShowSupportForm(true);

    setTimeout(() => {
      document.getElementById('support-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  const handleQuickPick = (faq) => {
    setActiveCategory(faq.category);
    setSearchQuery('');
    setOpenId(faq.id);

    setTimeout(() => {
      document.getElementById(faq.id)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 100);
  };

  const handleFeedback = (faqId, type) => {
    setFeedbackState((prev) => ({
      ...prev,
      [faqId]: type,
    }));
  };

  const highlight = (text, query) => {
    if (!query.trim()) return text;

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="faq-highlight">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const formatAnswer = (text, isList) => {
    if (!isList) {
      return <p>{text}</p>;
    }

    return (
      <div className="faq-answer-list">
        {text.split('\n').map((line, index) => {
          const numMatch = line.match(/^(\d+)\.\s(.+)/);

          if (numMatch) {
            return (
              <div key={index} className="faq-answer-step">
                <span className="faq-answer-step-number">{numMatch[1]}</span>
                <span>{numMatch[2]}</span>
              </div>
            );
          }

          return line.trim() ? (
            <p key={index} className="faq-answer-note">
              {line}
            </p>
          ) : null;
        })}
      </div>
    );
  };

  return (
    <AuthProvider>
      <div className="customer-faq-page">
        <Navbar />

        <section className="faq-hero">
          <div className="faq-hero-inner">
            <div className="faq-hero-text">
              <div className="faq-breadcrumb">
                <span className="faq-breadcrumb-badge">Customer</span>
                <span className="faq-breadcrumb-sep">•</span>
                <span>Help Center</span>
              </div>

              <h1 className="faq-title">Frequently Asked Questions</h1>

              <p className="faq-subtitle">
                Everything you need to know about booking, payments, and managing your stay in Sarawak.
              </p>
            </div>

            <div className="faq-stats">
              <div className="faq-stat">
                <span className="faq-stat-number">{faqs.length}</span>
                <span className="faq-stat-label">Answers</span>
              </div>

              <div className="faq-stat">
                <span className="faq-stat-number">{faqCategories.length}</span>
                <span className="faq-stat-label">Topics</span>
              </div>
            </div>
          </div>
        </section>

        <section className="faq-search-section">
          <div className="faq-search-box">
            <span className="faq-search-icon">
              <SearchIcon />
            </span>

            <input
              type="text"
              className="faq-search-input"
              placeholder="Search across all topics..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setOpenId(null);
              }}
            />

            {searchQuery && (
              <button
                type="button"
                className="faq-search-clear"
                onClick={() => {
                  setSearchQuery('');
                  setOpenId(null);
                }}
              >
                ×
              </button>
            )}
          </div>

          {!searchQuery && (
            <div className="faq-popular-wrap">
              <div className="faq-popular-card">
                <span className="faq-popular-label">Popular:</span>

                {quickPicks.map((faq) => (
                  <button
                    key={faq.id}
                    type="button"
                    className="faq-popular-chip"
                    onClick={() => handleQuickPick(faq)}
                  >
                    {faq.q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="faq-main">
          <aside className="faq-sidebar">
            <div className="faq-sidebar-card">
              <div className="faq-sidebar-title">Topics</div>

              <div className="faq-topic-list">
                {faqCategories.map((cat) => {
                  const isActive = !searchQuery && activeCategory === cat.id;
                  const iconColor = isActive ? '#493829' : '#7A6555';

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`faq-topic-btn ${isActive ? 'active' : ''}`}
                      onClick={() => selectCategory(cat.id)}
                    >
                      <span className="faq-topic-left">
                        {catIcon(cat.id, iconColor)}
                        <span className="faq-topic-name">{cat.label}</span>
                      </span>

                      <span className="faq-topic-count">{catCount(cat.id)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="faq-help-box">
                <button type="button" className="faq-help-btn" onClick={scrollToForm}>
                  📩 Still need help?
                </button>
              </div>
            </div>
          </aside>

          <main className="faq-content-panel">
            <div className="faq-section-header">
              <h2 className="faq-section-title">
                {searchQuery ? <>Search results for “{searchQuery}”</> : activeCat?.label || 'Frequently Asked Questions'}
              </h2>

              <p className="faq-section-desc">
                {searchQuery
                  ? `${filteredFaqs.length} ${filteredFaqs.length === 1 ? 'answer' : 'answers'} found.`
                  : activeCat?.subtitle}
              </p>
            </div>

            <div className="faq-accordion-list">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq) => {
                  const isOpen = openId === faq.id;

                  return (
                    <article key={faq.id} id={faq.id} className={`faq-accordion-item ${isOpen ? 'active' : ''}`}>
                      <button type="button" className="faq-accordion-header" onClick={() => setOpenId(isOpen ? null : faq.id)}>
                        <span className="faq-accordion-question">
                          {searchQuery ? highlight(faq.q, searchQuery) : faq.q}
                        </span>

                        <span className={`faq-accordion-icon ${isOpen ? 'rotate' : ''}`}>
                          <ChevronDown />
                        </span>
                      </button>

                      <div className={`faq-accordion-body ${isOpen ? 'open' : ''}`}>
                        <div className="faq-accordion-content">
                          {formatAnswer(faq.a, faq.isList)}

                          {faq.isPublished && (
                            <div className="faq-tip">
                              📌 Published by Admin
                            </div>
                          )}

                          {faq.tip && <div className="faq-tip">{faq.tip}</div>}

                          <div className="faq-helpful-row">
                            <span className="faq-helpful-text">Was this helpful?</span>

                            <div className="faq-helpful-actions">
                              <button
                                type="button"
                                className={`faq-helpful-btn ${feedbackState[faq.id] === 'up' ? 'active' : ''}`}
                                onClick={() => handleFeedback(faq.id, 'up')}
                              >
                                👍
                              </button>

                              <button
                                type="button"
                                className={`faq-helpful-btn ${feedbackState[faq.id] === 'down' ? 'active negative' : ''}`}
                                onClick={() => handleFeedback(faq.id, 'down')}
                              >
                                👎
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="faq-empty">
                  <div className="faq-empty-icon">
                    <SearchIcon />
                  </div>
                  <h3>No results found</h3>
                  <p>Try a different search term or browse a topic on the left.</p>
                </div>
              )}
            </div>

            <div id="support-form" className="faq-form-wrap">
              {!showSupportForm ? (
                <div className="faq-support-card">
                  <div>
                    <h3>Can’t find what you’re looking for?</h3>
                    <p>Send your question to our support team. We usually respond within 24 hours.</p>
                  </div>

                  <button
                    type="button"
                    className="faq-support-toggle-btn"
                    onClick={() => setShowSupportForm(true)}
                  >
                    Ask a Question
                  </button>
                </div>
              ) : (
                <>
                  <div className="faq-support-form-header">
                    <div>
                      <h3>Ask a Question</h3>
                      <p>Please provide your question details below.</p>
                    </div>

                    <button
                      type="button"
                      className="faq-support-close-btn"
                      onClick={() => setShowSupportForm(false)}
                    >
                      Hide Form
                    </button>
                  </div>

                  <AskQuestionForm role="customer" categories={faqCategories} theme="customer" />
                </>
              )}
            </div>
          </main>
        </section>

        <Footer />

         <Back_To_Top_Button />
      </div>
    </AuthProvider>
  );
}