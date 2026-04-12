import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../config/api';
import useIsMobile from '../hooks/useIsMobile';
import {
  Download, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, Search, X, ShieldCheck,
} from 'lucide-react';

const fmtDt = (d) => { try { return format(new Date(d), 'MMM dd, yyyy hh:mm a'); } catch { return '—'; } };

const HAULER_TYPES = ['City', 'Barangay', 'Accredited', 'Hazardous', 'Exempted', 'No Contract'];
const PER_PAGE = 10;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS  = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
  { value: 0, label: 'January' }, { value: 1, label: 'February' }, { value: 2, label: 'March' },
  { value: 3, label: 'April' },   { value: 4, label: 'May' },       { value: 5, label: 'June' },
  { value: 6, label: 'July' },    { value: 7, label: 'August' },    { value: 8, label: 'September' },
  { value: 9, label: 'October' }, { value: 10, label: 'November' }, { value: 11, label: 'December' },
];
const TABS = [
  { key: 'clearances',  label: 'Clearances'  },
  { key: 'inspections', label: 'Inspections' },
];

const InspStatusBadge = ({ status, isResolved }) => {
  if (status === 'PASSED')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700"><CheckCircle className="h-3 w-3" />Passed</span>;
  if (isResolved)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"><ShieldCheck className="h-3 w-3" />Resolved</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"><AlertTriangle className="h-3 w-3" />With Violation</span>;
};

const Reports = ({ rolePrefix = 'staff' }) => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'clearances';
  const now = new Date();
  const isMobile = useIsMobile();

  const [tab, setTab]                           = useState(['clearances', 'inspections'].includes(initialTab) ? initialTab : 'clearances');
  const [filterMode, setFilterMode]             = useState('monthly');
  const [selectedMonth, setSelectedMonth]       = useState(now.getMonth());
  const [selectedYear, setSelectedYear]         = useState(now.getFullYear());
  const [filterType, setFilterType]             = useState(searchParams.get('filter') || 'all');
  const [filterInspStatus, setFilterInspStatus] = useState('all');
  const [filterHauler, setFilterHauler]         = useState('all');
  const [search, setSearch]                     = useState('');
  const [currentPage, setCurrentPage]           = useState(1);
  const [pdfLoading, setPdfLoading]             = useState(false);

  const { dateFrom, dateTo, dateFromStr, dateToStr } = useMemo(() => {
    if (filterMode === 'monthly') {
      const d    = new Date(selectedYear, selectedMonth, 1);
      const from = startOfMonth(d);
      const to   = endOfMonth(d);
      return { dateFrom: from, dateTo: to, dateFromStr: format(from, 'yyyy-MM-dd'), dateToStr: format(to, 'yyyy-MM-dd') };
    } else {
      const d    = new Date(selectedYear, 0, 1);
      const from = startOfYear(d);
      const to   = endOfYear(d);
      return { dateFrom: from, dateTo: to, dateFromStr: format(from, 'yyyy-MM-dd'), dateToStr: format(to, 'yyyy-MM-dd') };
    }
  }, [filterMode, selectedMonth, selectedYear]);

  const { data: clearances = [],     isLoading: clrLoading  } = useQuery({ queryKey: [`allClr${rolePrefix}Rpt`],  queryFn: async () => (await API.get('/clearance/history/all')).data || [] });
  const { data: allInspections = [], isLoading: inspLoading } = useQuery({ queryKey: [`allInsp${rolePrefix}Rpt`], queryFn: async () => (await API.get('/inspections/all')).data || [] });
  const isLoading = clrLoading || inspLoading;

  const filteredClr = useMemo(() => clearances.filter(c => {
    if (c.printed_at) { const d = new Date(c.printed_at); if (d < dateFrom || d > endOfDay(dateTo)) return false; }
    if (filterType === 'issued'  && !c.is_claimed) return false;
    if (filterType === 'pending' &&  c.is_claimed) return false;
    if (search) { const q = search.toLowerCase(); if (!c.business_name?.toLowerCase().includes(q) && !c.control_number?.toLowerCase().includes(q)) return false; }
    return true;
  }), [clearances, dateFrom, dateTo, filterType, search]);

  const filteredInspections = useMemo(() => {
    const base = allInspections.filter(i => {
      if (i.date) { const d = new Date(i.date); if (d < dateFrom || d > endOfDay(dateTo)) return false; }
      if (filterInspStatus === 'passed'     && i.status !== 'PASSED') return false;
      if (filterInspStatus === 'unresolved' && !(i.status === 'WITH VIOLATION' && !i.is_resolved)) return false;
      if (filterInspStatus === 'resolved'   && !(i.status === 'WITH VIOLATION' &&  i.is_resolved)) return false;
      if (filterHauler !== 'all' && i.hauler_type !== filterHauler) return false;
      if (search) { const q = search.toLowerCase(); if (!i.establishment_name?.toLowerCase().includes(q) && !i.bin_number?.toLowerCase().includes(q)) return false; }
      return true;
    });
    if (filterInspStatus === 'all') {
      const unresolved = base.filter(i => i.status === 'WITH VIOLATION' && !i.is_resolved).sort((a, b) => new Date(a.date) - new Date(b.date));
      const rest       = base.filter(i => !(i.status === 'WITH VIOLATION' && !i.is_resolved)).sort((a, b) => new Date(b.date) - new Date(a.date));
      return [...unresolved, ...rest];
    }
    return [...base].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [allInspections, dateFrom, dateTo, filterInspStatus, filterHauler, search]);

  const active     = tab === 'clearances' ? filteredClr : filteredInspections;
  const totalPages = Math.ceil(active.length / PER_PAGE);

  // Desktop = paginated slice, Mobile = all
  const paginated = isMobile
    ? active
    : active.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const changeTab = (t) => { setTab(t); setCurrentPage(1); setFilterType('all'); setFilterInspStatus('all'); setSearch(''); setFilterHauler('all'); };

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('date_from', dateFromStr);
      params.set('date_to',   dateToStr);
      if (search) params.set('search', search);
      let endpoint;
      if (tab === 'clearances') {
        if (filterType !== 'all') params.set('status', filterType);
        endpoint = `/reports/clearances/download?${params.toString()}`;
      } else {
        if (filterInspStatus !== 'all') params.set('insp_status', filterInspStatus);
        if (filterHauler !== 'all')     params.set('hauler', filterHauler);
        endpoint = `/reports/inspections/download?${params.toString()}`;
      }
      const response = await API.get(endpoint, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `${tab}_report_${format(new Date(), 'yyyyMMdd')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch { toast.error('Failed to generate PDF'); }
    finally { setPdfLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6 lg:pb-28">
      <div className="space-y-4 sm:space-y-5">

        {/* Header */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Reports</h1>
          <button onClick={handleExportPDF} disabled={pdfLoading}
            className="inline-flex items-center px-3 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm disabled:opacity-60">
            {pdfLoading
              ? <><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Downloading</>
              : <><Download className="h-4 w-4 mr-1.5" />Download PDF</>}
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex gap-6 min-w-max">
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => changeTab(key)}
                className={`flex items-center pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === key ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </nav>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" /></div>
        ) : (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden text-sm">
                  {['monthly', 'yearly'].map(mode => (
                    <button key={mode} onClick={() => { setFilterMode(mode); setCurrentPage(1); }}
                      className={`px-2.5 sm:px-3 py-1.5 capitalize transition-colors ${filterMode === mode ? 'bg-emerald-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                      {mode === 'monthly' ? 'Month' : 'Year'}
                    </button>
                  ))}
                </div>

                {filterMode === 'monthly' && (
                  <select value={selectedMonth} onChange={e => { setSelectedMonth(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                )}

                <select value={selectedYear} onChange={e => { setSelectedYear(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                {tab === 'clearances' && (
                  <select value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
                    className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                    <option value="all">All Statuses</option>
                    <option value="issued">Issued</option>
                    <option value="pending">Pending</option>
                  </select>
                )}

                {tab === 'inspections' && (
                  <>
                    <select value={filterInspStatus} onChange={e => { setFilterInspStatus(e.target.value); setCurrentPage(1); }}
                      className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                      <option value="all">All Results</option>
                      <option value="passed">Passed</option>
                      <option value="unresolved">With Violation</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <select value={filterHauler} onChange={e => { setFilterHauler(e.target.value); setCurrentPage(1); }}
                      className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                      <option value="all">All Haulers</option>
                      {HAULER_TYPES.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </>
                )}

                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
                  <input type="text" placeholder="Search…" value={search}
                    onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm" />
                  {search && <button onClick={() => setSearch('')} className="absolute right-2 top-2 text-gray-400"><X className="h-4 w-4" /></button>}
                </div>

                <span className="text-xs text-gray-400 font-medium whitespace-nowrap ml-auto">{active.length} record{active.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              {paginated.length === 0 ? (
                <div className="text-center py-16"><p className="text-gray-400 text-sm">No records match your filters</p></div>
              ) : tab === 'clearances' ? (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Control #', 'Business', 'Hauler', 'Last Downloaded', 'Status'].map(col => (
                            <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paginated.map(c => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">{c.control_number}</td>
                            <td className="px-5 py-3"><div className="text-sm font-medium text-gray-900">{c.business_name || '—'}</div><div className="text-xs text-gray-400 font-mono">BIN: {c.bin_number || '—'}</div></td>
                            <td className="px-5 py-3 text-sm text-gray-600">{c.hauler_type || '—'}</td>
                            <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{c.last_printed_at ? fmtDt(c.last_printed_at) : fmtDt(c.printed_at)}</td>
                            <td className="px-5 py-3">
                              {c.is_claimed
                                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700"><CheckCircle className="h-3 w-3" />Issued</span>
                                : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Pending</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden divide-y divide-gray-100">
                    {paginated.map(c => (
                      <div key={c.id} className="p-4 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{c.business_name || '—'}</p>
                            <p className="text-xs font-mono text-gray-500">{c.control_number}</p>
                          </div>
                          {c.is_claimed
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 shrink-0"><CheckCircle className="h-3 w-3" />Issued</span>
                            : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 shrink-0">Pending</span>}
                        </div>
                        <p className="text-xs text-gray-400">{c.hauler_type || '—'} · {c.last_printed_at ? fmtDt(c.last_printed_at) : fmtDt(c.printed_at)}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Business', 'Hauler', 'Inspector', 'Date', 'Result', 'Remarks / Resolution'].map(col => (
                            <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paginated.map(i => {
                          const isUnresolved = i.status === 'WITH VIOLATION' && !i.is_resolved;
                          const isResolved   = i.status === 'WITH VIOLATION' &&  i.is_resolved;
                          return (
                            <tr key={i.id} className={`transition-colors ${isUnresolved ? 'bg-red-50 hover:bg-red-100' : isResolved ? 'hover:bg-blue-50' : 'hover:bg-gray-50'}`}>
                              <td className="px-5 py-3"><div className="text-sm font-medium text-gray-900">{i.establishment_name}</div><div className="text-xs text-gray-400 font-mono">BIN: {i.bin_number || '—'}</div></td>
                              <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{i.hauler_type || '—'}</td>
                              <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{i.inspector || '—'}</td>
                              <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtDt(i.date)}</td>
                              <td className="px-5 py-3 whitespace-nowrap"><InspStatusBadge status={i.status} isResolved={i.is_resolved} /></td>
                              <td className="px-5 py-3 max-w-[280px]">
                                {i.remarks && <p className="text-sm text-gray-700 break-words">{i.remarks}</p>}
                                {isResolved && (
                                  <div className="mt-1.5 pt-1.5 border-t border-blue-100">
                                    <div className="flex items-center gap-1 text-xs text-blue-600">
                                      <ShieldCheck className="h-3 w-3 shrink-0" />
                                      <span>Resolved by <strong>{i.resolved_by || 'Unknown'}</strong> · {fmtDt(i.resolved_at)}</span>
                                    </div>
                                    {i.resolved_remarks && <p className="text-xs text-blue-700 mt-0.5 break-words">{i.resolved_remarks}</p>}
                                  </div>
                                )}
                                {!i.remarks && !isResolved && <span className="text-sm text-gray-400">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden divide-y divide-gray-100">
                    {paginated.map(i => {
                      const isUnresolved = i.status === 'WITH VIOLATION' && !i.is_resolved;
                      return (
                        <div key={i.id} className={`p-4 space-y-2 ${isUnresolved ? 'bg-red-50' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{i.establishment_name}</p>
                              <p className="text-xs text-gray-400">BIN: {i.bin_number || '—'} · {i.hauler_type || '—'}</p>
                            </div>
                            <InspStatusBadge status={i.status} isResolved={i.is_resolved} />
                          </div>
                          <p className="text-xs text-gray-500">{i.inspector || '—'} · {fmtDt(i.date)}</p>
                          {i.remarks && <p className="text-xs text-gray-700 bg-white rounded p-2 border border-gray-100">{i.remarks}</p>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Pagination — desktop only */}
      {!isMobile && !isLoading && totalPages > 1 && (
        <div className="fixed bottom-4 left-64 right-4 z-10">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Page <span className="font-semibold">{currentPage}</span> / <span className="font-semibold">{totalPages}</span>
              <span className="text-gray-400 ml-2">({active.length} records)</span>
            </p>
            <div className="flex gap-2">
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

export default Reports;