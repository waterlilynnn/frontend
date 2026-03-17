import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import API from '../../config/api';
import { 
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  MinusCircle
} from 'lucide-react';

const AdminInspections = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [inspectionData, setInspectionData] = useState({
    status: 'PASSED',
    remarks: ''
  });

  // fetch businesses with pagination
  const { data, isLoading, refetch: refetchBusinesses } = useQuery({
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

  // fetch all inspections for status display
  const { data: allInspections, refetch: refetchAllInspections } = useQuery({
    queryKey: ['allInspections'],
    queryFn: async () => {
      const businesses = data?.items || [];
      const inspectionsMap = {};
      
      // Fetch inspections for each business in current page
      await Promise.all(
        businesses.map(async (business) => {
          try {
            const response = await API.get(`/inspections/business/${business.id}`);
            inspectionsMap[business.id] = response.data;
          } catch (error) {
            inspectionsMap[business.id] = [];
          }
        })
      );
      
      return inspectionsMap;
    },
    enabled: !!data?.items, 
  });

  // Get inspection history for selected business
  const { data: selectedInspections, refetch: refetchSelectedInspections } = useQuery({
    queryKey: ['selectedInspections', selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness) return [];
      const response = await API.get(`/inspections/business/${selectedBusiness.id}`);
      return response.data;
    },
    enabled: !!selectedBusiness,
  });

  // Add inspection mutation
  const inspectionMutation = useMutation({
    mutationFn: async ({ businessId, status, remarks }) => {
      const response = await API.post(
        `/inspections/business/${businessId}?status=${status}${remarks ? `&remarks=${encodeURIComponent(remarks)}` : ''}`
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Inspection recorded successfully');
      // Refresh all queries
      refetchSelectedInspections();
      refetchAllInspections();
      refetchBusinesses();
      setShowInspectModal(false);
      setSelectedBusiness(null);
      setInspectionData({ status: 'PASSED', remarks: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to record inspection');
    },
  });

  // handle row click - show history (read-only)
  const handleRowClick = (business) => {
    setSelectedBusiness(business);
    setShowHistoryModal(true);
  };

  // handle inspect button click - show editable form
  const handleInspectClick = (business, e) => {
    e.stopPropagation(); // Prevent row click
    setSelectedBusiness(business);
    setShowInspectModal(true);
    setInspectionData({ status: 'PASSED', remarks: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedBusiness) return;
    
    inspectionMutation.mutate({
      businessId: selectedBusiness.id,
      status: inspectionData.status,
      remarks: inspectionData.remarks
    });
  };

  const getStatusBadge = (business, inspectionsMap) => {
    const businessInspections = inspectionsMap?.[business.id] || [];
    
    if (!businessInspections || businessInspections.length === 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <MinusCircle className="h-3 w-3 mr-1" />
          Not Inspected Yet
        </span>
      );
    }

    // Get latest inspection (assuming sorted by desc date)
    const latestInspection = businessInspections[0];
    
    if (latestInspection.status === 'PASSED') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Passed
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          With Violation
        </span>
      );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return '—';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return '—';
    }
  };

  const businesses = data?.items || [];
  const totalPages = data?.total_pages || 1;
  const totalRecords = data?.total || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* history modal (read-only) */}
      {showHistoryModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Inspection History</h3>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedBusiness(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* business info summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900">{selectedBusiness.establishment_name}</h4>
                <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-gray-500">BIN:</span>
                    <span className="ml-2 font-mono">{selectedBusiness.bin_number || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Hauler:</span>
                    <span className="ml-2">{selectedBusiness.hauler_type || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Control #:</span>
                    <span className="ml-2 font-mono">{selectedBusiness.control_number || '—'}</span>
                  </div>
                </div>
              </div>

              {/* inspection history list */}
              {selectedInspections && selectedInspections.length > 0 ? (
                <div className="space-y-4">
                  {selectedInspections.map((inspection) => (
                    <div key={inspection.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {formatDateTime(inspection.date)}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          inspection.status === 'PASSED' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {inspection.status === 'PASSED' ? 'Passed' : 'With Violation'}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        Inspector: {inspection.inspector || 'Unknown'}
                      </div>
                      
                      {inspection.remarks && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">{inspection.remarks}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No inspection records found for this business</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* inspect modal (editable) */}
      {showInspectModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Record New Inspection</h3>
                <button
                  onClick={() => {
                    setShowInspectModal(false);
                    setSelectedBusiness(null);
                    setInspectionData({ status: 'PASSED', remarks: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* business info summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900">{selectedBusiness.establishment_name}</h4>
                <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-gray-500">BIN:</span>
                    <span className="ml-2 font-mono">{selectedBusiness.bin_number || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Hauler:</span>
                    <span className="ml-2">{selectedBusiness.hauler_type || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Control #:</span>
                    <span className="ml-2 font-mono">{selectedBusiness.control_number || '—'}</span>
                  </div>
                </div>
              </div>

              {/* inspection form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="PASSED"
                        checked={inspectionData.status === 'PASSED'}
                        onChange={(e) => setInspectionData({...inspectionData, status: e.target.value})}
                        className="h-4 w-4 text-emerald-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">Passed</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="WITH VIOLATION"
                        checked={inspectionData.status === 'WITH VIOLATION'}
                        onChange={(e) => setInspectionData({...inspectionData, status: e.target.value})}
                        className="h-4 w-4 text-red-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">With Violation</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                  <textarea
                    rows={3}
                    value={inspectionData.remarks}
                    onChange={(e) => setInspectionData({...inspectionData, remarks: e.target.value})}
                    placeholder="Enter inspection remarks..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    required={inspectionData.status === 'WITH VIOLATION'}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInspectModal(false);
                      setSelectedBusiness(null);
                      setInspectionData({ status: 'PASSED', remarks: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inspectionMutation.isLoading}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {inspectionMutation.isLoading ? 'Saving...' : 'Save Inspection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="pb-24">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Inspections</h1>
          </div>

          {/* search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search business by name, owner, or BIN..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* results table */}
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BIN Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hauler Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {businesses.map((business) => {
                      // Get inspections for this business from allInspections
                      const businessInspections = allInspections?.[business.id] || [];
                      
                      return (
                        <tr 
                          key={business.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleRowClick(business)}
                        >
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {business.establishment_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                            {business.bin_number || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {business.hauler_type || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                            {business.control_number || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(business, allInspections)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={(e) => handleInspectClick(business, e)}
                              className="px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 transition-colors"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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

export default AdminInspections;