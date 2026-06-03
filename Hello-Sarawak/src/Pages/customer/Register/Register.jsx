import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './Register.css';

import logo from '../../../public/Sarawak_icon.png';

import {
  FaMailBulk,
  FaUserAlt,
  FaPhoneAlt,
  FaUserCircle,
  FaEyeSlash,
  FaCheckCircle,
  FaFileContract,
  FaShieldAlt
} from 'react-icons/fa';

import { RiLockPasswordFill, RiLockPasswordLine } from 'react-icons/ri';
import { IoEyeSharp } from 'react-icons/io5';

import { signupUser, checkRegisterDuplicate } from '../../../../Api/api';
import Toast from '../../../Component/Toast/Toast';
import VisualCaptcha from '../../../Component/VisualCaptcha/VisualCaptcha';

import { termsContent } from './termsContent';
import { privacyContent } from './privacyContent';

/* ── PASSWORD STRENGTH  ── */
const getPasswordStrength = (pw) => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};

const strengthMeta = [
  { label: '',            hint: '' },
  { label: 'Weak',        hint: 'Add uppercase letters, numbers or symbols' },
  { label: 'Fair',        hint: 'Getting better — try adding more variety' },
  { label: 'Strong',      hint: 'Great! One more type for maximum strength' },
  { label: 'Very strong', hint: 'Excellent password!' },
];

/* ── PASSWORD STRENGTH BAR COMPONENT ── */
const PasswordStrengthBar = ({ password }) => {
  if (!password) return null;
  const strength = getPasswordStrength(password);
  const meta = strengthMeta[strength];

  return (
    <div className={`pwd-strength-wrap strength-${strength}`}>
      <div className="pwd-bars">
        <div className="pwd-bar" />
        <div className="pwd-bar" />
        <div className="pwd-bar" />
        <div className="pwd-bar" />
      </div>
      <div className="pwd-meta-row">
        <span className="pwd-label">{meta.label}</span>
        {meta.hint && <span className="pwd-hint">{meta.hint}</span>}
      </div>
    </div>
  );
};

/* ── PASSWORD REQUIREMENTS CHECKLIST ── */
const PasswordRequirements = ({ password }) => {
  if (!password) return null;

  const requirements = [
    { label: 'At least 8 characters',    met: password.length >= 8 },
    { label: 'One uppercase letter (A–Z)', met: /[A-Z]/.test(password) },
    { label: 'One number (0–9)',           met: /[0-9]/.test(password) },
    { label: 'One symbol (!@#…)',          met: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <div className="pwd-requirements">
      {requirements.map((req, i) => (
        <div key={i} className={`pwd-req-item ${req.met ? 'pwd-req-met' : 'pwd-req-unmet'}`}>
          <span className="pwd-req-icon">{req.met ? '✓' : '✗'}</span>
          <span className="pwd-req-label">{req.label}</span>
        </div>
      ))}
    </div>
  );
};

const LegalAgreementModal = ({
  isOpen,
  title,
  subtitle,
  content,
  icon,
  onClose,
  onAgree,
}) => {
  const contentRef = useRef(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  if (!isOpen) return null;

  const handleScroll = () => {
    const element = contentRef.current;
    if (!element) return;
    const isAtBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 12;
    if (isAtBottom) setHasScrolledToEnd(true);
  };

  const handleAgree = () => {
    if (!hasScrolledToEnd) return;
    onAgree();
  };

  return (
    <div className="legal-modal-overlay">
      <motion.div
        className="legal-modal"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="legal-modal-header">
          <div className="legal-modal-title-wrap">
            <div className="legal-modal-icon">{icon}</div>
            <div>
              <h3>{title}</h3>
              <p>{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className="legal-modal-close"
            onClick={onClose}
            aria-label="Close legal modal"
          >
            ×
          </button>
        </div>

        <div
          ref={contentRef}
          className="legal-modal-content"
          onScroll={handleScroll}
        >
          {content.split('\n').map((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return <br key={index} />;
            const isMainTitle = index === 0;
            const isSectionTitle = /^\d+\.\s/.test(trimmed);
            if (isMainTitle) return <h2 key={index} className="legal-content-main-title">{trimmed}</h2>;
            if (isSectionTitle) return <h4 key={index} className="legal-content-section-title">{trimmed}</h4>;
            return <p key={index} className="legal-content-paragraph">{trimmed}</p>;
          })}
        </div>

        <div className="legal-scroll-note">
          {hasScrolledToEnd ? (
            <span className="legal-scroll-success">
              <FaCheckCircle /> You have reached the end. You may agree now.
            </span>
          ) : (
            <span>Please scroll to the bottom before agreeing.</span>
          )}
        </div>

        <div className="legal-modal-footer">
          <button type="button" className="btn-ghost legal-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn-primary legal-agree-btn ${!hasScrolledToEnd ? 'legal-agree-btn-disabled' : ''}`}
            disabled={!hasScrolledToEnd}
            onClick={handleAgree}
          >
            I Agree
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Register = () => {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailFieldError, setEmailFieldError] = useState('');
  const [phoneFieldError, setPhoneFieldError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const recaptchaRef = useRef(null);

  const [showPassword, setShowPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState('');

  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);
  const [activeLegalModal, setActiveLegalModal] = useState(null);

  const navigate = useNavigate();
  const userGroup = 'Customer';

  const usernameRegex = /^[a-zA-Z0-9]*$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  const displayToast = (type, message) => {
    setToastType(type);
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  const handleCaptchaChange = (isValid, token) => {
    setIsCaptchaValid(isValid);
    setRecaptchaToken(token);
  };

  const handleNextStep = async () => {
    setEmailFieldError('');
    setPhoneFieldError('');

    if (!firstName || !lastName || !email || !phoneNumber) {
      return displayToast('error', 'Please fill in all personal details.');
    }

    if (!emailRegex.test(email)) {
      setEmailFieldError('Please enter a valid email address.');
      return displayToast('error', 'Invalid email format.');
    }

    try {
      await checkRegisterDuplicate({ email, phoneNumber });
      setStep(2);
    } catch (error) {
      if (error.field === 'email') setEmailFieldError(error.message || 'This email is already registered.');
      if (error.field === 'phone') setPhoneFieldError(error.message || 'This phone number is already registered.');
      displayToast('error', error.message || 'Email or phone number already exists.');
    }
  };

  const openTermsModal   = () => setActiveLegalModal('terms');
  const openPrivacyModal = () => setActiveLegalModal('privacy');
  const closeLegalModal  = () => setActiveLegalModal(null);
  const agreeTerms       = () => { setHasAcceptedTerms(true);   setActiveLegalModal(null); };
  const agreePrivacy     = () => { setHasAcceptedPrivacy(true); setActiveLegalModal(null); };

  const canCreateAccount = isCaptchaValid && hasAcceptedTerms && hasAcceptedPrivacy;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!usernameRegex.test(username)) return displayToast('error', 'Invalid Username. Use letters and numbers.');
    if (!passwordRegex.test(password)) {
  return displayToast('error', 'Password must be at least 8 characters and include letters and numbers.');
}
    if (password !== confirmPassword)  return displayToast('error', 'Passwords do not match.');
    if (!isCaptchaValid)               return displayToast('error', 'Please verify that you are not a robot.');
    if (!hasAcceptedTerms)             return displayToast('error', 'Please read and agree to the Terms & Conditions.');
    if (!hasAcceptedPrivacy)           return displayToast('error', 'Please read and agree to the Privacy Statement.');

    const userData = {
      firstName,
      lastName,
      username,
      email,
      password,
      uphoneno: phoneNumber,
      userGroup,
      recaptchaToken,
      acceptedTerms: true,
      acceptedPrivacy: true,
    };

    try {
      const response = await signupUser(userData);
      const data = await response.json();
      if (response.ok && data.success) {
        displayToast('success', 'Registration successful!');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        displayToast('error', data.message || 'Error during registration.');
        setIsCaptchaValid(false);
        setRecaptchaToken(null);
      }
    } catch (error) {
      console.error('Error during registration:', error);
      displayToast('error', 'An error occurred during registration.');
      setIsCaptchaValid(false);
      setRecaptchaToken(null);
    }
  };

  const staggerChild = {
    hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { delay: i * 0.11 + 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    }),
  };

  const formSlideVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    exit:    { opacity: 0, x: -30, transition: { duration: 0.3, ease: 'easeIn' } },
  };

  return (
    <div className="registerPage">
      {showToast && <Toast type={toastType} message={toastMessage} />}

      <AnimatePresence>
        {activeLegalModal === 'terms' && (
          <LegalAgreementModal
            isOpen={activeLegalModal === 'terms'}
            title="Terms & Conditions"
            subtitle="Please review the booking, payment, cancellation, and platform usage terms."
            content={termsContent}
            icon={<FaFileContract />}
            onClose={closeLegalModal}
            onAgree={agreeTerms}
          />
        )}
        {activeLegalModal === 'privacy' && (
          <LegalAgreementModal
            isOpen={activeLegalModal === 'privacy'}
            title="Privacy Statement"
            subtitle="Please review how Hello Sarawak collects, stores, and protects user data."
            content={privacyContent}
            icon={<FaShieldAlt />}
            onClose={closeLegalModal}
            onAgree={agreePrivacy}
          />
        )}
      </AnimatePresence>

      <div className="register-layout">
        {/* ── LEFT PANEL ── */}
        <motion.div
          className="videoDiv"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
        >
          <div className="scenic-vignette" />
          <div className="scenic-scanline" />
          <div className="scenic-rule" />
          <div className="scenic-bar" />

          <div className="textDiv">
            <div className="scenic-top">
              <motion.div
                className="scenic-logo-mark"
                onClick={() => navigate('/')}
                custom={0}
                variants={staggerChild}
                initial="hidden"
                animate="visible"
              >
                <img src={logo} alt="Hello Sarawak" className="scenic-logo" />
                <span className="scenic-logo-wordmark">
                  Hello Sarawak
                  <small>Tourism Portal</small>
                </span>
              </motion.div>

              <motion.div
                className="scenic-badge"
                custom={0.5}
                variants={staggerChild}
                initial="hidden"
                animate="visible"
              >
                <span className="badge-pulse" />
                <span>Est. 1963 · Kuching</span>
              </motion.div>
            </div>

            <div className="scenic-hero">
              <motion.div
                className="scenic-eyebrow"
                custom={1}
                variants={staggerChild}
                initial="hidden"
                animate="visible"
              >
                <span className="eyebrow-line" />
                <span className="eyebrow-text">Begin Your Journey</span>
              </motion.div>

              <motion.h1
                className="scenic-title"
                custom={2}
                variants={staggerChild}
                initial="hidden"
                animate="visible"
              >
                Join
                <br />
                <em>Sarawak</em>
              </motion.h1>

              <motion.p
                className="scenic-tagline"
                custom={3}
                variants={staggerChild}
                initial="hidden"
                animate="visible"
              >
                Create your account and start exploring the Land of the Hornbills.
              </motion.p>
            </div>
          </div>
        </motion.div>

        {/* ── RIGHT PANEL ── */}
        <div className="formDiv">
          <div className="form-panel-scroll">
            <div className="form-panel-inner">
              <div className="step-dots">
                <span className={`step-dot ${step === 1 ? 'step-dot--active' : ''}`} />
                <span className={`step-dot ${step === 2 ? 'step-dot--active' : ''}`} />
              </div>

              <AnimatePresence mode="wait">
                {/* ── STEP 1 ── */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    variants={formSlideVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <div className="form-header">
                      <h2 className="form-heading">Create <em>account</em></h2>
                      <p className="form-subheading">Step 1: Tell us a bit about yourself</p>
                    </div>

                    <div className="field-row">
                      <div className="field-group">
                        <label className="field-label">First Name</label>
                        <div className="input-wrap">
                          <FaUserAlt className="input-icon" />
                          <input
                            type="text"
                            className="field-input"
                            placeholder="First name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="field-group">
                        <label className="field-label">Last Name</label>
                        <div className="input-wrap">
                          <FaUserAlt className="input-icon" />
                          <input
                            type="text"
                            className="field-input"
                            placeholder="Last name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className={`field-group ${emailFieldError ? 'field-group-error' : ''}`}>
                      <div className="field-label-row">
                        <label className="field-label">Email Address</label>
                        {emailFieldError && <span className="field-error-label">Already used</span>}
                      </div>
                      <div className="input-wrap">
                        <FaMailBulk className="input-icon" />
                        <input
                          type="email"
                          className={`field-input ${emailFieldError ? 'field-input-error' : ''}`}
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setEmailFieldError(''); }}
                        />
                      </div>
                      {emailFieldError && <p className="field-error-text">{emailFieldError}</p>}
                    </div>

                    <div className={`field-group ${phoneFieldError ? 'field-group-error' : ''}`}>
                      <div className="field-label-row">
                        <label className="field-label">Phone Number</label>
                        {phoneFieldError && <span className="field-error-label">Already used</span>}
                      </div>
                      <div className="input-wrap">
                        <FaPhoneAlt className="input-icon" />
                        <input
                          type="tel"
                          className={`field-input ${phoneFieldError ? 'field-input-error' : ''}`}
                          placeholder="+60 12 345 6789"
                          value={phoneNumber}
                          onChange={(e) => { setPhoneNumber(e.target.value); setPhoneFieldError(''); }}
                        />
                      </div>
                      {phoneFieldError && <p className="field-error-text">{phoneFieldError}</p>}
                    </div>

                    <motion.button
                      type="button"
                      onClick={handleNextStep}
                      className="btn-primary"
                      style={{ marginTop: '1.5rem' }}
                    >
                      Continue to Account Details
                    </motion.button>
                  </motion.div>
                )}

                {/* ── STEP 2 ── */}
                {step === 2 && (
                  <motion.form
                    key="step2"
                    variants={formSlideVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    onSubmit={handleSubmit}
                  >
                    <div className="form-header">
                      <h2 className="form-heading">Secure <em>account</em></h2>
                      <p className="form-subheading">Step 2: Choose your login credentials</p>
                    </div>

                    <div className="field-group">
                      <label className="field-label">Username</label>
                      <div className="input-wrap">
                        <FaUserCircle className="input-icon" />
                        <input
                          type="text"
                          className="field-input"
                          placeholder="Choose a username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* ── PASSWORD + STRENGTH BAR ── */}
                    <div className="field-group">
                      <label className="field-label">Password</label>
                      <div className="input-wrap">
                        <RiLockPasswordFill className="input-icon" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="field-input"
                          placeholder="Min. 8 chars, letters & numbers"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="eye-btn"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? <IoEyeSharp /> : <FaEyeSlash />}
                        </button>
                      </div>

                      {/* PASSWORD STRENGTH INDICATOR */}
                      <PasswordStrengthBar password={password} />

                      {/* PASSWORD REQUIREMENTS CHECKLIST */}
                      <PasswordRequirements password={password} />
                    </div>

                    {/* ── CONFIRM PASSWORD + MATCH HINT ── */}
                    <div className="field-group">
                      <label className="field-label">Confirm Password</label>
                      <div className="input-wrap">
                        <RiLockPasswordLine className="input-icon" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="field-input"
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="eye-btn"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? <IoEyeSharp /> : <FaEyeSlash />}
                        </button>
                      </div>

                      {/* PASSWORD MATCH HINT */}
                      {confirmPassword && (
                        <p className={`pwd-match-hint ${password === confirmPassword ? 'match' : 'no-match'}`}>
                          {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                        </p>
                      )}
                    </div>

                    <div className="field-group" style={{ marginTop: '1.25rem' }}>
                      <VisualCaptcha
                        onValidationChange={handleCaptchaChange}
                        action="REGISTER"
                      />
                    </div>

                    <div className="legal-agreement-box">
                      <div className="legal-agreement-title">Before creating your account</div>

                      <label
                        className={`legal-check-row ${hasAcceptedTerms ? 'legal-check-row-accepted' : ''}`}
                        onClick={openTermsModal}
                      >
                        <input type="checkbox" checked={hasAcceptedTerms} readOnly />
                        <span className="legal-custom-check">
                          {hasAcceptedTerms && <FaCheckCircle />}
                        </span>
                        <span>I have read and agree to the <strong>Terms & Conditions</strong>.</span>
                      </label>

                      <label
                        className={`legal-check-row ${hasAcceptedPrivacy ? 'legal-check-row-accepted' : ''}`}
                        onClick={openPrivacyModal}
                      >
                        <input type="checkbox" checked={hasAcceptedPrivacy} readOnly />
                        <span className="legal-custom-check">
                          {hasAcceptedPrivacy && <FaCheckCircle />}
                        </span>
                        <span>I have read and agree to the <strong>Privacy Statement</strong>.</span>
                      </label>
                    </div>

                    <div className="button-row">
                      <button type="button" onClick={() => setStep(1)} className="btn-ghost">
                        ← Back
                      </button>
                      <button
                        type="submit"
                        className={`btn-primary ${!canCreateAccount ? 'btn-primary-disabled' : ''}`}
                        disabled={!canCreateAccount}
                      >
                        Create Account
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              <p className="signin-text">
                Already have an account?
                <Link to="/login" className="signin-link">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;