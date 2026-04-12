import { useEffect, useState, useRef, useCallback } from 'react';
import { Download, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, FileText } from 'lucide-react';

const PDFJS_CDN  = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const injectTextLayerCSS = () => {
  if (document.getElementById('pdfjs-text-layer-style')) return;
  const style = document.createElement('style');
  style.id = 'pdfjs-text-layer-style';
  style.textContent = `
    .pdf-text-layer {
      position: absolute;
      inset: 0;
      overflow: hidden;
      line-height: 1;
      pointer-events: auto;
    }
    .pdf-text-layer span {
      color: transparent;
      position: absolute;
      white-space: pre;
      cursor: text;
      transform-origin: 0% 0%;
    }
    .pdf-text-layer span::selection {
      background: rgba(37, 99, 235, 0.35);
      color: transparent;
    }
    .pdf-text-layer span::-moz-selection {
      background: rgba(37, 99, 235, 0.35);
      color: transparent;
    }
  `;
  document.head.appendChild(style);
};

const loadPdfJs = () =>
  new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const script = document.createElement('script');
    script.src = PDFJS_CDN;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_CDN;
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

/**
 * PDFViewer
 * Props:
 *  url        – blob URL of the PDF
 *  title      – shown in toolbar (e.g. control number or filename)
 *  onClose    – called when viewer is dismissed
 *  onDownload – called when Download button is clicked
 */
const PDFViewer = ({ url, title, onClose, onDownload }) => {
  const [pdfDoc, setPdfDoc]           = useState(null);
  const [numPages, setNumPages]       = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale]             = useState(() => window.innerWidth < 768 ? 0.65 : 1.3);
  const [loading, setLoading]         = useState(true);
  const [rendering, setRendering]     = useState(false);
  const [error, setError]             = useState(false);

  const canvasRef     = useRef(null);
  const textLayerRef  = useRef(null);
  const renderTaskRef = useRef(null);

  // Load PDF.js + open document
  useEffect(() => {
    injectTextLayerCSS();
    let cancelled = false;
    (async () => {
      try {
        const lib = await loadPdfJs();
        const doc = await lib.getDocument(url).promise;
        if (!cancelled) { setPdfDoc(doc); setNumPages(doc.numPages); setLoading(false); }
      } catch {
        if (!cancelled) { setError(true); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  // Render canvas + text layer
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !textLayerRef.current) return;
    if (renderTaskRef.current) { renderTaskRef.current.cancel(); renderTaskRef.current = null; }
    setRendering(true);
    try {
      const page    = await pdfDoc.getPage(currentPage);
      const canvas  = canvasRef.current;
      const textDiv = textLayerRef.current;
      if (!canvas || !textDiv) return;

      const viewport = page.getViewport({ scale });
      canvas.width   = viewport.width;
      canvas.height  = viewport.height;
      textDiv.style.width  = `${viewport.width}px`;
      textDiv.style.height = `${viewport.height}px`;
      textDiv.innerHTML    = '';

      const task = page.render({ canvasContext: canvas.getContext('2d'), viewport });
      renderTaskRef.current = task;
      await task.promise;

      const textContent = await page.getTextContent();
      window.pdfjsLib.renderTextLayer({
        textContentSource: textContent,
        container: textDiv,
        viewport,
        textDivs: [],
      });
    } catch (e) {
      if (e?.name !== 'RenderingCancelledException') console.error(e);
    } finally {
      setRendering(false);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => { renderPage(); }, [renderPage]);

  // ESC key
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const goTo = (p) => setCurrentPage(Math.min(numPages, Math.max(1, p)));
  const zoom = (d) => setScale((s) => Math.min(3, Math.max(0.4, parseFloat((s + d).toFixed(2)))));

  const touchStart = useRef(null);
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (touchStart.current === null || numPages <= 1) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 55) dx < 0 ? goTo(currentPage + 1) : goTo(currentPage - 1);
    touchStart.current = null;
  };

  const multiPage = numPages > 1;

  return (
    <>
      {/* Blurry transparent backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="fixed inset-0 z-50 flex flex-col"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5
                        bg-green-900/80 backdrop-blur-md text-white shrink-0 select-none
                        border-b border-white/10">

          {/* Left: page nav */}
          <div className="flex items-center gap-2 min-w-0">
            {multiPage ? (
              <>
                <button onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors shrink-0">
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <span className="text-xs sm:text-sm font-medium tabular-nums whitespace-nowrap">
                  {loading ? '—' : `${currentPage} / ${numPages}`}
                </span>
                <button onClick={() => goTo(currentPage + 1)} disabled={currentPage >= numPages || loading}
                  className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors shrink-0">
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </>
            ) : (
              /* Single-page: show filename / control number instead */
              title && (
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-gray-200 truncate max-w-[180px] sm:max-w-xs">
                    {title}
                  </span>
                </div>
              )
            )}
          </div>

          {/* Right: zoom + download + close */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button onClick={() => zoom(-0.1)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <ZoomOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <span className="text-xs font-mono text-gray-300 w-10 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={() => zoom(0.1)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {onDownload && (
              <button onClick={onDownload}
                className="flex items-center gap-1.5 ml-1 sm:ml-2 px-3 py-1.5
                           border border-white hover:bg-white/10 text-xs sm:text-sm
                           font-medium rounded-lg transition-colors">
                <span className="hidden sm:inline">Download</span>
              </button>
            )}

            <button onClick={onClose}
              className="p-1.5 ml-1 rounded-lg hover:bg-white/10 transition-colors">
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* PDF canvas area */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-3 sm:p-8">

          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-white">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
              <p className="text-sm text-gray-300">Loading document…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-white px-6 text-center">
              <X className="h-12 w-12 text-red-400" />
              <p className="font-semibold">Failed to load PDF</p>
              <p className="text-sm text-gray-300">Could not render the document. Try downloading instead.</p>
              {onDownload && (
                <button onClick={() => { onDownload(); onClose(); }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium">
                  Download PDF
                </button>
              )}
            </div>
          )}

          {/* Canvas + text layer */}
          <div className={`relative shadow-2xl rounded-sm overflow-hidden ${loading || error ? 'hidden' : ''}`}>
            <canvas ref={canvasRef} className="block" />
            <div ref={textLayerRef} className="pdf-text-layer" />
            {rendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/20 pointer-events-none">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            )}
          </div>
        </div>

        {/* Bottom page bar */}
        {!loading && !error && multiPage && (
          <div className="flex items-center justify-center gap-4 py-2.5
                          bg-gray-900/80 backdrop-blur-md text-white sm:hidden shrink-0
                          border-t border-white/10">
            <button onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm tabular-nums">{currentPage} / {numPages}</span>
            <button onClick={() => goTo(currentPage + 1)} disabled={currentPage >= numPages}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default PDFViewer;