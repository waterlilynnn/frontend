import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import API from '../config/api';
import {
  Lock, Eye, EyeOff, CheckCircle,
  Mail, ShieldCheck, KeyRound, ArrowLeft, AlertTriangle, Monitor,
  ShieldQuestion,
} from 'lucide-react';
import toast from 'react-hot-toast';

const MODES = {
  CHANGE:       'change',
  FORGOT_EMAIL: 'forgot_email',
  FORGOT_CODE:  'forgot_code',
  FORGOT_RESET: 'forgot_reset',
  FORGOT_DONE:  'forgot_done',
};

const CODE_LENGTH = 6;

const ChangePassword = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, updateToken } = useAuth();
  const [mode, setMode] = useState(MODES.CHANGE);

  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = useState({});
  const [logoutOtherDevices, setLogoutOtherDevices] = useState(false);

  const [code, setCode]               = useState(Array(CODE_LENGTH).fill(''));
  const [countdown, setCountdown]     = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotNewPassword, setForgotNewPassword]         = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNew, setShowForgotNew]         = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.current_password) newErrors.current_password = 'Current password is required';
    if (!formData.new_password) newErrors.new_password = 'New password is required';
    else if (formData.new_password.length < 8) newErrors.new_password = 'Password must be at least 8 characters';
    if (formData.new_password !== formData.confirm_password) newErrors.confirm_password = 'Passwords do not match';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const res = await API.post('/auth/change-password', {
        current_password: formData.current_password,
        new_password: formData.new_password,
        logout_other_devices: logoutOtherDevices,
      });
      
      updateToken(res.data?.access_token);
      toast.success(
        logoutOtherDevices
          ? 'Password changed! You have been logged out of other devices/browsers.'
          : 'Password changed successfully!'
      );
      handleClose();
      navigate(user?.role === 'admin' ? '/admin' : '/staff');
    } catch (error) {
      if (error.response?.status === 400) {
        setErrors({ current_password: error.response.data.detail || 'Current password is incorrect' });
      } else {
        toast.error('Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePassword = (field) =>
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));

  const isFormValid = () =>
    formData.current_password &&
    formData.new_password &&
    formData.confirm_password &&
    formData.new_password.length >= 8 &&
    formData.new_password === formData.confirm_password;

  const passwordsMatch =
    formData.confirm_password && formData.new_password === formData.confirm_password;

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStartForgot = () => {
    setForgotError('');
    setCode(Array(CODE_LENGTH).fill(''));
    setMode(MODES.FORGOT_EMAIL);
  };

  const handleSendCode = async () => {
    if (!user?.email) { toast.error('No email on file for this account.'); return; }
    setForgotLoading(true);
    setForgotError('');
    try {
      await API.post('/auth/forgot-password', { email: user.email });
      toast.success('Verification code sent to your email');
      setMode(MODES.FORGOT_CODE);
      startCountdown();
    } catch {
      setForgotError('Failed to send verification code. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0 || !user?.email) return;
    setResendLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: user.email });
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
    if (value && index < CODE_LENGTH - 1) {
      const nextInput = document.getElementById(`cp-code-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`cp-code-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== CODE_LENGTH) { toast.error(`Please enter the ${CODE_LENGTH}-digit code`); return; }
    setForgotLoading(true);
    setForgotError('');
    try {
      await API.post('/auth/verify-code', { email: user.email, code: fullCode });
      setMode(MODES.FORGOT_RESET);
    } catch (err) {
      setForgotError(err.response?.data?.detail || 'Invalid or expired code');
    } finally {
      setForgotLoading(false);
    }
  };

  const forgotPasswordsMatch =
    forgotConfirmPassword && forgotNewPassword === forgotConfirmPassword;

  const handleForgotReset = async (e) => {
    e.preventDefault();
    setForgotError('');
    if (forgotNewPassword.length < 8) { setForgotError('Password must be at least 8 characters'); return; }
    if (forgotNewPassword !== forgotConfirmPassword) { setForgotError('Passwords do not match'); return; }

    setForgotLoading(true);
    try {
      await API.post('/auth/reset-password', {
        email: user.email,
        code: code.join(''),
        new_password: forgotNewPassword,
      });
      setMode(MODES.FORGOT_DONE);
    } catch (err) {
      setForgotError(err.response?.data?.detail || 'Failed to reset password. The code may have expired.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleBackToChange = () => {
    setMode(MODES.CHANGE);
    setForgotError('');
    setCode(Array(CODE_LENGTH).fill(''));
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setCountdown(0);
  };

  const handleClose = () => {
    setFormData({ current_password: '', new_password: '', confirm_password: '' });
    setErrors({});
    setLogoutOtherDevices(false);
    handleBackToChange();
    onClose();
  };

  const inputClasses = "w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/30 focus:border-[#1d9e75] text-[#085041]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md bg-white rounded-2xl border border-black/[0.07] shadow-lg p-6 sm:p-8">

        {mode === MODES.CHANGE && (
          <>
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-[#f2f3f2] flex items-center justify-center">
                  <Lock className="h-3.5 w-3.5 text-[#0f6e53]" />
                </div>
                <h2 className="text-xl font-bold text-[#0a6045]">Change Password</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-9">Update your account password below.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Current Password */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1d9e75]" />
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    name="current_password"
                    value={formData.current_password}
                    onChange={handleChange}
                    placeholder="Enter current password"
                    className={`w-full pl-9 pr-10 py-3 sm:py-3.5 text-sm bg-gray-50 border rounded-xl
                      text-gray-800 placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/30 focus:border-[#1d9e75]
                      transition-colors
                      ${errors.current_password ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  />
                  <button
                    type="button"
                    onClick={() => togglePassword('current')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  {errors.current_password ? (
                    <p className="text-xs text-red-500">{errors.current_password}</p>
                  ) : <span />}
                  <button
                    type="button"
                    onClick={handleStartForgot}
                    className="text-xs text-[#0f6e56] hover:text-[#085041] hover:underline whitespace-nowrap"
                  >
                    Forgot your current password?
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1d9e75]" />
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    name="new_password"
                    value={formData.new_password}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
                    className={`w-full pl-9 pr-10 py-3 sm:py-3.5 text-sm bg-gray-50 border rounded-xl
                      text-gray-800 placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/30 focus:border-[#1d9e75]
                      transition-colors
                      ${errors.new_password ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  />
                  <button
                    type="button"
                    onClick={() => togglePassword('new')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.new_password && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.new_password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1d9e75]" />
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Re-enter new password"
                    className={`w-full pl-9 pr-10 py-3 sm:py-3.5 text-sm bg-gray-50 border rounded-xl
                      text-gray-800 placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/30 focus:border-[#1d9e75]
                      transition-colors
                      ${errors.confirm_password ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  />
                  <button
                    type="button"
                    onClick={() => togglePassword('confirm')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Passwords match indicator */}
                {passwordsMatch && (
                  <p className="mt-1.5 text-xs text-[#1d9e75] flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Passwords match
                  </p>
                )}
                {errors.confirm_password && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.confirm_password}</p>
                )}
              </div>

              {/* Log out other devices */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={logoutOtherDevices}
                  onChange={(e) => setLogoutOtherDevices(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0f6e53] focus:ring-[#1d9e75]/40"
                />
                <span className="flex-1">
                  <span className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-700">
                    Log out of other devices/browsers
                  </span>
                  <span className="block text-xs text-gray-400 mt-0.5">
                    This device stays signed in. All other sessions will need to log in again.
                  </span>
                </span>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 sm:py-3.5 text-sm font-medium text-gray-600 border border-gray-200
                             rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !isFormValid()}
                  className="flex-1 py-3 sm:py-3.5 bg-[#0f6e53] hover:bg-[#0b6048] text-white text-sm font-medium
                             rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {mode === MODES.FORGOT_EMAIL && (
          <>
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="rounded-lg flex items-center justify-center">
                  <ShieldQuestion className="h-5 w-5 text-[#0f6e53]" />
                </div>
                <h2 className="text-xl font-bold text-[#0a6045]">Forgot Password</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-9">
                We&apos;ll send a verification code to your registered email.
              </p>
            </div>

            {forgotError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {forgotError}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1d9e75]" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    className="w-full pl-9 pr-3 py-3 sm:py-3.5 text-sm bg-gray-100 border border-gray-200 rounded-xl text-gray-600 cursor-not-allowed"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  The verification code will be sent to the email on your account.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSendCode}
                disabled={forgotLoading}
                className="w-full py-3 sm:py-3.5 bg-[#0f6e53] hover:bg-[#0a6045] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {forgotLoading
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending...</>
                  : 'Send Verification Code'}
              </button>

              <div className="pt-2 border-t border-gray-100 text-center">
                <button
                  type="button"
                  onClick={handleBackToChange}
                  className="inline-flex items-center gap-1 text-xs sm:text-sm text-[#0f6e56] hover:text-[#085041]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Change Password
                </button>
              </div>
            </div>
          </>
        )}

        {mode === MODES.FORGOT_CODE && (
          <>
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-[#f2f3f2] flex items-center justify-center">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#0f6e53]" />
                </div>
                <h2 className="text-xl font-bold text-[#0a6045]">Enter Verification Code</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-9">
                We sent a {CODE_LENGTH}-digit code to <strong>{user?.email}</strong>
              </p>
            </div>

            {forgotError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {forgotError}
              </div>
            )}

            <div className="space-y-6">
              <div className="flex justify-center gap-2 sm:gap-3">
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`cp-code-input-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(idx, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                    className={inputClasses}
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={forgotLoading}
                className="w-full py-3 sm:py-3.5 bg-[#0f6e56] hover:bg-[#085041] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {forgotLoading
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Verifying...</>
                  : 'Verify Code'}
              </button>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-gray-400">Resend code in {countdown} seconds</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendLoading}
                    className="text-xs text-[#0f6e56] hover:text-[#085041] hover:underline"
                  >
                    {resendLoading ? 'Sending...' : 'Resend Code'}
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100 text-center">
                <button
                  type="button"
                  onClick={handleBackToChange}
                  className="inline-flex items-center gap-1 text-xs sm:text-sm text-[#0f6e56] hover:text-[#085041]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Change Password
                </button>
              </div>
            </div>
          </>
        )}

        {mode === MODES.FORGOT_RESET && (
          <>
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-[#f2f3f2] flex items-center justify-center">
                  <KeyRound className="h-3.5 w-3.5 text-[#0f6e53]" />
                </div>
                <h2 className="text-xl font-bold text-[#0a6045]">Reset Password</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-9">Create a new password for your account.</p>
            </div>

            {forgotError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {forgotError}
              </div>
            )}

            <form onSubmit={handleForgotReset} className="space-y-5">
              {/* New Password */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1d9e75]" />
                  <input
                    type={showForgotNew ? 'text' : 'password'}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-9 pr-10 py-3 sm:py-3.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/30 focus:border-[#1d9e75] transition-colors"
                  />
                  <button type="button" onClick={() => setShowForgotNew(!showForgotNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showForgotNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1d9e75]" />
                  <input
                    type={showForgotConfirm ? 'text' : 'password'}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-9 pr-10 py-3 sm:py-3.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/30 focus:border-[#1d9e75] transition-colors"
                  />
                  <button type="button" onClick={() => setShowForgotConfirm(!showForgotConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showForgotConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {forgotPasswordsMatch && (
                  <p className="mt-1.5 text-xs text-[#1d9e75] flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Passwords match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3 sm:py-3.5 bg-[#0f6e53] hover:bg-[#0a6045] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {forgotLoading
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Resetting...</>
                  : 'Reset Password'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <button
                type="button"
                onClick={handleBackToChange}
                className="inline-flex items-center gap-1 text-xs sm:text-sm text-[#0f6e56] hover:text-[#085041]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Change Password
              </button>
            </div>
          </>
        )}

        {mode === MODES.FORGOT_DONE && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-[#0a6045] flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0a6045]">Password Reset!</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Your password has been updated successfully. 
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 sm:py-3.5 bg-[#0f6e53] hover:bg-[#0b6048] text-white text-sm font-medium rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ChangePassword;