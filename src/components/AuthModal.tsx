import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext.tsx';

interface AuthModalProps {
  show: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ show, onClose, initialMode = 'login' }) => {
  const { login, signup, verifyOtp, resendOtp, forgotPasswordRequest, forgotPasswordReset } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'otp' | 'forgot_req' | 'forgot_reset'>('login');

  // Form states (No hardcoded manual customer names!)
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [otpTargetIdentifier, setOtpTargetIdentifier] = useState('');
  const [otpPurpose, setOtpPurpose] = useState<'signup' | 'forgot_password'>('signup');
  const [countdown, setCountdown] = useState<number>(60);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Top Right Corner OTP Toast State with Autofill
  const [topRightOtp, setTopRightOtp] = useState<{
    code: string;
    identifier: string;
    purpose: string;
  } | null>(null);

  // Forgot Password state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');

  // Status & error states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [duplicateAccount, setDuplicateAccount] = useState(false);

  useEffect(() => {
    if (show) {
      setMode(initialMode);
      setErrorMsg(null);
      setSuccessMsg(null);
      setDuplicateAccount(false);
    }
  }, [show, initialMode]);

  // 60-Second Real-Time Countdown Timer for OTP Resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if ((mode === 'otp' || mode === 'forgot_reset') && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode, countdown]);

  // Autofill OTP helper
  const handleAutofillOtp = () => {
    if (!topRightOtp) return;
    setOtpCode(topRightOtp.code);
    if (mode !== 'otp' && mode !== 'forgot_reset') {
      setMode(topRightOtp.purpose.includes('Recovery') ? 'forgot_reset' : 'otp');
    }
    confetti({ particleCount: 35, spread: 60, origin: { x: 0.9, y: 0.15 } });
    setSuccessMsg('OTP Code autofilled successfully! Click Verify to continue.');
  };

  if (!show) return null;

  // Live password validation checks
  const hasLetter = /[a-zA-Z]/.test(signupPassword);
  const hasNumber = /[0-9]/.test(signupPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(signupPassword);
  const hasMinLength = signupPassword.length >= 6;
  const isPasswordValid = hasLetter && hasNumber && hasSpecial && hasMinLength;

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await login(loginId, loginPassword);
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
      onClose();
    } catch (err: any) {
      if (
        err.status === 401 ||
        err.message?.toLowerCase().includes('password') ||
        err.message?.toLowerCase().includes('valid password')
      ) {
        setErrorMsg('Enter the valid password or enter correct password to continue your shopping.');
      } else {
        setErrorMsg(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Signup (Detects duplicate accounts cleanly and prompts user to login)
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setDuplicateAccount(false);

    if (signupPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMsg('Password must contain at least 6 characters, including a letter, number and special character.');
      return;
    }

    setLoading(true);
    try {
      const res = await signup({
        fullName,
        email,
        phone,
        password: signupPassword,
      });

      setOtpTargetIdentifier(res.phone || phone);
      setOtpPurpose('signup');
      setCountdown(res.resendInSeconds || 60);
      if (res.devOtpHint) {
        setDevOtpHint(res.devOtpHint);
        setTopRightOtp({
          code: res.devOtpHint,
          identifier: res.phone || phone,
          purpose: 'New Registration OTP',
        });
      }
      setSuccessMsg('Account created! Please enter the 6-digit verification code.');
      setMode('otp');
    } catch (err: any) {
      const isDuplicate =
        err.status === 409 ||
        err.data?.duplicate ||
        err.message?.toLowerCase().includes('already exist') ||
        err.message?.toLowerCase().includes('user already');

      if (isDuplicate) {
        setDuplicateAccount(true);
        setErrorMsg('User already exists. Please log in.');
      } else {
        setErrorMsg(err.message || 'Signup failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Verification
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await verifyOtp(otpTargetIdentifier, otpCode, otpPurpose);
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
      setTopRightOtp(null);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await resendOtp(otpTargetIdentifier, otpPurpose);
      setCountdown(res.resendInSeconds || 60);
      if (res.devOtpHint) {
        setDevOtpHint(res.devOtpHint);
        setTopRightOtp({
          code: res.devOtpHint,
          identifier: otpTargetIdentifier,
          purpose: 'Resend Verification OTP',
        });
      }
      setSuccessMsg('A new 6-digit OTP code has been sent.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Step 1
  const handleForgotReq = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await forgotPasswordRequest(forgotIdentifier);
      setOtpTargetIdentifier(res.phone || forgotIdentifier);
      setOtpPurpose('forgot_password');
      setCountdown(res.resendInSeconds || 60);
      if (res.devOtpHint) {
        setDevOtpHint(res.devOtpHint);
        setTopRightOtp({
          code: res.devOtpHint,
          identifier: res.phone || forgotIdentifier,
          purpose: 'Password Recovery OTP',
        });
      }
      setMode('forgot_reset');
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Step 2
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (newResetPassword !== confirmResetPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPasswordReset(otpTargetIdentifier, otpCode, newResetPassword);
      setSuccessMsg(res.message);
      setTopRightOtp(null);
      setMode('login');
      setLoginId(otpTargetIdentifier);
    } catch (err: any) {
      setErrorMsg(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* TOP RIGHT CORNER OTP NOTIFICATION WITH AUTOFILL */}
      {topRightOtp && (
        <aside
          role="status"
          aria-live="polite"
          className="position-fixed shadow-2xl rounded-4 overflow-hidden border border-2 border-warning animate-bounce-subtle"
          style={{
            top: '20px',
            right: '20px',
            width: '340px',
            maxWidth: 'calc(100vw - 32px)',
            zIndex: 1099,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)',
            color: '#ffffff',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45), 0 0 25px rgba(245, 158, 11, 0.45)',
          }}
        >
          {/* Glowing animated accent top bar */}
          <div className="bg-gradient-rainbow" style={{ height: '4px' }}></div>

          <div className="p-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="d-flex align-items-center gap-2">
                <span className="spinner-grow spinner-grow-sm text-warning" role="status" style={{ width: '9px', height: '9px' }}></span>
                <span className="text-uppercase fw-bold letter-spacing-1 text-warning" style={{ fontSize: '0.72rem' }}>
                  ✦ AURA INDIA SMS GATEWAY ✦
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-link text-white-50 p-0 text-decoration-none"
                onClick={() => setTopRightOtp(null)}
                aria-label="Dismiss OTP notification"
                title="Dismiss"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="d-flex align-items-center justify-content-between mb-2">
              <div>
                <span className="small text-white-50 d-block" style={{ fontSize: '0.75rem' }}>
                  {topRightOtp.purpose}
                </span>
                <span className="text-white fw-bold small">
                  Sent to {topRightOtp.identifier}
                </span>
              </div>
              <span className="badge bg-danger rounded-pill px-2 py-1" style={{ fontSize: '0.65rem' }}>
                EXP: 10 MIN
              </span>
            </div>

            {/* Prominent 6-digit OTP code */}
            <div className="p-2 mb-3 rounded-3 bg-white bg-opacity-10 border border-white border-opacity-20 d-flex align-items-center justify-content-between">
              <span className="font-monospace fs-4 fw-bold letter-spacing-2 text-warning px-2">
                {topRightOtp.code}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-dark text-white rounded-pill px-2 py-1 border border-secondary"
                style={{ fontSize: '0.7rem' }}
                onClick={() => {
                  navigator.clipboard?.writeText(topRightOtp.code);
                  setSuccessMsg('OTP code copied to clipboard!');
                }}
                title="Copy code"
              >
                <i className="bi bi-clipboard me-1"></i> Copy
              </button>
            </div>

            {/* Prominent Autofill CTA button */}
            <button
              type="button"
              className="btn btn-fancy-vibrant w-100 py-2 rounded-pill fw-bold text-uppercase d-flex align-items-center justify-content-center gap-2 shadow-lg"
              style={{ fontSize: '0.82rem', letterSpacing: '0.08em' }}
              onClick={handleAutofillOtp}
            >
              <i className="bi bi-lightning-charge-fill fs-6 text-warning"></i>
              <span>AUTOFILL OTP CODE</span>
            </button>
          </div>
        </aside>
      )}

      <div
        className="modal fade show d-block"
        tabIndex={-1}
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', zIndex: 1060 }}
      >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-2xl rounded-4 overflow-hidden position-relative" style={{ minHeight: '580px' }}>
          {/* Animated colorful glowing background orbs */}
          <div
            className="position-absolute rounded-circle animate-glow-orb pointer-events-none"
            style={{
              width: '350px',
              height: '350px',
              top: '-100px',
              left: '-80px',
              background: 'radial-gradient(circle, rgba(236,72,153,0.45) 0%, rgba(139,92,246,0) 70%)',
              zIndex: 0,
            }}
          />
          <div
            className="position-absolute rounded-circle animate-glow-orb pointer-events-none"
            style={{
              width: '380px',
              height: '380px',
              bottom: '-120px',
              right: '-80px',
              background: 'radial-gradient(circle, rgba(249,115,22,0.4) 0%, rgba(6,182,212,0) 70%)',
              zIndex: 0,
            }}
          />

          <div className="row g-0 position-relative z-1" style={{ minHeight: '580px' }}>
            {/* Left Colorful Brand Narrative Panel */}
            <div className="col-lg-5 bg-gradient-rainbow text-white p-4 p-md-5 d-flex flex-column justify-content-between position-relative overflow-hidden">
              <div
                className="position-absolute top-0 start-0 w-100 h-100 opacity-25 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)',
                  backgroundSize: '24px 24px',
                }}
              />

              <div className="position-relative z-2">
                <span className="badge rounded-pill bg-white text-dark px-3 py-2 text-uppercase mb-3 fw-bold shadow-sm d-inline-flex align-items-center gap-2 animate-float" style={{ fontSize: '0.72rem', letterSpacing: '0.15em' }}>
                  <span className="text-warning">✦</span> AURA INDIA ATELIER <span className="text-warning">✦</span>
                </span>
                <h2 className="font-serif display-5 fw-bold mb-1 text-white">
                  AURA INDIA
                </h2>
                <span className="editorial-sub text-white-50 d-block mb-3 fw-bold" style={{ letterSpacing: '0.28em' }}>
                  CONTEMPORARY HAUTE COUTURE
                </span>
                <p className="small text-white opacity-95 mb-4" style={{ lineHeight: '1.65' }}>
                  A symphony of vibrant Indian pigments, rich handloom silk, 280 GSM heavyweight cotton, and certified organic babywear.
                </p>
              </div>

              {/* Colorful feature cards */}
              <div className="position-relative z-2 d-flex flex-column gap-2 my-auto">
                <div className="d-flex align-items-center gap-3 p-2 px-3 rounded-3 bg-white bg-opacity-20 border border-white border-opacity-25 shadow-sm card-hover-lift">
                  <div className="rounded-circle p-2 bg-white text-dark d-flex align-items-center justify-content-center shadow-sm" style={{ width: '36px', height: '36px' }}>
                    <i className="bi bi-palette-fill text-danger fs-6"></i>
                  </div>
                  <div>
                    <strong className="d-block small text-white">Artisanal Pigments</strong>
                    <span className="text-white-50" style={{ fontSize: '0.72rem' }}>Royal Indigo, Saffron, Rani Pink & Emerald</span>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-3 p-2 px-3 rounded-3 bg-white bg-opacity-20 border border-white border-opacity-25 shadow-sm card-hover-lift">
                  <div className="rounded-circle p-2 bg-white text-dark d-flex align-items-center justify-content-center shadow-sm" style={{ width: '36px', height: '36px' }}>
                    <i className="bi bi-lightning-charge-fill text-warning fs-6"></i>
                  </div>
                  <div>
                    <strong className="d-block small text-white">Complimentary Express Shipping</strong>
                    <span className="text-white-50" style={{ fontSize: '0.72rem' }}>Free BlueDart delivery on orders above ₹999</span>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-3 p-2 px-3 rounded-3 bg-white bg-opacity-20 border border-white border-opacity-25 shadow-sm card-hover-lift">
                  <div className="rounded-circle p-2 bg-white text-dark d-flex align-items-center justify-content-center shadow-sm" style={{ width: '36px', height: '36px' }}>
                    <i className="bi bi-shield-lock-fill text-success fs-6"></i>
                  </div>
                  <div>
                    <strong className="d-block small text-white">Real-Time OTP Verification</strong>
                    <span className="text-white-50" style={{ fontSize: '0.72rem' }}>Encrypted sessions & 60s cooldown</span>
                  </div>
                </div>
              </div>

              <div className="position-relative z-2 pt-3 border-top border-white border-opacity-25 text-center">
                <span className="small text-white-50" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                  © 2026 AURA INDIA FASHION HOUSE
                </span>
              </div>
            </div>

            {/* Right Interactive Authentication Area */}
            <div className="col-lg-7 p-4 p-md-5 bg-white d-flex flex-column justify-content-between position-relative">
              {/* Close Button */}
              <button
                type="button"
                className="btn-close position-absolute top-0 end-0 m-3 z-3"
                aria-label="Close"
                onClick={onClose}
              ></button>

              <div>
                {/* Colorful Tabs Header */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div className="d-flex gap-2 p-1 bg-light rounded-pill border">
                    <button
                      type="button"
                      className={`btn btn-sm rounded-pill px-4 fw-bold text-uppercase transition ${
                        mode === 'login'
                          ? 'btn-fancy-vibrant'
                          : 'text-dark bg-transparent border-0'
                      }`}
                      style={{ fontSize: '0.78rem' }}
                      onClick={() => {
                        setMode('login');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                        setDuplicateAccount(false);
                      }}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm rounded-pill px-4 fw-bold text-uppercase transition ${
                        mode === 'signup'
                          ? 'btn-fancy-vibrant'
                          : 'text-dark bg-transparent border-0'
                      }`}
                      style={{ fontSize: '0.78rem' }}
                      onClick={() => {
                        setMode('signup');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                        setDuplicateAccount(false);
                      }}
                    >
                      Create Account
                    </button>
                  </div>

                  <span className="badge badge-festive text-uppercase py-2 px-3 small d-none d-sm-inline">
                    {mode === 'login' ? 'Welcome Back' : '10% OFF: AURA10'}
                  </span>
                </div>

                {/* PROMINENT DUPLICATE ACCOUNT ALERT WITH DIRECT LOGIN BUTTON */}
                {duplicateAccount && (
                  <div className="p-3 bg-danger bg-opacity-10 border border-2 border-danger rounded-4 mb-4 text-center animate-fade-in shadow-sm">
                    <div className="d-flex align-items-center justify-content-center gap-2 mb-2 text-danger fw-bold fs-6">
                      <i className="bi bi-person-exclamation fs-4"></i>
                      <span>User already exists! Please log in.</span>
                    </div>
                    <p className="small text-muted mb-3" style={{ fontSize: '0.82rem' }}>
                      An account is already registered with {email || phone}. Please sign in with your password.
                    </p>
                    <button
                      type="button"
                      className="btn btn-fancy-vibrant btn-sm text-uppercase fw-bold rounded-pill px-4 py-2 shadow-sm d-inline-flex align-items-center gap-2"
                      onClick={() => {
                        setMode('login');
                        setLoginId(email || phone);
                        setDuplicateAccount(false);
                        setErrorMsg(null);
                        setSuccessMsg('User already exists! Please enter your password to log in.');
                      }}
                    >
                      <i className="bi bi-box-arrow-in-right fs-5"></i> DO LOGIN / SIGN IN
                    </button>
                  </div>
                )}

                {/* Generic Errors */}
                {!duplicateAccount && errorMsg && (
                  <div className="alert alert-danger py-2 small mb-3 rounded-3 d-flex align-items-center animate-fade-in">
                    <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
                    <div>{errorMsg}</div>
                  </div>
                )}

                {successMsg && (
                  <div className="alert alert-success py-2 small mb-3 rounded-3 d-flex align-items-center animate-fade-in">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <div>{successMsg}</div>
                  </div>
                )}

                {/* Dev OTP Notification Pill */}
                {devOtpHint && (mode === 'otp' || mode === 'forgot_reset') && (
                  <div className="p-2 mb-3 rounded-3 bg-warning-subtle border border-warning text-dark small d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bi bi-chat-dots-fill me-1 text-warning"></i>
                      <strong>SMS OTP Code:</strong>
                    </span>
                    <span className="badge bg-dark fs-6 px-3 py-1 font-monospace">{devOtpHint}</span>
                  </div>
                )}

                {/* 1. LOGIN FORM */}
                {mode === 'login' && (
                  <form onSubmit={handleLoginSubmit}>
                    <div className="mb-3">
                      <label className="form-label small fw-bold text-uppercase text-muted">
                        Email Address or Mobile Number
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-end-0 text-muted">
                          <i className="bi bi-envelope-fill text-danger"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control border-start-0 py-2 input-fancy"
                          placeholder="e.g. yourname@domain.com or 10-digit mobile"
                          value={loginId}
                          onChange={(e) => setLoginId(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between">
                        <label className="form-label small fw-bold text-uppercase text-muted">
                          Password
                        </label>
                        <button
                          type="button"
                          className="btn btn-link p-0 text-decoration-none small fw-semibold text-danger"
                          onClick={() => {
                            setMode('forgot_req');
                            setErrorMsg(null);
                          }}
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-end-0 text-muted">
                          <i className="bi bi-lock-fill text-primary"></i>
                        </span>
                        <input
                          type="password"
                          className="form-control border-start-0 py-2 input-fancy"
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-fancy-vibrant w-100 py-3 rounded-pill text-uppercase fw-bold mb-3 d-flex align-items-center justify-content-center shadow-md"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="spinner-border spinner-border-sm me-2"></span>
                      ) : (
                        <i className="bi bi-box-arrow-in-right me-2 fs-5"></i>
                      )}
                      LOGIN TO AURA INDIA
                    </button>

                    <div className="text-center small text-muted">
                      Don't have an account yet?{' '}
                      <button
                        type="button"
                        className="btn btn-link p-0 fw-bold text-danger text-decoration-underline"
                        onClick={() => {
                          setMode('signup');
                          setErrorMsg(null);
                        }}
                      >
                        Create an Account
                      </button>
                    </div>
                  </form>
                )}

                {/* 2. SIGNUP FORM */}
                {mode === 'signup' && (
                  <form onSubmit={handleSignupSubmit}>
                    <div className="row g-2 mb-2">
                      <div className="col-12">
                        <label className="form-label small fw-bold text-uppercase text-muted mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          className="form-control py-2 input-fancy"
                          placeholder="Enter your full name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-bold text-uppercase text-muted mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          className="form-control py-2 input-fancy"
                          placeholder="name@domain.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-bold text-uppercase text-muted mb-1">
                          Indian Mobile (+91)
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-light text-muted small fw-bold">+91</span>
                          <input
                            type="tel"
                            className="form-control py-2 input-fancy"
                            placeholder="10-digit mobile"
                            maxLength={10}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="row g-2 mb-2">
                      <div className="col-sm-6">
                        <label className="form-label small fw-bold text-uppercase text-muted mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          className="form-control py-2 input-fancy"
                          placeholder="Min 6 characters (e.g. Aura@123)"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-bold text-uppercase text-muted mb-1">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          className="form-control py-2 input-fancy"
                          placeholder="Re-enter password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Live colorful interactive password checklist */}
                    <div className="p-2 mb-3 rounded-3 bg-light border">
                      <div className="d-flex flex-wrap gap-2" style={{ fontSize: '0.72rem' }}>
                        <span className={`badge ${hasMinLength ? 'bg-success text-white' : 'bg-secondary-subtle text-muted'}`}>
                          {hasMinLength ? '✓' : '○'} Min 6 chars
                        </span>
                        <span className={`badge ${hasLetter ? 'bg-primary text-white' : 'bg-secondary-subtle text-muted'}`}>
                          {hasLetter ? '✓' : '○'} 1 letter
                        </span>
                        <span className={`badge ${hasNumber ? 'bg-info text-dark' : 'bg-secondary-subtle text-muted'}`}>
                          {hasNumber ? '✓' : '○'} 1 number
                        </span>
                        <span className={`badge ${hasSpecial ? 'bg-warning text-dark' : 'bg-secondary-subtle text-muted'}`}>
                          {hasSpecial ? '✓' : '○'} 1 special char
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-fancy-vibrant w-100 py-3 rounded-pill text-uppercase fw-bold mb-3 d-flex align-items-center justify-content-center"
                      disabled={loading || !isPasswordValid}
                    >
                      {loading ? (
                        <span className="spinner-border spinner-border-sm me-2"></span>
                      ) : (
                        <i className="bi bi-sparkles me-2"></i>
                      )}
                      CREATE ACCOUNT & GET OTP
                    </button>

                    <div className="text-center small text-muted">
                      Already registered?{' '}
                      <button
                        type="button"
                        className="btn btn-link p-0 fw-bold text-danger text-decoration-underline"
                        onClick={() => {
                          setMode('login');
                          setErrorMsg(null);
                        }}
                      >
                        Sign In Here
                      </button>
                    </div>
                  </form>
                )}

                {/* 3. OTP VERIFICATION FORM */}
                {mode === 'otp' && (
                  <form onSubmit={handleOtpSubmit} className="text-center py-2">
                    <div
                      className="rounded-circle p-3 d-inline-flex align-items-center justify-content-center mb-3 bg-gradient-rainbow text-white shadow-lg animate-float"
                      style={{ width: '70px', height: '70px' }}
                    >
                      <i className="bi bi-shield-check fs-2"></i>
                    </div>

                    <h4 className="font-serif fw-bold mb-1">VERIFY YOUR CONTACT</h4>
                    <p className="text-muted small mb-3">
                      Enter the 6-digit verification code sent to{' '}
                      <strong className="text-dark">{otpTargetIdentifier}</strong>
                    </p>

                    <div className="mb-4 d-flex justify-content-center">
                      <input
                        type="text"
                        className="form-control text-center fs-3 fw-bold rounded-4 input-fancy"
                        style={{ maxWidth: '260px', letterSpacing: '0.45em' }}
                        maxLength={6}
                        placeholder="••••••"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        required
                        autoFocus
                      />
                    </div>

                    {/* Instant Autofill helper button */}
                    {(topRightOtp?.code || devOtpHint) && (
                      <div className="mb-3">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning text-dark fw-bold rounded-pill px-3 py-1 shadow-sm d-inline-flex align-items-center gap-1 animate-pulse"
                          onClick={handleAutofillOtp}
                        >
                          <i className="bi bi-lightning-charge-fill text-warning"></i> Autofill Code: {topRightOtp?.code || devOtpHint}
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn btn-fancy-vibrant w-100 py-3 rounded-pill text-uppercase fw-bold mb-3"
                      disabled={loading || otpCode.length !== 6}
                    >
                      {loading ? (
                        <span className="spinner-border spinner-border-sm me-2"></span>
                      ) : null}
                      VERIFY CODE & ENTER
                    </button>

                    {/* 60s Resend Timer with Fancy Pill */}
                    <div className="p-3 bg-light rounded-3 border text-center">
                      {countdown > 0 ? (
                        <span className="small text-muted">
                          Resend new code in <strong className="text-danger">{countdown}s</strong>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline-dark btn-sm rounded-pill px-4 text-uppercase fw-bold"
                          onClick={handleResendOtp}
                          disabled={loading}
                        >
                          <i className="bi bi-arrow-repeat me-1"></i> RESEND OTP NOW
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {/* 4. FORGOT PASSWORD REQUEST */}
                {mode === 'forgot_req' && (
                  <form onSubmit={handleForgotReq} className="py-2">
                    <h5 className="font-serif fw-bold mb-2">RECOVER YOUR ACCOUNT</h5>
                    <p className="text-muted small mb-3">
                      Enter your registered email address or mobile number. We will send an OTP to verify your identity.
                    </p>

                    <div className="mb-3">
                      <input
                        type="text"
                        className="form-control py-2 input-fancy"
                        placeholder="Email or 10-digit mobile"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-fancy-vibrant w-100 py-3 rounded-pill text-uppercase fw-bold mb-3"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="spinner-border spinner-border-sm me-2"></span>
                      ) : null}
                      SEND RESET CODE
                    </button>

                    <button
                      type="button"
                      className="btn btn-link w-100 text-muted small text-decoration-none"
                      onClick={() => setMode('login')}
                    >
                      ← Back to Login
                    </button>
                  </form>
                )}

                {/* 5. FORGOT PASSWORD RESET */}
                {mode === 'forgot_reset' && (
                  <form onSubmit={handleForgotReset} className="py-2">
                    <h5 className="font-serif fw-bold mb-2">SET NEW PASSWORD</h5>
                    <p className="text-muted small mb-3">
                      Enter the 6-digit OTP sent to <strong>{otpTargetIdentifier}</strong> along with your new password.
                    </p>

                    <div className="mb-2">
                      <input
                        type="text"
                        className="form-control py-2 text-center fs-5 fw-bold input-fancy"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                    </div>

                    {/* Instant Autofill helper button */}
                    {(topRightOtp?.code || devOtpHint) && (
                      <div className="mb-2 text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning text-dark fw-bold rounded-pill px-3 py-1 shadow-sm d-inline-flex align-items-center gap-1 animate-pulse"
                          onClick={handleAutofillOtp}
                        >
                          <i className="bi bi-lightning-charge-fill text-warning"></i> Autofill Code: {topRightOtp?.code || devOtpHint}
                        </button>
                      </div>
                    )}

                    <div className="mb-2">
                      <input
                        type="password"
                        className="form-control py-2 input-fancy"
                        placeholder="New Password (min 6 chars, letter, num, special)"
                        value={newResetPassword}
                        onChange={(e) => setNewResetPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <input
                        type="password"
                        className="form-control py-2 input-fancy"
                        placeholder="Confirm New Password"
                        value={confirmResetPassword}
                        onChange={(e) => setConfirmResetPassword(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-fancy-vibrant w-100 py-3 rounded-pill text-uppercase fw-bold mb-3"
                      disabled={loading || otpCode.length !== 6}
                    >
                      {loading ? (
                        <span className="spinner-border spinner-border-sm me-2"></span>
                      ) : null}
                      RESET PASSWORD & SIGN IN
                    </button>

                    <div className="text-center small">
                      {countdown > 0 ? (
                        <span className="text-muted">Resend OTP in {countdown}s</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-link p-0 text-dark fw-bold"
                          onClick={handleResendOtp}
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>

              {/* Bottom Guarantee */}
              <div className="text-center pt-3 border-top mt-3">
                <span className="small text-muted" style={{ fontSize: '0.72rem' }}>
                  <i className="bi bi-shield-lock-fill text-success me-1"></i>
                  Protected by 256-bit encryption. Your credentials and payment tokens are never shared.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
);
};
