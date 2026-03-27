import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import API from '../../config/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const fmtDt = (d) => { try { return format(new Date(d), 'MMM dd, yyyy · hh:mm a'); } catch { return '—'; } };

const ACTION_META = {
  CREATE:        { label: 'Created Record'       },
  UPDATE:        { label: 'Edited Business Info' },
  DELETE:        { label: 'Deleted Record'       },
  GENERATE:      { label: 'Generated Clearance'  },
  PRINT:         { label: 'Downloaded Clearance' },
  ISSUE:         { label: 'Issued Clearance'     },
  REVOKE:        { label: 'Revoked Clearance'    },
  REISSUE:       { label: 'Re-issued Clearance'  },
  INSPECT:       { label: 'Inspected Business'   },
  RESOLVE:       { label: 'Resolved Violation'   },
  ACTIVATE:      { label: 'Activated Staff'      },
  DEACTIVATE:    { label: 'Deactivated Staff'    },
  RESET_PASSWORD:{ label: 'Reset Password'       },
  BULK_IMPORT:   { label: 'Bulk Import'          },
  EXPORT:        { label: 'Exported Report'      },
};

const getActionMeta = (action) =>
  ACTION_META[action] ?? { label: action };

const parseActivity = (activity) => {
  if (!activity || activity === '—') return { title: activity || '—', sub: null };

  const toggleMatch = activity.match(/^(?:ACTIVATED|DEACTIVATED) staff account:\s*(.+?)(?:\s*\((.+?)\))?$/i);
  if (toggleMatch) {
    return {
      title:   toggleMatch[1]?.trim() || activity,
      sub:     toggleMatch[2]?.trim() || null,
      rawFull: activity,
    };
  }

  const exportMatch = activity.match(/^EXPORTED (.+?) — (\d+ records?)(.*)?$/i);
  if (exportMatch) {
    const reportLabel = exportMatch[1].trim();
    const countText   = exportMatch[2].trim();
    const filterRaw   = exportMatch[3]?.trim() || '';
    const filterClean = filterRaw.replace(/^\[|\]$/g, '').trim();
    return {
      title:   reportLabel,
      sub:     filterClean ? `${countText} · ${filterClean}` : countText,
      rawFull: activity,
    };
  }

  const resolveMatch = activity.match(/^RESOLVED violation for "(.+?)" \(Inspection #(\d+)\)(.*)?$/i);
  if (resolveMatch) {
    const bizName  = resolveMatch[1].trim();
    const remarks  = resolveMatch[3]?.replace(/^\s*·\s*/, '').trim() || null;
    return {
      title:   bizName,
      sub:     remarks || null,
      rawFull: activity,
    };
  }

  const quoted  = activity.match(/"([^"]+)"/);
  const entityName = quoted ? quoted[1] : null;

  const ctrlMatch = activity.match(/EMC-[\d-]+/);
  const controlNo = ctrlMatch ? ctrlMatch[0] : null;

  const colonIdx  = activity.lastIndexOf(':');
  const afterColon = colonIdx > 0 ? activity.slice(colonIdx + 1).trim() : null;

  const parts = [];
  if (controlNo) parts.push(controlNo);
  if (afterColon && afterColon !== entityName && afterColon.length < 80) parts.push(afterColon);

  return {
    title:   entityName || activity,
    sub:     parts.length ? parts.join(' · ') : null,
    rawFull: activity,
  };
};

const AdminAuditLogs = () => {
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', currentPage],
    queryFn: async () => {
      const response = await API.get(`/audit/logs?page=${currentPage}&per_page=15`);
      return response.data;
    },
  });

  const items      = data?.items      || [];
  const totalPages = data?.total_pages || 1;
  const total      = data?.total       || 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-gray-800">Audit Logs</h1>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16">
            <p className="text-gray-400 text-sm">No audit logs found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-44">Timestamp</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-36">User</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-48">Action</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((log) => {
                  const activityUpper = (log.activity || '').toUpperCase();
                  let actionKey = 'CREATE';
                  if      (activityUpper.startsWith('EDITED'))                                      actionKey = 'UPDATE';
                  else if (activityUpper.startsWith('DELETED'))                                     actionKey = 'DELETE';
                  else if (activityUpper.startsWith('GENERATED'))                                   actionKey = 'GENERATE';
                  else if (activityUpper.startsWith('PRINTED'))                                     actionKey = 'PRINT';
                  else if (activityUpper.startsWith('ISSUED'))                                      actionKey = 'ISSUE';
                  else if (activityUpper.startsWith('REVOKED'))                                     actionKey = 'REVOKE';
                  else if (activityUpper.startsWith('RE-ISSUED') || activityUpper.startsWith('REISSUED')) actionKey = 'REISSUE';
                  else if (activityUpper.startsWith('INSPECTED'))                                   actionKey = 'INSPECT';
                  else if (activityUpper.startsWith('RESOLVED'))                                    actionKey = 'RESOLVE';
                  else if (activityUpper.startsWith('DEACTIVATED'))                                 actionKey = 'DEACTIVATE';
                  else if (activityUpper.startsWith('ACTIVATED'))                                   actionKey = 'ACTIVATE';
                  else if (activityUpper.includes('RESET'))                                         actionKey = 'RESET_PASSWORD';
                  else if (activityUpper.includes('BULK'))                                          actionKey = 'BULK_IMPORT';
                  else if (activityUpper.startsWith('EXPORTED'))                                    actionKey = 'EXPORT';
                  else if (activityUpper.startsWith('CREATED'))                                     actionKey = 'CREATE';

                  const { label: actionLabel } = getActionMeta(actionKey);
                  const { title, sub, rawFull } = parseActivity(log.activity);

                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-5 text-xs text-gray-400 whitespace-nowrap align-top">
                        {fmtDt(log.timestamp)}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span className="text-sm font-medium text-gray-700">{log.user || 'System'}</span>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span className="inline-flex py-1 rounded-full text-sm whitespace-nowrap text-gray-600">
                          {actionLabel}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top" title={rawFull}>
                        <p className="text-sm text-gray-900 leading-snug">{title}</p>
                        {sub && (
                          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{sub}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="fixed bottom-4 left-72 right-4 z-10">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
              <span className="text-gray-400 ml-2">({total} entries)</span>
            </p>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;