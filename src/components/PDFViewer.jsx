import { useEffect, useState } from 'react';
import { Download, X, AlertTriangle, ExternalLink } from 'lucide-react';

const PDFViewer = ({ url, onClose, onDownload }) => {
  const [error, setError]       = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile
    const mobile =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      window.innerWidth < 768;
    setIsMobile(mobile);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // MOBILE VIEW 
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-black/70 z-40" onClick={onClose} />

        {/* Bottom sheet on mobile */}
        <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

          <div className="px-6 pt-3 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">View Clearance</h3>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              PDF viewing is not available on mobile browsers. You can open it
              in your browser's built-in viewer, or download it directly to your device.
            </p>

            <div className="space-y-3">
              {/* Open in browser tab */}
              
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-700
                           text-white rounded-xl text-sm font-medium hover:bg-emerald-800
                           active:bg-emerald-900 transition-colors"
              <a>
                <ExternalLink className="h-4 w-4" />
                Open in Browser
              </a>

              {onDownload && (
                <button
                  onClick={() => { onDownload(); onClose(); }}
                  className="flex items-center justify-center gap-2 w-full py-3.5
                             border-2 border-emerald-700 text-emerald-700 rounded-xl
                             text-sm font-medium hover:bg-emerald-50 active:bg-emerald-100
                             transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
              )}

              <button
                onClick={onClose}
                className="w-full py-3 border border-gray-200 text-gray-500 rounded-xl
                           text-sm hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ERROR STATE 
  if (error) {
    return (
      <>
        <div className="fixed inset-0 bg-black/85 z-40" onClick={onClose} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center shadow-xl">
            <AlertTriangle className="h-14 w-14 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Cannot Load PDF</h3>
            <p className="text-sm text-gray-500 mb-5">
              The clearance document could not be loaded. Try downloading it instead.
            </p>
            <div className="flex gap-3 justify-center">
              {onDownload && (
                <button
                  onClick={() => { onDownload(); onClose(); }}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm
                             hover:bg-emerald-800 flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />Download
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm
                           text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // DESKTOP IFRAME VIEW 
  return (
    <>
      <div className="fixed inset-0 bg-black/85 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12">
        <div className="relative w-full h-full">
          <iframe
            src={`${url}#toolbar=0&navpanes=0&scrollbar=0&zoom=53.60`}
            className="w-full h-full"
            style={{ backgroundColor: 'transparent' }}
            title="Clearance Document"
            onError={() => setError(true)}
          />

          <div className="absolute bottom-4 sm:bottom-8 right-4 sm:right-8 flex gap-3">
            {onDownload && (
              <button
                onClick={onDownload}
                title="Download PDF"
                className="bg-emerald-700 hover:bg-emerald-800 text-white p-3 sm:p-3.5
                           rounded-full shadow-lg transition-all hover:scale-105"
              >
                <Download className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
            <button
              onClick={onClose}
              title="Close (ESC)"
              className="bg-red-600 hover:bg-red-700 text-white p-3 sm:p-3.5
                         rounded-full shadow-lg transition-all hover:scale-105"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PDFViewer;