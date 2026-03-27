import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import API from '../../config/api';
import PDFViewer from '../../components/PDFViewer';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminClearanceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasViolation, setHasViolation] = useState(false);
  const [controlNumber, setControlNumber] = useState('');

  const { data: clearanceInfo } = useQuery({
    queryKey: ['clearance', id],
    queryFn: async () => {
      const response = await API.get(`/clearance/${id}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (clearanceInfo) {
      setHasViolation(clearanceInfo.has_violation || false);
    }
  }, [clearanceInfo]);

  useEffect(() => {
    const fetchPDF = async () => {
      try {
        setLoading(true);
        const response = await API.post(`/clearance/view/${id}`, null, {
          responseType: 'blob',
        });
        
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);
        setError(null);
      } catch (err) {
        setError('Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPDF();
    return () => { if (pdfUrl) window.URL.revokeObjectURL(pdfUrl); };
  }, [id]);

  const downloadMutation = useMutation({
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
        if (match && match[1]) filename = match[1].replace(/['"]/g, '');
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
      toast.success('Downloaded!');
    },
    onError: () => toast.error('Download failed'),
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
        <button onClick={() => navigate('/admin/clearance')} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-red-300 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (hasViolation) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <button onClick={() => navigate('/admin/clearance')} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </button>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <p className="text-yellow-700 font-medium">Cannot view clearance</p>
          <p className="text-yellow-600 text-sm mt-2">This business has unresolved violations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      {pdfUrl && (
        <PDFViewer
          url={pdfUrl}
          onClose={() => navigate('/admin/clearance')}
          onDownload={() => downloadMutation.mutate()}
        />
      )}
    </div>
  );
};

export default AdminClearanceView;