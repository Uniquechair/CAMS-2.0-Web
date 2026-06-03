import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaEnvelope } from "react-icons/fa6";
import TermsPrivacyModal from "../TermsPrivacy/TermsPrivacyModal";
import "./footer.css";

const Footer = () => {
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [initialSection, setInitialSection] = useState("terms");

  const openTerms = () => {
    setInitialSection("terms");
    setShowTermsModal(true);
  };

  const openPrivacy = () => {
    setInitialSection("privacy");
    setShowTermsModal(true);
  };

  const closeModal = () => setShowTermsModal(false);

  return (
    <>
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <h2>Hello Sarawak</h2>
            <p>Your Journey Begins</p>
          </div>

          <div className="footer-column">
            <h3>Support</h3>
            <Link to="/customer-faq">Frequently Asked Questions</Link>
            <Link to="/customer-faq">Contact</Link>
            <Link to="/customer-faq">How to Book</Link>
            <Link to="/customer-faq">Payment Methods</Link>
          </div>

          <div className="footer-column">
            <h3>Partner with Us</h3>
            <Link to="/register">List Your Property</Link>
          </div>

          <div className="footer-column">
            <h3>Terms and Settings</h3>
            <button type="button" onClick={openTerms}>
              Terms of Use
            </button>
            <button type="button" onClick={openPrivacy}>
              Privacy Statement
            </button>
          </div>

          <div className="footer-column">
            <h3>About</h3>
            <Link to="/about_us">About Hello Sarawak</Link>

            <Link
              to="/about_sarawak"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  left: 0,
                  behavior: "smooth",
                })
              }
            >
              About Sarawak
            </Link>

            <Link to="/product">Browse Stays</Link>
          </div>

          {/* 
          <div className="footer-column">
            <h3>NGO</h3>
            <span className="footer-hover-text">
              Gabungan Usahawan Homestay Sarawak
            </span>
          </div>
          */}

          <div className="footer-column footer-contact">
            <h3>Contact Us</h3>
            <a href="mailto:hellosarawak@webnyou.com">
              <FaEnvelope />
              <span>hellosarawak@webnyou.com</span>
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Hello Sarawak. All rights reserved.</p>
        </div>
      </footer>

      <TermsPrivacyModal
        isOpen={showTermsModal}
        onClose={closeModal}
        onAccept={closeModal}
        initialSection={initialSection}
      />
    </>
  );
};

export default Footer;