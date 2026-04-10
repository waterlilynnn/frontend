import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Key, ChevronDown, User, Save, X, LogOut, Menu } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import ChangePassword from '../pages/ChangePassword';
import API from '../config/api';
import toast from 'react-hot-toast';

const Header = ({ onMenuToggle, sidebarOpen }) => {
  const { user, setUser, logout } = useAuth();
  const [showUserMenu, setShowUserMenu]       = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm]               = useState({ full_name: '', email: '' });
  const [editing, setEditing]                 = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (user) setEditForm({ full_name: user.full_name || '', email: user.email || '' });
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    if (showUserMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleUpdateProfile = async () => {
    if (!editForm.full_name.trim() || !editForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setEditing(true);
    try {
      const response = await API.put('/users/profile', {
        full_name: editForm.full_name.trim(),
        email:     editForm.email.trim(),
      });
      const updatedUser = { ...user, full_name: response.data.full_name, email: response.data.email };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      toast.success('Profile updated successfully');
      setShowEditProfile(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setEditing(false);
    }
  };

  if (!user) return null;

  const displayName = user.full_name || user.email?.split('@')[0] || 'User';
  const userRole    = user.role === 'admin' ? 'Administrator' : 'Staff Member';

  return (
    <>
      <header className="bg-white border-b border-gray-200 h-16 fixed top-0 left-0 right-0 z-50">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between">

          {/* Hamburger */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:text-gray-700
                         hover:bg-gray-100 transition-colors"
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={sidebarOpen}
            >
              <Menu className="h-5 w-5" />
            </button>

            <img src="/cenro-logo.png" alt="CENRO" className="h-8 w-auto object-contain" />
          </div>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 py-2 px-2 sm:px-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="bg-forest-100 p-1.5 rounded-full">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-800" />
              </div>
              {/* Name */}
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-800 leading-none">{displayName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{userRole}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                {/* User info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-forest-100 text-forest-800 rounded-full">
                    {userRole}
                  </span>
                </div>

                <button
                  onClick={() => { setShowUserMenu(false); setShowEditProfile(true); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                >
                  <User className="h-4 w-4" /><span>Edit Profile</span>
                </button>

                <button
                  onClick={() => { setShowUserMenu(false); setShowChangePassword(true); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                >
                  <Key className="h-4 w-4" /><span>Change Password</span>
                </button>

                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                  >
                    <LogOut className="h-4 w-4" /><span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Edit Profile</h2>
                <button onClick={() => setShowEditProfile(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="your@email.com"
                  />
                  <p className="text-xs text-gray-400 mt-1">Changing your email will affect your login credentials</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowEditProfile(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateProfile}
                  disabled={editing}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {editing
                    ? <><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                    : <><Save className="h-4 w-4" />Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ChangePassword isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} />
    </>
  );
};

export default Header;