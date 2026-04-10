import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const ImportProgress = ({ stats }) => {
  if (!stats) return null;

  const progress = stats.total > 0 
    ? Math.round((stats.success / stats.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Import Progress</span>
          <span className="text-gray-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-emerald-700 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Success</p>
              <p className="text-2xl font-bold text-green-700">{stats.success}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Failed</p>
              <p className="text-2xl font-bold text-red-700">{stats.failed}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">New/Renewals</p>
              <p className="text-2xl font-bold text-blue-700">
                {stats.new || 0}/{stats.renewals || 0}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Errors List */}
      {stats.errors?.length > 0 && (
        <div className="bg-red-50 rounded-lg p-4">
          <h3 className="font-medium text-red-800 mb-3">Errors ({stats.errors.length})</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {stats.errors.map((err, idx) => (
              <div key={idx} className="text-sm bg-white rounded p-2">
                <span className="font-medium text-red-600">Row {err.row}:</span>{' '}
                <span className="text-gray-600">{err.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportProgress;