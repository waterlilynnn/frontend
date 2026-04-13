import { useState, useEffect } from 'react';
import { Download, X, FileText, AlertTriangle, Loader2 } from 'lucide-react';

const PDFViewer = ({ url, title, onClose, onDownload }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const filename = title || (url ? url.split('/').pop() : 'document.pdf');

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (url) {
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
        {/* Simple toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-sm text-gray-300 truncate font-mono">
              {filename}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center bg-gray-800">
          {loading && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
              <p className="text-gray-400">Preparing PDF...</p>
            </>
          )}
          
          {!loading && !error && (
            <>
              <FileText className="h-24 w-24 text-emerald-500" />
              <p className="text-gray-300 text-lg font-medium">PDF Ready</p>
              <p className="text-gray-400 text-sm max-w-xs">
                Tap the button below to view or download the document
              </p>
              <button
                onClick={() => window.open(url, '_blank')}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-base font-medium transition-colors"
              >
                View PDF
              </button>
              <button
                onClick={handleDownload}
                className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-base font-medium transition-colors"
              >
                Download
              </button>
            </>
          )}

          {error && (
            <>
              <AlertTriangle className="h-16 w-16 text-red-400" />
              <p className="text-gray-300 font-medium">Failed to load PDF</p>
              <button
                onClick={handleDownload}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
              >
                Try Downloading
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default PDFViewer;