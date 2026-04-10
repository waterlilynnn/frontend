import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../config/api';
import { Archive, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminArchiveRecords = () => {
  const qc = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['archivedRecords', currentPage],
    queryFn: async () => {
      const res = await API.get(`/archive/list?page=${currentPage}&per_page=20`);
      return res.data;
    },
  });

  const runArchiveMutation = useMutation({
    mutationFn: async () => {
      const res = await API.post('/archive/run');
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Archived ${data.archived_count} record(s)`);
      qc.invalidateQueries(['archivedRecords']);
      qc.invalidateQueries(['allBizAdminDash']);
    },
    onError: () => toast.error('Archive run failed'),
  });

  const restoreMutation = useMutation({
    mutationFn: async (recordId) => {
      const res = await API.post(`/archive/restore/${recordId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Record restored');
      qc.invalidateQueries(['archivedRecords']);
      qc.invalidateQueries(['allBizAdminDash']);
    },
    onError: () => toast.error('Restore failed'),
  });

  const items = data?.items || [];
  const totalPages = data?.total_pages || 1;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Archived Records</h1>
        <button
          onClick={() => runArchiveMutation.mutate()}
          disabled={runArchiveMutation.isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
        >
          <Archive className="h-4 w-4" />
          {runArchiveMutation.isLoading ? 'Archiving...' : 'Archive'}
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          Archived records are older businesses that have been moved to this section.
          You can restore them if needed.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <Archive className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No archived records found</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Archived On</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{record.establishment_name}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">BIN: {record.bin_number || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {record.owner_last_name && record.owner_first_name 
                        ? `${record.owner_last_name}, ${record.owner_first_name}`
                        : record.owner_name_raw || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {record.created_at ? new Date(record.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {record.updated_at ? new Date(record.updated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => restoreMutation.mutate(record.id)}
                        disabled={restoreMutation.isLoading}
                        className="inline-flex items-center gap-1 px-3 py-1 border border-emerald-600 text-emerald-600 text-xs rounded hover:bg-emerald-50"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminArchiveRecords;