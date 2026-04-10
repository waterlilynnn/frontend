import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../../config/api';
import { ChevronLeft, ChevronRight, Filter, X, Calendar } from 'lucide-react';

const fmtDt = (d) => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return '—'; }
};

const ACTIVITY_CATEGORIES = [
  { value: 'all',        label: 'All Activities',    entity_types: null,                            actions: null },
  { value: 'business',   label: 'Business Records',  entity_types: ['BUSINESS'],                    actions: null },
  { value: 'clearance',  label: 'Clearances',        entity_types: ['CLEARANCE'],                   actions: null },
  { value: 'report',     label: 'Reports',           entity_types: ['REPORT'],                      actions: null },
  { value: 'archive',    label: 'Archive',           entity_types: ['BUSINESS_RECORD', 'SYSTEM'],   actions: ['ARCHIVE', 'UNARCHIVE', 'MANUAL_ARCHIVE'] },
  { value: 'user',       label: 'User Management',   entity_types: ['USER', 'ADMIN_ACCOUNT'],        actions: null },
  { value: 'settings',   label: 'Settings',          entity_types: ['SETTING', 'REQUIREMENT_TEMPLATE'], actions: null },
  { value: 'login',      label: 'Login / Logout',    entity_types: null,                            actions: ['LOGIN', 'LOGOUT'] },
];

const matchesCategory = (log, categoryValue) => {
  if (categoryValue === 'all') return true;
  const cat = ACTIVITY_CATEGORIES.find((c) => c.value === categoryValue);
  if (!cat) return true;
  const hasEntityFilter = cat.entity_types && cat.entity_types.length > 0;
  const hasActionFilter = cat.actions && cat.actions.length > 0;
  if (hasEntityFilter && hasActionFilter) return cat.entity_types.includes(log.entity_type) && cat.actions.includes(log.action);
  if (hasEntityFilter) return cat.entity_types.includes(log.entity_type);
  if (hasActionFilter) return cat.actions.includes(log.action);
  return true;
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const PER_PAGE = 10;

const AdminAuditLogs = () => {
  const [currentPage, setCurrentPage]           = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [dateRangeType, setDateRangeType]       = useState('all');
  const [selectedMonth, setSelectedMonth]       = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear]         = useState(new Date().getFullYear());
  const [showDateFilter, setShowDateFilter]     = useState(false);

  const dateParams = useMemo(() => {
    if (dateRangeType === 'month') {
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate   = new Date(selectedYear, selectedMonth + 1, 0);
      return { date_from: startDate.toISOString().split('T')[0], date_to: endDate.toISOString().split('T')[0] };
    }
    if (dateRangeType === 'year') return { date_from: `${selectedYear}-01-01`, date_to: `${selectedYear}-12-31` };
    return {};
  }, [dateRangeType, selectedMonth, selectedYear]);

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', dateRangeType, selectedMonth, selectedYear],
    queryFn: async () => {
      const params = new URLSearchParams({ page: 1, per_page: 500 });
      if (dateParams.date_from) params.set('date_from', dateParams.date_from);
      if (dateParams.date_to)   params.set('date_to',   dateParams.date_to);
      const response = await API.get(`/audit/logs?${params.toString()}`);
      return response.data;
    },
  });

  const allItems = data?.items || [];
  const filteredItems = useMemo(() => allItems.filter((log) => matchesCategory(log, selectedCategory)), [allItems, selectedCategory]);
  const totalFiltered = filteredItems.length;
  const totalPages    = Math.max(1, Math.ceil(totalFiltered / PER_PAGE));
  const pageItems     = filteredItems.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const activeCategory = ACTIVITY_CATEGORIES.find((c) => c.value === selectedCategory) || ACTIVITY_CATEGORIES[0];

  const clearCategoryFilter = () => { setSelectedCategory('all'); setCurrentPage(1); setShowCategoryDropdown(false); };
  const applyCategoryFilter = (value) => { setSelectedCategory(value); setCurrentPage(1); setShowCategoryDropdown(false); };

  const getDateRangeLabel = () => {
    if (dateRangeType === 'month') return `${MONTHS[selectedMonth]} ${selectedYear}`;
    if (dateRangeType === 'year')  return `Year ${selectedYear}`;
    return 'All Time';
  };

  const clearDateFilter = () => { setDateRangeType('all'); setCurrentPage(1); setShowDateFilter(false); };
  const hasActiveFilters = selectedCategory !== 'all' || dateRangeType !== 'all';

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="space-y-4 sm:space-y-5">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Activity Logs</h1>
          <div className="flex gap-2">

            {/* Date filter */}
            <div className="relative">
              <button
                onClick={() => { setShowDateFilter(!showDateFilter); if (showCategoryDropdown) setShowCategoryDropdown(false); }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${dateRangeType !== 'all' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">{getDateRangeLabel()}</span>
                {dateRangeType !== 'all' && (
                  <span onClick={(e) => { e.stopPropagation(); clearDateFilter(); }} className="ml-0.5 p-0.5 hover:bg-white/20 rounded cursor-pointer">
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>

              {showDateFilter && (
                <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4">
                    <button onClick={() => { setDateRangeType('all'); setCurrentPage(1); setShowDateFilter(false); }}
                      className={`w-full text-center py-2 rounded-lg text-sm font-medium mb-4 ${dateRangeType === 'all' ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      ALL TIME
                    </button>
                    <div className="border-t border-gray-200 my-3" />
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={() => setSelectedYear((y) => y - 1)} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="h-4 w-4 text-gray-600" /></button>
                      <span className="text-sm font-semibold text-gray-700">{selectedYear}</span>
                      <button onClick={() => setSelectedYear((y) => y + 1)} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="h-4 w-4 text-gray-600" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {MONTHS.map((month, idx) => (
                        <button key={idx} onClick={() => { setSelectedMonth(idx); setDateRangeType('month'); setCurrentPage(1); setShowDateFilter(false); }}
                          className={`text-center px-2 py-1.5 rounded-lg text-sm transition-colors ${dateRangeType === 'month' && selectedMonth === idx ? 'bg-emerald-700 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                          {month.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Category filter */}
            <div className="relative">
              <button
                onClick={() => { setShowCategoryDropdown(!showCategoryDropdown); if (showDateFilter) setShowDateFilter(false); }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${selectedCategory !== 'all' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">{activeCategory.label}</span>
                {selectedCategory !== 'all' && (
                  <span onClick={(e) => { e.stopPropagation(); clearCategoryFilter(); }} className="ml-0.5 p-0.5 hover:bg-white/20 rounded cursor-pointer">
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>

              {showCategoryDropdown && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase">Filter by Activity</p>
                  </div>
                  {ACTIVITY_CATEGORIES.map((category) => (
                    <button key={category.value} onClick={() => applyCategoryFilter(category.value)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${selectedCategory === category.value ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'}`}>
                      <span>{category.label}</span>
                      {selectedCategory === category.value && <span className="text-emerald-600 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                {activeCategory.label}<button onClick={clearCategoryFilter} className="ml-1 hover:text-emerald-900">×</button>
              </span>
            )}
            {dateRangeType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {getDateRangeLabel()}<button onClick={clearDateFilter} className="ml-1 hover:text-blue-900">×</button>
              </span>
            )}
          </div>
        )}

        {/* Table / Cards */}
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" /></div>
        ) : pageItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16">
            <p className="text-gray-400 text-sm">No activity logs found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['DATE / TIME', 'USER NAME', 'USER ROLE', 'ACTIVITIES'].map(col => (
                      <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pageItems.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap align-top">{fmtDt(log.timestamp)}</td>
                      <td className="px-5 py-4 align-top"><span className="text-sm text-gray-800">{log.user_name || 'System'}</span></td>
                      <td className="px-5 py-4 align-top"><span className="text-sm text-gray-600">{log.user_role || '—'}</span></td>
                      <td className="px-5 py-4 align-top"><p className="text-sm text-gray-700 leading-snug">{log.activity}</p></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-100">
              {pageItems.map((log) => (
                <div key={log.id} className="p-4 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800">{log.user_name || 'System'}</span>
                    <span className="text-xs text-gray-400 shrink-0">{fmtDt(log.timestamp)}</span>
                  </div>
                  <p className="text-xs text-gray-500">{log.user_role || '—'}</p>
                  <p className="text-sm text-gray-700 leading-snug">{log.activity}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="fixed bottom-4 left-0 right-4 lg:left-64 z-10 px-4 lg:px-0">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between">
            <p className="text-xs sm:text-sm text-gray-600">
              Page <span className="font-semibold">{currentPage}</span> / <span className="font-semibold">{totalPages}</span>
              <span className="hidden sm:inline text-gray-400 ml-2">({totalFiltered} entries)</span>
            </p>
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

export default AdminAuditLogs;