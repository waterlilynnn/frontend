import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../config/api';
import { CheckCircle2, Circle, ClipboardList, Loader2, FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const HaulerBadge = ({ haulerType }) => {
  if (!haulerType) return null;
  return (
    <span className="inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-600">
      {haulerType}
    </span>
  );
};

const ExemptedNotice = () => (
  <div className="flex items-center gap-2 py-3 px-4 bg-emerald-50 border border-emerald-200 rounded-lg">
    <FileCheck className="h-4 w-4 text-forest-600 shrink-0" />
    <div>
      <p className="text-sm font-medium text-emerald-800">Exempted from Requirements</p>
      <p className="text-xs text-forest-500 mt-0.5">
        This business line does not require document submissions.
      </p>
    </div>
  </div>
);

const RequirementsChecklist = ({ businessId, mode = 'view' }) => {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['requirements', businessId],
    queryFn:  async () => (await API.get(`/requirements/business/${businessId}`)).data,
    enabled:  !!businessId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ submissionId, is_submitted, notes }) =>
      API.patch(`/requirements/business/${businessId}/submission/${submissionId}`, {
        is_submitted,
        notes,
      }),
    onSuccess: () => qc.invalidateQueries(['requirements', businessId]),
    onError:   () => toast.error('Failed to update requirement'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading requirements…
      </div>
    );
  }

  // Exempted business line
  if (data?.is_exempted) {
    return <ExemptedNotice />;
  }

  if (!data || data.total === 0) {
    return (
      <div className="py-4 text-sm text-gray-400 flex items-center gap-2">
        <ClipboardList className="h-4 w-4" />
        No requirements configured for this hauler type.
      </div>
    );
  }

  const { items = [], submitted, total } = data;
  const allDone = submitted === total && total > 0;
  const pct     = total > 0 ? Math.round((submitted / total) * 100) : 0;

  if (mode === 'view') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700 flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4 text-emerald-700" />
            Requirements
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            allDone ? 'bg-forest-100 text-emerald-800' : 'bg-amber-100 text-amber-700'
          }`}>
            {submitted} / {total} submitted
          </span>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${allDone ? 'bg-forest-500' : 'bg-amber-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              {item.is_submitted
                ? <CheckCircle2 className="h-4 w-4 text-forest-500 shrink-0" />
                : <Circle       className="h-4 w-4 text-gray-300 shrink-0"    />}
              <span className={item.is_submitted ? 'text-gray-700' : 'text-gray-400'}>
                {item.label}
                {item.is_required && !item.is_submitted && (
                  <span className="ml-1 text-xs text-red-400">*required</span>
                )}
                <HaulerBadge haulerType={item.hauler_type} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900 flex items-center gap-2 text-sm">
          Requirements Checklist
        </h3>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          allDone ? 'bg-forest-100 text-emerald-800' : 'bg-amber-100 text-amber-700'
        }`}>
          {submitted} / {total}
        </span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${allDone ? 'bg-forest-500' : 'bg-amber-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400">No requirements for this hauler type.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={item.is_submitted}
                  onChange={() =>
                    toggleMutation.mutate({
                      submissionId: item.id,
                      is_submitted: !item.is_submitted,
                      notes: null,
                    })
                  }
                  disabled={toggleMutation.isLoading}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-700
                             focus:ring-forest-500 cursor-pointer"
                />
                <div>
                  <span className={`text-sm transition-colors ${
                    item.is_submitted
                      ? 'text-gray-700 line-through decoration-forest-400'
                      : 'text-gray-600 group-hover:text-gray-800'
                  }`}>
                    {item.label}
                    {item.is_required && <span className="text-red-400 ml-0.5">*</span>}
                  </span>
                  {item.hauler_type && <HaulerBadge haulerType={item.hauler_type} />}
                  {item.notes && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>
                  )}
                </div>
              </label>
            </li>
          ))}
        </ul>
      )}

      {allDone && (
        <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> All requirements submitted
        </p>
      )}
    </div>
  );
};

export default RequirementsChecklist;