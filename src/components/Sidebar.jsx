import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  FileText, 
  ClipboardCheck,
  LogOut,
  Users,
  Shield,
  BarChart3,
  History,
  Building2,
  Upload  
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const navItems = {
    admin: [
      { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
      { name: 'Staff Management', path: '/admin/staff', icon: Shield },
      { name: 'Business Records', path: '/admin/business', icon: Building2 },
      { name: 'Clearances', path: '/admin/clearance', icon: FileText },
      { name: 'Inspections', path: '/admin/inspections', icon: ClipboardCheck },
      { name: 'Reports', path: '/admin/reports', icon: BarChart3 },
      { name: 'Audit Logs', path: '/admin/audit', icon: History },
    ],
    staff: [
      { name: 'Dashboard', path: '/staff', icon: LayoutDashboard },
      { name: 'Business Records', path: '/staff/business', icon: Building2 },
      { name: 'Clearances', path: '/staff/clearance', icon: FileText },
      { name: 'Inspections', path: '/staff/inspections', icon: ClipboardCheck },
      //{ name: 'Test Upload', path: '/staff/bulk-import', icon: Upload },  
      { name: 'Reports', path: '/staff/reports', icon: BarChart3 },
    ]
  };

  const currentNavItems = user?.role ? navItems[user.role] || [] : [];

  if (!user) return null;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-64px)] fixed left-0 top-16">
      <nav className="flex-1 overflow-y-auto py-6 px-3">
        <div className="space-y-1">
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : 'text-gray-500'}`} />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;