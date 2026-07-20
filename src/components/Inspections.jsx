import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import API from '../config/api';
import InspectionModal from './InspectionModal';
import useIsMobile from '../hooks/useIsMobile';
import {
  Search, CheckCircle, AlertCircle, MinusCircle, X,
  ChevronLeft, ChevronRight, Clock, User, Calendar,
  Shield, Filter, ShieldCheck,
} from 'lucide-react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

/* ── FIX: add search helpers to match format of BusinessRecords / Clearance ── */
const norm = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

/* FIX: order-independent, multi-word matching (see BusinessRecords.jsx for details) */
const hit = (text, q) => {
  const t = norm(text);
  const words = norm(q).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  return words.every((w) => t.includes(w));
};

/* FIX: highlight matches across separators (see BusinessRecords.jsx) */
const escapeChar = (c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buildFlexPattern = (word) =>
  word.split('').map(escapeChar).join('[^a-zA-Z0-9]*');

const Highlight = ({ text = '', query = '' }) => {
  const words = norm(query).split(' ').filter(Boolean);
  if (words.length === 0 || !text) return <>{String(text)}</>;

  const pattern = words.map(buildFlexPattern).join('|');
  const parts = String(text).split(new RegExp(`(${pattern})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <mark key={i} className="bg-[#FFFF00] text-black rounded-sm">{part}</mark>
          : part
      )}
    </>
  );
};

const ResultBadge = ({ inspections }) => {
  if (!inspections || inspections.length === 0) return null;
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
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-700" />
            </div>
          ) : inspections.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No inspection records yet</div>
          ) : (
            inspections.map(insp => (
              <div key={insp.id} className={`border rounded-xl p-4 space-y-2 ${
                insp.status === 'WITH VIOLATION' && !insp.is_resolved
                  ? 'border-red-200 bg-red-50'
                  : insp.is_resolved
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-green-200 bg-green-50'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {fmtDt(insp.date)}
                  </div>
                  <ResultBadge inspections={[insp]} />
                </div>
                {insp.inspector_name && (
                  <p className="text-xs text-gray-500 flex items-center gap-1"><User className="h-3 w-3" />{insp.inspector_name}</p>
                )}
                {insp.remarks && <p className="text-sm text-gray-700">{insp.remarks}</p>}
                {insp.is_resolved && (
                  <div className="text-xs text-blue-600 pt-1 border-t border-blue-200">
                    <p>Resolved by {insp.resolved_by} · {fmtDt(insp.resolved_at)}</p>
                    {insp.resolved_remarks && <p className="mt-0.5 italic">"{insp.resolved_remarks}"</p>}
                  </div>
                )}
                {insp.status === 'WITH VIOLATION' && !insp.is_resolved && (
                  resolveId === insp.id ? (
                    <div className="pt-2 space-y-2">
                      <textarea
                        placeholder="Resolution remarks (optional)"
                        value={resolveRemarks}
                        onChange={e => setResolveRemarks(e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => resolveMutation.mutate({ id: insp.id, remarks: resolveRemarks })}
                          disabled={resolveMutation.isLoading}
                          className="px-3 py-1 bg-emerald-700 text-white text-xs rounded-lg hover:bg-emerald-800 disabled:opacity-50"
                        >
                          {resolveMutation.isLoading ? 'Saving…' : 'Confirm Resolve'}
                        </button>
                        <button onClick={() => { setResolveId(null); setResolveRemarks(''); }} className="px-3 py-1 border border-gray-300 text-xs rounded-lg text-gray-600 hover:bg-gray-50">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResolveId(insp.id)}
                      className="text-xs text-emerald-700 hover:underline font-medium"
                    >
                      Mark as Resolved
                    </button>
                  )
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

const Inspections = ({ rolePrefix = 'staff' }) => {
  const qc       = useQueryClient();
  const isMobile = useIsMobile();

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

  /* Map inspections by business id, sorted latest-first */
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
        if (['inspected', 'violation', 'passed'].includes(filterStatus) && !inPeriod) return false;
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
        const hasPassed = inspections.some(i =>
          i.status === 'PASSED' && i.date &&
          new Date(i.date) >= dateFrom && new Date(i.date) <= dateTo
        );
        if (!hasPassed) return false;
      }

      /* FIX: use norm()/hit() like BusinessRecords instead of plain .toLowerCase() */
      if (search.trim()) {
        const q = norm(search);
        if (
          !hit(b.establishment_name, q) &&
          !hit(b.bin_number,         q) &&
          !hit(b.control_number,     q)
        ) return false;
      }

      return true;
    });
  }, [allBiz, inspectionMap, filterStatus, search, dateFrom, dateTo]);

  const PER_PAGE   = 10;
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = isMobile
    ? filtered
    : filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

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
      if (res.data.can_inspect) { setInspectBusiness(businessData); return; }
      if (res.data.reason === 'exempted') { toast.error('This business line is exempted from inspections'); return; }
      const maxCount      = res.data.max_count;
      const period        = res.data.period;
      const lastRaw       = res.data.last_inspection_date;
      const lastFormatted = lastRaw ? format(new Date(lastRaw), 'MMMM dd, yyyy') : null;
      const msg = lastFormatted
        ? `Already inspected on ${lastFormatted}. Max ${maxCount} inspection(s) per ${period}.`
        : `Maximum ${maxCount} inspection(s) per ${period} reached.`;
      toast.error(msg);
    } catch { toast.error('Failed to check inspection eligibility'); }
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
        <HistorySlideOver business={historyBusiness} onClose={() => setHistoryBusiness(null)} />
      )}

      <div className="pb-6 lg:pb-28 space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Inspections</h1>

        {/* Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div><span className="text-gray-500">Total:</span>           <span className="font-semibold text-gray-800 ml-1">{stats.total}</span></div>
            <div><span className="text-gray-500">Inspected:</span>       <span className="font-semibold text-emerald-700 ml-1">{stats.inspected}</span></div>
            <div><span className="text-gray-500">Not Inspected:</span>   <span className="font-semibold text-amber-600 ml-1">{stats.notInspected}</span></div>
            <div><span className="text-gray-500">With Violations:</span> <span className="font-semibold text-red-600 ml-1">{stats.violations}</span></div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filter by:</span>

            <div className="flex items-center gap-2">
              <button onClick={() => { setSelYear(p => p - 1); setCurrentPage(1); }} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-gray-800 min-w-[80px] text-center">{selYear}</span>
              <button onClick={() => { setSelYear(p => p + 1); setCurrentPage(1); }} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <select value={selMonth} onChange={e => { setSelMonth(Number(e.target.value)); setCurrentPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>

            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
              <option value="all">All Businesses</option>
              <option value="inspected">Inspected</option>
              <option value="not_inspected">Not Yet Inspected</option>
              <option value="violation">With Violation</option>
              <option value="passed">Latest: Passed</option>
            </select>
          </div>
        </div>

        {/* FIX: standalone search bar matching the same format as BusinessRecords / Clearance */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search business name or BIN…"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 text-sm"
          />
          {search && (
            <button onClick={() => { setSearch(''); setCurrentPage(1); }} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* FIX: results count */}
        {search && !isLoading && (
          <p className="text-xs text-gray-500">
            <span className="bg-gray-100 px-2 py-0.5 rounded-full font-medium">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &quot;{search.trim()}&quot;
            </span>
          </p>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No businesses match the current filters</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Business</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Hauler</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Remarks</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginated.map(b => {
                      const inspections = inspectionMap[b.id] || [];
                      const isInspected = inspections.length > 0;
                      return (
                        <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            {/* FIX: Highlight matches in establishment name and BIN */}
                            <div className="text-sm font-medium text-gray-900">
                              <Highlight text={b.establishment_name} query={search} />
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              BIN: <Highlight text={b.bin_number || '—'} query={search} />
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-600">{b.hauler_type || '—'}</td>
                          <td className="px-5 py-3">
                            {isInspected
                              ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 font-medium"><CheckCircle className="h-3 w-3" />Inspected</span>
                              : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500"><MinusCircle className="h-3 w-3" />Not Yet Inspected</span>}
                          </td>
                          <td className="px-5 py-3">
                            <button onClick={() => setHistoryBusiness(b)} className="hover:opacity-70">
                              <ResultBadge inspections={inspections} />
                            </button>
                            {!isInspected && <span className="text-xs text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <button
                              onClick={() => checkCanInspect(b.id, b)}
                              className="px-3 py-1 border border-emerald-700 text-emerald-700 text-xs rounded hover:bg-forest-50 transition-colors"
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

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {paginated.map(b => {
                  const inspections = inspectionMap[b.id] || [];
                  const isInspected = inspections.length > 0;
                  return (
                    <div key={b.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* FIX: Highlight in mobile cards too */}
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            <Highlight text={b.establishment_name} query={search} />
                          </p>
                          <p className="text-xs text-gray-400">
                            BIN: <Highlight text={b.bin_number || '—'} query={search} /> · {b.hauler_type || '—'}
                          </p>
                        </div>
                        {isInspected
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 font-medium shrink-0"><CheckCircle className="h-3 w-3" />Inspected</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 shrink-0"><MinusCircle className="h-3 w-3" />Not Yet</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <button onClick={() => isInspected && setHistoryBusiness(b)}>
                          <ResultBadge inspections={inspections} />
                        </button>
                        <button
                          onClick={() => checkCanInspect(b.id, b)}
                          className="px-3 py-1 border border-emerald-700 text-emerald-700 text-xs rounded hover:bg-forest-50"
                        >
                          Inspect
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pagination — desktop only */}
      {!isMobile && !isLoading && totalPages > 1 && (
        <div className="fixed bottom-4 left-64 right-4 z-10">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-700">
              Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
              <span className="text-gray-400 ml-2">({filtered.length} records)</span>
            </span>
            <div className="flex gap-3">
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
    </div>
  );
};

export default Inspections;