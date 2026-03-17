import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Key, ChevronDown, User, Settings } from 'lucide-react';
import { useState } from 'react';
import ChangePassword from '../pages/ChangePassword'; 

const Header = () => {
  const { user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const getPageTitle = () => {
    const path = window.location.pathname;
    if (path.includes('/admin')) return 'Admin Dashboard';
    if (path.includes('/staff')) return 'Staff Dashboard';
    return 'EMC System';
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 h-16 fixed top-0 left-0 right-0 z-50">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <img src="/cenro-logo.png" alt="CENRO Logo" className="w-28 object-contain"/>
              <span className="text-xl font-bold text-forest-700 hidden md:block">
                EMC System
              </span>
            </div>
          </div>

          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-emerald-100 p-1.5 rounded-full">
                    <User className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-sm font-medium text-gray-800">{user.full_name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                    <span className="inline-block mt-2 px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded-full">
                      {user.role === 'admin' ? 'Administrator' : 'Staff Member'}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowChangePassword(true);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                  >
                    <Key className="h-4 w-4" />
                    <span>Change Password</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <ChangePassword 
        isOpen={showChangePassword} 
        onClose={() => setShowChangePassword(false)} 
      />
    </>
  );
};

export default Header;