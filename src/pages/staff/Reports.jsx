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

const StaffReports = () => {
  const [dateRange, setDateRange] = useState({
    start: format(new Date().setMonth(new Date().getMonth() - 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('all');

  // Get all businesses
  const { data: businesses, isLoading } = useQuery({
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

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return '—';
    }
  };

  // Filter businesses based on date and type
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

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredBusinesses.length / itemsPerPage);
  const paginatedBusinesses = filteredBusinesses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = async () => {
    try {
      const headers = [
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
      
      const rows = filteredBusinesses.map(item => [
        formatDate(item.application_date || item.created_at),
        item.establishment_name,
        item.bin_number || '—',
        item.business_line || '—',
        item.owner_name || '—',
        item.hauler_type || '—',
        item.application_type || 'NEW',
        item.control_number || '—',
        item.has_violation ? 'Yes' : 'No'
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `business_report_${format(new Date(), 'yyyyMMdd')}.csv`;
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
                <option value="new">New Applications</option>
                <option value="renewal">Renewals</option>
                <option value="withViolation">With Violations</option>
              </select>
            </div>
          </div>

          {/* summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <p className="text-sm text-gray-500">Total Records</p>
              <p className="text-2xl font-bold text-emerald-700">{filteredBusinesses.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <p className="text-sm text-gray-500">New Applications</p>
              <p className="text-2xl font-bold text-emerald-700">
                {filteredBusinesses.filter(b => b.application_type === 'NEW').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <p className="text-sm text-gray-500">Renewals</p>
              <p className="text-2xl font-bold text-emerald-700">
                {filteredBusinesses.filter(b => b.application_type === 'RENEWAL').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <p className="text-sm text-gray-500">With Violations</p>
              <p className="text-2xl font-bold text-emerald-700">
                {filteredBusinesses.filter(b => b.has_violation).length}
              </p>
            </div>
          </div>

          {/* results table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            {paginatedBusinesses.length === 0 ? (
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Applied</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BIN</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Line</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hauler</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedBusinesses.map((business) => (
                        <tr key={business.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(business.application_date || business.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {business.establishment_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                            {business.bin_number || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {business.business_line || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {business.owner_name || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {business.hauler_type || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {business.application_type || 'NEW'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                            {business.control_number || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {business.has_violation ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Violation
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* pagination */}
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

export default StaffReports;