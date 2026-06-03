import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// Import Icons
import { FaMailBulk, FaUserCircle, FaEyeSlash } from 'react-icons/fa';
import { RiLockPasswordFill, RiShieldKeyholeFill } from 'react-icons/ri';
import { IoEyeSharp } from "react-icons/io5";
import { FcGoogle } from "react-icons/fc";
// Import API function & Auth
import { loginUser, forgotPassword, googleLogin } from '../../../../Api/api';
import { useGoogleLogin } from '@react-oauth/google';
// Import Toast
import Toast from '../../../Component/Toast/Toast';
// Import VisualCaptcha
import VisualCaptcha from '../../../Component/VisualCaptcha/VisualCaptcha';
// Assets
import logo from '../../../public/Sarawak_icon.png';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const Login = () => {
  // ─── STATES ───────────────────────────────────────────────────────
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState('');
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null); 

  // ─── MFA STATES ───────────────────────────────────────────────────
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaTempToken, setMfaTempToken] = useState('');
  const [mfaMethod, setMfaMethod] = useState('authenticator'); // 'authenticator' | 'email'
  const [mfaToken, setMfaToken] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const redirectAfterLogin = location.state?.from || null;
  const redirectState = location.state || {};

  // ─── HANDLERS ──────────────────────────────────────────────────────
  const displayToast = (type, message) => {
    setToastType(type);
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  useEffect(() => {
    const logoutToast = sessionStorage.getItem('logoutToast');
    if (logoutToast === 'true') {
      sessionStorage.removeItem('logoutToast');
      setTimeout(() => displayToast('success', 'Logout successful'), 300);
    }
  }, []);

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

 const handleSuccessfulRedirect = (data) => {
  localStorage.setItem('isLoggedIn', 'true');

  
  // Keep login only for the current browser tab/session.
  // If user closes browser/tab and opens again, Navbar will force login again.
  sessionStorage.setItem('activeSession', 'true');

  localStorage.setItem('username', data.username || username);
  localStorage.setItem('usergroup', data.usergroup);
  localStorage.setItem('userid', data.userid);
  localStorage.setItem('uactivation', data.uactivation);

  // clear previous account avatar first
  localStorage.removeItem('uimage');

  // Save this account avatar only
  localStorage.setItem('uimage', data.uimage || '');

  // Tell navbar/profile avatar to refresh
  window.dispatchEvent(
    new CustomEvent('avatarUpdated', {
      detail: data.uimage || ''
    })
  );

  if (!data.username) localStorage.setItem('plainPassword', password);

  window.dispatchEvent(new Event('cart-login-updated'));
  displayToast('success', 'Login successful! Redirecting...');

  const routes = {
    Customer: '/home',
    Owner: '/owner_dashboard',
    Moderator: '/moderator_dashboard',
    Administrator: '/administrator_dashboard',
  };

  const route = data.usergroup === 'Customer' && redirectAfterLogin
    ? redirectAfterLogin
    : routes[data.usergroup];

  if (route) {
    setTimeout(() => navigate(route, { state: redirectState, replace: true }), 2000);
  } else {
    displayToast('error', 'Invalid user group.');
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isCaptchaValid) {
      displayToast('error', 'Please complete the reCAPTCHA verification.');
      return;
    }

    const userData = { username, password, captchaToken }; 
    try {
      const response = await loginUser(userData);
      const data = await response.json();

      if (response.ok && data.success) {
        if (data.uactivation === 'Inactive') return displayToast('error', 'Your account is inactive.');
        
        // INTERCEPT MFA TRIGGER
        if (data.requiresMFA) {
          setMfaTempToken(data.tempToken);
          setRequiresMFA(true);
          return;
        }

        handleSuccessfulRedirect(data);
      } else {
        displayToast('error', data.message || 'Invalid username or password.');
      }
    } catch (error) {
      console.error('Error during login:', error);
      displayToast('error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleSendEmailOTP = async () => {
    setMfaLoading(true);
    try {
      const res = await fetch(`${API_URL}/mfa/send-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: mfaTempToken })
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        displayToast('success', 'Verification code sent to your email.');
      } else {
        displayToast('error', data.message || 'Failed to send OTP.');
      }
    } catch (err) {
      displayToast('error', 'Network error. Please try again.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMFA = async (e) => {
    e.preventDefault();
    if (mfaToken.length !== 6) return displayToast('error', 'Please enter a 6-digit code.');
    
    setMfaLoading(true);
    try {
      const res = await fetch(`${API_URL}/mfa/verify-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: mfaTempToken, token: mfaToken, method: mfaMethod })
      });
      const data = await res.json();
      
      if (data.success) {
        handleSuccessfulRedirect(data);
      } else {
        displayToast('error', data.message || 'Invalid code.');
      }
    } catch (err) {
      displayToast('error', 'Verification failed. Please try again.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      await forgotPassword(email);
      displayToast('success', 'New password has been sent to your email');
      setShowForgotPassword(false);
      setEmail('');
    } catch (error) {
      displayToast('error', error.message || 'Reset password failed');
    }
  };

  const googleLoginHandler = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      try {
        localStorage.setItem("googleAccessToken", tokenResponse.access_token);
        const data = await googleLogin(tokenResponse.access_token);
        
        if (data.uactivation === 'Inactive') return displayToast('error', 'Your account is inactive.');
        handleSuccessfulRedirect(data);
      } catch (error) {
        displayToast("error", error.message || "An unexpected error occurred.");
      }
    },
    onError: () => displayToast("error", "Google sign-in failed. Please try again.")
  });

  // ─── ANIMATION VARIANTS ───────────────────────────────────────────
  const staggerChild = {
    hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
    visible: (i) => ({
      opacity: 1, y: 0, filter: 'blur(0px)',
      transition: { delay: i * 0.11 + 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }
    })
  };

  const formSwapVariants = {
    initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
    exit:    { opacity: 0, y: -12, filter: 'blur(4px)', transition: { duration: 0.22 } }
  };

  return (
    <div className="login-wrapper">
      {showToast && <Toast type={toastType} message={toastMessage} />}

      {/* LEFT PANEL — SCENIC (Unchanged) */}
      <motion.div className="scenic-panel" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}>
        <div className="scenic-overlay" />
        <div className="scenic-vignette" />
        <div className="scenic-scanline" />
        <div className="scenic-ring scenic-ring--1" />
        <div className="scenic-ring scenic-ring--2" />
        <div className="scenic-ring scenic-ring--3" />
        <div className="scenic-rule" />
        <div className="scenic-bottom-strip" />
        
        <div className="scenic-content">
          <div className="scenic-top">
            <motion.a className="scenic-logo-mark" onClick={() => navigate('/')} custom={0} variants={staggerChild} initial="hidden" animate="visible">
              <img src={logo} alt="Hello Sarawak" className="scenic-logo" />
              <span className="scenic-logo-wordmark">Hello Sarawak<small>Tourism Portal</small></span>
            </motion.a>
            <motion.div className="scenic-badge" custom={0.5} variants={staggerChild} initial="hidden" animate="visible">
              <span className="badge-pulse" /><span>Est. 1963 · Kuching</span>
            </motion.div>
          </div>
          <div className="scenic-hero">
            <motion.div className="scenic-eyebrow" custom={1} variants={staggerChild} initial="hidden" animate="visible">
              <span className="eyebrow-line" /><span className="eyebrow-text">Land of the Hornbills</span>
            </motion.div>
            <motion.h1 className="scenic-title" custom={2} variants={staggerChild} initial="hidden" animate="visible">
              Hello<br /><em>Sarawak</em>
            </motion.h1>
            <motion.p className="scenic-tagline" custom={3} variants={staggerChild} initial="hidden" animate="visible">
              Where ancient rainforests meet living cultures — explore 130,000 km² of wonder.
            </motion.p>
            <motion.div className="scenic-stats" custom={4} variants={staggerChild} initial="hidden" animate="visible">
              <div className="scenic-stat"><span className="stat-num">400+</span><span className="stat-label">Destinations</span></div>
              <div className="scenic-stat"><span className="stat-num">38</span><span className="stat-label">Ethnic Groups</span></div>
              <div className="scenic-stat"><span className="stat-num">130K</span><span className="stat-label">km² Wilderness</span></div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* RIGHT PANEL — FORM */}
      <motion.div className="form-panel" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}>
        <div className="form-panel-scroll">
          <div className="form-panel-inner">
            <motion.div className="step-dots" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55, duration: 0.5 }}>
              <span className={`step-dot ${!requiresMFA && !showForgotPassword ? 'step-dot--active' : ''}`} />
              <span className={`step-dot ${requiresMFA ? 'step-dot--active' : ''}`} />
              <span className={`step-dot ${showForgotPassword ? 'step-dot--active' : ''}`} />
            </motion.div>

            <AnimatePresence mode="wait">
              {/* ─── MFA VERIFICATION FORM ─── */}
              {requiresMFA ? (
                <motion.div key="mfa" variants={formSwapVariants} initial="initial" animate="animate" exit="exit">
                  <div className="form-header">
                    <h2 className="form-heading">Verify <em>Identity</em></h2>
                    <p className="form-subheading">Unrecognized device. Please verify it's you.</p>
                  </div>
                  
                  <div className="mfa-tabs">
                    <button type="button" className={`mfa-tab ${mfaMethod === 'authenticator' ? 'active' : ''}`} onClick={() => { setMfaMethod('authenticator'); setMfaToken(''); }}>
                      Authenticator
                    </button>
                    <button type="button" className={`mfa-tab ${mfaMethod === 'email' ? 'active' : ''}`} onClick={() => { setMfaMethod('email'); setMfaToken(''); }}>
                      Email OTP
                    </button>
                  </div>

                  <form onSubmit={handleVerifyMFA}>
                    {mfaMethod === 'email' && !otpSent ? (
                      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-mid)', marginBottom: '1rem' }}>We'll send a 6-digit code to your registered email.</p>
                        <motion.button type="button" className="btn-primary" onClick={handleSendEmailOTP} disabled={mfaLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                          {mfaLoading ? 'Sending...' : 'Send Email Code'}
                        </motion.button>
                      </div>
                    ) : (
                      <>
                        <div className="field-group">
                          <label className="field-label">Enter 6-Digit Code</label>
                          <div className="input-wrap">
                            <RiShieldKeyholeFill className="input-icon" />
                            <input
                              type="text"
                              maxLength={6}
                              className="field-input mfa-code-input"
                              placeholder="000000"
                              value={mfaToken}
                              onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ''))}
                              required
                            />
                          </div>
                        </div>
                        <motion.button type="submit" className="btn-primary" disabled={mfaLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                          {mfaLoading ? 'Verifying...' : 'Complete Sign In'}
                        </motion.button>
                      </>
                    )}
                  </form>
                  <motion.button type="button" className="btn-ghost" onClick={() => { setRequiresMFA(false); setMfaTempToken(''); setOtpSent(false); }} whileTap={{ scale: 0.98 }}>
                    ← Cancel
                  </motion.button>
                </motion.div>

              /* ─── FORGOT PASSWORD FORM ─── */
              ) : showForgotPassword ? (
                <motion.div key="forgot" variants={formSwapVariants} initial="initial" animate="animate" exit="exit">
                  <div className="form-header">
                    <h2 className="form-heading">Reset <em>Password</em></h2>
                    <p className="form-subheading">We'll send a new password to your email address</p>
                  </div>
                  <form onSubmit={handleForgotPassword}>
                    <div className="field-group">
                      <label className="field-label">Email Address</label>
                      <div className="input-wrap">
                        <FaMailBulk className="input-icon" />
                        <input type="email" className="field-input" placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                      </div>
                    </div>
                    <motion.button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                      Send Reset Link
                    </motion.button>
                  </form>
                  <motion.button type="button" className="btn-ghost" onClick={() => setShowForgotPassword(false)} whileTap={{ scale: 0.98 }}>
                    ← Back to Sign In
                  </motion.button>
                </motion.div>

              /* ─── STANDARD LOGIN FORM ─── */
              ) : (
                <motion.div key="login" variants={formSwapVariants} initial="initial" animate="animate" exit="exit">
                  <div className="form-header">
                    <h2 className="form-heading">Welcome <em>back</em></h2>
                    <p className="form-subheading">Sign in to continue your adventure</p>
                  </div>
                  <form onSubmit={handleSubmit}>
                    <div className="field-group">
                      <label className="field-label">Username or Email</label>
                      <div className="input-wrap">
                        <FaUserCircle className="input-icon" />
                        <input type="text" className="field-input" placeholder="Enter your username or email" value={username} onChange={(e) => setUsername(e.target.value)} required />
                      </div>
                    </div>
                    <div className="field-group">
                      <label className="field-label">Password</label>
                      <div className="input-wrap">
                        <RiLockPasswordFill className="input-icon" />
                        <input type={showPassword ? "text" : "password"} className="field-input" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        <button type="button" className="eye-btn" onClick={togglePasswordVisibility}>
                          {showPassword ? <IoEyeSharp /> : <FaEyeSlash />}
                        </button>
                      </div>
                    </div>
                    <div className="form-row-spread">
                      <label className="remember-label">
                        <input type="checkbox" className="remember-check" /><span>Remember me</span>
                      </label>
                      <a href="#" className="forgot-link" onClick={(e) => { e.preventDefault(); setShowForgotPassword(true); }}>
                        Forgot password?
                      </a>
                    </div>
                    
                    <div className="field-group">
                      <VisualCaptcha onValidationChange={(isValid, token) => { setIsCaptchaValid(isValid); setCaptchaToken(token); }} />
                    </div>

                    <motion.button type="submit" className="btn-primary" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                      Sign In
                    </motion.button>
                  </form>
                  
                  <div className="or-divider"><span>Or continue with</span></div>
                  
                 <div className="social-row">
                  <motion.button
                    type="button"
                    className="social-btn"
                    onClick={() => googleLoginHandler()}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FcGoogle />
                  </motion.button>
                </div>
                  
                  <p className="signup-text">
                    Don't have an account? <Link to="/register" state={redirectState} className="signup-link">Create one</Link>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;