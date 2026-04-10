import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import API from '../config/api';
import { ArrowLeft, Download, AlertTriangle, FileText, Loader2 } from 'lucide-react';

const ClearanceView = ({ rolePrefix = 'staff' }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pdfObjectUrl, setPdfObjectUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState(null);
  const [controlNumber, setControlNumber] = useState('');

  //  Fetch clearance metadata (for violation check) 

  const { data: clearanceInfo } = useQuery({
    queryKey: ['clearance', id],
    queryFn: async () => {
      const res = await API.get(`/clearance/${id}`);
      return res.data;
    },
  });

  const hasViolation = clearanceInfo?.has_violation || false;

  //  Fetch PDF blob on mount 

  useEffect(() => {
    if (!id) return;

    let objectUrl = null;

    const fetchPdf = async () => {
      try {
        setPdfLoading(true);
        setPdfError(null);

        const response = await API.post(`/clearance/view/${id}`, null, {
          responseType: 'blob',
          headers: { Accept: 'application/pdf' },
        });

        const contentType = response.headers['content-type'] || '';
        if (!contentType.includes('application/pdf')) {
          throw new Error('Server did not return a PDF');
        }

        // Extract control number from Content-Disposition header if present
        const disposition = response.headers['content-disposition'] || '';
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match?.[1]) {
          setControlNumber(
            match[1].replace(/['"]/g, '').replace('EMC_CLEARANCE_', '').replace('.pdf', '')
          );
        }

        objectUrl = URL.createObjectURL(
          new Blob([response.data], { type: 'application/pdf' })
        );
        // Append #toolbar=0 to hide the browser PDF toolbar (download/print buttons)
        setPdfObjectUrl(objectUrl + '#toolbar=0&navpanes=0&view=FitH');
      } catch (err) {
        console.error('PDF load error:', err);
        setPdfError('Failed to load the clearance PDF. Please try again.');
      } finally {
        setPdfLoading(false);
      }
    };

    fetchPdf();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  //  Download (print endpoint — increments print count) 

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const response = await API.post(`/clearance/print/${id}`, null, {
        responseType: 'blob',
      });
      return response;
    },
    onSuccess: (response) => {
      const disposition = response.headers['content-disposition'] || '';
      let filename = 'clearance.pdf';
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match?.[1]) {
        filename = match[1].replace(/['"]/g, '');
      } else if (controlNumber) {
        filename = `EMC_CLEARANCE_${controlNumber}.pdf`;
      }

      const url = URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' })
      );
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.setAttribute('download', filename);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast.success('Clearance downloaded');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to download clearance');
    },
  });

  //  Loading state 

  if (pdfLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 text-gray-400">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-700" />
        <p className="text-sm">Loading clearance…</p>
      </div>
    );
  }

  //  Error state 

  if (pdfError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => navigate(`/${rolePrefix}/clearance`)}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <FileText className="h-14 w-14 text-red-300 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{pdfError}</p>
          <p className="text-sm text-gray-500 mt-2">
            Try generating the clearance again from the Clearance Management page.
          </p>
        </div>
      </div>
    );
  }

  //  Main render 

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shrink-0">
        <button
          onClick={() => navigate(`/${rolePrefix}/clearance`)}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {hasViolation ? (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Download disabled — business has an active violation
          </div>
        ) : (
          <button
            onClick={() => downloadMutation.mutate()}
            disabled={downloadMutation.isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white
                       rounded-lg text-sm hover:bg-emerald-800 disabled:opacity-50 transition-colors"
          >
            {downloadMutation.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloadMutation.isLoading ? 'Downloading…' : 'Download'}
          </button>
        )}
      </div>

      {/* Inline PDF viewer — fills remaining viewport height */}
      <div className="flex-1 bg-gray-200 overflow-hidden">
        {pdfObjectUrl && (
          <iframe
            src={pdfObjectUrl}
            title="EMC Clearance"
            className="w-full h-full border-0"
            allow="fullscreen"
          />
        )}
      </div>
    </div>
  );
};

export default ClearanceView;