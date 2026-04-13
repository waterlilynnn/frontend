import { useState, useEffect, useRef } from 'react';
import { Download, X, FileText, AlertTriangle, Loader2, ZoomIn, ZoomOut, Printer } from 'lucide-react';

const PDFViewer = ({ url, title, onClose, onDownload }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(1);
  const iframeRef = useRef(null);
  const filename = title || (url ? url.split('/').pop() : 'document.pdf');

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError(true);
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (url) {
      // For mobile, use window.open as fallback
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Mobile fallback
      setTimeout(() => {
        window.open(url, '_blank');
      }, 100);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow.print();
      } catch (e) {
        // Fallback for mobile
        window.open(url, '_blank');
      }
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2.5));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.6));
  };

  // ESC key handler (desktop only)
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Clean up blob URL
  useEffect(() => {
    return () => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  // Detect mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
        {/* Custom Toolbar - simplified for mobile */}
        <div className="flex items-center justify-between gap-1 px-2 sm:px-4 py-2 sm:py-3 bg-gray-800 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm text-gray-300 truncate max-w-[120px] sm:max-w-md font-mono">
              {filename}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Zoom controls - hide on very small screens */}
            {!isMobile && (
              <>
                <button
                  onClick={zoomOut}
                  className="p-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-300 min-w-[35px] text-center hidden sm:inline">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  className="p-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </>
            )}

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              title="Print"
            >
              <Printer className="h-4 w-4" />
            </button>

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Area */}
        <div className="flex-1 relative bg-gray-800">
          {/* Loading indicator */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-800 z-10">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
              <p className="text-sm text-gray-400">Loading PDF document...</p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-800 z-10 p-4 text-center">
              <AlertTriangle className="h-12 w-12 text-red-400" />
              <p className="text-gray-300 font-medium">Failed to load PDF</p>
              <p className="text-sm text-gray-400">The document could not be loaded on this device.</p>
              <button
                onClick={handleDownload}
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Download PDF Instead
              </button>
            </div>
          )}

          {/* For mobile: Open in new window instead of iframe */}
          {!error && isMobile && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-6 p-6 text-center">
              <FileText className="h-20 w-20 text-emerald-500" />
              <p className="text-gray-300 text-sm">
                PDF document is ready to view
              </p>
              <button
                onClick={() => window.open(url, '_blank')}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-base font-medium transition-colors"
              >
                Open PDF
              </button>
              <button
                onClick={handleDownload}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-base font-medium transition-colors"
              >
                Download PDF
              </button>
              <p className="text-xs text-gray-500 mt-4">
                The PDF will open in your device's default PDF viewer where you can zoom, print, and share.
              </p>
            </div>
          )}

          {/* For desktop: iframe with zoom */}
          {!error && !isMobile && (
            <div 
              className="w-full h-full overflow-auto flex items-center justify-center"
              style={{ 
                transform: `scale(${scale})`, 
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease',
                width: '100%',
                height: '100%'
              }}
            >
              <iframe
                ref={iframeRef}
                src={`${url}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                className="w-full h-full border-0"
                style={{ 
                  width: `${100 / scale}%`, 
                  height: `${100 / scale}%`,
                  minWidth: '100%',
                  minHeight: '100%'
                }}
                title="PDF Viewer"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PDFViewer;