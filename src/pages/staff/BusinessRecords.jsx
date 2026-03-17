import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import API from '../../config/api';
import SearchableSelect from '../../components/SearchableSelect';
import { 
  Search, 
  Plus, 
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  User,
  MapPin,
  Building2,
  Hash,
  Mail,
  Phone,
  FileText,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const StaffBusinessRecords = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    establishment_name: '',
    business_line: '',
    owner_last_name: '',
    owner_first_name: '',
    owner_middle_name: '',
    owner_suffix: '',
    location: 'ASISAN',
    hauler_type: 'Barangay',
    has_own_structure: true,
    bin_number: '',
    contact_number: '',
    email: '',
    application_type: 'NEW',
  });

  // Fetch business records
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['businessRecords', searchQuery, currentPage],
    queryFn: async () => {
      if (searchQuery && searchQuery.length >= 2) {
        const response = await API.get(`/business-records/search?q=${searchQuery}`);
        return {
          items: response.data,
          total: response.data.length,
          page: 1,
          per_page: 10,
          total_pages: Math.ceil(response.data.length / 10)
        };
      }
      const response = await API.get(`/business-records/recent?page=${currentPage}&per_page=10`);
      return response.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await API.delete(`/business-records/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Business record deleted successfully');
      setShowDeleteConfirm(null);
      refetch();
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete record');
    },
  });

  const { data: options } = useQuery({
    queryKey: ['options'],
    queryFn: async () => {
      const [barangays, businessLines, haulerTypes] = await Promise.all([
        API.get('/options/barangays'),
        API.get('/options/business-lines'),
        API.get('/options/hauler-types'),
      ]);
      return {
        barangays: barangays.data.barangays,
        businessLines: businessLines.data.business_lines,
        haulerTypes: haulerTypes.data.hauler_types,
      };
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const submitData = {
        ...data,
        location: data.location,
        hauler_type: data.hauler_type,
        application_type: data.application_type,
        owner_last_name: data.owner_last_name.toUpperCase(),
        owner_first_name: data.owner_first_name.toUpperCase(),
        owner_middle_name: data.owner_middle_name?.toUpperCase() || null,
        owner_suffix: data.owner_suffix || null,
        contact_number: data.contact_number || null,
        email: data.email || null,
        bin_number: data.bin_number || null,
      };
      
      const response = await API.post('/business-records', submitData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Business record created successfully');
      setShowForm(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      console.error('Create error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create record');
    },
  });

  const resetForm = () => {
    setFormData({
      establishment_name: '',
      business_line: '',
      owner_last_name: '',
      owner_first_name: '',
      owner_middle_name: '',
      owner_suffix: '',
      location: 'ASISAN',
      hauler_type: 'Barangay',
      has_own_structure: true,
      bin_number: '',
      contact_number: '',
      email: '',
      application_type: 'NEW',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleRowClick = (businessId, e) => {
    if (e.target.closest('button')) return;
    navigate(`/staff/business/${businessId}`);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    setShowDeleteConfirm(id);
  };

  const confirmDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '—';
      return format(date, 'MMM dd, yyyy');
    } catch {
      return '—';
    }
  };

  const formatOwnerName = (business) => {
    if (business.owner_last_name && business.owner_first_name) {
      let name = `${business.owner_last_name}, ${business.owner_first_name}`;
      if (business.owner_middle_name) {
        name += ` ${business.owner_middle_name[0]}.`;
      }
      if (business.owner_suffix) {
        name += ` ${business.owner_suffix}`;
      }
      return name;
    }
    
    if (business.owner_name && business.owner_name !== '—') {
      return business.owner_name;
    }
    
    if (business.owner_name_raw) {
      return business.owner_name_raw;
    }
    
    return '—';
  };

  const businesses = data?.items || [];
  const totalPages = data?.total_pages || 1;
  const totalRecords = data?.total || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this business record? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pb-24">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Business Records</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Business
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by business name, owner, or BIN..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">New Business Record</h2>
                    <button
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubmit}>
                    {/* SECTION 1: BUSINESS INFO */}
                    <div className="mb-6">
                      <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                        <Building2 className="h-4 w-4 mr-2 text-emerald-600" />
                        Business Information
                      </h3>
                      
                      {/* Application Type */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Application Type <span className="text-red-500">*</span>
                        </label>
                        <div className="flex space-x-6">
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="application_type"
                              value="NEW"
                              checked={formData.application_type === 'NEW'}
                              onChange={(e) => setFormData({...formData, application_type: e.target.value})}
                              className="h-4 w-4 text-emerald-600"
                            />
                            <span className="ml-2 text-sm text-gray-700">New</span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="application_type"
                              value="RENEWAL"
                              checked={formData.application_type === 'RENEWAL'}
                              onChange={(e) => setFormData({...formData, application_type: e.target.value})}
                              className="h-4 w-4 text-emerald-600"
                            />
                            <span className="ml-2 text-sm text-gray-700">Renewal</span>
                          </label>
                        </div>
                      </div>

                      {/* Establishment Name & Hauler Type */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Establishment Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.establishment_name}
                            onChange={(e) => setFormData({...formData, establishment_name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Hauler Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formData.hauler_type}
                            onChange={(e) => setFormData({...formData, hauler_type: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            required
                          >
                            {options?.haulerTypes?.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Business Line & BIN Number */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Business Line <span className="text-red-500">*</span>
                          </label>
                          <SearchableSelect
                            options={options?.businessLines || []}
                            value={formData.business_line}
                            onChange={(value) => setFormData({...formData, business_line: value})}
                            placeholder="Select business line"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">BIN Number</label>
                          <input
                            type="text"
                            value={formData.bin_number}
                            onChange={(e) => setFormData({...formData, bin_number: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: OWNER INFO */}
                    <div className="mb-6 pt-4 border-t border-gray-200">
                      <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                        <User className="h-4 w-4 mr-2 text-emerald-600" />
                        Owner Information
                      </h3>
                      
                      {/* Last Name & First Name */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.owner_last_name}
                            onChange={(e) => setFormData({...formData, owner_last_name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.owner_first_name}
                            onChange={(e) => setFormData({...formData, owner_first_name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Middle Name & Suffix */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                          <input
                            type="text"
                            value={formData.owner_middle_name}
                            onChange={(e) => setFormData({...formData, owner_middle_name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Suffix</label>
                          <input
                            type="text"
                            value={formData.owner_suffix}
                            onChange={(e) => setFormData({...formData, owner_suffix: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="Jr., Sr., III"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: LOCATION & CONTACT */}
                    <div className="mb-6 pt-4 border-t border-gray-200">
                      <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-emerald-600" />
                        Location & Contact
                      </h3>
                      
                      {/* Barangay */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Barangay <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          options={options?.barangays || []}
                          value={formData.location}
                          onChange={(value) => setFormData({...formData, location: value})}
                          placeholder="Select barangay"
                          required
                        />
                      </div>

                      {/* Contact info */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                          <input
                            type="text"
                            value={formData.contact_number}
                            onChange={(e) => setFormData({...formData, contact_number: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Own structure checkbox */}
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.has_own_structure}
                            onChange={(e) => setFormData({...formData, has_own_structure: e.target.checked})}
                            className="h-4 w-4 text-emerald-600 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Owns the building/structure</span>
                        </label>
                      </div>
                    </div>

                    {/* form actions */}
                    <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          resetForm();
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createMutation.isLoading}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center"
                      >
                        {createMutation.isLoading ? (
                          <>
                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                            Creating...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Create Record
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : businesses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No business records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Applied</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Line</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Owner</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {businesses.map((business) => (
                      <tr 
                        key={business.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={(e) => handleRowClick(business.id, e)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(business.application_date || business.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {business.establishment_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => handleDelete(business.id, e)}
                            className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                            title="Delete record"
                          >
                            Delete
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
      </div>

      {/* floating pagination */}
      <div className="fixed bottom-4 left-72 right-4 z-10">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-3 backdrop-blur-sm bg-white/90">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page <span className="font-medium">{currentPage}</span> of{' '}
              <span className="font-medium">{totalPages}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`inline-flex items-center px-4 py-2 rounded-lg transition-all ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg'
                }`}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`inline-flex items-center px-4 py-2 rounded-lg transition-all ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg'
                }`}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffBusinessRecords;