import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../config/api';
import { Mail, ArrowLeft, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email });
      setStep('code');
      toast.success('Verification code sent to your email');
      startCountdown();
    } catch {
      toast.error('Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    setResendLoading(true);
    try {
      await API.post('/auth/forgot-password', { email });
      toast.success('New code sent');
      startCountdown();
    } catch {
      toast.error('Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) { toast.error('Please enter the 6-digit code'); return; }
    setLoading(true);
    try {
      await API.post('/auth/verify-code', { email, code: fullCode });
      navigate(`/reset-password?email=${encodeURIComponent(email)}&code=${fullCode}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-12 h-12 sm:w-14 sm:h-14 text-center text-2xl font-bold border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/30 focus:border-[#1d9e75] text-[#085041]";

  /* Icon changes per step */
  const StepIcon = step === 'email' ? Mail : ShieldCheck;

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
      <div className="relative z-10 flex-1 flex items-center justify-center lg:items-start lg:pt-16">
        <div className="w-full max-w-sm mx-4 lg:min-w-[450px] lg:max-w-md">

          {/* Floating icon */}
          <div className="flex justify-center">
            <div className="relative z-10 mb-[-48px] w-24 h-24 rounded-full bg-[#0a6045] border-4 border-[#edf3f0] shadow-xl flex items-center justify-center">
              <StepIcon className="h-10 w-10 text-white" strokeWidth={1.5} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.07] pt-16 pb-6 px-6 lg:pb-8 lg:px-8 shadow-lg">

            {step === 'email' ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl lg:text-2xl font-bold text-[#0a6045]">Forgot Password</h2>
                  <p className="text-xs lg:text-sm text-gray-500 mt-1">Enter your email to receive a verification code.</p>
                </div>
                <form onSubmit={handleEmailSubmit} className="space-y-5 lg:space-y-6">
                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-600 mb-1.5">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1d9e75]" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-9 pr-3 py-3 lg:py-3.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/30 focus:border-[#1d9e75] transition-colors"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 lg:py-3.5 bg-[#0f6e53] hover:bg-[#0a6045] text-white text-sm lg:text-base font-medium rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending...</> : 'Send Verification Code'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl lg:text-2xl font-bold text-[#0a6045]">Enter Verification Code</h2>
                  <p className="text-xs lg:text-sm text-gray-500 mt-1">We sent a 6-digit code to <strong>{email}</strong></p>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {code.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`code-input-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        className={inputClasses}
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleVerifyCode}
                    disabled={loading}
                    className="w-full py-3 lg:py-3.5 bg-[#0f6e56] hover:bg-[#085041] text-white text-sm lg:text-base font-medium rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Verifying...</> : 'Verify Code'}
                  </button>
                  <div className="text-center">
                    {countdown > 0 ? (
                      <p className="text-xs text-gray-400">Resend code in {countdown} seconds</p>
                    ) : (
                      <button onClick={handleResendCode} disabled={resendLoading} className="text-xs text-[#0f6e56] hover:text-[#085041] hover:underline">
                        {resendLoading ? 'Sending...' : 'Resend Code'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <Link to="/login" className="inline-flex items-center gap-1 text-xs lg:text-sm text-[#0f6e56] hover:text-[#085041]">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;