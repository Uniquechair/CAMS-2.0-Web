import React, { useState } from 'react';
import { IoClose } from 'react-icons/io5';

const API_URL = import.meta.env.VITE_API_URL || '';

const MFASetupModal = ({ userid, onComplete, onClose }) => {
  const [qrCode, setQrCode]   = useState(null);
  const [token, setToken]     = useState('');
  const [step, setStep]       = useState('intro'); // 'intro' | 'qr' | 'verify' | 'done'
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // ── Generate QR code ───────────────────────────────────────
  const handleSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/mfa/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid })
      });
      const data = await res.json();
      if (data.success) {
        setQrCode(data.qrCode);
        setStep('qr');
      } else {
        setError(data.message || 'Failed to generate QR code.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Verify the code typed from the authenticator app ───────
  const handleVerify = async () => {
    if (token.length !== 6) { setError('Please enter a 6-digit code.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/mfa/verify-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid, token })
      });
      const data = await res.json();
      if (data.success) {
        setStep('done');
        setTimeout(() => onComplete(), 1800);
      } else {
        setError(data.message || 'Invalid code. Try again.');
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Inline styles for Light Earthy Theme ───────────────────
  const styles = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(26, 19, 11, 0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    },
    card: {
      background: '#fff', borderRadius: '16px',
      padding: '2.5rem 2rem 2rem', width: '100%', maxWidth: '420px',
      boxShadow: '0 8px 40px rgba(26, 19, 11, 0.15)',
      fontFamily: '"DM Sans", sans-serif',
      position: 'relative' // Required for absolute close button
    },
    closeBtn: {
      position: 'absolute', top: '16px', right: '16px',
      background: 'transparent', border: 'none',
      fontSize: '24px', color: '#A09080', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'color 0.2s ease', padding: '4px'
    },
    title: { 
      fontFamily: '"Cormorant Garamond", serif', 
      fontSize: '1.8rem', fontWeight: 500, color: '#1A130B', 
      marginBottom: '0.5rem', textAlign: 'center' 
    },
    titleAccent: { fontStyle: 'italic', color: '#BF8C5A' },
    subtitle: { 
      fontSize: '14px', color: '#5C4A38', marginBottom: '1.5rem', 
      lineHeight: 1.5, opacity: 0.8, textAlign: 'center' 
    },
    btn: {
      width: '100%', padding: '0.9rem', borderRadius: '10px',
      border: 'none', cursor: 'pointer', fontSize: '14px',
      fontWeight: 600, marginBottom: '0.6rem', transition: '0.2s ease',
      fontFamily: 'inherit'
    },
    btnPrimary: { background: '#1A130B', color: '#fff' },
    btnGhost: {
      background: 'transparent', color: '#5C4A38',
      border: '1px solid rgba(191, 140, 90, 0.4)'
    },
    input: {
      width: '100%', padding: '1rem', fontSize: '1.4rem',
      textAlign: 'center', letterSpacing: '0.6em',
      border: '1.5px solid rgba(191, 140, 90, 0.4)', borderRadius: '10px',
      outline: 'none', marginBottom: '0.75rem', fontFamily: 'inherit',
      color: '#1A130B', background: '#F7F2EA', fontWeight: 600
    },
    error: { color: '#C0664A', fontSize: '13px', marginBottom: '0.75rem', fontWeight: 500, textAlign: 'center' },
    qrWrap: { textAlign: 'center', margin: '1.5rem 0', display: 'flex', justifyContent: 'center' },
    successIcon: { fontSize: '3.5rem', textAlign: 'center', margin: '1rem 0' },
  };

  return (
    <div style={styles.overlay} onClick={(e) => { 
      // This ensures clicking the dark background closes the modal, but clicking inside the white card doesn't
      if (e.target === e.currentTarget) onClose(); 
    }}>
      <div style={styles.card}>
        
        {/* The X Close Button */}
        {step !== 'done' && (
          <button 
            style={styles.closeBtn} 
            onClick={onClose}
            onMouseEnter={(e) => e.currentTarget.style.color = '#1A130B'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#A09080'}
          >
            <IoClose />
          </button>
        )}

        {/* ── INTRO STEP ── */}
        {step === 'intro' && (
          <>
            <div style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔐</div>
            <h2 style={styles.title}>Secure your <span style={styles.titleAccent}>Account</span></h2>
            <p style={styles.subtitle}>
              Protect your account with Google Authenticator. Once enabled, you will need to verify with a code whenever you log in from a new device.
            </p>
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={handleSetup}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Set Up Authenticator'}
            </button>
            <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={onClose}>
              Cancel
            </button>
          </>
        )}

        {/* ── QR CODE STEP ── */}
        {step === 'qr' && (
          <>
            <h2 style={styles.title}>Scan <span style={styles.titleAccent}>QR Code</span></h2>
            <p style={styles.subtitle}>
              Open Google Authenticator, tap <strong>+</strong>, then scan this code.
            </p>
            {qrCode && (
              <div style={styles.qrWrap}>
                <img src={qrCode} alt="MFA QR Code" style={{ width: '180px', borderRadius: '12px', border: '1px solid #eaeaea', padding: '10px' }} />
              </div>
            )}
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={() => setStep('verify')}
            >
              I've scanned it →
            </button>
            <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={() => setStep('intro')}>
              ← Back
            </button>
          </>
        )}

        {/* ── VERIFY CODE STEP ── */}
        {step === 'verify' && (
          <>
            <h2 style={styles.title}>Enter <span style={styles.titleAccent}>Code</span></h2>
            <p style={styles.subtitle}>
              Enter the 6-digit code from your authenticator app to confirm setup.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={token}
              onChange={e => { setToken(e.target.value.replace(/\D/g, '')); setError(''); }}
              style={styles.input}
              placeholder="000000"
              autoFocus
            />
            {error && <p style={styles.error}>{error}</p>}
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={handleVerify}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Confirm & Enable MFA'}
            </button>
            <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={() => { setStep('qr'); setToken(''); setError(''); }}>
              ← Back
            </button>
          </>
        )}

        {/* ── DONE STEP ── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={{ ...styles.title, color: '#6B7B5E' }}>MFA Enabled!</h2>
            <p style={styles.subtitle}>
              Your account is now securely protected. Redirecting...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MFASetupModal;