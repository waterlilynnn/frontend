import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import API from '../../config/api';
import { 
  Search, 
  Plus, 
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Mail,
  Calendar,
  Shield
} from 'lucide-react';

const StaffManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ full_name: '', email: '' });
  const [creating, setCreating] = useState(false);

  // Fetch staff list
  const { data: staff, isLoading, refetch } = useQuery({
    queryKey: ['staffList', searchQuery, currentPage],
    queryFn: async () => {
      const response = await API.get('/admin/staff');
      let data = response.data || [];
      
      // Search filter
      if (searchQuery && searchQuery.length >= 2) {
        const query = searchQuery.toLowerCase();
        data = data.filter(s => 
          s.full_name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query)
        );
      }
      
      // Pagination
      const start = (currentPage - 1) * 10;
      const end = start + 10;
      
      return {
        items: data.slice(start, end),
        total: data.length,
        page: currentPage,
        per_page: 10,
        total_pages: Math.ceil(data.length / 10)
      };
    },
  });

  // Create staff mutation
  const createStaff = useMutation({
    mutationFn: async (staffData) => {
      const response = await API.post('/admin/staff', staffData);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Staff account created. Temporary password: ${data.temporary_password}`);
      setShowCreateModal(false);
      setNewStaff({ full_name: '', email: '' });
      refetch();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create staff account');
    },
  });

  // Toggle staff status
  const toggleStatus = useMutation({
    mutationFn: async (staffId) => {
      const response = await API.patch(`/admin/staff/${staffId}/toggle-status`);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Staff ${data.is_active ? 'activated' : 'deactivated'}`);
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to update status');
    },
  });

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.full_name || !newStaff.email) {
      toast.error('Please fill in all fields');
      return;
    }
    setCreating(true);
    await createStaff.mutateAsync(newStaff);
    setCreating(false);
  };

  const getStatusText = (isActive) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const items = staff?.items || [];
  const totalPages = staff?.total_pages || 1;
  const totalRecords = staff?.total || 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-24">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Staff Management</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Staff
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <p className="text-sm text-gray-500">Total Staff</p>
              <p className="text-2xl font-bold text-emerald-700">{totalRecords}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-emerald-700">
                {items.filter(s => s.is_active).length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <p className="text-sm text-gray-500">Inactive</p>
              <p className="text-2xl font-bold text-emerald-700">
                {items.filter(s => !s.is_active).length}
              </p>
            </div>
          </div>

          {/* Staff table */}
          <div className="bg-white rounded-lg shadow-sm">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No staff members found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff Member</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-900">{member.full_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-600">{member.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-600">
                                {format(new Date(member.created_at), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              member.is_active 
                                ? 'text-green-800' 
                                : 'text-gray-800'
                            }`}>
                              {getStatusText(member.is_active)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleStatus.mutate(member.id)}
                              className={`px-3 py-1 border text-xs rounded transition-colors ${
                                member.is_active 
                                  ? 'border-red-600 text-red-600 hover:bg-red-50' 
                                  : 'border-emerald-600 text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {member.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="border-t border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                        {totalRecords > 0 && (
                          <span className="text-gray-500 ml-2">
                            ({totalRecords} records)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className={`px-4 py-2 rounded-lg ${
                            currentPage === 1
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className={`px-4 py-2 rounded-lg ${
                            currentPage === totalPages
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Add New Staff Member</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewStaff({ full_name: '', email: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreateStaff}>
                {/* Full Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStaff.full_name}
                    onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Juan Dela Cruz"
                    required
                  />
                </div>
                
                {/* Email */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="staff@example.com"
                    required
                  />
                </div>

                {/* Password info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 mb-6">
                  <p className="text-xs text-blue-700 mt-1">
                    Temporary password will be sent to the email provided.
                  </p>
                </div>

                {/* Form actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewStaff({ full_name: '', email: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center"
                  >
                    {creating ? (
                      <>
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Account
                      </>
                    )}
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