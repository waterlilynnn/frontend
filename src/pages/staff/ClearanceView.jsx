import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import API from '../../config/api';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const StaffClearanceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [controlNumber, setControlNumber] = useState('');

  // fetch pdf for viewing
  useEffect(() => {
    const fetchPDF = async () => {
      try {
        setLoading(true);
        const response = await API.post(`/clearance/view/${id}`, null, {
          responseType: 'blob',
          headers: {
            'Accept': 'application/pdf',
          }
        });
        
        // get control number from headers
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition) {
          const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (match && match[1]) {
            const filename = match[1].replace(/['"]/g, '');
            setControlNumber(filename.replace('EMC_CLEARANCE_', '').replace('.pdf', ''));
          }
        }
        
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url  + "#toolbar=0&view=FitH");
        setError(null);
      } catch (err) {
        console.error('Error fetching PDF:', err);
        setError('Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    fetchPDF();

    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [id]);

  // handle print
  const printMutation = useMutation({
    mutationFn: async () => {
      const response = await API.post(`/clearance/print/${id}`, null, {
        responseType: 'blob'
      });
      return response;
    },
    onSuccess: (response) => {
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'clearance.pdf';
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      } else if (controlNumber) {
        filename = `${controlNumber}.pdf`;
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Clearance downloaded!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to print clearance');
    },
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <button
          onClick={() => navigate('/staff/clearance')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <FileText className="h-16 w-16 text-red-300 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* minimal header */}
      <div className="bg-white border-b border-gray-200 py-2 px-4 flex justify-between items-center">
        <button
          onClick={() => navigate('/staff/clearance')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
        <button
          onClick={() => printMutation.mutate()}
          disabled={printMutation.isLoading}
          className="inline-flex items-center px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm disabled:opacity-50"
        >
          {printMutation.isLoading ? 'Processing...' : 'Download'}
        </button>
      </div>

      {/* pdf viewer */}
      {pdfUrl && (
        <div className='bg-white px-11 flex-1 w-full'>
          <iframe className="flex-1 w-full h-full" src={pdfUrl}>
          </iframe>
        </div>
      )}
    </div>
  );
};

export default StaffClearanceView;