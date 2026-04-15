import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../config/api';
import { CheckCircle2, Circle, ClipboardList, Loader2, FileCheck, Lock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const HaulerBadge = ({ haulerType }) => {
  if (!haulerType) return null;
  return (
    <span className="inline-flex items-center ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-600">
      {haulerType}
    </span>
  );
};

const ExemptedNotice = () => (
  <div className="flex items-center gap-3 py-3 px-4 bg-emerald-50 border border-emerald-200 rounded-lg">
    <FileCheck className="h-5 w-5 text-forest-600 shrink-0" />
    <div>
      <p className="text-sm font-semibold text-emerald-800">Exempted from Requirements</p>
      <p className="text-xs text-forest-500 mt-0.5">This business line does not require document submissions.</p>
    </div>
  </div>
);

const RequirementsChecklist = ({ businessId, mode = 'view' }) => {
  const qc = useQueryClient();
  const [pendingConfirm, setPendingConfirm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['requirements', businessId],
    queryFn: async () => (await API.get(`/requirements/business/${businessId}`)).data,
    enabled: !!businessId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ submissionId, is_submitted, notes }) =>
      API.patch(`/requirements/business/${businessId}/submission/${submissionId}`, { is_submitted, notes }),
    onSuccess: () => {
      qc.invalidateQueries(['requirements', businessId]);
      toast.success('Requirement status updated');
      setPendingConfirm(null);
    },
    onError: () => toast.error('Failed to update requirement'),
  });

  const handleToggle = (item) => {
    setPendingConfirm(item);
  };

  const confirmToggle = () => {
    if (pendingConfirm) {
      toggleMutation.mutate({ 
        submissionId: pendingConfirm.id, 
        is_submitted: !pendingConfirm.is_submitted, 
        notes: null 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-gray-400 text-sm justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading requirements…
      </div>
    );
  }

  if (data?.is_exempted) return <ExemptedNotice />;

  if (!data || data.total === 0) {
    return (
      <div className="py-6 text-sm text-gray-400 flex items-center justify-center gap-2">
        <AlertCircle className="h-4 w-4" />
        No requirements configured for this hauler type.
      </div>
    );
  }

  const { items = [], submitted, total } = data;
  const allDone = submitted === total && total > 0;
  const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;

  // Group items by hauler_type
  const globalItems = items.filter(i => !i.hauler_type);
  const specificItems = items.filter(i => i.hauler_type);
  const haulerType = data.hauler_type;

  /* VIEW mode - display only, NO editing, NO Undo buttons */
  if (mode === 'view') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-emerald-700" />
            <span className="font-medium text-gray-700">Completeness</span>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${allDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-700'}`}>
            {submitted} / {total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
        </div>

        {/* Requirements list - display only, NO Undo buttons */}
        <div className="space-y-3">
          {/* Global requirements first */}
          {globalItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">General Requirements</p>
              <ul className="space-y-2">
                {globalItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-sm">
                    {item.is_submitted
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      : <Circle className="h-4 w-4 text-gray-300 shrink-0" />}
                    <span className={item.is_submitted ? 'text-gray-700' : 'text-gray-500'}>
                      {item.label}
                      {item.is_required && !item.is_submitted && <span className="ml-1 text-xs text-red-400">*</span>}
                    </span>
                    <HaulerBadge haulerType={item.hauler_type} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Hauler-specific requirements */}
          {specificItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Requirements for {haulerType}
              </p>
              <ul className="space-y-2">
                {specificItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-sm">
                    {item.is_submitted
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      : <Circle className="h-4 w-4 text-gray-300 shrink-0" />}
                    <span className={item.is_submitted ? 'text-gray-700' : 'text-gray-500'}>
                      {item.label}
                      {item.is_required && !item.is_submitted && <span className="ml-1 text-xs text-red-400">*</span>}
                    </span>
                    <HaulerBadge haulerType={item.hauler_type} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {allDone && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium pt-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            All requirements completed
          </div>
        )}
      </div>
    );
  }

  /* EDIT mode - with confirmation modal and Undo buttons */
  const pendingItems = items.filter(i => !i.is_submitted);
  const completedItems = items.filter(i => i.is_submitted);

  return (
    <>
      {/* Confirmation Modal */}
      {pendingConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              <h3 className="text-lg font-bold text-gray-900">
                {pendingConfirm.is_submitted ? 'Unsubmit Requirement' : 'Confirm Submission'}
              </h3>
            </div>
            <p className="text-gray-600 mb-2">
              {pendingConfirm.is_submitted 
                ? `Are you sure you want to mark "${pendingConfirm.label}" as NOT submitted?`
                : `Are you sure you want to mark "${pendingConfirm.label}" as submitted?`}
            </p>
            <p className="text-xs text-gray-400 mb-6">
              {pendingConfirm.is_submitted
                ? 'This will remove it from the completed list.'
                : 'This action can be reversed if needed.'}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setPendingConfirm(null)} 
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmToggle} 
                disabled={toggleMutation.isLoading}
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50"
              >
                {toggleMutation.isLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-base">Completeness</h3>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${allDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-700'}`}>
            {submitted} / {total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
        </div>

        {/* Completed items - with Undo button ONLY in edit mode */}
        {completedItems.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
            <ul className="space-y-2">
              {completedItems.map(item => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-gray-700 flex-1">{item.label}</span>
                  <HaulerBadge haulerType={item.hauler_type} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pending items */}
        {pendingItems.length > 0 && (
          <div>
            <ul className="space-y-2">
              {pendingItems.map(item => (
                <li key={item.id}>
                  <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => handleToggle(item)}
                      disabled={toggleMutation.isLoading}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-gray-600 group-hover:text-gray-800">
                        {item.label}
                        {item.is_required && <span className="text-red-400 ml-0.5">*</span>}
                      </span>
                      <HaulerBadge haulerType={item.hauler_type} />
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {allDone && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium pt-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            All requirements completed
          </div>
        )}
      </div>
    </>
  );
};

export default RequirementsChecklist;