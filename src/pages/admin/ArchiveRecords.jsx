import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../config/api';
import { Archive, RotateCcw, AlertTriangle, FileText, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminArchiveRecords = () => {
  const qc = useQueryClient();
  const [confirmYear, setConfirmYear] = useState(null);
  const [action, setAction] = useState(null);

  const { data: years = [], isLoading, refetch } = useQuery({
    queryKey: ['archiveYears'],
    queryFn: async () => (await API.get('/admin/settings/archive/years')).data,
  });

  const archiveMutation = useMutation({
    mutationFn: (year) => API.post(`/admin/settings/archive/${year}`),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setConfirmYear(null);
      refetch();
      qc.invalidateQueries(['allClrAdminDash']);
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Archive failed'),
  });

  const unarchiveMutation = useMutation({
    mutationFn: (year) => API.post(`/admin/settings/unarchive/${year}`),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setConfirmYear(null);
      refetch();
      qc.invalidateQueries(['allClrAdminDash']);
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Restore failed'),
  });

  // Get current sticker year for info
  const { data: stickerInfo } = useQuery({
    queryKey: ['stickerYear'],
    queryFn: async () => (await API.get('/admin/settings/sticker-year')).data,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-b-2 border-emerald-700 rounded-full" />
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Archive Clearances</h1>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800 mb-1">About Clearance Archiving</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              This section archives <strong>clearances only</strong> — business records remain active and editable.
              Archived clearances are hidden from the main clearance list but can be restored at any time.
            </p>
          </div>
        </div>
      </div>

      {/* Sticker Year Info */}
      {stickerInfo && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-800 mb-1">Sticker Year Logic</p>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Current month: <strong>{new Date(2024, currentMonth - 1).toLocaleString('default', { month: 'long' })}</strong>.
                Cutoff month: <strong>November</strong>.
                Current sticker year: <strong className="text-lg">{stickerInfo.sticker_year}</strong>
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                {currentMonth >= 11 
                  ? `Since it's November or later, clearances generated now will show sticker year ${stickerInfo.sticker_year} (next year).`
                  : `Clearances generated now will show sticker year ${stickerInfo.sticker_year} (current year).`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Important Note */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Important</p>
            <p className="text-xs leading-relaxed">
              Archiving clearances does NOT delete or archive business records. 
              Businesses remain fully accessible and can still be inspected or renewed.
              Only the clearances from the selected year will be hidden.
            </p>
          </div>
        </div>
      </div>

      {years.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Archive className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No clearances found</p>
          <p className="text-xs text-gray-400 mt-1">Clearances will appear here once generated</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Year</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Clearances</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {years.map(item => (
                <tr key={item.year} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-semibold text-gray-800 text-lg">{item.year}</span>
                    {item.year === currentYear && (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Current</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-600">{item.clearance_count.toLocaleString()} clearance(s)</span>
                  </td>
                  <td className="px-5 py-4">
                    {item.already_archived ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        <Archive className="h-3 w-3" />
                        Archived
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {item.already_archived ? (
                      <button
                        onClick={() => { setConfirmYear(item.year); setAction('unarchive'); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-emerald-700 text-emerald-700 text-xs rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore Clearances
                      </button>
                    ) : (
                      <button
                        onClick={() => { setConfirmYear(item.year); setAction('archive'); }}
                        disabled={item.year === currentYear}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          item.year === currentYear
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'border border-amber-600 text-amber-600 hover:bg-amber-50'
                        }`}
                        title={item.year === currentYear ? "Cannot archive current year clearances" : ""}
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Archive Clearances
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmYear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {action === 'archive' ? (
                  <Archive className="h-6 w-6 text-amber-600" />
                ) : (
                  <RotateCcw className="h-6 w-6 text-emerald-600" />
                )}
                <h3 className="text-lg font-bold text-gray-900">
                  {action === 'archive' ? `Archive ${confirmYear} Clearances?` : `Restore ${confirmYear} Clearances?`}
                </h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                {action === 'archive' 
                  ? `All clearances from ${confirmYear} will be hidden from the main list.`
                  : `All archived clearances from ${confirmYear} will be restored and visible again.`}
              </p>
              
              <p className="text-xs text-gray-400 mb-6">
                <strong>Note:</strong> Business records will remain active and unaffected.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmYear(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => action === 'archive' 
                    ? archiveMutation.mutate(confirmYear) 
                    : unarchiveMutation.mutate(confirmYear)
                  }
                  disabled={archiveMutation.isLoading || unarchiveMutation.isLoading}
                  className={`px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50 flex items-center gap-2 transition-colors ${
                    action === 'archive' 
                      ? 'bg-amber-600 hover:bg-amber-700' 
                      : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  {(archiveMutation.isLoading || unarchiveMutation.isLoading) && (
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {action === 'archive' ? 'Archive Clearances' : 'Restore Clearances'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminArchiveRecords;