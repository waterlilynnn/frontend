import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { useEffect, useState } from 'react';

import SidebarLayout from './components/SidebarLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';

// Staff pages
import StaffDashboard from './pages/staff/Dashboard';
import StaffBulkImport from './pages/staff/BulkImport';
import StaffBusinessRecords from './pages/staff/BusinessRecords';
import StaffBusinessDetails from './pages/staff/BusinessDetails';
import StaffClearanceGeneration from './pages/staff/ClearanceGeneration';
import StaffClearanceView from './pages/staff/ClearanceView';
import StaffInspections from './pages/staff/Inspections';
import StaffReports from './pages/staff/Reports';

// Admin pages
import AdminArchiveRecords from './pages/admin/ArchiveRecords.jsx';
import AdminAuditLogs from './pages/admin/AuditLogs';
import AdminDashboard from './pages/admin/Dashboard';
import AdminBusinessRecords from './pages/admin/BusinessRecords';
import AdminBusinessDetails from './pages/admin/BusinessDetails';
import AdminClearanceGeneration from './pages/admin/ClearanceGeneration';
import AdminClearanceView from './pages/admin/ClearanceView';
import AdminInspections from './pages/admin/Inspections';
import AdminReports from './pages/admin/Reports';
import AdminSettings from './pages/admin/Settings';
import AdminStaffManagement from './pages/admin/StaffManagement';

const queryClient = new QueryClient();

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!isLoading && (!token || !storedUser || !user)) {
      navigate('/login', { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return <SidebarLayout>{children}</SidebarLayout>;
};

const AppRoutes = () => {
  const { user } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const location = useLocation();

  // Check if user needs to change password (first login or forced)
  useEffect(() => {
    const needsChange = localStorage.getItem('needsPasswordChange');
    if (user && needsChange === 'true' && location.pathname !== '/change-password') {
      setShowChangePassword(true);
    }
  }, [user, location.pathname]);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#fff', color: '#363636', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', borderRadius: '0.5rem' },
        }}
      />
      
      <ChangePassword 
        isOpen={showChangePassword} 
        onClose={() => {
          setShowChangePassword(false);
          localStorage.removeItem('needsPasswordChange');
        }} 
      />

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/staff" element={<PrivateRoute allowedRoles={['staff']}><StaffDashboard /></PrivateRoute>} />
        <Route path="/staff/bulk-import" element={<PrivateRoute allowedRoles={['staff']}><StaffBulkImport /></PrivateRoute>} />
        <Route path="/staff/business" element={<PrivateRoute allowedRoles={['staff']}><StaffBusinessRecords /></PrivateRoute>} />
        <Route path="/staff/business/:id" element={<PrivateRoute allowedRoles={['staff']}><StaffBusinessDetails /></PrivateRoute>} />
        <Route path="/staff/clearance" element={<PrivateRoute allowedRoles={['staff']}><StaffClearanceGeneration /></PrivateRoute>} />
        <Route path="/staff/clearance/:id/view" element={<PrivateRoute allowedRoles={['staff', 'admin']}><StaffClearanceView /></PrivateRoute>} />
        <Route path="/staff/inspections" element={<PrivateRoute allowedRoles={['staff']}><StaffInspections /></PrivateRoute>} />
        <Route path="/staff/reports" element={<PrivateRoute allowedRoles={['staff']}><StaffReports /></PrivateRoute>} />

        <Route path="/admin" element={<PrivateRoute allowedRoles={['admin']}><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/staff" element={<PrivateRoute allowedRoles={['admin']}><AdminStaffManagement /></PrivateRoute>} />
        <Route path="/admin/business" element={<PrivateRoute allowedRoles={['admin']}><AdminBusinessRecords /></PrivateRoute>} />
        <Route path="/admin/business/:id" element={<PrivateRoute allowedRoles={['admin']}><AdminBusinessDetails /></PrivateRoute>} />
        <Route path="/admin/clearance" element={<PrivateRoute allowedRoles={['admin']}><AdminClearanceGeneration /></PrivateRoute>} />
        <Route path="/admin/clearance/:id/view" element={<PrivateRoute allowedRoles={['admin']}><AdminClearanceView /></PrivateRoute>} />
        <Route path="/admin/inspections" element={<PrivateRoute allowedRoles={['admin']}><AdminInspections /></PrivateRoute>} />
        <Route path="/admin/reports" element={<PrivateRoute allowedRoles={['admin']}><AdminReports /></PrivateRoute>} />
        <Route path="/admin/audit" element={<PrivateRoute allowedRoles={['admin']}><AdminAuditLogs /></PrivateRoute>} />
        <Route path="/admin/archive" element={<PrivateRoute allowedRoles={['admin']}><AdminArchiveRecords /></PrivateRoute>} />
        <Route path="/admin/settings" element={<PrivateRoute allowedRoles={['admin']}><AdminSettings /></PrivateRoute>} />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;