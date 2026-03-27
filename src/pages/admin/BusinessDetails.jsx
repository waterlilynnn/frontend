import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import API from '../../config/api';
import SearchableSelect from '../../components/SearchableSelect';
import { RequirementsStatusBanner, RequirementsModal } from '../../components/RequirementsSection';
import { 
  ArrowLeft, User, MapPin, Edit, Save, X, AlertTriangle,
  Calendar, Building2, Hash, Phone, Mail, Clock, FileText,
  CheckCircle, XCircle, Upload, Eye, Download, ClipboardList
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const AdminBusinessDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [formData, setFormData] = useState({});

  // Get business details
  const { data: business, isLoading, refetch } = useQuery({
    queryKey: ['business', id],
    queryFn: async () => {
      const response = await API.get(`/business-records/${id}`);
      return response.data;
    },
  });

  // Get options for dropdowns
  const { data: options } = useQuery({
    queryKey: ['options'],
    queryFn: async () => {
      const [barangays, businessLines, haulerTypes] = await Promise.all([
        API.get('/options/barangays'),
        API.get('/options/business-lines'),
        API.get('/options/hauler-types'),
      ]);
      return {
        barangays: barangays.data.barangays,
        businessLines: businessLines.data.business_lines,
        haulerTypes: haulerTypes.data.hauler_types,
      };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const updateData = {
        ...data,
        owner_last_name: data.owner_last_name?.toUpperCase(),
        owner_first_name: data.owner_first_name?.toUpperCase(),
        owner_middle_name: data.owner_middle_name?.toUpperCase() || null,
      };
      const response = await API.put(`/business-records/${id}`, updateData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Business record updated');
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Update failed');
    },
  });

  useEffect(() => {
    if (business) {
      setFormData({
        establishment_name: business.establishment_name || '',
        business_line: business.business_line || '',
        bin_number: business.bin_number || '',
        owner_last_name: business.owner_last_name || '',
        owner_first_name: business.owner_first_name || '',
        owner_middle_name: business.owner_middle_name || '',
        owner_suffix: business.owner_suffix || '',
        contact_number: business.contact_number || '',
        email: business.email || '',
        location: business.location || '',
        hauler_type: business.hauler_type || '',
        application_type: business.application_type || 'NEW',
        has_own_structure: business.has_own_structure || false,
      });
    }
  }, [business]);

  const handleSave = () => {
    const dataToSave = {
      establishment_name: formData.establishment_name || business?.establishment_name,
      business_line: formData.business_line || business?.business_line,
      bin_number: formData.bin_number || business?.bin_number,
      owner_last_name: formData.owner_last_name || business?.owner_last_name,
      owner_first_name: formData.owner_first_name || business?.owner_first_name,
      owner_middle_name: formData.owner_middle_name || business?.owner_middle_name,
      owner_suffix: formData.owner_suffix || business?.owner_suffix,
      contact_number: formData.contact_number || business?.contact_number,
      email: formData.email || business?.email,
      location: formData.location || business?.location,
      hauler_type: formData.hauler_type || business?.hauler_type,
      application_type: formData.application_type || business?.application_type || 'NEW',
      has_own_structure: formData.has_own_structure ?? business?.has_own_structure ?? false,
    };
    
    updateMutation.mutate(dataToSave);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Business not found</p>
      </div>
    );
  }

  const getDisplayOwnerName = () => {
    if (business.owner_last_name && business.owner_first_name) {
      let name = `${business.owner_last_name}, ${business.owner_first_name}`;
      if (business.owner_middle_name) {
        name += ` ${business.owner_middle_name[0]}.`;
      }
      if (business.owner_suffix) {
        name += ` ${business.owner_suffix}`;
      }
      return name;
    }
    return business.owner_name_raw || '—';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/business')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Business Records
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRequirementsModal(true)}
            className="inline-flex items-center px-4 py-2 border border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50"
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Requirements Checklist
          </button>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Record
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    establishment_name: business.establishment_name || '',
                    business_line: business.business_line || '',
                    owner_last_name: business.owner_last_name || '',
                    owner_first_name: business.owner_first_name || '',
                    owner_middle_name: business.owner_middle_name || '',
                    owner_suffix: business.owner_suffix || '',
                    location: business.location || '',
                    contact_number: business.contact_number || '',
                    email: business.email || '',
                    hauler_type: business.hauler_type || '',
                    application_type: business.application_type || 'NEW',
                    has_own_structure: business.has_own_structure || false,
                    bin_number: business.bin_number || '',
                  });
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isLoading}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {updateMutation.isLoading ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Requirements Status Banner */}
      <RequirementsStatusBanner businessId={id} />

      {/* Business info card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {!isEditing ? (
          // DISPLAY MODE
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{business.establishment_name}</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Control Number</p>
                <p className="font-mono text-sm">{business.control_number || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Application Type</p>
                <p className="text-sm">{business.application_type || 'NEW'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Hauler Type</p>
                <p className="text-sm">{business.hauler_type || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Business Line</p>
                <p className="text-sm">{business.business_line || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Date Applied</p>
                <p className="text-sm">
                  {business.application_date ? format(new Date(business.application_date), 'MMM dd, yyyy') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Valid Until</p>
                <p className="text-sm">
                  {business.validity ? format(new Date(business.validity), 'MMM dd, yyyy') : '—'}
                </p>
              </div>
            </div>

            {/* SECTION 1: BUSINESS INFO */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                <Building2 className="h-4 w-4 mr-2 text-emerald-600" />
                Business Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">BIN Number</p>
                  <p className="text-gray-900">{business.bin_number || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Hauler Type</p>
                  <p className="text-gray-900">{business.hauler_type || '—'}</p>
                </div>
              </div>
            </div>

            {/* SECTION 2: OWNER INFO */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                <User className="h-4 w-4 mr-2 text-emerald-600" />
                Owner Information
              </h3>
              <p className="text-gray-900">{getDisplayOwnerName()}</p>
            </div>

            {/* SECTION 3: LOCATION & CONTACT */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-emerald-600" />
                Location & Contact
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Barangay</p>
                  <p className="text-gray-900">{business.location || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Contact Number</p>
                  <p className="text-gray-900">{business.contact_number || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-gray-900">{business.email || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Own Structure</p>
                  <p className="text-gray-900">{business.has_own_structure ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          // EDIT MODE - COMPLETE
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Edit Business Record</h2>
            
            {/* SECTION 1: BUSINESS INFO */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                <Building2 className="h-4 w-4 mr-2 text-emerald-600" />
                Business Information
              </h3>

              {/* Application Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Type <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-6">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="application_type"
                      value="NEW"
                      checked={formData.application_type === 'NEW'}
                      onChange={(e) => handleInputChange('application_type', e.target.value)}
                      className="h-4 w-4 text-emerald-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">New</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="application_type"
                      value="RENEWAL"
                      checked={formData.application_type === 'RENEWAL'}
                      onChange={(e) => handleInputChange('application_type', e.target.value)}
                      className="h-4 w-4 text-emerald-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Renewal</span>
                  </label>
                </div>
              </div>

              {/* Establishment Name & Hauler Type */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Establishment Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.establishment_name || ''}
                    onChange={(e) => handleInputChange('establishment_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hauler Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.hauler_type || ''}
                    onChange={(e) => handleInputChange('hauler_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    {options?.haulerTypes?.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Business Line & BIN Number */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Line <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={options?.businessLines || []}
                    value={formData.business_line || ''}
                    onChange={(value) => handleInputChange('business_line', value)}
                    placeholder="Select business line"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BIN Number</label>
                  <input
                    type="text"
                    value={formData.bin_number || ''}
                    onChange={(e) => handleInputChange('bin_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., 0402119-2011-0000466"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: OWNER INFO */}
            <div className="mb-6 pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                <User className="h-4 w-4 mr-2 text-emerald-600" />
                Owner Information
              </h3>
              
              {/* Last Name & First Name */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.owner_last_name || ''}
                    onChange={(e) => handleInputChange('owner_last_name', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.owner_first_name || ''}
                    onChange={(e) => handleInputChange('owner_first_name', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              {/* Middle Name & Suffix */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={formData.owner_middle_name || ''}
                    onChange={(e) => handleInputChange('owner_middle_name', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Suffix</label>
                  <input
                    type="text"
                    value={formData.owner_suffix || ''}
                    onChange={(e) => handleInputChange('owner_suffix', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Jr., Sr., III"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: LOCATION & CONTACT */}
            <div className="mb-6 pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-emerald-600" />
                Location & Contact
              </h3>
              
              {/* Barangay */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Barangay <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={options?.barangays || []}
                  value={formData.location || ''}
                  onChange={(value) => handleInputChange('location', value)}
                  placeholder="Select barangay"
                  required
                />
              </div>

              {/* Contact Number & Email */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={formData.contact_number || ''}
                    onChange={(e) => handleInputChange('contact_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="09171234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="business@email.com"
                  />
                </div>
              </div>

              {/* Own structure checkbox */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.has_own_structure || false}
                    onChange={(e) => handleInputChange('has_own_structure', e.target.checked)}
                    className="h-4 w-4 text-emerald-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Owns the building/structure</span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Requirements Modal */}
      <RequirementsModal
        businessId={id}
        isOpen={showRequirementsModal}
        onClose={() => setShowRequirementsModal(false)}
      />
    </div>
  );
};

export default AdminBusinessDetails;