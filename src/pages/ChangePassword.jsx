import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import API from '../config/api';
import { Lock, Eye, EyeOff, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ChangePassword = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
      await API.post('/auth/change-password', {
        current_password: formData.current_password,
        new_password: formData.new_password,
      });
      toast.success('Password changed successfully!');
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

  const handleClose = () => {
    setFormData({ current_password: '', new_password: '', confirm_password: '' });
    setErrors({});
    onClose();
  };

  const passwordsMatch =
    formData.confirm_password && formData.new_password === formData.confirm_password;

  return (
    /* Overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal card — matches the white card style of Login/ForgotPassword */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md bg-white rounded-2xl border border-black/[0.07] shadow-lg p-6 sm:p-8">

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
            {errors.current_password && (
              <p className="mt-1.5 text-xs text-red-500">{errors.current_password}</p>
            )}
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
      </div>
    </div>
  );
};

export default ChangePassword;