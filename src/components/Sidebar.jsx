import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, FileText, ClipboardCheck, LogOut, Users,
  BarChart3, History, Building2, Settings, Archive, AlertTriangle, X,
} from 'lucide-react';
import { useState } from 'react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navItems = {
    admin: [
      { name: 'Dashboard',        path: '/admin',             icon: LayoutDashboard },
      { name: 'Staff Management', path: '/admin/staff',       icon: Users },
      { name: 'Business Records', path: '/admin/business',    icon: Building2 },
      { name: 'Clearances',       path: '/admin/clearance',   icon: FileText },
      { name: 'Inspections',      path: '/admin/inspections', icon: ClipboardCheck },
      { name: 'Reports',          path: '/admin/reports',     icon: BarChart3 },
      { name: 'Audit Logs',       path: '/admin/audit',       icon: History },
      { name: 'Settings',         path: '/admin/settings',    icon: Settings },
    ],
    staff: [
      { name: 'Dashboard',        path: '/staff',             icon: LayoutDashboard },
      { name: 'Business Records', path: '/staff/business',    icon: Building2 },
      { name: 'Clearances',       path: '/staff/clearance',   icon: FileText },
      { name: 'Inspections',      path: '/staff/inspections', icon: ClipboardCheck },
      { name: 'Reports',          path: '/staff/reports',     icon: BarChart3 },
    ],
  };

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const handleConfirmLogout = () => { setShowLogoutConfirm(false); logout(); };
  const handleCancelLogout  = () => setShowLogoutConfirm(false);

  const currentNavItems = user?.role ? (navItems[user.role] ?? []) : [];
  if (!user) return null;

  return (
    <>
      <aside
        className={`
          fixed left-0 top-0 bottom-0 z-40 w-64 bg-white border-r border-gray-200
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:top-16 lg:z-20
        `}
      >
        {/* Mobile */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 lg:hidden">
          <div className="flex items-center gap-2">
            <img src="/cenro-logo.png" alt="CENRO" className="h-7 w-auto object-contain" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-0.5">
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  replace
                  onClick={() => onClose()}
                  className={`
                    flex items-center space-x-3 px-4 py-2.5 rounded-lg
                    transition-all duration-200
                    ${isActive
                      ? 'bg-forest-50 text-emerald-800'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-emerald-700' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-500
                       hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-md font-semibold text-gray-900">Confirm Sign Out</h3>
              </div>
              <button onClick={handleCancelLogout} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-700 text-center mb-6">Are you sure you want to sign out?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleCancelLogout}
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;