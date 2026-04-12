import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import API from '../config/api';
import PDFViewer from './PDFViewer';
import {
  FileText, Search, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, AlertTriangle, X, ClipboardList,
} from 'lucide-react';

const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  try { return format(new Date(dateString), 'MMM dd, yyyy hh:mm a'); }
  catch { return '—'; }
};

const extractErrorMsg = (error) => {
  const detail = error?.response?.data?.detail;
  if (!detail) return 'An unexpected error occurred.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(d => d.msg || JSON.stringify(d)).join(', ');
  return JSON.stringify(detail);
};

const ClearanceGeneration = ({ rolePrefix = 'staff' }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery]               = useState('');
  const [currentPage, setCurrentPage]               = useState(1);
  const [showGenerateModal, setShowGenerateModal]   = useState(false);
  const [showIssueModal, setShowIssueModal]         = useState(false);
  const [showViewer, setShowViewer]                 = useState(false);
  const [pdfUrl, setPdfUrl]                         = useState(null);
  const [selectedBusiness, setSelectedBusiness]     = useState(null);
  const [selectedClearance, setSelectedClearance]   = useState(null);
  const [viewingClearanceId, setViewingClearanceId] = useState(null);
  const [viewingControlNumber, setViewingControlNumber] = useState('');
  const [generateError, setGenerateError]           = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['clearanceBusinesses', searchQuery, currentPage],
    queryFn: async () => {
      let businessesRes;
      if (searchQuery && searchQuery.length >= 2) {
        const searchRes = await API.get(`/business-records/search?q=${searchQuery}`);
        businessesRes = { data: { items: searchRes.data, total: searchRes.data.length, page: 1, per_page: 10, total_pages: Math.ceil(searchRes.data.length / 10) } };
      } else {
        businessesRes = await API.get(`/business-records/recent?page=${currentPage}&per_page=10`);
      }
      const approvedBusinesses = businessesRes.data.items || [];
      const clearancesRes      = await API.get('/clearance/history/all');
      const clearances         = clearancesRes.data || [];
      const items = approvedBusinesses.map((business) => {
        const clearance = clearances.find((c) => c.business_record_id === business.id);
        return {
          id:               business.id,
          establishment_name: business.establishment_name,
          owner_name:       business.owner_name,
          control_number:   clearance?.control_number || business.control_number,
          hauler_type:      business.hauler_type,
          has_violation:    business.has_violation,
          violation_details: business.violation_details || '—',
          clearance_id:     clearance?.id,
          is_claimed:       clearance?.is_claimed || false,
          printed_at:       clearance?.printed_at,
          last_printed_at:  clearance?.last_printed_at,
          last_printed_by:  clearance?.last_printed_by,
          printed_by:       clearance?.printed_by,
          has_clearance:    !!clearance,
        };
      });
      return { items, total: businessesRes.data.total || items.length, page: businessesRes.data.page || currentPage, per_page: businessesRes.data.per_page || 10, total_pages: businessesRes.data.total_pages || Math.ceil(items.length / 10) };
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (businessId) => (await API.post(`/clearance/generate/${businessId}`)).data,
    onSuccess: () => { toast.success('Clearance generated'); setShowGenerateModal(false); setSelectedBusiness(null); setGenerateError(''); refetch(); },
    onError: (error) => setGenerateError(extractErrorMsg(error)),
  });

  const issueMutation = useMutation({
    mutationFn: async (clearanceId) => (await API.post(`/clearance/issue/${clearanceId}`)).data,
    onSuccess: () => { toast.success('Clearance marked as issued'); setShowIssueModal(false); setSelectedClearance(null); refetch(); },
    onError: (error) => toast.error(extractErrorMsg(error)),
  });

  const viewClearance = async (clearanceId, businessName, controlNumber) => {
    try {
      toast.loading('Loading clearance…', { id: 'view-clearance' });
      const response = await API.post(`/clearance/view/${clearanceId}`, null, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setPdfUrl(url);
      setViewingClearanceId(clearanceId);
      setViewingControlNumber(controlNumber);
      setShowViewer(true);
      toast.dismiss('view-clearance');
    } catch (error) {
      toast.dismiss('view-clearance');
      toast.error(extractErrorMsg(error) || 'Failed to load clearance');
    }
  };

  const handleDownload = async () => {
    if (!viewingClearanceId) return;
    try {
      const response = await API.post(`/clearance/print/${viewingClearanceId}`, null, { responseType: 'blob' });
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${viewingControlNumber || 'clearance'}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match?.[1]) filename = match[1].replace(/['"]/g, '');
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
    } catch { toast.error('Failed to download clearance'); }
  };

  const closeViewer = () => {
    if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
    setShowViewer(false); setPdfUrl(null); setViewingClearanceId(null);
  };

  const handleGenerateClick = (business) => {
    if (business.has_violation) { toast.error('Cannot generate clearance: Business has unresolved violations'); return; }
    setSelectedBusiness(business); setGenerateError(''); setShowGenerateModal(true);
  };

  const closeGenerateModal = () => { setShowGenerateModal(false); setSelectedBusiness(null); setGenerateError(''); };

  const items      = data?.items      || [];
  const totalPages = data?.total_pages || 1;

  const StatusChip = ({ item }) => {
    if (item.is_claimed) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="h-3 w-3" />Issued</span>;
    if (item.has_clearance) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><XCircle className="h-3 w-3" />Not Yet Issued</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">No Clearance</span>;
  };

  const ActionButtons = ({ item }) => (
    item.has_clearance ? (
      <div className="flex items-center gap-2">
        <button
          onClick={() => viewClearance(item.clearance_id, item.establishment_name, item.control_number)}
          disabled={item.has_violation}
          className={`px-3 py-1 border text-xs rounded ${item.has_violation ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-emerald-700 text-emerald-700 hover:bg-forest-50'}`}
        >View</button>
        {!item.is_claimed && (
          <button onClick={() => { setSelectedClearance(item); setShowIssueModal(true); }}
            className="text-emerald-700 hover:text-forest-800 text-xs font-medium">
            Issue
          </button>
        )}
      </div>
    ) : (
      <button
        onClick={() => handleGenerateClick(item)}
        disabled={item.has_violation}
        className={`inline-flex items-center px-3 py-1 text-xs rounded ${item.has_violation ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-emerald-700 text-white hover:bg-emerald-800'}`}
      >Generate</button>
    )
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modals */}
      {showGenerateModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Generate Clearance</h3>
                <button onClick={closeGenerateModal}><X className="h-5 w-5 text-gray-400" /></button>
              </div>
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{selectedBusiness.establishment_name}</p>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>Owner: {selectedBusiness.owner_name}</p>
                  <p>Control #: {selectedBusiness.control_number || '—'}</p>
                  <p>Hauler: {selectedBusiness.hauler_type}</p>
                </div>
              </div>
              {generateError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700">Cannot Generate</p>
                    <p className="text-sm text-red-600 mt-0.5">{generateError}</p>
                    {generateError.toLowerCase().includes('missing required') && (
                      <button onClick={() => { closeGenerateModal(); navigate(`/${rolePrefix}/business/${selectedBusiness.id}`); }}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-red-700 underline">
                        <ClipboardList className="h-3 w-3" />Go to business to complete requirements
                      </button>
                    )}
                  </div>
                </div>
              )}
              {!generateError && <p className="text-gray-600 mb-4">Generate clearance for this business?</p>}
              <div className="flex justify-end gap-3">
                <button onClick={closeGenerateModal} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
                  {generateError ? 'Close' : 'Cancel'}
                </button>
                {!generateError && (
                  <button onClick={() => generateMutation.mutate(selectedBusiness.id)} disabled={generateMutation.isLoading}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 text-sm">
                    {generateMutation.isLoading ? 'Generating…' : 'Generate'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showIssueModal && selectedClearance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Mark as Issued</h3>
                <button onClick={() => { setShowIssueModal(false); setSelectedClearance(null); }}><X className="h-5 w-5 text-gray-400" /></button>
              </div>
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{selectedClearance.establishment_name}</p>
                <p className="text-sm text-gray-600 mt-1">Control #: {selectedClearance.control_number}</p>
              </div>
              <p className="text-gray-600 mb-6 text-sm">Mark this clearance as issued to the business owner?</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowIssueModal(false); setSelectedClearance(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
                <button onClick={() => issueMutation.mutate(selectedClearance.clearance_id)} disabled={issueMutation.isLoading}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 text-sm">
                  {issueMutation.isLoading ? 'Processing…' : 'Confirm Issue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showViewer && pdfUrl && <PDFViewer url={pdfUrl} onClose={closeViewer} onDownload={handleDownload} />}

      <div className="pb-28 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Clearance Management</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by business name or control number…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-forest-500 focus:border-forest-500 text-sm"
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">No businesses found</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Establishment Name', 'Last Downloaded', 'Status', 'Actions'].map(col => (
                        <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{item.establishment_name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Control #: {item.control_number || '—'}</div>
                          {item.has_violation && (
                            <div className="flex items-center text-xs text-red-600 mt-1">
                              <AlertTriangle className="h-3 w-3 mr-1" />Violation: {item.violation_details}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{formatDateTime(item.last_printed_at || item.printed_at)}</div>
                          <div className="text-xs text-gray-500 mt-0.5">by: {item.last_printed_by || item.printed_by || '—'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap"><StatusChip item={item} /></td>
                        <td className="px-6 py-4 whitespace-nowrap"><ActionButtons item={item} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.establishment_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Control #: {item.control_number || '—'}</p>
                        {item.has_violation && (
                          <p className="flex items-center text-xs text-red-600 mt-1">
                            <AlertTriangle className="h-3 w-3 mr-1 shrink-0" />{item.violation_details}
                          </p>
                        )}
                      </div>
                      <StatusChip item={item} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">{formatDateTime(item.last_printed_at || item.printed_at)}</p>
                        <p className="text-xs text-gray-400">by: {item.last_printed_by || item.printed_by || '—'}</p>
                      </div>
                      <ActionButtons item={item} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="fixed bottom-4 left-0 right-0 lg:left-64 z-10 px-4 lg:pr-4 lg:pl-0">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-700">
              Page <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                className={`inline-flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-700 text-white hover:bg-emerald-800'}`}>
                <ChevronLeft className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Previous</span>
              </button>
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className={`inline-flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-700 text-white hover:bg-emerald-800'}`}>
                <span className="hidden sm:inline">Next</span><ChevronRight className="h-4 w-4 sm:ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClearanceGeneration;