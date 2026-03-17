import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import API from '../../config/api';
import { 
  FileText, 
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const AdminReports = () => {
  const [dateRange, setDateRange] = useState({
    start: format(new Date().setMonth(new Date().getMonth() - 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('businesses');

  // Get all businesses
  const { data: businesses, isLoading: businessesLoading } = useQuery({
    queryKey: ['allBusinesses'],
    queryFn: async () => {
      try {
        const response = await API.get('/business-records/all');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching businesses:', error);
        return [];
      }
    },
  });

  // Get all clearances
  const { data: clearances, isLoading: clearancesLoading } = useQuery({
    queryKey: ['allClearances'],
    queryFn: async () => {
      try {
        const response = await API.get('/clearance/history/all');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching clearances:', error);
        return [];
      }
    },
  });

  const isLoading = businessesLoading || clearancesLoading;

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

  // Filter businesses
  const filteredBusinesses = businesses?.filter(business => {
    const businessDate = business.application_date || business.created_at;
    if (businessDate) {
      const date = new Date(businessDate);
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59);
      if (date < start || date > end) return false;
    }

    if (filterType === 'new' && business.application_type !== 'NEW') return false;
    if (filterType === 'renewal' && business.application_type !== 'RENEWAL') return false;
    if (filterType === 'withViolation' && !business.has_violation) return false;

    return true;
  }) || [];

  // Filter clearances
  const filteredClearances = clearances?.filter(clearance => {
    if (clearance.printed_at) {
      const date = new Date(clearance.printed_at);
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59);
      if (date < start || date > end) return false;
    }

    if (filterType === 'issued' && !clearance.is_claimed) return false;
    if (filterType === 'pending' && clearance.is_claimed) return false;

    return true;
  }) || [];

  // Pagination
  const itemsPerPage = 10;
  const currentItems = activeTab === 'businesses' ? filteredBusinesses : filteredClearances;
  const totalPages = Math.ceil(currentItems.length / itemsPerPage);
  const paginatedItems = currentItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats?
  const totalBusinesses = businesses?.length || 0;
  const newApplications = businesses?.filter(b => b.application_type === 'NEW').length || 0;
  const renewals = businesses?.filter(b => b.application_type === 'RENEWAL').length || 0;
  const withViolations = businesses?.filter(b => b.has_violation).length || 0;
  
  const totalClearances = clearances?.length || 0;
  const issuedClearances = clearances?.filter(c => c.is_claimed).length || 0;
  const pendingClearances = totalClearances - issuedClearances;

  const handleExport = async () => {
    try {
      let headers = [];
      let data = [];
      
      if (activeTab === 'businesses') {
        headers = [
          'Date Applied',
          'Business Name',
          'BIN Number',
          'Business Line',
          'Owner',
          'Hauler Type',
          'Application Type',
          'Control Number',
          'Has Violation'
        ];
        data = filteredBusinesses;
      } else {
        headers = [
          'Control Number',
          'Business Name',
          'Clearance Color',
          'Printed By',
          'Printed At',
          'Last Printed By',
          'Last Printed At',
          'Print Count',
          'Status'
        ];
        data = filteredClearances;
      }
      
      const rows = data.map(item => {
        if (activeTab === 'businesses') {
          return [
            formatDate(item.application_date || item.created_at),
            item.establishment_name,
            item.bin_number || '—',
            item.business_line || '—',
            item.owner_name || '—',
            item.hauler_type || '—',
            item.application_type || 'NEW',
            item.control_number || '—',
            item.has_violation ? 'Yes' : 'No'
          ];
        } else {
          return [
            item.control_number,
            item.business_name,
            item.clearance_color,
            item.printed_by || '—',
            formatDateTime(item.printed_at),
            item.last_printed_by || '—',
            formatDateTime(item.last_printed_at),
            item.print_count || 0,
            item.is_claimed ? 'Issued' : 'Pending'
          ];
        }
      });
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}_report_${format(new Date(), 'yyyyMMdd')}.csv`;
      a.click();
      
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-24">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => {
                  setActiveTab('businesses');
                  setCurrentPage(1);
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'businesses'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Businesses
              </button>
              <button
                onClick={() => {
                  setActiveTab('clearances');
                  setCurrentPage(1);
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'clearances'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Clearances
              </button>
            </nav>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Records</option>
                {activeTab === 'businesses' && (
                  <>
                    <option value="new">New Applications</option>
                    <option value="renewal">Renewals</option>
                    <option value="withViolation">With Violations</option>
                  </>
                )}
                {activeTab === 'clearances' && (
                  <>
                    <option value="issued">Issued</option>
                    <option value="pending">Pending</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {activeTab === 'businesses' ? (
              <>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                  <p className="text-sm text-gray-500">Total Businesses</p>
                  <p className="text-2xl font-bold text-emerald-700">{totalBusinesses}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                  <p className="text-sm text-gray-500">New</p>
                  <p className="text-2xl font-bold text-emerald-700">{newApplications}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                  <p className="text-sm text-gray-500">Renewals</p>
                  <p className="text-2xl font-bold text-emerald-700">{renewals}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                  <p className="text-sm text-gray-500">Violations</p>
                  <p className="text-2xl font-bold text-emerald-700">{withViolations}</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                  <p className="text-sm text-gray-500">Total Clearances</p>
                  <p className="text-2xl font-bold text-emerald-700">{totalClearances}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                  <p className="text-sm text-gray-500">Issued</p>
                  <p className="text-2xl font-bold text-emerald-700">{issuedClearances}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-emerald-700">{pendingClearances}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                  <p className="text-sm text-gray-500">Total Prints</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {clearances?.reduce((sum, c) => sum + (c.print_count || 0), 0) || 0}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            {paginatedItems.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No records found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {activeTab === 'businesses' ? (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Applied</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BIN</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Line</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hauler</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control #</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </>
                        ) : (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control #</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Printed By</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Printed At</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prints</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          {activeTab === 'businesses' ? (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {formatDate(item.application_date || item.created_at)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {item.establishment_name}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                                {item.bin_number || '—'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {item.business_line || '—'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {item.owner_name || '—'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {item.hauler_type || '—'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {item.application_type || 'NEW'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                                {item.control_number || '—'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {item.has_violation ? (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Violation
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Active
                                  </span>
                                )}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                                {item.control_number}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {item.business_name}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {item.clearance_color}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {item.printed_by || '—'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {formatDateTime(item.printed_at)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                                {item.print_count}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {item.is_claimed ? (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Issued
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Pending
                                  </span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="border-t border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className={`px-4 py-2 rounded-lg ${
                            currentPage === 1
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className={`px-4 py-2 rounded-lg ${
                            currentPage === totalPages
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;