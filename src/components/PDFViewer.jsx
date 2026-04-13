import { useState, useEffect } from 'react';
import { Download, X, FileText, AlertTriangle, Loader2, ZoomIn, ZoomOut, Printer } from 'lucide-react';

const PDFViewer = ({ url, title, onClose, onDownload }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(1);
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
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    const iframe = document.querySelector('.pdf-iframe');
    if (iframe) {
      iframe.contentWindow.print();
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Clean up blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
        {/* Custom Toolbar */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-sm text-gray-300 truncate max-w-[200px] sm:max-w-md font-mono">
              {filename}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom controls */}
            <button
              onClick={zoomOut}
              className="p-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs text-gray-300 min-w-[45px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

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
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
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

        {/* PDF Viewer Area with zoom wrapper */}
        <div className="flex-1 relative bg-gray-800 overflow-auto">
          {/* Loading indicator */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-800 z-10">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
              <p className="text-sm text-gray-400">Loading PDF document...</p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-800 z-10">
              <AlertTriangle className="h-12 w-12 text-red-400" />
              <p className="text-gray-300 font-medium">Failed to load PDF</p>
              <p className="text-sm text-gray-400">The document could not be loaded.</p>
              <button
                onClick={handleDownload}
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Download PDF Instead
              </button>
            </div>
          )}

          {/* Iframe with PDF */}
          <div 
            className="flex items-center justify-center min-h-full"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top center', transition: 'transform 0.2s ease' }}
          >
            <iframe
              src={`${url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              className="pdf-iframe w-full h-screen border-0"
              style={{ width: `${100 / scale}%`, height: `${100 / scale}vh` }}
              title="PDF Viewer"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default PDFViewer;