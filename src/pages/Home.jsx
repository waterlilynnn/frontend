import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import API from '../config/api';
import toast from 'react-hot-toast';
import {
  Mail, Lock, Eye, EyeOff, ArrowLeft,
  AlertCircle, CheckCircle, User,
  ShieldCheck, KeyRound, Facebook,
} from 'lucide-react';

/* view state keys */
const V = { HOME: 'home', LOGIN: 'login', FORGOT: 'forgot', VERIFY: 'verify', RESET: 'reset' };

/* shared input styles — reduced padding on mobile */
const IN  = 'w-full pl-10 pr-4 py-2.5 sm:py-3.5 lg:py-4 text-sm bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f6e53]/30 focus:border-[#0f6e53] focus:bg-white transition-all duration-200';
const INR = 'w-full pl-10 pr-12 py-2.5 sm:py-3.5 lg:py-4 text-sm bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f6e53]/30 focus:border-[#0f6e53] focus:bg-white transition-all duration-200';
const BTN = 'w-full py-2.5 sm:py-3.5 lg:py-4 bg-gradient-to-r from-[#0f6e53] to-[#0a6045] hover:from-[#0a6045] hover:to-[#085041] text-white text-sm font-medium rounded-xl transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5';

/* floating icon per view */
const AUTH_ICON = { [V.LOGIN]: User, [V.FORGOT]: Mail, [V.VERIFY]: ShieldCheck, [V.RESET]: KeyRound };

export default function Home() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [view,      setView]      = useState(V.HOME);
  const [fading,    setFading]    = useState(false);

  /* login */
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPw,       setShowPw]       = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError,   setLoginError]   = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);

  /* forgot */
  const [forgotEmail,   setForgotEmail]   = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  /* verify */
  const [code,          setCode]          = useState(['','','','','','']);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [countdown,     setCountdown]     = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  /* reset */
  const [newPw,        setNewPw]        = useState('');
  const [confirmPw,    setConfirmPw]    = useState('');
  const [showNewPw,    setShowNewPw]    = useState(false);
  const [showCfmPw,    setShowCfmPw]    = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone,    setResetDone]    = useState(false);
  const [resetCd,      setResetCd]      = useState(5);
  const [verifiedCode, setVerifiedCode] = useState('');

  useEffect(() => {
    const path = location.pathname;
    if (path === '/login') setView(V.LOGIN);
    else if (path === '/forgot-password') setView(V.FORGOT);
    else if (path === '/reset-password') setView(V.RESET);
  }, [location.pathname]);

  useEffect(() => {
    if (user) navigate(user.role === 'admin' ? '/admin' : '/staff');
  }, [user, navigate]);

  useEffect(() => {
    if (!loginError) return;
    const t = setTimeout(() => setLoginError(''), 4000);
    return () => clearTimeout(t);
  }, [loginError]);

  useEffect(() => {
    if (!resetDone) return;
    if (resetCd === 0) { setResetDone(false); setResetCd(5); switchAuth(V.LOGIN); return; }
    const t = setTimeout(() => setResetCd(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resetDone, resetCd]);

  /* helpers */
  const switchAuth = (next) => {
    setFading(true);
    setTimeout(() => { setView(next); setFading(false); }, 200);
    if (next === V.LOGIN) window.history.replaceState(null, '', '/#/login');
    else if (next === V.FORGOT) window.history.replaceState(null, '', '/#/forgot-password');
    else if (next === V.RESET) window.history.replaceState(null, '', '/#/reset-password');
    else if (next === V.HOME) window.history.replaceState(null, '', '/#/');
  };

  const openAuth = () => { setView(V.LOGIN); window.history.replaceState(null, '', '/#/login'); };

  const backToHome = () => {
    setView(V.HOME);
    setEmail(''); setPassword('');
    setLoginError(''); setLoginSuccess(false);
    window.history.replaceState(null, '', '/#/');
  };

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
  };

  /* handlers */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true); setLoginError('');
    const result = await login(email, password);
    if (result.success) setLoginSuccess(true);
    else setLoginError(result.error);
    setLoginLoading(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: forgotEmail });
      switchAuth(V.VERIFY); startCountdown();
      toast.success('Verification code sent to your email');
    } catch { toast.error('Failed to send code'); }
    setForgotLoading(false);
  };

  const handleCodeChange = (idx, val) => {
    if (val.length > 1 || !/^\d*$/.test(val)) return;
    const next = [...code]; next[idx] = val; setCode(next);
    if (val && idx < 5) document.getElementById(`vcode-${idx + 1}`)?.focus();
  };

  const handleCodeKey = (idx, e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) document.getElementById(`vcode-${idx - 1}`)?.focus();
  };

  const handleVerify = async () => {
    const full = code.join('');
    if (full.length !== 6) { toast.error('Enter the complete 6-digit code'); return; }
    setVerifyLoading(true);
    try {
      await API.post('/auth/verify-code', { email: forgotEmail, code: full });
      setVerifiedCode(full); switchAuth(V.RESET);
    } catch (err) { toast.error(err.response?.data?.detail || 'Invalid or expired code'); }
    setVerifyLoading(false);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResendLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: forgotEmail });
      toast.success('New code sent'); startCountdown();
    } catch { toast.error('Failed to resend'); }
    setResendLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    setResetLoading(true);
    try {
      await API.post('/auth/reset-password', { email: forgotEmail, code: verifiedCode, new_password: newPw });
      setResetDone(true);
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to reset password'); }
    setResetLoading(false);
  };

  /* derived */
  const isAuth   = view !== V.HOME;
  const AuthIcon = AUTH_ICON[view] || User;
  const pwsMatch = confirmPw && newPw === confirmPw;

  const CIRC = 2 * Math.PI * 28;
  const ring  = CIRC * (1 - resetCd / 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#edf3f0] via-[#e8f5e9] to-[#e0f2e9] flex flex-col relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute top-[-100px] right-[-100px] w-96 h-96 rounded-full bg-[#9fe1cb] opacity-20 pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-60px] left-[-60px] w-72 h-72 rounded-full bg-[#5dcaa5] opacity-15 pointer-events-none" />
      <div className="absolute bottom-[-120px] right-[-50px] w-[420px] h-[420px] rounded-full bg-[#7dd3a0] opacity-10 pointer-events-none" />
      <div className="absolute top-1/3 left-[-80px] w-56 h-56 rounded-full bg-[#a8e6cf] opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.06]"
           style={{ backgroundImage: "url('/cityhall.jpg')" }} />

      {/* ─── MAIN CONTENT ─── */}
      <div className="relative z-10 flex-1 flex items-center justify-center overflow-hidden py-6 sm:py-8 px-4">

        {/* ════════════════════════════════
            HOME VIEW
        ════════════════════════════════ */}
        <div className={`absolute inset-0 flex items-center justify-center px-4 sm:px-6 py-8
          transition-all duration-700 ease-in-out
          ${!isAuth ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-32 scale-95 pointer-events-none'}`}>

          <div className="w-full max-w-2xl text-center">

            {/* Logos */}
            <div className="flex items-center justify-center gap-8 sm:gap-12 mb-8 sm:mb-10">
              <div className="relative">
                <div className="absolute inset-0 bg-[#0f6e53]/10 rounded-full blur-2xl" />
                <img src="/cenro-logo.png" alt="CENRO"
                     className="relative h-16 sm:h-20 lg:h-24 w-auto object-contain drop-shadow-lg" />
              </div>
            </div>

            {/* Decorative divider */}
            <div className="flex items-center justify-center gap-3 mb-4 sm:mb-5">
              <div className="h-px w-14 bg-gradient-to-r from-transparent to-[#107e45]/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#107e45]/50" />
              <div className="h-px w-14 bg-gradient-to-l from-transparent to-[#107e45]/40" />
            </div>

            {/* Heading */}
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-[#0e7641] leading-tight tracking-tight mb-1 sm:mb-2">
              Environmental Management
            </h1>
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-[#0e7641] leading-tight tracking-tight mb-4 sm:mb-5">
              Clearance System
            </h1>

            {/* Tagline */}
            <p className="text-sm sm:text-base lg:text-xl font-semibold text-[#138a4c] italic mb-4 sm:mb-5">
              Better, Cleaner, &amp; Greener Tagaytay
            </p>

            {/* Description */}
            <p className="text-xs sm:text-sm lg:text-base text-gray-500 leading-relaxed mb-8 sm:mb-10 max-w-xl mx-auto">
              A Web-Based System to Optimize Environmental Management Clearance at
              Tagaytay City Environment and Natural Resources Office
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-12">
              <button
                onClick={openAuth}
                className="group relative w-52 sm:w-56 py-3 sm:py-3.5 bg-gradient-to-r from-[#0f6e53] to-[#0a6045]
                           text-white rounded-xl font-semibold text-sm
                           transition-all duration-300
                           shadow-lg shadow-[#0f6e53]/30 hover:shadow-xl hover:shadow-[#0f6e53]/40
                           hover:-translate-y-1 active:translate-y-0 overflow-hidden"
              >
                <span className="relative z-10">Access the System</span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a6045] to-[#085041] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>

              <Link
                to="/about"
                className="w-52 sm:w-56 py-3 sm:py-3.5 border-2 border-[#0f6e53]/30 text-[#0f6e53] rounded-xl
                           font-semibold text-sm text-center
                           hover:bg-[#0f6e53]/5 transition-all duration-300
                           hover:-translate-y-1 active:translate-y-0 hover:border-[#0f6e53]/60"
              >
                Meet the Team
              </Link>
            </div>

            {/* Footer link */}
            <a
              href="https://www.facebook.com/profile.php?id=61574050328045"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#6a8a72]
                         hover:text-[#0f6e53] transition-colors duration-300 group"
            >
              <Facebook className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
              <span className="border-b border-transparent group-hover:border-[#0f6e53]/30">
                CENRO Tagaytay City
              </span>
            </a>
          </div>
        </div>

        {/* ════════════════════════════════
            AUTH PANEL
        ════════════════════════════════ */}
        <div className={`relative w-full max-w-sm sm:max-w-md lg:max-w-lg
          transition-all duration-700 ease-in-out
          ${isAuth ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-32 scale-95 pointer-events-none'}`}>

          {/* Floating Icon */}
          <div className="flex justify-center">
            <div className="relative z-10 mb-[-48px] sm:mb-[-64px] w-24 h-24 sm:w-32 sm:h-32 rounded-2xl
                            bg-gradient-to-br from-[#0a6045] to-[#0f6e53]
                            border-4 border-[#edf3f0] shadow-2xl
                            flex items-center justify-center
                            transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <AuthIcon className="h-10 w-10 sm:h-14 sm:w-14 text-white" strokeWidth={1.5} />
            </div>
          </div>

          {/* Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-white/20 pt-16 sm:pt-24 pb-6 sm:pb-10 lg:pb-12 px-5 sm:px-7 lg:px-9 shadow-2xl">
            <div className={`transition-all duration-300 ${fading ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}`}>

              {/* LOGIN */}
              {view === V.LOGIN && (
                <div>
                  <div className="text-center mb-5 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#0a6045] mb-1 sm:mb-2">Welcome Back!</h2>
                    <p className="text-xs sm:text-sm text-gray-500">Sign in to your account to continue</p>
                  </div>

                  {loginSuccess && (
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border-l-4 border-green-500 rounded-xl flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-800">Login Successful!</p>
                        <p className="text-xs text-green-700">Redirecting to dashboard…</p>
                      </div>
                    </div>
                  )}

                  {loginError && (
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border-l-4 border-red-500 rounded-xl flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-red-800">Login Failed</p>
                        <p className="text-xs text-red-700">{loginError}</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-[#0f6e53]" />
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                               placeholder="name@example.com" className={IN} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Password</label>
                        <button type="button" onClick={() => switchAuth(V.FORGOT)}
                                className="text-xs text-[#0f6e53] hover:text-[#0a6045] hover:underline transition-colors">
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-[#0f6e53]" />
                        <input type={showPw ? 'text' : 'password'} required value={password}
                               onChange={e => setPassword(e.target.value)}
                               placeholder="••••••••" className={INR} />
                        <button type="button" onClick={() => setShowPw(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button type="submit" disabled={loginLoading} className={BTN}>
                      {loginLoading
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing in…</>
                        : 'Sign In'}
                    </button>
                  </form>

                  <div className="mt-5 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 text-center">
                    <button onClick={backToHome}
                            className="inline-flex items-center gap-2 text-sm text-[#0f6e53] hover:text-[#0a6045] transition-colors group">
                      <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                      Back to home
                    </button>
                  </div>
                </div>
              )}

              {/* FORGOT */}
              {view === V.FORGOT && (
                <div>
                  <div className="text-center mb-5 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#0a6045] mb-1 sm:mb-2">Forgot Password</h2>
                    <p className="text-xs sm:text-sm text-gray-500">Enter your email to receive a verification code.</p>
                  </div>

                  <form onSubmit={handleForgot} className="space-y-4 sm:space-y-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-[#0f6e53]" />
                        <input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                               placeholder="name@example.com" className={IN} />
                      </div>
                    </div>
                    <button type="submit" disabled={forgotLoading} className={BTN}>
                      {forgotLoading
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending…</>
                        : 'Send Verification Code'}
                    </button>
                  </form>

                  <div className="mt-5 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 text-center">
                    <button onClick={() => switchAuth(V.LOGIN)}
                            className="inline-flex items-center gap-2 text-sm text-[#0f6e53] hover:text-[#0a6045] transition-colors group">
                      <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                      Back to Sign In
                    </button>
                  </div>
                </div>
              )}

              {/* VERIFY */}
              {view === V.VERIFY && (
                <div>
                  <div className="text-center mb-5 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#0a6045] mb-1 sm:mb-2">Enter Code</h2>
                    <p className="text-xs sm:text-sm text-gray-500">
                      We sent a 6-digit code to <strong>{forgotEmail}</strong>
                    </p>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex justify-center gap-2 sm:gap-3">
                      {code.map((digit, idx) => (
                        <input key={idx} id={`vcode-${idx}`} type="text" maxLength={1} value={digit}
                               onChange={e => handleCodeChange(idx, e.target.value)}
                               onKeyDown={e => handleCodeKey(idx, e)} autoFocus={idx === 0}
                               className="w-10 h-12 sm:w-12 sm:h-14 lg:w-14 lg:h-16 text-center text-xl sm:text-2xl font-bold
                                          border-2 border-gray-200 rounded-xl bg-white
                                          focus:outline-none focus:ring-2 focus:ring-[#0f6e53]/30
                                          focus:border-[#0f6e53] text-[#0a6045] transition-all duration-200" />
                      ))}
                    </div>

                    <button onClick={handleVerify} disabled={verifyLoading} className={BTN}>
                      {verifyLoading
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Verifying…</>
                        : 'Verify Code'}
                    </button>

                    <div className="text-center">
                      {countdown > 0
                        ? <p className="text-xs text-gray-400">Resend code in {countdown} seconds</p>
                        : <button onClick={handleResend} disabled={resendLoading}
                                  className="text-xs text-[#0f6e53] hover:text-[#0a6045] hover:underline transition-colors">
                            {resendLoading ? 'Sending…' : 'Resend Code'}
                          </button>}
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 text-center">
                    <button onClick={() => switchAuth(V.FORGOT)}
                            className="inline-flex items-center gap-2 text-sm text-[#0f6e53] hover:text-[#0a6045] transition-colors group">
                      <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                      Back
                    </button>
                  </div>
                </div>
              )}

              {/* RESET */}
              {view === V.RESET && (
                <div>
                  {resetDone ? (
                    <div className="text-center space-y-4 sm:space-y-6">
                      <div>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#0a6045] mb-1 sm:mb-2">Password Reset!</h2>
                        <p className="text-xs sm:text-sm text-gray-500">Your password has been updated. Returning to Sign In…</p>
                      </div>
                      <div className="flex flex-col items-center gap-3 sm:gap-4 py-4 sm:py-6">
                        <div className="relative w-16 sm:w-20 h-16 sm:h-20">
                          <svg className="w-16 sm:w-20 h-16 sm:h-20 -rotate-90" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r="28" fill="none" stroke="#d8f3dc" strokeWidth="6" />
                            <circle cx="32" cy="32" r="28" fill="none" stroke="#0f6e53" strokeWidth="6"
                                    strokeDasharray={CIRC} strokeDashoffset={ring} strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 1s linear' }} />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xl sm:text-2xl font-bold text-[#0f6e53]">
                            {resetCd}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400">
                          Redirecting in <span className="font-semibold text-[#0f6e53]">{resetCd}</span> second{resetCd !== 1 ? 's' : ''}…
                        </p>
                      </div>
                      <button onClick={() => { switchAuth(V.LOGIN); setResetDone(false); }} className={BTN}>
                        Go to Sign In now
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-center mb-5 sm:mb-8">
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#0a6045] mb-1 sm:mb-2">Reset Password</h2>
                        <p className="text-xs sm:text-sm text-gray-500">Create a new password for your account.</p>
                      </div>

                      <form onSubmit={handleReset} className="space-y-4 sm:space-y-6">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-[#0f6e53]" />
                            <input type={showNewPw ? 'text' : 'password'} required value={newPw}
                                   onChange={e => setNewPw(e.target.value)}
                                   placeholder="Minimum 8 characters" className={INR} />
                            <button type="button" onClick={() => setShowNewPw(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                              {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-[#0f6e53]" />
                            <input type={showCfmPw ? 'text' : 'password'} required value={confirmPw}
                                   onChange={e => setConfirmPw(e.target.value)}
                                   placeholder="Re-enter new password" className={INR} />
                            <button type="button" onClick={() => setShowCfmPw(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                              {showCfmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {pwsMatch && (
                            <p className="mt-1.5 text-xs text-[#0f6e53] flex items-center gap-1.5">
                              <CheckCircle className="h-3.5 w-3.5" />Passwords match
                            </p>
                          )}
                        </div>

                        <button type="submit" disabled={resetLoading} className={BTN}>
                          {resetLoading
                            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Resetting…</>
                            : 'Reset Password'}
                        </button>
                      </form>

                      <div className="mt-5 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 text-center">
                        <button onClick={() => switchAuth(V.LOGIN)}
                                className="inline-flex items-center gap-2 text-sm text-[#0f6e53] hover:text-[#0a6045] transition-colors group">
                          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                          Back to Sign In
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-3">
        <p className="text-xs text-[#6a8a72]/60 italic">
          © {new Date().getFullYear()} City Environment and Natural Resources Office · Tagaytay City
        </p>
      </div>
    </div>
  );
}