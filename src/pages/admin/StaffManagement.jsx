import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import API from '../../config/api';
import useIsMobile from '../../hooks/useIsMobile';
import { Search, Plus, ChevronLeft, ChevronRight, X, Shield } from 'lucide-react';

const PER_PAGE = 10;

const StaffManagement = () => {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ full_name: '', email: '' });
  const [creating, setCreating] = useState(false);

  const { data: allStaff = [], isLoading, refetch } = useQuery({
    queryKey: ['staffList'],
    queryFn: async () => {
      const response = await API.get('/admin/staff');
      return response.data || [];
    },
  });

  // Client-side filter
  const filtered = searchQuery.length >= 2
    ? allStaff.filter(s => {
        const q = searchQuery.toLowerCase();
        return s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      })
    : allStaff;

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / PER_PAGE);

  // Desktop = paginated slice, Mobile = all
  const items = isMobile
    ? filtered
    : filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const createStaff = useMutation({
    mutationFn: async (staffData) => (await API.post('/admin/staff', staffData)).data,
    onSuccess: (data) => {
      toast.success(`Account created. Temporary password: ${data.temporary_password}`);
      setShowCreateModal(false);
      setNewStaff({ full_name: '', email: '' });
      refetch();
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'Failed to create staff account'),
  });

  const toggleStatus = useMutation({
    mutationFn: async (staffId) => (await API.patch(`/admin/staff/${staffId}/toggle-status`)).data,
    onSuccess: (data) => { toast.success(`Staff ${data.is_active ? 'activated' : 'deactivated'}`); refetch(); },
    onError: () => toast.error('Failed to update status'),
  });

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.full_name || !newStaff.email) { toast.error('Please fill in all fields'); return; }
    setCreating(true);
    await createStaff.mutateAsync(newStaff);
    setCreating(false);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-6 lg:pb-28 space-y-4">

        {/* Header */}
        <div className="flex justify-between items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Staff Management</h1>
          <button onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-3 sm:px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 shadow-sm text-sm">
            <Plus className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">New Staff</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input type="text" placeholder="Search by name or email…" value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-forest-500 focus:border-forest-500 text-sm" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Staff', value: allStaff.length },
            { label: 'Active',      value: allStaff.filter(s => s.is_active).length },
            { label: 'Inactive',    value: allStaff.filter(s => !s.is_active).length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-lg shadow-sm p-3 sm:p-4 border border-gray-100">
              <p className="text-xs sm:text-sm text-gray-500">{label}</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-800">{value}</p>
            </div>
          ))}
        </div>

        {/* Table / Cards */}
        <div className="bg-white rounded-lg shadow-sm">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">No staff members found</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Staff Member', 'Email', 'Created', 'Status', 'Actions'].map(col => (
                        <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{member.full_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{member.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{format(new Date(member.created_at), 'MMM dd, yyyy')}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium ${member.is_active ? 'text-green-700' : 'text-gray-500'}`}>
                            {member.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button onClick={() => toggleStatus.mutate(member.id)}
                            className={`px-3 py-1 border text-xs rounded transition-colors ${member.is_active ? 'border-red-600 text-red-600 hover:bg-red-50' : 'border-emerald-700 text-emerald-700 hover:bg-forest-50'}`}>
                            {member.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {items.map((member) => (
                  <div key={member.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{member.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{member.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium ${member.is_active ? 'text-green-700' : 'text-gray-400'}`}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{format(new Date(member.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    <button onClick={() => toggleStatus.mutate(member.id)}
                      className={`shrink-0 px-3 py-1 border text-xs rounded ${member.is_active ? 'border-red-600 text-red-600 hover:bg-red-50' : 'border-emerald-700 text-emerald-700 hover:bg-forest-50'}`}>
                      {member.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pagination — desktop only */}
      {!isMobile && totalPages > 1 && (
        <div className="fixed bottom-4 left-64 right-4 z-10">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-700">
              Page <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
              <span className="text-gray-400 ml-2">({totalCount} staff)</span>
            </span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-700 text-white hover:bg-emerald-800'}`}>
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-700 text-white hover:bg-emerald-800'}`}>
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create staff modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Add New Staff Member</h2>
                <button onClick={() => { setShowCreateModal(false); setNewStaff({ full_name: '', email: '' }); }}
                  className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
              </div>
              <form onSubmit={handleCreateStaff} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" value={newStaff.full_name}
                    onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Juan Dela Cruz" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                  <input type="email" value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="staff@example.com" required />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-800">Auto-generated password</p>
                  <p className="text-xs text-blue-600 mt-1">A random password will be generated and shown after creation.</p>
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                  <button type="button" onClick={() => { setShowCreateModal(false); setNewStaff({ full_name: '', email: '' }); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
                  <button type="submit" disabled={creating}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-2 text-sm">
                    {creating ? <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />Creating...</> : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;