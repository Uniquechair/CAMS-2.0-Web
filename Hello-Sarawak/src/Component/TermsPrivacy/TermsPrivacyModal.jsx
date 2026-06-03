import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import "./TermsPrivacyModal.css";

const sections = [
  { id: "terms",        label: "Terms & Conditions",          group: "terms" },
  { id: "intro",        label: "1. Introduction",             group: "terms" },
  { id: "general",      label: "2. General Policy",           group: "terms" },
  { id: "account",      label: "3. User Account Policy",      group: "terms" },
  { id: "booking",      label: "4. Booking Policy",           group: "terms" },
  { id: "property",     label: "5. Property Listing Policy",  group: "terms" },
  { id: "pricing",      label: "6. Pricing",                  group: "terms" },
  { id: "payment",      label: "7. Payment Policy",           group: "terms" },
  { id: "cancellation", label: "8. Cancellation & Refund",    group: "terms" },
  { id: "reviews",      label: "9. Reviews & Content",        group: "terms" },
  { id: "notifications",label: "10. Notifications",           group: "terms" },
  { id: "privacy",      label: "Privacy Statement",           group: "privacy" },
  { id: "data",         label: "11. Data We Collect",         group: "privacy" },
  { id: "use",          label: "12. Use of Personal Data",    group: "privacy" },
  { id: "control",      label: "13. User Control",            group: "privacy" },
  { id: "security",     label: "14. Data Protection",         group: "privacy" },
  { id: "third-party",  label: "15. Third Parties",           group: "privacy" },
  { id: "cookies",      label: "16. Cookies & Storage",       group: "privacy" },
  { id: "legal",        label: "17. Legal Disclosure",        group: "privacy" },
  { id: "contact",      label: "18. Contact",                 group: "privacy" },
];

const TermsPrivacyModal = ({ isOpen, onClose, onAccept, initialSection }) => {
  const [accepted, setAccepted]               = useState(false);
  const [activeId, setActiveId]               = useState("terms");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const contentRef = useRef(null);
  const sidebarRef = useRef(null);
  const navBtnRefs = useRef({});

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Scroll sidebar so the active nav button is always in view
  const scrollSidebarTo = (id) => {
    const sidebar = sidebarRef.current;
    const btn     = navBtnRefs.current[id];
    if (!sidebar || !btn) return;
    const btnTop    = btn.offsetTop;
    const btnBottom = btnTop + btn.offsetHeight;
    const visTop    = sidebar.scrollTop;
    const visBottom = visTop + sidebar.offsetHeight;
    if (btnTop < visTop + 20) {
      sidebar.scrollTo({ top: btnTop - 20, behavior: "smooth" });
    } else if (btnBottom > visBottom - 20) {
      sidebar.scrollTo({ top: btnBottom - sidebar.offsetHeight + 20, behavior: "smooth" });
    }
  };

  // Use scrollIntoView — reliable across all section types, no offset math
  const scrollContentTo = (id, animate = true) => {
    const container = contentRef.current;
    const el        = container?.querySelector(`#${id}`);
    if (!el || !container) return;

    el.scrollIntoView({
      behavior: animate ? "smooth" : "instant",
      block: "start",
    });

    setActiveId(id);
    scrollSidebarTo(id);
    setIsMobileNavOpen(false);
  };

  // On open: jump to target section after DOM has painted
  useEffect(() => {
    if (!isOpen) return;
    const target = initialSection || "terms";
    setActiveId(target);

    const timer = setTimeout(() => {
      scrollContentTo(target, false);
    }, 100);
    return () => clearTimeout(timer);
  }, [isOpen, initialSection]);

  // Scroll-spy: keep sidebar in sync as user scrolls content
  useEffect(() => {
    if (!isOpen) return;
    const container = contentRef.current;
    if (!container) return;

    const handleScroll = () => {
      let newActive = sections[0].id;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = container.querySelector(`#${sections[i].id}`);
        if (el && el.getBoundingClientRect().top <= container.getBoundingClientRect().top + 60) {
          newActive = sections[i].id;
          break;
        }
      }
      setActiveId(prev => {
        if (prev !== newActive) scrollSidebarTo(newActive);
        return newActive;
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (onAccept) onAccept();
    onClose();
  };

  const termsGroups   = sections.filter(s => s.group === "terms");
  const privacyGroups = sections.filter(s => s.group === "privacy");

  const modal = (
    <div
      className="tpm-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="tpm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tpm-title"
      >
        {/* ── HEADER ── */}
        <header className="tpm-header">
          <div className="tpm-header-left">
            <span className="tpm-header-eyebrow">Hello Sarawak</span>
            <h2 id="tpm-title" className="tpm-header-title">Terms &amp; Privacy</h2>
          </div>
          <button className="tpm-close-btn" onClick={onClose} aria-label="Close modal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* ── MOBILE NAV TOGGLE ── */}
        <button
          className="tpm-mobile-nav-toggle"
          onClick={() => setIsMobileNavOpen(v => !v)}
          aria-expanded={isMobileNavOpen}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16">
            <line x1="3" y1="6"  x2="21" y2="6"  />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <span>{isMobileNavOpen ? "Hide sections" : "Browse sections"}</span>
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            width="14" height="14"
            className={`tpm-chevron ${isMobileNavOpen ? "open" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* ── BODY ── */}
        <div className="tpm-body">

          {/* SIDEBAR */}
          <aside
            className={`tpm-sidebar ${isMobileNavOpen ? "mobile-open" : ""}`}
            ref={sidebarRef}
          >
            <div className="tpm-sidebar-inner">
              <div className="tpm-nav-group">
                <p className="tpm-nav-group-label">Terms &amp; Conditions</p>
                {termsGroups.map(s => (
                  <button
                    key={s.id}
                    ref={el => { navBtnRefs.current[s.id] = el; }}
                    className={`tpm-nav-btn ${activeId === s.id ? "active" : ""} ${s.id === "terms" ? "nav-chapter" : ""}`}
                    onClick={() => scrollContentTo(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="tpm-nav-group">
                <p className="tpm-nav-group-label">Privacy Policy</p>
                {privacyGroups.map(s => (
                  <button
                    key={s.id}
                    ref={el => { navBtnRefs.current[s.id] = el; }}
                    className={`tpm-nav-btn ${activeId === s.id ? "active" : ""} ${s.id === "privacy" ? "nav-chapter" : ""}`}
                    onClick={() => scrollContentTo(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* CONTENT — wrapper div gives top padding so sections aren't clipped */}
          <main className="tpm-content" ref={contentRef}>
            <div className="tpm-content-inner">

              <section id="terms" className="tpm-chapter-header">
                <span className="tpm-chapter-badge">Part I</span>
                <h1 className="tpm-chapter-title">Terms &amp; Conditions</h1>
                <p>Welcome to <strong>Hello Sarawak</strong>, a Centralized Accommodation Management System designed to help customers search, view, and book accommodations across Sarawak. The platform also supports local accommodation providers by allowing them to manage property listings, reservations, availability, pricing, and customer bookings.</p>
                <p>By accessing or using the Hello Sarawak website or mobile application, you agree to follow these Terms and Conditions. If you do not agree with these terms, you should not use the platform or make any booking through the system.</p>
                <p>Hello Sarawak may update these Terms and Conditions from time to time. Continued use of the platform after any updates means that you accept the revised terms.</p>
              </section>

              <section id="intro" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">1</span>Introduction</h2>
                <p>Hello Sarawak provides an online platform for accommodation discovery and booking. Users may browse properties, check details, make reservations, complete payments, submit reviews, and receive booking-related notifications.</p>
              </section>

              <section id="general" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">2</span>General Policy</h2>
                <p>While Hello Sarawak aims to provide accurate property information, booking details, pricing, and availability, we do not guarantee that all information will always be error-free, complete, or up to date.</p>
                <p>Hello Sarawak will not be responsible for any loss, damage, delay, injury, accident, service disruption, or inconvenience caused by incorrect platform use, inaccurate information submitted by users or property owners, third-party service issues, payment gateway issues, hosting downtime, or changes made by property owners after a listing has been published.</p>
              </section>

              <section id="account" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">3</span>User Account Policy</h2>
                <p>Users may be required to create an account to access certain features such as making reservations, managing bookings, posting reviews, receiving notifications, or managing property listings.</p>
                <p>Users are responsible for keeping their login details secure. Hello Sarawak reserves the right to suspend or restrict accounts involved in fraud, misuse, false information, abusive reviews, spam, or actions that may affect the safety and reliability of the platform.</p>
              </section>

              <section id="booking" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">4</span>Booking Policy</h2>
                <p>Customers may browse available properties, view details, check pricing, and make reservations through Hello Sarawak.</p>
                <p>A booking is only considered confirmed after the required payment or deposit has been successfully completed. If payment is not completed, the booking may remain unconfirmed and the selected room or property may still be available to other customers.</p>
                <p>Hello Sarawak reserves the right to cancel or reject bookings if there is evidence of incorrect information, payment failure, system error, duplicate booking, suspicious activity, or fraudulent behaviour.</p>
              </section>

              <section id="property" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">5</span>Property Listing Policy</h2>
                <p>Property owners are responsible for ensuring that property information is accurate. This includes property name, description, location, images, facilities, room details, availability, pricing, house rules, and cancellation conditions.</p>
                <p>Hello Sarawak may review, approve, reject, hide, or remove property listings that contain misleading information, inappropriate content, invalid images, unavailable accommodation, or content that does not follow platform rules.</p>
              </section>

              <section id="pricing" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">6</span>Room Reservation and Pricing</h2>
                <p>All prices shown on Hello Sarawak are displayed in Malaysian Ringgit (RM), unless stated otherwise.</p>
                <p>Prices may vary depending on normal rates, weekend rates, festive or public holiday rates, discounts, platform fees, taxes, or other charges configured in the system.</p>
                <p>Customers should review the final booking amount before making payment.</p>
              </section>

              <section id="payment" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">7</span>Payment Policy</h2>
                <p>Payments on Hello Sarawak may include full payment, deposit payment, or other payment options provided by the platform.</p>
                <p>A booking will only be processed or confirmed once payment is successfully completed. If a customer exits the payment process or fails to complete payment, the booking may remain unconfirmed.</p>
                <p>Hello Sarawak may store payment status, booking records, transaction references, and payment logs for booking management and audit purposes. Full credit card details should not be permanently stored by Hello Sarawak unless required and securely handled by an authorised payment provider.</p>
              </section>

              <section id="cancellation" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">8</span>Cancellation and Refund Policy</h2>
                <p>Cancellation and refund conditions may depend on the property, booking type, payment type, and cancellation rules shown during booking.</p>
                <p>Some bookings may be non-refundable if stated clearly before payment. Failure to arrive at the property on the confirmed check-in date may be treated as a no-show, and the customer may not be entitled to a refund.</p>
                <p>If a refund is approved, the refund processing time may depend on the payment provider, bank, or internal approval process.</p>
              </section>

              <section id="reviews" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">9</span>Reviews and User Content</h2>
                <p>Customers may submit reviews, ratings, comments, or feedback about properties.</p>
                <p>Users must not submit content that is offensive, abusive, threatening, discriminatory, false, misleading, spam, or contains inappropriate language. Hello Sarawak may filter, hide, reject, or remove reviews that violate these rules.</p>
              </section>

              <section id="notifications" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">10</span>Notifications and Email Reminders</h2>
                <p>Hello Sarawak may send notifications, email reminders, booking confirmations, payment reminders, cancellation updates, or account-related messages through the website, mobile application, email, or other supported channels.</p>
                <p>Users are responsible for ensuring that their email address and contact information are correct.</p>
              </section>

              {/* ── PRIVACY ── */}
              <section id="privacy" className="tpm-chapter-header">
                <span className="tpm-chapter-badge">Part II</span>
                <h1 className="tpm-chapter-title">Privacy Statement</h1>
                <p>Hello Sarawak values the privacy and security of its users. This Privacy Statement explains how we collect, use, store, and protect personal information when users access the Hello Sarawak website or mobile application.</p>
                <p>By using Hello Sarawak, you agree to the collection and use of information as described in this Privacy Statement.</p>
              </section>

              <section id="data" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">11</span>Personal Data We Collect</h2>
                <p>Hello Sarawak may collect personal information provided by users during registration, booking, payment, review submission, or contact form submission.</p>
                <ul className="tpm-list">
                  <li>Full name and username</li>
                  <li>Email address and phone number</li>
                  <li>Password or login credentials</li>
                  <li>Google Sign-In information, where applicable</li>
                  <li>Booking details and property preferences</li>
                  <li>Payment status and transaction references</li>
                  <li>Customer review content and notification records</li>
                  <li>IP address, device information, and system activity logs</li>
                </ul>
                <p>For property owners, Hello Sarawak may also collect property-related information such as property name, address, images, room details, pricing, availability, and listing status.</p>
              </section>

              <section id="use" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">12</span>How We Use Personal Data</h2>
                <p>Hello Sarawak may use collected information to:</p>
                <ul className="tpm-list">
                  <li>Create and manage user accounts</li>
                  <li>Authenticate users and manage login sessions</li>
                  <li>Provide role-based access for customers, property owners, moderators, and administrators</li>
                  <li>Process reservations and booking records</li>
                  <li>Record payment status and transaction references</li>
                  <li>Allow property owners to manage accommodation listings</li>
                  <li>Respond to enquiries, complaints, or technical issues</li>
                  <li>Send booking confirmations, reminders, and system alerts</li>
                  <li>Monitor suspicious activity and maintain audit trail records</li>
                </ul>
              </section>

              <section id="control" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">13</span>User Control Over Personal Data</h2>
                <p>Users may review and update certain personal information through their account profile, where supported by the system.</p>
                <p>Users may request account changes or deletion, subject to legal, security, booking, audit, or payment record requirements.</p>
                <p>Some records, such as audit trails, booking logs, and payment records, may need to be retained for system integrity, dispute handling, or administrative purposes.</p>
              </section>

              <section id="security" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">14</span>Protecting Personal Data</h2>
                <p>Hello Sarawak aims to protect user data using appropriate security measures, including controlled access, authentication, encrypted password storage, secure login handling, and role-based permissions.</p>
                <p>Users should protect their own account by using a strong password and not sharing login details with others. While Hello Sarawak takes reasonable steps to protect personal data, no online platform can guarantee complete security against all risks.</p>
              </section>

              <section id="third-party" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">15</span>Sharing Personal Data with Third Parties</h2>
                <p>Hello Sarawak may share limited user data with third-party services when necessary to operate the platform.</p>
                <ul className="tpm-list">
                  <li>Hosting and database providers</li>
                  <li>Email or notification services</li>
                  <li>Payment gateway providers</li>
                  <li>Authentication providers such as Google Sign-In</li>
                  <li>Analytics or system monitoring tools</li>
                </ul>
                <p>These third parties should only access information needed to provide their services. Hello Sarawak does not sell users' personal data to advertisers.</p>
              </section>

              <section id="cookies" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">16</span>Cookies and Local Storage</h2>
                <p>Hello Sarawak may use cookies, browser storage, or similar technologies to support login sessions, authentication tokens, preferences, and system functionality.</p>
                <p>Disabling cookies or browser storage may affect some platform features, including login, booking, notifications, or dashboard access.</p>
              </section>

              <section id="legal" className="tpm-section">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">17</span>Legal Disclosure</h2>
                <p>Hello Sarawak may disclose personal information if required by law, legal process, investigation, government request, or to protect the rights, safety, and security of the platform, users, or property owners.</p>
              </section>

              <section id="contact" className="tpm-section tpm-section-last">
                <h2 className="tpm-section-heading"><span className="tpm-section-num">18</span>Contact</h2>
                <p>For questions about bookings, accounts, payments, listings, platform use, or privacy-related requests, users may contact Hello Sarawak through the contact form or support email provided on the platform.</p>
                <div className="tpm-contact-card">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
              </section>

            </div>{/* end .tpm-content-inner */}
          </main>
        </div>

        {/* ── FOOTER ── */}
        <footer className="tpm-footer">
          <label className="tpm-checkbox-label">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="tpm-checkbox"
            />
            <span className="tpm-checkbox-custom" aria-hidden="true" />
            <span className="tpm-checkbox-text">
              I have read and agree to the Terms &amp; Conditions and Privacy Policy.
            </span>
          </label>
          <div className="tpm-footer-btns">
            <button className="tpm-btn tpm-btn-ghost" onClick={onClose}>Close</button>
            <button
              className={`tpm-btn tpm-btn-primary ${!accepted ? "disabled" : ""}`}
              disabled={!accepted}
              onClick={handleAccept}
            >
              Accept &amp; Continue
            </button>
          </div>
        </footer>

      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
};

export default TermsPrivacyModal;