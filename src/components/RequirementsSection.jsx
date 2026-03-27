import { useQuery } from '@tanstack/react-query';
import API from '../config/api';
import RequirementsChecklist from './RequirementsChecklist';
import { ClipboardList, X } from 'lucide-react';

// Status Banner 
export const RequirementsStatusBanner = ({ businessId }) => {
  const { data } = useQuery({
    queryKey: ['requirements', businessId],
    queryFn: async () => (await API.get(`/requirements/business/${businessId}`)).data,
    enabled: !!businessId,
  });

  if (!data) return null;

  const { submitted, total, hauler_type } = data;
  const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;
  const allDone = submitted === total && total > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-emerald-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Requirements Status</h3>
          <p className="text-xs text-gray-500 mt-1">
            {submitted} of {total} requirements completed
            {hauler_type && <span className="ml-2 text-gray-400">({hauler_type})</span>}
          </p>
        </div>
        <div className="w-48">
          <div className="flex justify-between text-xs mb-1">
            <span className={allDone ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
              {pct}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-amber-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Requirements Modal
export const RequirementsModal = ({ businessId, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              Requirements Checklist
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Check off each document as it is received.
            </p>
          </div>

          <RequirementsChecklist businessId={businessId} mode="edit" />

          <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};