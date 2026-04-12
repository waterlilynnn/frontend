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
  location: '',
  hauler_type: 'Barangay',
  has_own_structure: false,
  bin_number: '',
  contact_number: '',
  email: '',
  application_type: 'NEW',
};

const PER_PAGE = 10;

const BusinessRecords = ({ rolePrefix = 'staff' }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm]       = useState(false);
  const [formData, setFormData]       = useState(EMPTY_FORM);

  const isSearchMode = searchQuery.length >= 2;

  const { data: recentData, isLoading: recentLoading, refetch: refetchRecent } = useQuery({
    queryKey: ['businessRecords', currentPage],
    queryFn: async () => {
      const res = await API.get(`/business-records/recent?page=${currentPage}&per_page=${PER_PAGE}`);
      return res.data;
    },
    enabled: !isSearchMode,
    keepPreviousData: true,
  });

  const { data: searchData, isLoading: searchLoading, refetch: refetchSearch } = useQuery({
    queryKey: ['businessSearch', searchQuery, currentPage],
    queryFn: async () => {
      const res = await API.get(
        `/business-records/search?q=${encodeURIComponent(searchQuery)}&page=${currentPage}&per_page=${PER_PAGE}`
      );
      const items = res.data || [];
      const first = items[0] || {};
      return {
        items,
        total:       first._total       ?? items.length,
        page:        first._page        ?? currentPage,
        per_page:    first._per_page    ?? PER_PAGE,
        total_pages: first._total_pages ?? Math.ceil(items.length / PER_PAGE),
      };
    },
    enabled: isSearchMode,
    keepPreviousData: true,
  });

  const isLoading = isSearchMode ? searchLoading : recentLoading;
  const pageData  = isSearchMode ? searchData : recentData;
  const refetch   = isSearchMode ? refetchSearch : refetchRecent;

  const businesses = pageData?.items      || [];
  const totalPages = pageData?.total_pages ?? 0;
  const totalCount = pageData?.total       ?? 0;

  const { data: options } = useQuery({
    queryKey: ['options'],
    queryFn: async () => {
      const [barangaysRes, businessLinesRes, haulerTypesRes] = await Promise.all([
        API.get('/options/barangays'),
        API.get('/options/business-lines'),
        API.get('/options/hauler-types'),
      ]);
      return {
        barangays:     barangaysRes.data.barangays          || [],
        businessLines: businessLinesRes.data.business_lines || [],
        haulerTypes:   haulerTypesRes.data.hauler_types     || [],
      };
    },
    keepPreviousData: true,
    initialData: { barangays: [], businessLines: [], haulerTypes: [] },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => (await API.post('/business-records', data)).data,
    onSuccess: () => {
      toast.success('Business record created successfully');
      setShowForm(false);
      setFormData(EMPTY_FORM);
      refetch();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create record'),
  });

  const handleSubmit    = (e) => { e.preventDefault(); createMutation.mutate(formData); };
  const handleFieldChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));
  const handleSearchChange = (value) => { setSearchQuery(value); setCurrentPage(1); };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return isNaN(d.getTime()) ? '—' : format(d, 'MMM dd, yyyy');
    } catch { return '—'; }
  };

  const formatOwnerName = (business) => {
    if (business.owner_last_name && business.owner_first_name) {
      let name = `${business.owner_last_name}, ${business.owner_first_name}`;
      if (business.owner_middle_name) name += ` ${business.owner_middle_name[0]}.`;
      if (business.owner_suffix)      name += ` ${business.owner_suffix}`;
      return name;
    }
    return business.owner_name || business.owner_name_raw || '—';
  };

  const safeOptions = {
    barangays:     options?.barangays     || [],
    businessLines: options?.businessLines || [],
    haulerTypes:   options?.haulerTypes   || [],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-28 space-y-4">

        {/* Header row */}
        <div className="flex justify-between items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Business Records</h1>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-700 text-white
                       rounded-lg hover:bg-emerald-800 shadow-sm transition-all text-sm whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Business</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, owner, or BIN…"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg
                       focus:ring-forest-500 focus:border-forest-500 text-sm"
          />
          {searchQuery && (
            <button onClick={() => handleSearchChange('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {isSearchMode && !isLoading && (
          <p className="text-xs text-gray-500">
            <span className="bg-gray-100 px-2 py-0.5 rounded-full font-medium">
              {totalCount} result{totalCount !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
            </span>
          </p>
        )}

        {/* Create modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white rounded-b-none sm:rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] sm:max-h-[95vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">New Business Record</h2>
                  <button onClick={() => { setShowForm(false); setFormData(EMPTY_FORM); }}
                    className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                </div>
                <BusinessForm
                  mode="create"
                  formData={formData}
                  onChange={handleFieldChange}
                  onSubmit={handleSubmit}
                  onCancel={() => { setShowForm(false); setFormData(EMPTY_FORM); }}
                  isSubmitting={createMutation.isLoading}
                  options={safeOptions}
                />
              </div>
            </div>
          </div>
        )}

        {/* Table / Cards */}
        <div className="bg-white rounded-lg shadow-sm">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              {isSearchMode ? `No results found for "${searchQuery}"` : 'No business records found'}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Date Applied', 'Business Name', 'Business Line', 'Business Owner', 'Type', 'Action'].map(col => (
                        <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {businesses.map((business) => (
                      <tr key={business.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(business.application_date || business.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{business.establishment_name}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">BIN: {business.bin_number || '—'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{business.business_line || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatOwnerName(business)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{business.application_type || 'NEW'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/${rolePrefix}/business/${business.id}`)}
                            className="px-3 py-1 border border-emerald-700 text-emerald-700 text-xs rounded hover:bg-forest-50"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-gray-100">
                {businesses.map((business) => (
                  <div key={business.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{business.establishment_name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">BIN: {business.bin_number || '—'}</p>
                        <p className="text-xs text-gray-600 mt-1">{formatOwnerName(business)}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs text-gray-400">{formatDate(business.application_date || business.created_at)}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{business.application_type || 'NEW'}</span>
                          {business.business_line && (
                            <span className="text-xs text-gray-500 truncate max-w-[140px]">{business.business_line}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/${rolePrefix}/business/${business.id}`)}
                        className="shrink-0 px-3 py-1 border border-emerald-700 text-emerald-700 text-xs rounded hover:bg-forest-50"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="fixed bottom-4 left-0 right-4 lg:left-64 z-10 px-4 lg:px-0">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-700">
              Page <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
              <span className="hidden sm:inline text-gray-400 ml-2">({totalCount} records)</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`inline-flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm ${
                  currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-700 text-white hover:bg-emerald-800'
                }`}
              >
                <ChevronLeft className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Previous</span>
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`inline-flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm ${
                  currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-700 text-white hover:bg-emerald-800'
                }`}
              >
                <span className="hidden sm:inline">Next</span><ChevronRight className="h-4 w-4 sm:ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessRecords;