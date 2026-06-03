import React, { useState, useEffect, useMemo } from 'react';
import AskQuestionForm from './AskQuestionForm.jsx';
import './ModeratorFAQ.css';
import { fetchPublishedFaqs } from '../../../../../Api/api';

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const ChevronDown = ({ open }) => (
  <svg className={open ? 'mod-faq-chevron open' : 'mod-faq-chevron'} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const ThumbIcon = ({ down = false }) => (
  <svg className={down ? 'mod-faq-thumb down' : 'mod-faq-thumb'} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10v12" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
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
    properties: (
      <>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
    reservations: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
    finance: (
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </>
    ),
  };

  return (
    <svg className="mod-faq-topic-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[id] || paths.account}
    </svg>
  );
};

const faqCategories = [
  { id: 'account', label: 'Account & Profile', subtitle: 'Managing your moderator credentials and personal details.' },
  { id: 'properties', label: 'Property Management', subtitle: 'Creating, submitting, and updating property listings.' },
  { id: 'reservations', label: 'Reservations', subtitle: 'Accepting, rejecting, and suggesting alternative rooms.' },
  { id: 'finance', label: 'Finance & Logs', subtitle: 'Tracking payments, audit trails, and system activity.' },
];

const defaultFaqs = [
  {
    id: 'm-acc1',
    category: 'account',
    q: 'How do I access the Moderator dashboard?',
    a: 'The Moderator role must first be assigned to your account by the CAMS Owner. Once your role has been updated, log in using your existing credentials. You will be redirected to the Moderator dashboard instead of the customer homepage.',
  },
  {
    id: 'm-acc4',
    category: 'account',
    q: 'How do I update my profile or PayPal information?',
    a: 'Navigate to your Profile page. From there, you can edit your phone number, update your password, and change your PayPal email address. Click Save to apply any changes.',
    tip: '💡 Keep your PayPal email up to date because this is the account that receives payment from customer bookings.',
  },
  {
    id: 'm-prop1',
    category: 'properties',
    q: 'How do I create a new property listing?',
    a: '1. Go to the Property Listing page in your Moderator dashboard.\n2. Click Create New Property.\n3. Fill in all required details: name, location, type, facilities, price, house rules, and images.\n4. Click Submit to send the listing for administrator review.',
    isList: true,
  },
  {
    id: 'm-prop2',
    category: 'properties',
    q: "Why does my new property show a 'Pending' status?",
    a: 'When you submit a new property listing, it is sent to an Administrator for review and approval before it becomes visible to customers. The Pending status means your listing is in the review queue.',
  },
  {
    id: 'm-prop5',
    category: 'properties',
    q: 'What are blackout dates and how do I configure them?',
    a: 'Blackout dates are periods when a property is unavailable for booking, such as maintenance, private events, or public holidays. Customers will see these dates greyed-out and will not be able to select them.',
  },
  {
    id: 'm-res2',
    category: 'reservations',
    q: "How do I accept a customer's booking request?",
    a: 'On the Reservations page, select the pending reservation and click Accept. The reservation status changes to Accepted and the customer is automatically notified to proceed with payment.',
  },
  {
    id: 'm-res4',
    category: 'reservations',
    q: 'How do I suggest an alternative room to a customer?',
    a: '1. Reject the original reservation request.\n2. Click the Suggest button that appears.\n3. Select another available property from your listings.\n4. Confirm the suggestion.\nThe customer will receive a notification with the alternative property details.',
    isList: true,
  },
  {
    id: 'm-fin1',
    category: 'finance',
    q: 'How will I know when a customer has paid for their booking?',
    a: 'You will receive a payment confirmation notification in your bell icon as soon as the customer completes the transaction via PayPal. The reservation status will update automatically.',
    tip: '💡 Payment goes directly to your connected PayPal account. Ensure your PayPal email is correctly set in your Profile.',
  },
  {
    id: 'm-fin2',
    category: 'finance',
    q: 'Where can I find the Book & Pay Log?',
    a: 'Navigate to the Book & Pay Log page from your Moderator dashboard sidebar. This page displays a filterable history of payments and bookings associated with your properties.',
  },
  {
    id: 'm-fin3',
    category: 'finance',
    q: 'What information does the Audit Trail show?',
    a: '- Property creation and updates\n- Reservation decisions such as accept, reject, and suggest\n- Customer payment transactions\n- Login and logout events\nThis is useful for tracking changes and verifying activity over time.',
    isList: true,
  },
];

const QUICK_PICK_IDS = ['m-prop1', 'm-res2', 'm-fin1'];

const normalizeModeratorCategory = (category = '') => {
  const value = String(category || '').toLowerCase().trim();

  if (value === 'account') return 'account';
  if (value === 'properties' || value === 'property' || value === 'browse') return 'properties';
  if (value === 'reservations' || value === 'reservation' || value === 'booking') return 'reservations';
  if (value === 'finance' || value === 'payment') return 'finance';

  return null;
};

export default function ModeratorFAQ() {
  const [activeCategory, setActiveCategory] = useState('account');
  const [searchQuery, setSearchQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [feedbackState, setFeedbackState] = useState({});
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [publishedFaqs, setPublishedFaqs] = useState([]);

  useEffect(() => {
    const handleScroll = () => setShowTopBtn(window.scrollY > 400);

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
            const normalizedCategory = normalizeModeratorCategory(faq.category);

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

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) {
      return faqs.filter((faq) => faq.category === activeCategory);
    }

    const query = searchQuery.toLowerCase();

    return faqs.filter((faq) => {
      return faq.q.toLowerCase().includes(query) || faq.a.toLowerCase().includes(query);
    });
  }, [faqs, searchQuery, activeCategory]);

  const activeCat = faqCategories.find((cat) => cat.id === activeCategory);
  const quickPicks = faqs.filter((faq) => QUICK_PICK_IDS.includes(faq.id));
  const catCount = (catId) => faqs.filter((faq) => faq.category === catId).length;

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const scrollToForm = () => {
    setShowSupportForm(true);

    setTimeout(() => {
      document.getElementById('moderator-support-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  const handleFeedback = (faqId, type) => {
    setFeedbackState((prev) => ({ ...prev, [faqId]: type }));
  };

  const selectCategory = (catId) => {
    setActiveCategory(catId);
    setSearchQuery('');
    setOpenId(null);
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

  const highlight = (text, query) => {
    if (!query.trim()) return text;

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="mod-faq-highlight">
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
      return <p className="mod-faq-answer-text">{text}</p>;
    }

    return (
      <div className="mod-faq-answer-list">
        {text.split('\n').map((line, index) => {
          const numMatch = line.match(/^(\d+)\.\s(.+)/);

          if (numMatch) {
            return (
              <div key={index} className="mod-faq-answer-step">
                <span className="mod-faq-answer-step-number">{numMatch[1]}</span>
                <span>{numMatch[2]}</span>
              </div>
            );
          }

          if (line.startsWith('- ')) {
            return (
              <div key={index} className="mod-faq-answer-bullet">
                <span>●</span>
                <p>{line.substring(2)}</p>
              </div>
            );
          }

          return line.trim() ? (
            <p key={index} className="mod-faq-answer-note">
              {line}
            </p>
          ) : null;
        })}
      </div>
    );
  };

  return (
    <div className="moderator-faq-page">
      <section className="mod-faq-hero">
        <div className="mod-faq-hero-inner">
          <div className="mod-faq-hero-text">
            <div className="mod-faq-breadcrumb">
              <span className="mod-faq-badge">Moderator</span>
              <span>• Help Center</span>
            </div>

            <h1>Help & Support</h1>

            <p>
              Quick answers for managing properties, handling reservations, and tracking payments on CAMS.
            </p>
          </div>

          <div className="mod-faq-stats">
            <div>
              <strong>{faqs.length}</strong>
              <span>Answers</span>
            </div>

            <div className="mod-faq-divider" />

            <div>
              <strong>{faqCategories.length}</strong>
              <span>Topics</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mod-faq-search-section">
        <div className="mod-faq-search-box">
          <span>
            <SearchIcon />
          </span>

          <input
            type="text"
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
              onClick={() => {
                setSearchQuery('');
                setOpenId(null);
              }}
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </section>

      {!searchQuery && (
        <section className="mod-faq-popular">
          <div className="mod-faq-popular-inner">
            <span>Popular:</span>

            {quickPicks.map((faq) => (
              <button key={faq.id} type="button" onClick={() => handleQuickPick(faq)}>
                <i />
                {faq.q.length > 52 ? faq.q.slice(0, 50) + '…' : faq.q}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mod-faq-main">
        <aside className="mod-faq-sidebar">
          <h3>Topics</h3>

          <div className="mod-faq-topic-list">
            {faqCategories.map((cat) => {
              const isActive = !searchQuery && activeCategory === cat.id;
              const iconColor = isActive ? '#5c8721' : '#6b7280';

              return (
                <button
                  key={cat.id}
                  type="button"
                  className={isActive ? 'mod-faq-topic-btn active' : 'mod-faq-topic-btn'}
                  onClick={() => selectCategory(cat.id)}
                >
                  <span>
                    {catIcon(cat.id, iconColor)}
                    <strong>{cat.label}</strong>
                  </span>

                  <em>{catCount(cat.id)}</em>
                </button>
              );
            })}
          </div>

          <div className="mod-faq-help-box">
            <button type="button" onClick={scrollToForm}>
              ✉️ Need admin help?
            </button>
          </div>
        </aside>

        <main className="mod-faq-content">
          <div className="mod-faq-section-header">
            <h2>
              {searchQuery ? (
                <>Results for <span>"{searchQuery}"</span></>
              ) : (
                activeCat?.label || 'Moderator Guidelines'
              )}
            </h2>

            <p>
              {searchQuery
                ? `${filteredFaqs.length} ${filteredFaqs.length === 1 ? 'answer' : 'answers'} found`
                : activeCat?.subtitle}
            </p>
          </div>

          <div className="mod-faq-accordion-list">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq) => {
                const isOpen = openId === faq.id;

                return (
                  <article
                    key={faq.id}
                    id={faq.id}
                    className={isOpen ? 'mod-faq-accordion active' : 'mod-faq-accordion'}
                  >
                    <button type="button" className="mod-faq-accordion-header" onClick={() => setOpenId(isOpen ? null : faq.id)}>
                      <span>{searchQuery ? highlight(faq.q, searchQuery) : faq.q}</span>
                      <ChevronDown open={isOpen} />
                    </button>

                    <div className={isOpen ? 'mod-faq-accordion-body open' : 'mod-faq-accordion-body'}>
                      <div className="mod-faq-accordion-content">
                        {formatAnswer(faq.a, faq.isList)}

                        {faq.isPublished && (
                          <div className="mod-faq-tip">
                            📌 Published by Admin
                          </div>
                        )}

                        {faq.tip && <div className="mod-faq-tip">{faq.tip}</div>}

                        <div className="mod-faq-helpful">
                          <span>Was this helpful?</span>

                          <div>
                            <button
                              type="button"
                              className={feedbackState[faq.id] === 'up' ? 'active' : ''}
                              onClick={() => handleFeedback(faq.id, 'up')}
                            >
                              <ThumbIcon />
                            </button>

                            <button
                              type="button"
                              className={feedbackState[faq.id] === 'down' ? 'active negative' : ''}
                              onClick={() => handleFeedback(faq.id, 'down')}
                            >
                              <ThumbIcon down />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="mod-faq-empty">
                <div>
                  <SearchIcon />
                </div>
                <h3>No results found</h3>
                <p>Try a different search term or browse a topic on the left.</p>
              </div>
            )}
          </div>

          <div id="moderator-support-form" className="mod-faq-form-wrap">
            {!showSupportForm ? (
              <div className="mod-faq-support-card">
                <div>
                  <h3>Need help from Admin?</h3>
                  <p>Send your question to the administrator team for support.</p>
                </div>

                <button type="button" onClick={() => setShowSupportForm(true)}>
                  Ask Admin
                </button>
              </div>
            ) : (
              <>
                <div className="mod-faq-support-header">
                  <div>
                    <h3>Ask Admin</h3>
                    <p>Please provide your question details below.</p>
                  </div>

                  <button type="button" onClick={() => setShowSupportForm(false)}>
                    Hide Form
                  </button>
                </div>

                <AskQuestionForm role="moderator" categories={faqCategories} theme="moderator" />
              </>
            )}
          </div>
        </main>
      </section>

      <button type="button" onClick={scrollToTop} className={showTopBtn ? 'mod-faq-backtop show' : 'mod-faq-backtop'} aria-label="Back to top">
        ↑
      </button>
    </div>
  );
}