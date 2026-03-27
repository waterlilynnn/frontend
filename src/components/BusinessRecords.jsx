import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import API from '../config/api';
import BusinessForm from './BusinessForm';
import { Search, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';

const EMPTY_FORM = {
  establishment_name: '',
  business_line: '',
  owner_last_name: '',
  owner_first_name: '',
  owner_middle_name: '',
  owner_suffix: '',
  location: 'ASISAN',
  hauler_type: 'Barangay',
  has_own_structure: false,
  bin_number: '',
  contact_number: '',
  email: '',
  application_type: 'NEW',
};

// rolePrefix can be 'staff' or 'admin' - defaults to 'staff'
const BusinessRecords = ({ rolePrefix = 'staff' }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['businessRecords', searchQuery, currentPage],
    queryFn: async () => {
      if (searchQuery && searchQuery.length >= 2) {
        const res = await API.get(`/business-records/search?q=${searchQuery}`);
        return {
          items: res.data,
          total: res.data.length,
          page: 1,
          per_page: 10,
          total_pages: Math.ceil(res.data.length / 10),
        };
      }
      const res = await API.get(
        `/business-records/recent?page=${currentPage}&per_page=10`
      );
      return res.data;
    },
  });

  const { data: options } = useQuery({
    queryKey: ['options'],
    queryFn: async () => {
      const [barangaysRes, businessLinesRes, haulerTypesRes] = await Promise.all([
        API.get('/options/barangays'),
        API.get('/options/business-lines'),
        API.get('/options/hauler-types'),
      ]);
      return {
        barangays: barangaysRes.data.barangays,
        businessLines: businessLinesRes.data.business_lines,
        haulerTypes: haulerTypesRes.data.hauler_types,
      };
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await API.post('/business-records', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Business record created successfully');
      setShowForm(false);
      setFormData(EMPTY_FORM);
      refetch();
    },
    onError: (err) => {
      const errorMsg = err.response?.data?.detail || 'Failed to create record';
      toast.error(errorMsg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return isNaN(d.getTime()) ? '—' : format(d, 'MMM dd, yyyy');
    } catch {
      return '—';
    }
  };

  const formatOwnerName = (business) => {
    if (business.owner_last_name && business.owner_first_name) {
      let name = `${business.owner_last_name}, ${business.owner_first_name}`;
      if (business.owner_middle_name) name += ` ${business.owner_middle_name[0]}.`;
      if (business.owner_suffix) name += ` ${business.owner_suffix}`;
      return name;
    }
    return business.owner_name || business.owner_name_raw || '—';
  };

  const businesses = data?.items || [];
  const totalPages = data?.total_pages || 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-24 space-y-4">
        {/* Page header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Business Records</h1>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white
                       rounded-lg hover:bg-emerald-700 shadow-sm transition-all text-sm"
          >
            <Plus className="h-4 w-4" />
            New Business
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by business name, owner, or BIN…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                       focus:ring-emerald-500 focus:border-emerald-500 text-sm"
          />
        </div>

        {/* New Business Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">New Business Record</h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setFormData(EMPTY_FORM);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <BusinessForm
                  mode="create"
                  formData={formData}
                  onChange={handleFieldChange}
                  onSubmit={handleSubmit}
                  onCancel={() => {
                    setShowForm(false);
                    setFormData(EMPTY_FORM);
                  }}
                  isSubmitting={createMutation.isLoading}
                  options={options || {}}
                />
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No business records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date Applied', 'Business Name', 'Business Line', 'Business Owner', 'Type', 'Action'].map(
                      (col) => (
                        <th
                          key={col}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {businesses.map((business) => (
                    <tr key={business.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(business.application_date || business.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {business.establishment_name}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                          BIN: {business.bin_number || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {business.business_line || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatOwnerName(business)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {business.application_type || 'NEW'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            const token = localStorage.getItem('token');
                            if (!token) {
                              toast.error('Session expired. Please login again.');
                              navigate('/login');
                              return;
                            }
                            navigate(`/${rolePrefix}/business/${business.id}`)
                          }}
                          className="px-3 py-1 border border-emerald-600 text-emerald-600
                                     text-xs rounded hover:bg-emerald-50 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="fixed bottom-4 left-72 right-4 z-10">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-700">
            Page <span className="font-medium">{currentPage}</span> of{' '}
            <span className="font-medium">{totalPages}</span>
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm transition-all ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm transition-all ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessRecords;