import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import API from '../config/api';
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ClipboardCheck,
  X,
  Clock,
} from 'lucide-react';

const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  try {
    return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
  } catch {
    return '—';
  }
};

const InspectionBadge = ({ hasBeenInspected, hasViolation }) => {
  if (!hasBeenInspected) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <Clock className="h-3 w-3" />
        Not Inspected
      </span>
    );
  }
  if (hasViolation) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <AlertTriangle className="h-3 w-3" />
        With Violation
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      <ClipboardCheck className="h-3 w-3" />
      Passed
    </span>
  );
};

const ClearanceStatusBadge = ({ hasClearance, isClaimed }) => {
  if (!hasClearance) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        No Clearance
      </span>
    );
  }
  if (isClaimed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3" />
        Issued
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      <XCircle className="h-3 w-3" />
      Not Yet Issued
    </span>
  );
};

const ClearanceGeneration = ({ rolePrefix = 'staff' }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [generateTarget, setGenerateTarget] = useState(null);
  const [issueTarget, setIssueTarget] = useState(null);

  //  Data fetching 

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['clearanceBusinesses', searchQuery, currentPage],
    queryFn: async () => {
      let businessItems;
      let paginationMeta;

      if (searchQuery && searchQuery.length >= 2) {
        const searchRes = await API.get(`/business-records/search?q=${searchQuery}`);
        businessItems = searchRes.data;
        paginationMeta = {
          total: businessItems.length,
          page: 1,
          per_page: 10,
          total_pages: Math.ceil(businessItems.length / 10),
        };
      } else {
        const recentRes = await API.get(
          `/business-records/recent?page=${currentPage}&per_page=10`
        );
        businessItems = recentRes.data.items || [];
        paginationMeta = {
          total: recentRes.data.total,
          page: recentRes.data.page,
          per_page: recentRes.data.per_page,
          total_pages: recentRes.data.total_pages,
        };
      }

      const clearancesRes = await API.get('/clearance/history/all');
      const clearances = clearancesRes.data || [];

      const items = businessItems.map((business) => {
        const matchedClearance = clearances.find(
          (c) => c.business_record_id === business.id
        );
        return {
          id: business.id,
          establishment_name: business.establishment_name,
          owner_name: business.owner_name,
          control_number:
            matchedClearance?.control_number || business.control_number,
          hauler_type: business.hauler_type,
          has_violation: business.has_violation,
          has_been_inspected: business.has_been_inspected,
          violation_details: business.violation_details || '—',
          clearance_id: matchedClearance?.id,
          is_claimed: matchedClearance?.is_claimed || false,
          printed_at: matchedClearance?.printed_at,
          last_printed_at: matchedClearance?.last_printed_at,
          last_printed_by: matchedClearance?.last_printed_by,
          printed_by: matchedClearance?.printed_by,
          has_clearance: !!matchedClearance,
        };
      });

      return { items, ...paginationMeta };
    },
  });

  //  Mutations 

  const generateMutation = useMutation({
    mutationFn: async (businessId) => {
      const res = await API.post(`/clearance/generate/${businessId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Clearance generated successfully');
      setGenerateTarget(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to generate clearance');
    },
  });

  const issueMutation = useMutation({
    mutationFn: async (clearanceId) => {
      const res = await API.post(`/clearance/issue/${clearanceId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Clearance marked as issued');
      setIssueTarget(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to issue clearance');
    },
  });

  //  Click handlers 

  const handleGenerateClick = (item) => {
    if (!item.has_been_inspected) {
      toast.error('Cannot generate clearance: Business has not been inspected yet');
      return;
    }
    if (item.has_violation) {
      toast.error('Cannot generate clearance: Business has unresolved violations');
      return;
    }
    setGenerateTarget(item);
  };

  const canGenerate = (item) =>
    item.has_been_inspected && !item.has_violation;

  const generateTooltip = (item) => {
    if (!item.has_been_inspected) return 'Business must be inspected first';
    if (item.has_violation) return 'Business has unresolved violations';
    return 'Generate clearance';
  };

  //  Render 

  const items = data?.items || [];
  const totalPages = data?.total_pages || 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/*  Generate Confirmation Modal  */}
      {generateTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Generate Clearance</h3>
                <button
                  onClick={() => setGenerateTarget(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-1 text-sm">
                <p className="font-medium text-gray-900">
                  {generateTarget.establishment_name}
                </p>
                <p>
                  <span className="text-gray-500">Owner: </span>
                  {generateTarget.owner_name}
                </p>
                <p>
                  <span className="text-gray-500">Control #: </span>
                  {generateTarget.control_number || '—'}
                </p>
                <p>
                  <span className="text-gray-500">Hauler: </span>
                  {generateTarget.hauler_type}
                </p>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                Generate a clearance for this business?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setGenerateTarget(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => generateMutation.mutate(generateTarget.id)}
                  disabled={generateMutation.isLoading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {generateMutation.isLoading ? 'Generating…' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  Issue Confirmation Modal  */}
      {issueTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Mark as Issued</h3>
                <button
                  onClick={() => setIssueTarget(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium text-gray-900">
                  {issueTarget.establishment_name}
                </p>
                <p className="text-gray-600 mt-1">
                  Control #: {issueTarget.control_number}
                </p>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                Mark this clearance as issued to the business owner? This cannot be
                undone.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIssueTarget(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => issueMutation.mutate(issueTarget.clearance_id)}
                  disabled={issueMutation.isLoading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {issueMutation.isLoading ? 'Processing…' : 'Confirm Issue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  Main Content  */}
      <div className="pb-24 space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Clearance Management</h1>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by business name or control number…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                       focus:ring-emerald-500 focus:border-emerald-500 text-sm"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">No businesses found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      'Establishment',
                      'Inspection',
                      'Last Printed',
                      'Clearance Status',
                      'Actions',
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {/* Establishment */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.establishment_name}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                          Control #: {item.control_number || '—'}
                        </div>
                        {item.has_violation && (
                          <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                            <AlertTriangle className="h-3 w-3" />
                            {item.violation_details}
                          </div>
                        )}
                      </td>

                      {/* Inspection status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <InspectionBadge
                          hasBeenInspected={item.has_been_inspected}
                          hasViolation={item.has_violation}
                        />
                      </td>

                      {/* Last printed */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDateTime(item.last_printed_at || item.printed_at)}
                        </div>
                        {(item.last_printed_by || item.printed_by) && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            by: {item.last_printed_by || item.printed_by}
                          </div>
                        )}
                      </td>

                      {/* Clearance status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ClearanceStatusBadge
                          hasClearance={item.has_clearance}
                          isClaimed={item.is_claimed}
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.has_clearance ? (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                navigate(
                                  `/${rolePrefix}/clearance/${item.clearance_id}/view`
                                )
                              }
                              disabled={item.has_violation}
                              title={
                                item.has_violation
                                  ? 'Cannot view: business has violation'
                                  : 'View clearance'
                              }
                              className={`px-3 py-1 border text-xs rounded transition-colors ${
                                item.has_violation
                                  ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                                  : 'border-emerald-600 text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              View
                            </button>
                            {!item.is_claimed && (
                              <button
                                onClick={() => setIssueTarget(item)}
                                className="text-sm font-medium text-emerald-600 hover:text-emerald-800"
                              >
                                Issue
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleGenerateClick(item)}
                            disabled={!canGenerate(item)}
                            title={generateTooltip(item)}
                            className={`inline-flex items-center px-3 py-1 text-xs rounded transition-colors ${
                              canGenerate(item)
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
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
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
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
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm ${
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
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm ${
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
      )}
    </div>
  );
};

export default ClearanceGeneration;