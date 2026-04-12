import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import API from '../config/api';
import InspectionModal from './InspectionModal';
import {
  Search, CheckCircle, AlertCircle, MinusCircle, X,
  ChevronLeft, ChevronRight, Clock, User, Calendar,
  ClipboardList, Shield, Filter, ShieldCheck, AlertTriangle,
} from 'lucide-react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const StatusBadge = ({ inspections }) => {
  if (!inspections || inspections.length === 0)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500"><MinusCircle className="h-3 w-3" />Not Inspected</span>;
  const latest = inspections[0];
  if (latest.status === 'PASSED')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium"><CheckCircle className="h-3 w-3" />Passed</span>;
  if (latest.is_resolved)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium"><ShieldCheck className="h-3 w-3" />Resolved</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium"><AlertCircle className="h-3 w-3" />With Violation</span>;
};

const fmtDt = (d) => {
  try { return format(new Date(d), 'MMM dd, yyyy hh:mm a'); }
  catch { return '—'; }
};

const HistorySlideOver = ({ business, onClose }) => {
  const qc = useQueryClient();
  const [resolveId, setResolveId]           = useState(null);
  const [resolveRemarks, setResolveRemarks] = useState('');

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['businessInspections', business.id],
    queryFn: async () => (await API.get(`/inspections/business/${business.id}`)).data,
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, remarks }) => {
      const params = new URLSearchParams();
      if (remarks) params.set('resolved_remarks', remarks);
      return API.post(`/inspections/resolve/${id}?${params.toString()}`);
    },
    onSuccess: () => {
      toast.success('Violation resolved');
      qc.invalidateQueries(['businessInspections', business.id]);
      qc.invalidateQueries(['allInspections']);
      qc.invalidateQueries(['allBizInspections']);
      setResolveId(null);
      setResolveRemarks('');
    },
    onError: () => toast.error('Failed to resolve'),
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[460px] max-w-[95vw] bg-white z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Inspection History</h2>
            <p className="text-xs text-gray-500 mt-0.5">{business.establishment_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-emerald-700 border-t-transparent rounded-full" />
            </div>
          ) : inspections.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock className="h-10 w-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">No inspections recorded yet</p>
            </div>
          ) : (
            inspections.map(insp => {
              const isViolation = insp.status === 'WITH VIOLATION';
              const isResolved  = insp.is_resolved;
              return (
                <div key={insp.id} className={`border rounded-xl p-4 ${
                  isViolation && !isResolved ? 'border-red-200 bg-red-50'
                  : isResolved             ? 'border-blue-200 bg-blue-50'
                  : 'border-green-200 bg-green-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      {fmtDt(insp.date)}
                    </div>
                    {isViolation && !isResolved
                      ? <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">With Violation</span>
                      : isResolved
                      ? <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Resolved</span>
                      : <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Passed</span>}
                  </div>

                  <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                    <User className="h-3 w-3" /> {insp.inspector || 'Unknown'}
                  </div>

                  {insp.remarks && (
                    <p className="text-sm text-gray-700 mt-2 bg-white/60 rounded p-2">{insp.remarks}</p>
                  )}

                  {isResolved && (
                    <div className="mt-2 text-xs text-blue-700">
                      <span className="font-medium">Resolved by:</span> {insp.resolved_by} · {fmtDt(insp.resolved_at)}
                      {insp.resolved_remarks && <p className="mt-0.5">Remark: {insp.resolved_remarks}</p>}
                    </div>
                  )}

                  {isViolation && !isResolved && (
                    <div className="mt-3">
                      {resolveId === insp.id ? (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            placeholder="Resolution remarks (optional)"
                            value={resolveRemarks}
                            onChange={e => setResolveRemarks(e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => { setResolveId(null); setResolveRemarks(''); }}
                              className="px-3 py-1 border border-gray-300 rounded text-xs text-gray-600">Cancel</button>
                            <button
                              onClick={() => resolveMutation.mutate({ id: insp.id, remarks: resolveRemarks })}
                              disabled={resolveMutation.isLoading}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50">
                              Confirm
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setResolveId(insp.id)}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Mark as Resolved
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

const Inspections = ({ rolePrefix = 'staff' }) => {
  const qc = useQueryClient();

  const now = new Date();
  const [selYear, setSelYear]             = useState(now.getFullYear());
  const [selMonth, setSelMonth]           = useState(now.getMonth());
  const [filterStatus, setFilterStatus]   = useState('all');
  const [search, setSearch]               = useState('');
  const [currentPage, setCurrentPage]     = useState(1);
  const [inspectBusiness, setInspectBusiness] = useState(null);
  const [historyBusiness, setHistoryBusiness] = useState(null);

  const { data: allBiz = [], isLoading: bizLoading } = useQuery({
    queryKey: ['allBizInspections'],
    queryFn: async () => (await API.get('/business-records/all')).data || [],
  });

  const { data: allInspections = [], isLoading: inspLoading } = useQuery({
    queryKey: ['allInspections'],
    queryFn: async () => (await API.get('/inspections/all')).data || [],
  });

  const isLoading = bizLoading || inspLoading;

  const inspectionMap = useMemo(() => {
    const map = {};
    allInspections.forEach(i => {
      if (!map[i.business_record_id]) map[i.business_record_id] = [];
      map[i.business_record_id].push(i);
    });
    return map;
  }, [allInspections]);

  const { dateFrom, dateTo } = useMemo(() => {
    const d = new Date(selYear, selMonth, 1);
    return { dateFrom: startOfMonth(d), dateTo: endOfMonth(d) };
  }, [selMonth, selYear]);

  const filtered = useMemo(() => {
    return allBiz.filter(b => {
      const inspections = inspectionMap[b.id] || [];

      if (filterStatus !== 'not_inspected' && inspections.length > 0) {
        const inPeriod = inspections.some(i => {
          if (!i.date) return false;
          const d = new Date(i.date);
          return d >= dateFrom && d <= dateTo;
        });
        if (filterStatus === 'inspected' && !inPeriod) return false;
        if (filterStatus === 'violation'  && !inPeriod) return false;
        if (filterStatus === 'passed'     && !inPeriod) return false;
      }

      if (filterStatus === 'inspected'     && inspections.length === 0) return false;
      if (filterStatus === 'not_inspected' && inspections.length > 0)   return false;

      if (filterStatus === 'violation') {
        const hasOpen = inspections.some(i =>
          i.status === 'WITH VIOLATION' && !i.is_resolved &&
          i.date && new Date(i.date) >= dateFrom && new Date(i.date) <= dateTo
        );
        if (!hasOpen) return false;
      }

      if (filterStatus === 'passed') {
        const hasPassedInPeriod = inspections.some(i =>
          i.status === 'PASSED' &&
          i.date && new Date(i.date) >= dateFrom && new Date(i.date) <= dateTo
        );
        if (!hasPassedInPeriod) return false;
      }

      if (search) {
        const q = search.toLowerCase();
        if (
          !b.establishment_name?.toLowerCase().includes(q) &&
          !(b.bin_number || '').toLowerCase().includes(q) &&
          !(b.control_number || '').toLowerCase().includes(q)
        ) return false;
      }

      return true;
    });
  }, [allBiz, inspectionMap, filterStatus, search, dateFrom, dateTo]);

  const PER_PAGE   = 10;
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const handleInspectDone = () => {
    qc.invalidateQueries(['allInspections']);
    qc.invalidateQueries(['allBizInspections']);
  };

  const stats = useMemo(() => ({
    total:        allBiz.length,
    inspected:    allBiz.filter(b => (inspectionMap[b.id] || []).length > 0).length,
    violations:   allBiz.filter(b => b.has_violation).length,
    notInspected: allBiz.filter(b => (inspectionMap[b.id] || []).length === 0).length,
  }), [allBiz, inspectionMap]);

  const checkCanInspect = async (businessId, businessData) => {
    try {
      const res = await API.get(`/inspections/business/${businessId}/can-inspect`);

      if (res.data.can_inspect) {
        setInspectBusiness(businessData);
        return;
      }

      if (res.data.reason === 'exempted') {
        toast.error('This business line is exempted from inspections');
        return;
      }

      const maxCount    = res.data.max_count;  
      const period      = res.data.period;
      const lastRaw     = res.data.last_inspection_date;
      const lastFormatted = lastRaw
        ? format(new Date(lastRaw), 'MMMM dd, yyyy')
        : null;

      const msg = lastFormatted
        ? `This business was already inspected on ${lastFormatted}. Maximum of ${maxCount} inspection(s) per ${period} reached.`
        : `Maximum ${maxCount} inspection(s) per ${period} reached.`;

      toast.error(msg);
    } catch {
      toast.error('Failed to check inspection eligibility');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {inspectBusiness && (
        <InspectionModal
          business={inspectBusiness}
          isOpen={!!inspectBusiness}
          onClose={() => setInspectBusiness(null)}
          onSubmitSuccess={handleInspectDone}
        />
      )}
      {historyBusiness && (
        <HistorySlideOver
          business={historyBusiness}
          onClose={() => setHistoryBusiness(null)}
        />
      )}

      <div className="pb-6 lg:pb-28 space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Inspections</h1>

        {/* Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div><span className="text-gray-500">Total:</span>          <span className="font-semibold text-gray-800 ml-1">{stats.total}</span></div>
            <div><span className="text-gray-500">Inspected:</span>      <span className="font-semibold text-emerald-700 ml-1">{stats.inspected}</span></div>
            <div><span className="text-gray-500">Not Inspected:</span>  <span className="font-semibold text-amber-600 ml-1">{stats.notInspected}</span></div>
            <div><span className="text-gray-500">With Violations:</span><span className="font-semibold text-red-600 ml-1">{stats.violations}</span></div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filter by:</span>

            <div className="flex items-center gap-2">
              <button onClick={() => { setSelYear(prev => prev - 1); setCurrentPage(1); }} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-gray-800 min-w-[80px] text-center">{selYear}</span>
              <button onClick={() => { setSelYear(prev => prev + 1); setCurrentPage(1); }} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <select value={selMonth}
              onChange={e => { setSelMonth(Number(e.target.value)); setCurrentPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>

            <select value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
              <option value="all">All Businesses</option>
              <option value="inspected">Inspected</option>
              <option value="not_inspected">Not Yet Inspected</option>
              <option value="violation">With Violation</option>
              <option value="passed">Latest: Passed</option>
            </select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search business name or control #…"
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-2 text-gray-400">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No businesses match the current filters</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Business</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Hauler</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(b => {
                    const inspections = inspectionMap[b.id] || [];
                    return (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="text-sm font-medium text-gray-900">{b.establishment_name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">BIN: {b.bin_number || '—'}</div>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600">{b.hauler_type || '—'}</td>
                        <td className="px-5 py-3">
                          <button onClick={() => setHistoryBusiness(b)} className="hover:opacity-70 transition-opacity">
                            <StatusBadge inspections={inspections} />
                          </button>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <button
                            onClick={() => checkCanInspect(b.id, b)}
                            className="px-3 py-1 border border-emerald-700 text-emerald-700 text-xs rounded hover:bg-forest-50 transition-colors">
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
      {!isLoading && totalPages > 1 && (
      <>
        <div className="hidden lg:block fixed bottom-4 left-64 right-4 z-10">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-700">
              Page <span className="font-medium">{currentPage}</span> of{' '}
              <span className="font-medium">{totalPages}</span>
              <span className="text-gray-400 ml-2">(records)</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800'
                }`}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800'
                }`}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:hidden mt-4 flex items-center justify-between px-1">
          <span className="text-xs text-gray-500">
            Page {currentPage} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800'
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </>
    )}
    </div>
  );
};

export default Inspections;