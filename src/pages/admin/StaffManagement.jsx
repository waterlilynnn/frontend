import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import API from '../../config/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const StaffManagement = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ full_name: '', email: '' });
  const [creating, setCreating] = useState(false);

  // Fetch staff list
  const { data: staff, isLoading, refetch } = useQuery({
    queryKey: ['staffList'],
    queryFn: async () => {
      const response = await API.get('/admin/staff');
      return response.data;
    },
  });

  // Create staff mutation
  const createStaff = useMutation({
    mutationFn: async (staffData) => {
      const response = await API.post('/admin/staff', staffData);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Staff account created! Temporary password: ${data.temporary_password}`);
      setShowCreateModal(false);
      setNewStaff({ full_name: '', email: '' });
      refetch();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create staff');
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Staff Management</h1>
          <p className="text-gray-600 mt-1">Manage staff accounts and permissions</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Add New Staff
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">Total Staff</p>
          <p className="text-3xl font-bold text-emerald-700">{staff?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-3xl font-bold text-emerald-700">
            {staff?.filter(s => s.is_active).length || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">Inactive</p>
          <p className="text-3xl font-bold text-emerald-700">
            {staff?.filter(s => !s.is_active).length || 0}
          </p>
        </div>
      </div>

      {/* Staff able */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
              {staff?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <p className="text-gray-900 mb-2">No staff members yet</p>
                    <p className="text-sm text-gray-600">
                      Click "Add New Staff" to create your first staff account.
                    </p>
                  </td>
                </tr>
              ) : (
                staff?.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-gray-900">{member.full_name}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{member.email}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {format(new Date(member.created_at), 'MMM dd, yyyy')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm ${
                        member.is_active ? 'text-emerald-600' : 'text-gray-400'
                      }`}>
                        {getStatusText(member.is_active)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus.mutate(member.id)}
                        className={`text-sm ${
                          member.is_active 
                            ? 'text-red-600 hover:text-red-800' 
                            : 'text-emerald-600 hover:text-emerald-800'
                        }`}
                      >
                        {member.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create staff modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Add New Staff Member
              </h2>
              
              <form onSubmit={handleCreateStaff}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStaff.full_name}
                    onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Juan Dela Cruz"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="staff@example.com"
                    required
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm font-medium text-blue-800">Auto-generated password</p>
                  <p className="text-xs text-blue-600 mt-1">
                    A random password will be generated and sent to the staff's email.
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
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
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Staff Account'}
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