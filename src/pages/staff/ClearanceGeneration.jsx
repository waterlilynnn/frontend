import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import API from '../../config/api';
import PDFViewer from '../../components/PDFViewer';
import { 
  FileText, 
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Eye
} from 'lucide-react';

const StaffClearance = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedClearance, setSelectedClearance] = useState(null);
  const [viewingClearanceId, setViewingClearanceId] = useState(null);
  const [viewingControlNumber, setViewingControlNumber] = useState('');

  // Fetch all businesses with clearance info
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['clearanceBusinesses', searchQuery, currentPage],
    queryFn: async () => {
      let businessesRes;
      if (searchQuery && searchQuery.length >= 2) {
        const searchRes = await API.get(`/business-records/search?q=${searchQuery}`);
        businessesRes = {
          data: {
            items: searchRes.data,
            total: searchRes.data.length,
            page: 1,
            per_page: 10,
            total_pages: Math.ceil(searchRes.data.length / 10)
          }
        };
      } else {
        businessesRes = await API.get(`/business-records/recent?page=${currentPage}&per_page=10`);
      }
      
      const approvedBusinesses = businessesRes.data.items || [];
      
      const clearancesRes = await API.get('/clearance/history/all');
      const clearances = clearancesRes.data || [];
      
      const items = approvedBusinesses.map(business => {
        const clearance = clearances.find(c => c.business_record_id === business.id);
        return {
          id: business.id,
          establishment_name: business.establishment_name,
          owner_name: business.owner_name,
          control_number: clearance?.control_number || business.control_number,
          hauler_type: business.hauler_type,
          has_violation: business.has_violation,
          violation_details: business.violation_details || '—',
          clearance_id: clearance?.id,
          is_claimed: clearance?.is_claimed || false,
          printed_at: clearance?.printed_at,
          last_printed_at: clearance?.last_printed_at,
          last_printed_by: clearance?.last_printed_by,
          printed_by: clearance?.printed_by,
          has_clearance: !!clearance
        };
      });
      
      return {
        items,
        total: businessesRes.data.total || items.length,
        page: businessesRes.data.page || currentPage,
        per_page: businessesRes.data.per_page || 10,
        total_pages: businessesRes.data.total_pages || Math.ceil(items.length / 10)
      };
    },
  });

  // Generate clearance
  const generateMutation = useMutation({
    mutationFn: async (businessId) => {
      const response = await API.post(`/clearance/generate/${businessId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Clearance generated successfully');
      setShowGenerateModal(false);
      setSelectedBusiness(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to generate clearance');
    },
  });

  // Issue clearance
  const issueMutation = useMutation({
    mutationFn: async (clearanceId) => {
      const response = await API.post(`/clearance/issue/${clearanceId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Clearance marked as issued');
      setShowIssueModal(false);
      setSelectedClearance(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to issue clearance');
    },
  });

  // View clearance - fetch PDF and show modal (no page redirect)
  const viewClearance = async (clearanceId, businessName, controlNumber) => {
    try {
      toast.loading('Loading clearance...', { id: 'view-clearance' });
      
      const response = await API.post(`/clearance/view/${clearanceId}`, null, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      setPdfUrl(url);
      setViewingClearanceId(clearanceId);
      setViewingControlNumber(controlNumber);
      setShowViewer(true);
      
      toast.dismiss('view-clearance');
    } catch (error) {
      toast.dismiss('view-clearance');
      toast.error('Failed to load clearance');
    }
  };

  // Handle download from viewer
  const handleDownload = async () => {
    if (!viewingClearanceId) return;
    
    try {
      const response = await API.post(`/clearance/print/${viewingClearanceId}`, null, {
        responseType: 'blob'
      });
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${viewingControlNumber || 'clearance'}.pdf`;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Clearance downloaded!');
      refetch();
    } catch (error) {
      toast.error('Failed to download clearance');
    }
  };

  const handleGenerateClick = (business) => {
    if (business.has_violation) {
      toast.error('Cannot generate clearance: Business has unresolved violations');
      return;
    }
    setSelectedBusiness(business);
    setShowGenerateModal(true);
  };

  const handleIssueClick = (clearance) => {
    setSelectedClearance(clearance);
    setShowIssueModal(true);
  };

  const confirmGenerate = () => {
    if (selectedBusiness) {
      generateMutation.mutate(selectedBusiness.id);
    }
  };

  const confirmIssue = () => {
    if (selectedClearance) {
      issueMutation.mutate(selectedClearance.clearance_id);
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

  const closeViewer = () => {
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
    }
    setShowViewer(false);
    setPdfUrl(null);
    setViewingClearanceId(null);
  };

  const items = data?.items || [];
  const totalPages = data?.total_pages || 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Generate modal */}
      {showGenerateModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Generate Clearance</h3>
                <button
                  onClick={() => {
                    setShowGenerateModal(false);
                    setSelectedBusiness(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{selectedBusiness.establishment_name}</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p><span className="text-gray-500">Owner:</span> {selectedBusiness.owner_name}</p>
                  <p><span className="text-gray-500">Control #:</span> {selectedBusiness.control_number || '—'}</p>
                  <p><span className="text-gray-500">Hauler:</span> {selectedBusiness.hauler_type}</p>
                </div>
              </div>

              <p className="text-gray-600 mb-6">
                Generate clearance for this business?
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowGenerateModal(false);
                    setSelectedBusiness(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmGenerate}
                  disabled={generateMutation.isLoading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {generateMutation.isLoading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue modal */}
      {showIssueModal && selectedClearance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Mark as Issued</h3>
                <button
                  onClick={() => {
                    setShowIssueModal(false);
                    setSelectedClearance(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{selectedClearance.establishment_name}</p>
                <p className="text-sm text-gray-600 mt-1">Control #: {selectedClearance.control_number}</p>
              </div>

              <p className="text-gray-600 mb-6">
                Mark this clearance as issued to the business owner? This action cannot be undone.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowIssueModal(false);
                    setSelectedClearance(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmIssue}
                  disabled={issueMutation.isLoading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {issueMutation.isLoading ? 'Processing...' : 'Confirm Issue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal - stays on same page */}
      {showViewer && pdfUrl && (
        <PDFViewer
          url={pdfUrl}
          onClose={closeViewer}
          onDownload={handleDownload}
        />
      )}

      <div className="pb-24">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Clearance Management</h1>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by business name or control number..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No approved businesses found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Establishment Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Printed</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {item.establishment_name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Control #: {item.control_number || '—'}
                            </div>
                            {item.has_violation && (
                              <div className="flex items-center text-xs text-red-600 mt-1">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Violation: {item.violation_details}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {formatDateTime(item.last_printed_at || item.printed_at)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              by: {item.last_printed_by || item.printed_by || '—'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.is_claimed ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Issued
                              </span>
                            ) : item.has_clearance ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <XCircle className="h-3 w-3 mr-1" />
                                Not Yet Issued
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                No Clearance
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {item.has_clearance ? (
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => viewClearance(item.clearance_id, item.establishment_name, item.control_number)}
                                  disabled={item.has_violation}
                                  className={`px-3 py-1 border text-xs rounded flex items-center gap-1 ${
                                    item.has_violation
                                      ? 'border-gray-400 text-gray-400 cursor-not-allowed'
                                      : 'border-emerald-600 text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                  title={item.has_violation ? 'Cannot view: Business has violation' : 'View clearance'}
                                >
                                  View
                                </button>
                                {!item.is_claimed && (
                                  <button
                                    onClick={() => handleIssueClick(item)}
                                    className="text-emerald-600 hover:text-emerald-800 text-sm font-medium"
                                  >
                                    Issue
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleGenerateClick(item)}
                                disabled={item.has_violation}
                                className={`inline-flex items-center px-3 py-1 text-xs rounded transition-colors ${
                                  item.has_violation
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                }`}
                                title={item.has_violation ? 'Cannot generate: Business has violation' : 'Generate clearance'}
                              >
                                Generate
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {totalPages > 1 && (
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
      )}
    </div>
  );
};

export default StaffClearance;