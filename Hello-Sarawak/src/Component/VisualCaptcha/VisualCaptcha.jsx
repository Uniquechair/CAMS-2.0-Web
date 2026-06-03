import React, { useEffect } from 'react';

const VisualCaptcha = ({ onValidationChange, action = 'LOGIN', theme = 'light' }) => {

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/enterprise.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    window.onRecaptchaSuccess = (token) => {
      onValidationChange(true, token);
    };
    window.onRecaptchaExpired = () => {
      onValidationChange(false, null);
    };

    return () => {
      delete window.onRecaptchaSuccess;
      delete window.onRecaptchaExpired;
    };
  }, [onValidationChange]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem',
      width: '100%',
    }}>

      {/* Label row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <div style={{
          width: '20px',
          height: '1px',
          background: 'var(--accent-gold)',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: '0.62rem',
          fontWeight: '600',
          color: 'var(--accent-gold)',
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
        }}>
          Security Verification
        </span>
      </div>

      {/* reCAPTCHA widget container */}
      <div style={{
        background: 'var(--bg-cream)',
        borderRadius: '0.8rem',
        border: '1.5px solid var(--border-soft, rgba(191,140,90,0.22))',
        padding: '0.65rem 0.75rem',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        boxShadow: '0 2px 12px rgba(26,19,11,0.05)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        overflow: 'hidden',
        maxWidth: '100%',
      }}>
        <div
          className="g-recaptcha"
          data-sitekey="6Lf-z88sAAAAAPRrNtsdYBkYWKPJZZkvKlZk7F9k"
          data-action={action}
          data-callback="onRecaptchaSuccess"
          data-expired-callback="onRecaptchaExpired"
          data-theme={theme}
          style={{ transform: 'scale(0.97)', transformOrigin: 'left center' }}
        />
      </div>

    </div>
  );
};

export default VisualCaptcha;