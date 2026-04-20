import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import API from '../config/api';
import { Lock, Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const MAX_COUNTDOWN = 5; // seconds before auto-redirect

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const code  = searchParams.get('code')  || '';

  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [done, setDone]                       = useState(false);
  const [countdown, setCountdown]             = useState(MAX_COUNTDOWN);
  const [error, setError]                     = useState('');

  const passwordsMatch = confirmPassword && newPassword === confirmPassword;

  // Countdown + redirect after success
  useEffect(() => {
    if (!done) return;
    if (countdown === 0) { navigate('/login'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [done, countdown, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await API.post('/auth/reset-password', { email, code, new_password: newPassword });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. The code may have expired.');
    } finally {
      setLoading(false);
    }
  };

  // BUG FIX: the SVG ring animation was wrong.
  //
  // The circumference of the circle is 2π*r = 2π*28 ≈ 175.9 px.
  // `strokeDasharray` = circumference means "the stroke is one full circle long".
  // `strokeDashoffset` controls how much of that stroke is shifted (hidden):
  //   • offset = 0               → full ring visible  (timer just started)
  //   • offset = circumference   → ring fully hidden   (timer expired)
  //
  // Previous code: offset = circumference * (countdown / 15)
  //   At countdown=5: offset = 175.9 * 0.33 = 58.6  → ring is 67% full  ❌ starts part-way
  //   At countdown=0: offset = 0                      → ring is 100% full ❌ fills up, wrong!
  //
  // Correct formula: ring DRAINS as countdown decreases
  //   offset = circumference * (1 - countdown / MAX_COUNTDOWN)
  //   At countdown=5: offset = 0                    → ring 100% full  ✓
  //   At countdown=0: offset = circumference        → ring 0%  (empty) ✓

  const CIRCUMFERENCE = 2 * Math.PI * 28;
  const ringOffset = CIRCUMFERENCE * (1 - countdown / MAX_COUNTDOWN);

  return (
    <div className="min-h-screen bg-[#edf3f0] flex flex-col relative overflow-hidden">
      <div className="absolute top-[-60px] right-[-60px] w-64 h-64 rounded-full bg-[#9fe1cb] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-40px] left-[-40px] w-48 h-48 rounded-full bg-[#5dcaa5] opacity-15 pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-30px] w-80 h-80 rounded-full bg-[#9fe1cb] opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{ backgroundImage: `url('/cityhall.jpg')` }} />

      {/* Mobile header */}
      <div className="lg:hidden relative z-10 flex flex-col items-center px-4 pt-5 pb-4">
        <img src="/cenro-logo.png" alt="CENRO Logo" className="h-12 w-auto object-contain mb-2" />
        <div className="w-60 h-0.5 bg-[#107e45] rounded-full mb-2" />
        <div className="text-center">
          <h1 className="text-base font-bold text-[#0e7641] leading-tight">Environmental Management Clearance System</h1>
          <p className="text-sm italic text-[#138a4c] mt-1">Better, Cleaner &amp; Greener Tagaytay</p>
        </div>
      </div>

      {/* Desktop top bar */}
      <div className="hidden lg:flex relative z-10 items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-0.5 h-12 bg-[#107e45] rounded-full" />
          <div>
            <h1 className="text-lg font-bold text-[#0e7641] leading-tight">Environmental Management Clearance System</h1>
            <p className="text-md italic text-[#138a4c] mt-0.5">Better, Cleaner, &amp; Greener Tagaytay</p>
          </div>
        </div>
        <img src="/cenro-logo.png" alt="CENRO Logo" className="h-14 w-auto object-contain" />
      </div>

      {/* Card area */}
      <div className={`relative z-10 flex-1 flex items-center justify-center lg:items-start ${done ? 'lg:pt-20' : 'lg:pt-2'}`}>
        <div className="w-full max-w-sm mx-4 lg:min-w-[450px] lg:max-w-md">

          {/* Floating icon */}
          <div className="flex justify-center">
            <div className="relative z-10 mb-[-48px] w-24 h-24 rounded-full bg-[#0a6045] border-4 border-[#edf3f0] shadow-xl flex items-center justify-center">
              {done
                ? <CheckCircle className="h-10 w-10 text-white" strokeWidth={1.5} />
                : <KeyRound    className="h-10 w-10 text-white" strokeWidth={1.5} />
              }
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.07] pt-16 pb-6 px-6 lg:pb-8 lg:px-8 shadow-lg">

            {done ? (
              /* SUCCESS STATE */
              <div className="text-center space-y-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold text-[#0a6045]">Password Reset!</h2>
                  <p className="text-xs lg:text-sm text-gray-500 mt-1">
                    Your password has been updated successfully.
                  </p>
                </div>

                {/* Countdown ring — drains to empty as seconds run out */}
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      {/* Background track */}
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#d8f3dc" strokeWidth="6" />
                      {/* Animated ring */}
                      <circle
                        cx="32" cy="32" r="28" fill="none"
                        stroke="#0f6e53" strokeWidth="6"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={ringOffset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-[#0f6e53]">
                      {countdown}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Redirecting to Sign In in <span className="font-semibold text-[#0f6e53]">{countdown}</span> second{countdown !== 1 ? 's' : ''}…
                  </p>
                </div>

                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-3 bg-[#0f6e53] hover:bg-[#0b6048] text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Go to Sign In now
                </button>
              </div>
            ) : (
              /* FORM STATE */
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl lg:text-2xl font-bold text-[#0a6045]">Reset Password</h2>
                  <p className="text-xs lg:text-sm text-gray-500 mt-1">Create a new password for your account.</p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs lg:text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-6">

                  {/* New Password */}
                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-600 mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1d9e75]" />
                      <input
                        type={showNew ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className="w-full pl-9 pr-10 py-3 lg:py-3.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/30 focus:border-[#1d9e75] transition-colors"
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-600 mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1d9e75]" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full pl-9 pr-10 py-3 lg:py-3.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/30 focus:border-[#1d9e75] transition-colors"
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordsMatch && (
                      <p className="mt-1.5 text-xs text-[#1d9e75] flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Passwords match
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 lg:py-3.5 bg-[#0f6e53] hover:bg-[#0a6045] text-white text-sm lg:text-base font-medium rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading
                      ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Resetting...</>
                      : 'Reset Password'}
                  </button>
                </form>

                <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                  <Link to="/login" className="inline-flex items-center gap-1 text-xs lg:text-sm text-[#0f6e56] hover:text-[#085041]">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Sign In
                  </Link>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;