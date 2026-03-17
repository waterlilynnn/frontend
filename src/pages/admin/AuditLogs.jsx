import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import API from '../../config/api';
import { 
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const AdminAuditLogs = () => {
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch audit logs from backend
  const { data: logs, isLoading } = useQuery({
    queryKey: ['auditLogs', currentPage],
    queryFn: async () => {
      const response = await API.get(`/audit/logs?page=${currentPage}&per_page=10`);
      return response.data;
    },
  });

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return '—';
    }
  };

  const items = logs?.items || [];
  const totalPages = logs?.total_pages || 1;
  const totalRecords = logs?.total || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-24">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Audit Logs</h1>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-lg shadow-sm">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No audit logs found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDateTime(log.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.user}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {log.action}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {log.entity} #{log.entity_id}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-md">
                            {log.details}
                          </td>
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
                        {totalRecords > 0 && (
                          <span className="text-gray-500 ml-2">
                            ({totalRecords} records)
                          </span>
                        )}
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

export default AdminAuditLogs;