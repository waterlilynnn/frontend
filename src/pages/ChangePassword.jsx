import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import API from '../config/api';
import { 
  Lock, 
  Key, 
  AlertCircle, 
  CheckCircle,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

const ChangePassword = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth(); 
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [errors, setErrors] = useState({});

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  const validatePassword = (password) => {
    return password.length >= 8;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    
    if (!formData.current_password) {
      newErrors.current_password = 'Current password is required';
    }
    
    if (!formData.new_password) {
      newErrors.new_password = 'New password is required';
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = 'Password must be at least 8 characters';
    }
    
    if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    
    try {
      await API.post('/auth/change-password', {
        current_password: formData.current_password,
        new_password: formData.new_password
      });
      
      toast.success('Password changed successfully!');
      handleClose();
      
      if (user?.role === 'admin') {
        navigate('/admin');
      } else if (user?.role === 'staff') {
        navigate('/staff');
      } else {
        navigate('/owner');
      }
      
    } catch (error) {
      if (error.response?.status === 400) {
        setErrors({ 
          current_password: error.response.data.detail || 'Current password is incorrect' 
        });
      } else {
        toast.error('Failed to change password');
      }
    }
    
    setLoading(false);
  };

  const togglePassword = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const isFormValid = () => {
    if (!formData.current_password || !formData.new_password || !formData.confirm_password) {
      return false;
    }
    if (formData.new_password.length < 8) {
      return false;
    }
    if (formData.new_password !== formData.confirm_password) {
      return false;
    }
    return true;
  };

  const handleClose = () => {
    setFormData({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Modal header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Lock className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-gray-800">Change Password</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                name="current_password"
                value={formData.current_password}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg pr-10 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.current_password ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => togglePassword('current')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.current_password && (
              <p className="mt-1 text-xs text-red-600 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.current_password}
              </p>
            )}
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                name="new_password"
                value={formData.new_password}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg pr-10 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.new_password ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => togglePassword('new')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            
            <div className="mt-1 text-xs text-gray-500">
              Minimum 8 characters
            </div>
            
            {errors.new_password && (
              <p className="mt-1 text-xs text-red-600">{errors.new_password}</p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg pr-10 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.confirm_password ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => togglePassword('confirm')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {formData.confirm_password && formData.new_password === formData.confirm_password && (
              <p className="mt-1 text-xs text-green-600 flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                Passwords match
              </p>
            )}
            {errors.confirm_password && (
              <p className="mt-1 text-xs text-red-600">{errors.confirm_password}</p>
            )}
          </div>

          {/* Modal footer */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                  Changing...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;