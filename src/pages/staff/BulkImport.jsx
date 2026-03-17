import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../config/api';
import FileUploader from '../../components/BulkImport/FileUploader';
import ImportProgress from '../../components/BulkImport/ImportProgress';
import { ArrowLeft, Download, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const StaffBulkImport = () => {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setImportResult(null);

    try {
      const response = await API.post('/bulk/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setImportResult(response.data.stats);
      
      if (response.data.stats.failed === 0) {
        toast.success(response.data.message);
      } else {
        toast.warning(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    navigate('/staff/business');
  };

  const downloadTemplate = () => {
    const headers = [
      'Column 1',
      'BIN',
      'NAME OF ESTABLISHMENT',
      'BUSINESS LINE',
      'BUSINESS OWNER',
      'LOCATION',
      'TYPE',
      'HAULER',
      'DATE ISSUED',
      'VALIDITY',
      'EMC-ID'
    ].join(',');

    // sample row
    const sampleRow = [
      '1/5/2026 9:51:03',
      '123-456-789',
      'Maria\'s Sari-sari Store',
      'Sari-sari Store',
      'SANTOS, MARIA CRUZ',
      'ASISAN',
      'NEW',
      'Barangay',
      '1/20/2026',
      '12/31/2026',
      'EMC-2026-01-0001'
    ].join(',');

    const csvContent = [headers, sampleRow].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'emc_import_template.csv';
    a.click();
  };

  return (
    <div className="max-w-4xxl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/staff/business')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Business Records
        </button>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Test Upload</h1>
      </div>

      {/* Uploader */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <FileUploader
          onFileSelect={handleFileUpload}
          onCancel={handleCancel}
          isLoading={isUploading}
        />
      </div>

      {/* Progress/Results */}
      {importResult && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <ImportProgress stats={importResult} />
        </div>
      )}
    </div>
  );
};

export default StaffBulkImport;