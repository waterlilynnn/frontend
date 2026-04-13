import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import API from '../../config/api';
import useIsMobile from '../../hooks/useIsMobile';
import { Search, Plus, ChevronLeft, ChevronRight, X, Shield, AlertTriangle, UserMinus, Info } from 'lucide-react';

const MAX_STAFF = 5;
const PER_PAGE  = 10;

/* Helpers */
const fmtDate = (d) => {
  try { return format(new Date(d), 'MMM dd, yyyy'); }
  catch { return '—'; }
};

/* Main component */
const StaffManagement = () => {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery]       = useState('');
  const [currentPage, setCurrentPage]       = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // When limit is reached the admin picks one staff to deactivate first
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedToDeactivate, setSelectedToDeactivate] = useState(null);
  const [newStaff, setNewStaff]             = useState({ full_name: '', email: '' });
  const [creating, setCreating]             = useState(false);
  const [pendingCreate, setPendingCreate]   = useState(false);

  const { data: allStaff = [], isLoading, refetch } = useQuery({
    queryKey: ['staffList'],
    queryFn: async () => (await API.get('/admin/staff')).data || [],
  });

  const activeStaff   = allStaff.filter(s => s.is_active);
  const limitReached  = activeStaff.length >= MAX_STAFF;

  /* Filtered / paginated */
  const filtered = searchQuery.length >= 1
    ? allStaff.filter(s => {
        const q = searchQuery.toLowerCase();
        return s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      })
    : allStaff;

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / PER_PAGE);
  const items      = isMobile
    ? filtered
    : filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  /* Mutations */
  const createStaff = useMutation({
    mutationFn: async (data) => (await API.post('/admin/staff', data)).data,
    onSuccess: (data) => {
      toast.success(`Account created.\nTemporary password: ${data.temporary_password}`, { duration: 8000 });
      setShowCreateModal(false);
      setNewStaff({ full_name: '', email: '' });
      setPendingCreate(false);
      refetch();
    },
    onError: (err) => {
      const detail = err.response?.data?.detail || '';
      if (detail.startsWith('STAFF_LIMIT_REACHED')) {
        toast.error(`Maximum ${MAX_STAFF} active staff reached.`);
      } else {
        toast.error(detail || 'Failed to create staff account');
      }
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async (staffId) => (await API.patch(`/admin/staff/${staffId}/toggle-status`)).data,
    onSuccess: (data, staffId) => {
      toast.success(`Staff ${data.is_active ? 'activated' : 'deactivated'}`);
      refetch();
      // If we deactivated someone to make room, now open the create modal
      if (pendingCreate && !data.is_active) {
        setShowLimitModal(false);
        setSelectedToDeactivate(null);
        setShowCreateModal(true);
        setPendingCreate(false);
      }
    },
    onError: () => toast.error('Failed to update status'),
  });

  /* Handlers */
  const handleNewStaffClick = () => {
    if (limitReached) {
      setShowLimitModal(true);
    } else {
      setShowCreateModal(true);
    }
  };

  const handleDeactivateAndProceed = () => {
    if (!selectedToDeactivate) {
      toast.error('Please select a staff member to deactivate first.');
      return;
    }
    setPendingCreate(true);
    toggleStatus.mutate(selectedToDeactivate);
  };

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

  /* Loading */
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-6 lg:pb-28 space-y-4">

        {/* Header */}
        <div className="flex justify-between items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Staff Management</h1>
          <button
            onClick={handleNewStaffClick}
            className="inline-flex items-center px-3 sm:px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 shadow-sm text-sm"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New Staff</span>
          </button>
        </div>

        {/* Limit warning banner */}
        {limitReached && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-800">
            <Info className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-semibold">Maximum of {MAX_STAFF} active staff accounts reached.</p>
              <p className="text-xs mt-0.5">To add a new staff member, you must first deactivate one of the existing active accounts.</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="search"
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-forest-500 focus:border-forest-500 text-sm"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Staff',  value: allStaff.length },
            { label: `Active (max ${MAX_STAFF})`, value: activeStaff.length },
            { label: 'Inactive',     value: allStaff.filter(s => !s.is_active).length },
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
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{fmtDate(member.created_at)}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium ${member.is_active ? 'text-green-700' : 'text-gray-500'}`}>
                            {member.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleStatus.mutate(member.id)}
                            disabled={toggleStatus.isLoading}
                            className={`px-3 py-1 border text-xs rounded transition-colors disabled:opacity-50 ${
                              member.is_active
                                ? 'border-red-600 text-red-600 hover:bg-red-50'
                                : 'border-emerald-700 text-emerald-700 hover:bg-forest-50'
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
                        <span className="text-xs text-gray-400">{fmtDate(member.created_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleStatus.mutate(member.id)}
                      disabled={toggleStatus.isLoading}
                      className={`shrink-0 px-3 py-1 border text-xs rounded disabled:opacity-50 ${
                        member.is_active
                          ? 'border-red-600 text-red-600 hover:bg-red-50'
                          : 'border-emerald-700 text-emerald-700 hover:bg-forest-50'
                      }`}
                    >
                      {member.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pagination (desktop) */}
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

      {/* Limit modal: pick who to deactivate */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <h3 className="text-lg font-bold text-gray-900">Staff Limit Reached</h3>
                </div>
                <button onClick={() => { setShowLimitModal(false); setSelectedToDeactivate(null); }}
                  className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Only <strong>{MAX_STAFF} active staff accounts</strong> are allowed. To add a new staff member,
                select one of the following active accounts to deactivate first.
              </p>

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Active Staff</p>
              <div className="space-y-2 max-h-60 overflow-y-auto mb-5">
                {activeStaff.map(s => (
                  <label key={s.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedToDeactivate === s.id
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deactivate-staff"
                      value={s.id}
                      checked={selectedToDeactivate === s.id}
                      onChange={() => setSelectedToDeactivate(s.id)}
                      className="h-4 w-4 text-red-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{s.email}</p>
                    </div>
                    <UserMinus className="h-4 w-4 text-red-400 shrink-0" />
                  </label>
                ))}
              </div>

              {selectedToDeactivate && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-4">
                  <strong>Note:</strong> The selected staff member will be deactivated immediately.
                  Their current session will be terminated on their next action.
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowLimitModal(false); setSelectedToDeactivate(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >Cancel</button>
                <button
                  onClick={handleDeactivateAndProceed}
                  disabled={!selectedToDeactivate || toggleStatus.isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {toggleStatus.isLoading
                    ? <><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing…</>
                    : <><UserMinus className="h-4 w-4" />Deactivate & Add New</>}
                </button>
              </div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStaff.full_name}
                    onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    placeholder="Juan Dela Cruz"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    placeholder="staff@example.com"
                    required
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-800">Auto-generated password</p>
                  <p className="text-xs text-blue-600 mt-1">
                    A random temporary password will be shown after creation.
                    The staff member must change it on first login.
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setNewStaff({ full_name: '', email: '' }); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                  >Cancel</button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-2 text-sm"
                  >
                    {creating
                      ? <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />Creating…</>
                      : 'Create Account'}
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