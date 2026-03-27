import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import API from '../config/api';
import {
  Search, CheckCircle, AlertCircle, MinusCircle,
  Calendar, User, ChevronLeft, ChevronRight,
  X, Clock, ShieldCheck,
} from 'lucide-react';

//  helpers 

const fmtDt = (d) => {
  if (!d) return '—';
  try { return format(new Date(d), 'MMM dd, yyyy hh:mm a'); } catch { return '—'; }
};

/** Badge used inside the inspection history modal entries */
const EntryBadge = ({ status, isResolved }) => {
  if (status === 'PASSED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3" />Passed
      </span>
    );
  }
  if (isResolved) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
        <ShieldCheck className="h-3 w-3" />Resolved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
      <AlertCircle className="h-3 w-3" />With Violation
    </span>
  );
};

/** Badge shown in the main table "Latest Inspection" column */
const LatestBadge = ({ inspections }) => {
  if (!inspections || inspections.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <MinusCircle className="h-3 w-3" />Not Inspected Yet
      </span>
    );
  }
  const latest = inspections[0];
  return <EntryBadge status={latest.status} isResolved={latest.is_resolved} />;
};

//  component 

const Inspections = ({ rolePrefix = 'staff' }) => {
  const [searchQuery, setSearchQuery]           = useState('');
  const [currentPage, setCurrentPage]           = useState(1);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [historyOpen, setHistoryOpen]           = useState(false);
  const [inspectOpen, setInspectOpen]           = useState(false);
  const [resolveOpen, setResolveOpen]           = useState(false);
  const [targetInspection, setTargetInspection] = useState(null);
  const [inspectForm, setInspectForm]           = useState({ status: 'PASSED', remarks: '' });
  const [resolvedRemarks, setResolvedRemarks]   = useState('');

  //  Business list 

  const {
    data: businessPage,
    isLoading: businessLoading,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['bizListInsp', searchQuery, currentPage],
    queryFn: async () => {
      if (searchQuery && searchQuery.length >= 2) {
        const res = await API.get(`/business-records/search?q=${searchQuery}`);
        return { items: res.data, total: res.data.length, page: 1, per_page: 10, total_pages: Math.ceil(res.data.length / 10) };
      }
      const res = await API.get(`/business-records/recent?page=${currentPage}&per_page=10`);
      return res.data;
    },
  });

  //  Inspection map (latest per business on this page) 

  const { data: inspMap, refetch: refetchMap } = useQuery({
    queryKey: ['inspMap', businessPage?.items?.map(b => b.id).join(',')],
    queryFn: async () => {
      const businesses = businessPage?.items || [];
      const entries = await Promise.all(
        businesses.map(async (b) => {
          try { const r = await API.get(`/inspections/business/${b.id}`); return [b.id, r.data]; }
          catch { return [b.id, []]; }
        })
      );
      return Object.fromEntries(entries);
    },
    enabled: !!businessPage?.items?.length,
  });

  //  Inspection history for selected business 

  const { data: bizInspections, refetch: refetchHistory } = useQuery({
    queryKey: ['bizInspHistory', selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness) return [];
      const res = await API.get(`/inspections/business/${selectedBusiness.id}`);
      return res.data;
    },
    enabled: !!selectedBusiness,
  });

  //  Mutations 

  const recordMutation = useMutation({
    mutationFn: async ({ businessId, status, remarks }) => {
      const params = new URLSearchParams({ status });
      if (remarks) params.append('remarks', remarks);
      return (await API.post(`/inspections/business/${businessId}?${params.toString()}`)).data;
    },
    onSuccess: () => {
      toast.success('Inspection recorded');
      refetchHistory(); refetchMap(); refetchList();
      setInspectOpen(false);
      setInspectForm({ status: 'PASSED', remarks: '' });
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to record inspection'),
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ inspectionId, resolvedRemarks }) => {
      const params = new URLSearchParams();
      if (resolvedRemarks) params.append('resolved_remarks', resolvedRemarks);
      return (await API.post(`/inspections/${inspectionId}/resolve?${params.toString()}`)).data;
    },
    onSuccess: () => {
      toast.success('Violation marked as resolved');
      refetchHistory(); refetchMap(); refetchList();
      setResolveOpen(false);
      setTargetInspection(null);
      setResolvedRemarks('');
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to resolve'),
  });

  //  Handlers 

  const openHistory = (business) => { setSelectedBusiness(business); setHistoryOpen(true); };

  const openInspect = (business, e) => {
    e.stopPropagation();
    setSelectedBusiness(business);
    setInspectForm({ status: 'PASSED', remarks: '' });
    setInspectOpen(true);
  };

  const openResolve = (inspection, e) => {
    e.stopPropagation();
    setTargetInspection(inspection);
    setResolvedRemarks('');
    setResolveOpen(true);
  };

  const closeAll = () => {
    setHistoryOpen(false);
    setInspectOpen(false);
    setResolveOpen(false);
    setSelectedBusiness(null);
    setTargetInspection(null);
    setInspectForm({ status: 'PASSED', remarks: '' });
    setResolvedRemarks('');
  };

  //  Derived 

  const businessList = businessPage?.items || [];
  const totalPages   = businessPage?.total_pages || 1;

  //  Render 

  return (
    <div className="min-h-screen bg-gray-50">

      {historyOpen && selectedBusiness && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Inspection History</h3>
                <button onClick={closeAll} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
              </div>

              {/* business summary */}
              <div className="mb-5 p-4 bg-gray-50 rounded-lg text-sm">
                <h4 className="font-medium text-gray-900 mb-2">{selectedBusiness.establishment_name}</h4>
                <div className="grid grid-cols-3 gap-3 text-gray-600">
                  <div><span className="text-gray-400">BIN: </span><span className="font-mono">{selectedBusiness.bin_number || '—'}</span></div>
                  <div><span className="text-gray-400">Hauler: </span>{selectedBusiness.hauler_type || '—'}</div>
                  <div><span className="text-gray-400">Control #: </span><span className="font-mono">{selectedBusiness.control_number || '—'}</span></div>
                </div>
              </div>

              {/* inspection entries */}
              {bizInspections && bizInspections.length > 0 ? (
                <div className="space-y-3">
                  {bizInspections.map((insp) => {
                    const isUnresolved = insp.status === 'WITH VIOLATION' && !insp.is_resolved;
                    const isResolved   = insp.status === 'WITH VIOLATION' &&  insp.is_resolved;
                    return (
                      <div key={insp.id} className={`border rounded-lg p-4 ${
                        isUnresolved ? 'border-red-200 bg-red-50'
                        : isResolved  ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200'
                      }`}>
                        {/* row 1: date + badge + resolve button */}
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            {fmtDt(insp.date)}
                          </div>
                          <div className="flex items-center gap-2">
                            <EntryBadge status={insp.status} isResolved={insp.is_resolved} />
                            {isUnresolved && (
                              <button
                                onClick={(e) => openResolve(insp, e)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-blue-500 text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <ShieldCheck className="h-3 w-3" />Mark Resolved
                              </button>
                            )}
                          </div>
                        </div>

                        {/* row 2: inspector */}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4 text-gray-400" />
                          Inspector: {insp.inspector || 'Unknown'}
                        </div>

                        {/* remarks */}
                        {insp.remarks && (
                          <div className="mt-2 p-3 bg-white/70 rounded-lg text-sm text-gray-700">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Remarks: </span>
                            {insp.remarks}
                          </div>
                        )}

                        {/* resolution info */}
                        {isResolved && (
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <div className="flex items-center gap-2 text-sm text-blue-900">
                              <ShieldCheck className="h-4 w-4" />
                              <span>Marked as resolved by <strong>{insp.resolved_by || 'Unknown'}</strong> · {fmtDt(insp.resolved_at)}</span>
                            </div>
                            {insp.resolved_remarks && (
                              <p className="mt-1 text-sm text-blue-900 uppercase tracking-widepl-6">REMARKS: {insp.resolved_remarks}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No inspections recorded yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {inspectOpen && selectedBusiness && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Record Inspection</h3>
                <button onClick={closeAll} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
              </div>

              <div className="mb-5 p-4 bg-gray-50 rounded-lg text-sm">
                <h4 className="font-medium text-gray-900 mb-2">{selectedBusiness.establishment_name}</h4>
                <div className="grid grid-cols-3 gap-3 text-gray-600">
                  <div><span className="text-gray-400">BIN: </span><span className="font-mono">{selectedBusiness.bin_number || '—'}</span></div>
                  <div><span className="text-gray-400">Hauler: </span>{selectedBusiness.hauler_type || '—'}</div>
                  <div><span className="text-gray-400">Control #: </span><span className="font-mono">{selectedBusiness.control_number || '—'}</span></div>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); recordMutation.mutate({ businessId: selectedBusiness.id, status: inspectForm.status, remarks: inspectForm.remarks }); }}
                className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Result</label>
                  <div className="flex gap-6">
                    {[
                      { value: 'PASSED',         label: 'Passed'        },
                      { value: 'WITH VIOLATION',  label: 'With Violation'},
                    ].map(({ value, label }) => (
                      <label key={value} className="inline-flex items-center gap-2 cursor-pointer">
                        <input type="radio" value={value}
                          checked={inspectForm.status === value}
                          onChange={(e) => setInspectForm(f => ({ ...f, status: e.target.value }))}
                          className={`h-4 w-4 ${value === 'PASSED' ? 'text-emerald-600' : 'text-red-600'}`} />
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks
                    {inspectForm.status === 'WITH VIOLATION' && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <textarea rows={3} value={inspectForm.remarks}
                    onChange={(e) => setInspectForm(f => ({ ...f, remarks: e.target.value }))}
                    placeholder="Enter inspection remarks…"
                    required={inspectForm.status === 'WITH VIOLATION'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500" />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={closeAll}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={recordMutation.isLoading}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">
                    {recordMutation.isLoading ? 'Saving…' : 'Save Inspection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {resolveOpen && targetInspection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Mark Violation as Resolved</h3>
                <button onClick={() => { setResolveOpen(false); setTargetInspection(null); setResolvedRemarks(''); }}
                  className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
              </div>

              {/* violation summary */}
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                <p className="font-medium text-red-800 mb-0.5">Violation recorded</p>
                <p className="text-red-700">{targetInspection.remarks || '—'}</p>
                <p className="text-red-400 text-xs mt-1">on {fmtDt(targetInspection.date)}</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); resolveMutation.mutate({ inspectionId: targetInspection.id, resolvedRemarks }); }}
                className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resolution Notes <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea rows={3} value={resolvedRemarks}
                    onChange={(e) => setResolvedRemarks(e.target.value)}
                    placeholder="Describe how the violation was resolved…"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button"
                    onClick={() => { setResolveOpen(false); setTargetInspection(null); setResolvedRemarks(''); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={resolveMutation.isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2">
                    {resolveMutation.isLoading ? 'Saving…' : 'Confirm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="pb-24 space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Inspections</h1>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input type="text" placeholder="Search business by name, owner, or BIN…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm" />
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          {businessLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : businessList.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">No business records found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Business Name', 'BIN Number', 'Hauler Type', 'Control Number', 'Latest Inspection', 'Actions'].map(col => (
                      <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {businessList.map((business) => {
                    const inspections = inspMap?.[business.id] || [];
                    return (
                      <tr key={business.id} className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => openHistory(business)}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{business.establishment_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{business.bin_number || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{business.hauler_type || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{business.control_number || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <LatestBadge inspections={inspections} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button onClick={(e) => openInspect(business, e)}
                            className="px-3 py-1 border border-emerald-600 text-emerald-600 text-xs rounded hover:bg-emerald-50 transition-colors">
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

      {/* Pagination */}
      <div className="fixed bottom-4 left-72 right-4 z-10">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-700">
            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
          </span>
          <div className="flex gap-3">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm transition-all ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
              <ChevronLeft className="h-4 w-4 mr-1" />Previous
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm transition-all ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
              Next<ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inspections;