import { useEffect, useState } from 'react';
import { Download, X, AlertTriangle } from 'lucide-react';

const PDFViewer = ({ url, onClose, onDownload, clearanceId }) => {
  const [error, setError] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Handle iframe load error
  const handleIframeError = () => {
    setError(true);
  };

  if (error) {
    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-85 z-40" onClick={onClose} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-12">
          <div className="bg-white rounded-lg p-8 max-w-md text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Failed to Load PDF</h3>
            <p className="text-gray-600 mb-4">
              The clearance document could not be loaded. Please try again or check your connection.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Close
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div 
        className="bg-opacity-85 z-40"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-12">
        <div className="relative w-full h-full">
          <iframe
            src={`${url}#toolbar=0&navpanes=0&scrollbar=0&zoom=53.60`}
            className="w-full h-full bg-transparent"
            style={{ backgroundColor: 'transparent' }}
            title="Clearance Document"
            onError={handleIframeError}
          />
          
          <div className="absolute bottom-8 right-8 flex gap-4">
            {onDownload && (
              <button
                onClick={onDownload}
                className="bg-forest-600 hover:bg-forest-700 text-white p-3.5 rounded-full shadow-lg transition-all hover:scale-105"
                title="Download PDF"
              >
                <Download className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white p-3.5 rounded-full shadow-lg transition-all hover:scale-105"
              title="Close (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PDFViewer;