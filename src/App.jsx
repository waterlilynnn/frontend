import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';

// Layout
import SidebarLayout from './components/SidebarLayout';

// Public Pages
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';

// Staff Pages
import StaffDashboard from './pages/staff/Dashboard';
import StaffBulkImport from './pages/staff/BulkImport';
import StaffBusinessRecords from './pages/staff/BusinessRecords';
import StaffBusinessDetails from './pages/staff/BusinessDetails';
import StaffClearance from './pages/staff/ClearanceGeneration';
import StaffClearanceView from './pages/staff/ClearanceView';
import StaffInspections from './pages/staff/Inspections';
import StaffReports from './pages/staff/Reports';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminStaff from './pages/admin/StaffManagement';
import AdminBusinessRecords from './pages/admin/BusinessRecords';
import AdminClearance from './pages/admin/ClearanceGeneration.jsx'; 
import AdminClearanceView from './pages/admin/ClearanceView';
import AdminInspections from './pages/admin/Inspections';
import AdminReports from './pages/admin/Reports';
import AdminAuditLogs from './pages/admin/AuditLogs';

const queryClient = new QueryClient();

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <SidebarLayout>{children}</SidebarLayout>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#363636',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                borderRadius: '0.5rem',
              },
            }}
          />
          
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={
              <PrivateRoute allowedRoles={['admin', 'staff']}>
                <ChangePassword />
              </PrivateRoute>
            } />

            {/* Staff routes */}
            <Route path="/staff" element={
              <PrivateRoute allowedRoles={['staff']}>
                <StaffDashboard />
              </PrivateRoute>
            } />
            <Route path="/staff/bulk-import" element={
              <PrivateRoute allowedRoles={['staff']}>
                <StaffBulkImport />
              </PrivateRoute>
            } />
            <Route path="/staff/business" element={
              <PrivateRoute allowedRoles={['staff']}>
                <StaffBusinessRecords />
              </PrivateRoute>
            } />
            <Route path="/staff/business/:id" element={
              <PrivateRoute allowedRoles={['staff']}>
                <StaffBusinessDetails />
              </PrivateRoute>
            } />
            <Route path="/staff/clearance" element={
              <PrivateRoute allowedRoles={['staff']}>
                <StaffClearance />
              </PrivateRoute>
            } />
            <Route path="/staff/clearance/:id/view" element={
              <PrivateRoute allowedRoles={['staff', 'admin']}>
                <StaffClearanceView />
              </PrivateRoute>
            } />
            <Route path="/staff/inspections" element={
              <PrivateRoute allowedRoles={['staff']}>
                <StaffInspections />
              </PrivateRoute>
            } />
            <Route path="/staff/reports" element={
              <PrivateRoute allowedRoles={['staff']}>
                <StaffReports />
              </PrivateRoute>
            } />

            {/* Admin routes */}
            <Route path="/admin" element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            } />
            <Route path="/admin/staff" element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminStaff />
              </PrivateRoute>
            } />
            <Route path="/admin/business" element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminBusinessRecords />
              </PrivateRoute>
            } />
            <Route path="/admin/clearance" element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminClearance />
              </PrivateRoute>
            } />
            <Route path="/admin/clearance/:id/view" element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminClearanceView />
              </PrivateRoute>
            } />
            <Route path="/admin/inspections" element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminInspections />
              </PrivateRoute>
            } />
            <Route path="/admin/reports" element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminReports />
              </PrivateRoute>
            } />
            <Route path="/admin/audit" element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminAuditLogs />
              </PrivateRoute>
            } />

            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;